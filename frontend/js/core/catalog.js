/**
 * core/catalog.js · 商品目录缓存
 * ------------------------------------------------------------
 * 全站商品列表的模块级只读缓存：购物车渲染、清单导出、
 * 交叉链接等都需要按 id 快速取商品信息，避免重复请求后端。
 * 后端不可达时降级为空目录，相关功能自动失效而非报错。
 */
import { fetchAllProducts } from '../api/products.js';

let cache = null;
let inflight = null;

/** 加载全部商品（首次请求后缓存；force=true 强制刷新） */
export async function loadCatalog(force = false) {
  if (cache && !force) return cache;
  if (inflight && !force) return inflight;
  inflight = fetchAllProducts()
    .then((list) => {
      cache = list;
      return cache;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** 同步读取已缓存目录（未加载时返回空数组） */
export function allProducts() {
  return cache || [];
}

/** 按 id 取商品（同步，依赖已加载的缓存） */
export function getProduct(id) {
  return (cache || []).find((p) => String(p.id) === String(id)) || null;
}

/** 目录是否已就绪 */
export function isReady() {
  return Array.isArray(cache);
}
