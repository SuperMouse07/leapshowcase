/**
 * core/cart.js · 采购清单（购物车）状态管理
 * ------------------------------------------------------------
 * B2B 语义：这是一个本地“需求清单”，非在线零售结算（proposal §4.1 / design 2.4）。
 * 职责：维护 {productId → qty} 状态、持久化到 localStorage（不可用时降级内存态）、
 * 变更时通过事件总线广播，供购物车抽屉等 UI 订阅渲染；并支持一键导出清单。
 * 商品信息经 core/catalog.js 解析，本模块只持有 id 与数量，杜绝经存储通道的注入。
 */
import { SITE } from './config.js';
import { emit, EVENTS, on } from './events.js';
import { getProduct } from './catalog.js';
import { money, clampInt } from './dom.js';
import { reportActivity } from '../api/activity.js';

const MAX_QTY = 999;
let items = new Map();
let storageOk = true;

/* ---------- 持久化 ---------- */
function load() {
  items = new Map();
  try {
    const raw = JSON.parse(localStorage.getItem(SITE.cartKey) || '{}');
    for (const [id, qty] of Object.entries(raw)) {
      const n = clampInt(qty, 1, MAX_QTY);
      if (n > 0) items.set(String(id), n);
    }
  } catch {
    storageOk = false; // 存储不可用 → 内存态
  }
}

function persist() {
  if (!storageOk) return;
  try {
    localStorage.setItem(SITE.cartKey, JSON.stringify(Object.fromEntries(items)));
  } catch {
    storageOk = false;
  }
}

load();

function commit() {
  persist();
  emit(EVENTS.cartChanged, snapshot());
}

/* ---------- 查询 ---------- */

/** 清单条目（含解析后的商品信息；缓存未就绪的商品被过滤） */
export function entries() {
  const list = [];
  for (const [id, qty] of items) {
    const p = getProduct(id);
    if (p) list.push({ id, qty, product: p });
  }
  return list;
}

export function snapshot() {
  const list = entries();
  return {
    items: list,
    count: list.reduce((s, it) => s + it.qty, 0),
    total: list.reduce((s, it) => s + it.qty * (it.product.price || 0), 0),
  };
}

export function count() {
  return [...items.values()].reduce((s, q) => s + q, 0);
}

export function getQty(id) {
  return items.get(String(id)) || 0;
}

/* ---------- 变更 ---------- */

export function add(id, qty = 1) {
  const key = String(id);
  const next = clampInt((items.get(key) || 0) + qty, 1, MAX_QTY);
  items.set(key, next);
  commit();
  const p = getProduct(key);
  reportActivity('add_to_cart', `${p?.name || 'product'} (id:${key}) x${qty}`, {
    target_type: 'product',
    target_id: key,
  });
}

export function setQty(id, qty) {
  const key = String(id);
  const n = clampInt(qty, 0, MAX_QTY);
  if (n <= 0) items.delete(key);
  else items.set(key, n);
  commit();
}

export function step(id, delta) {
  setQty(id, (items.get(String(id)) || 0) + Number(delta));
}

export function remove(id) {
  items.delete(String(id));
  commit();
}

export function clear() {
  items.clear();
  commit();
}

/** 订阅清单变更，返回取消订阅函数 */
export function subscribe(handler) {
  return on(EVENTS.cartChanged, handler);
}

/* ---------- 导出采购清单（本地 Blob 下载，无网络请求） ---------- */
export function exportList() {
  const list = entries();
  if (!list.length) return false;
  const lines = list.map(
    (it) => `${it.product.name}  x${it.qty}  @${money(it.product.price)}  = ${money(it.product.price * it.qty)}`
  );
  const { total } = snapshot();
  const bar = '—'.repeat(36);
  const text = `LEAP Shopping List\n${bar}\n${lines.join('\n')}\n${bar}\nTotal: ${money(total)}\n`;
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'leap-shopping-list.txt' });
  a.click();
  URL.revokeObjectURL(url);
  clear();
  return true;
}
