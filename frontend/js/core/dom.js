/**
 * core/dom.js · DOM 与格式化工具
 * ------------------------------------------------------------
 * 纯函数集合：选择器、HTML 转义、金额格式化、元素创建、
 * 事件委托辅助。无副作用、无外部依赖，供全站复用。
 */

/** querySelector 简写 */
export const $ = (sel, root = document) => root.querySelector(sel);
/** querySelectorAll → 数组 */
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** HTML 转义：所有插入 innerHTML 的动态文本必须先经此处理 */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

/**
 * 白名单式富文本净化：先全量转义，仅放行内联排版标签。
 * 用于公告栏等“允许少量标记”的字段，杜绝 XSS。
 */
export function sanitizeInline(html) {
  return escapeHtml(html).replace(/&lt;(\/?(?:strong|b|em|i)|br\s*\/?)&gt;/gi, '<$1>');
}

/** 金额格式化（USD，两位小数） */
export const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;

/** 字节数格式化 */
export function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n;
  let u = -1;
  do {
    v /= 1024;
    u++;
  } while (v >= 1024 && u < units.length - 1);
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[u]}`;
}

/** 日期时间本地化（无效值返回占位） */
export function dateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

/** 仅日期本地化 */
export function dateOnly(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

/** 创建元素（可选 class / 属性 / 子节点） */
export function el(tag, opts = {}, children = []) {
  const node = document.createElement(tag);
  if (opts.class) node.className = opts.class;
  if (opts.text != null) node.textContent = opts.text;
  if (opts.html != null) node.innerHTML = opts.html;
  if (opts.attrs) {
    for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.append(child);
  }
  return node;
}

/** 在元素上绑定委托点击：selector 命中时回调 */
export function delegate(root, selector, handler) {
  root.addEventListener('click', (e) => {
    const target = e.target.closest(selector);
    if (target && root.contains(target)) handler(e, target);
  });
}

/** 读取 URL query 参数 */
export function queryParam(name, search = location.search) {
  return new URLSearchParams(search).get(name);
}

/** 数值收敛到 [min, max] 区间内的整数 */
export function clampInt(value, min, max) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}
