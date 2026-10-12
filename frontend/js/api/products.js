/**
 * api/products.js · 商品数据访问层
 * ------------------------------------------------------------
 * 统一封装商品相关接口，并对后端返回做“契约归一化”：
 * 无论旧基线是否返回 tags，前端拿到的商品对象都保证含
 * `tags: string[]`（ADR-0004 规划字段，旧基线缺失时补默认 []），
 * 以及 images/details/info 数组与 cover 主图，避免各页面重复兜底。
 */
import { http } from '../core/http.js';
import { buildPath } from './endpoints.js';
import { SITE } from '../core/config.js';

/** 归一化单个商品对象：补齐数组字段、封面与标签 */
export function normalizeProduct(p) {
  if (!p) return p;
  const images = Array.isArray(p.images) ? p.images : p.image ? [p.image] : [];
  return {
    ...p,
    images,
    cover: images[0] || SITE.placeholder,
    details: Array.isArray(p.details) ? p.details : [],
    info: Array.isArray(p.info) ? p.info : p.info ? [p.info] : [],
    variants: Array.isArray(p.variants) ? p.variants : [],
    // ADR-0004：tags 为新增契约字段，旧基线缺失时补默认空数组
    tags: Array.isArray(p.tags) ? p.tags.filter((t) => t != null && t !== '') : [],
    // 双价契约（ADR-0006）：current_price 现价（兼容旧基线 price 别名），original_price 划线原价（可空）
    current_price: Number(p.current_price ?? p.price) || 0,
    original_price: Number(p.original_price) > 0 ? Number(p.original_price) : null,
    // 起订量（ADR-0006）：缺省 1
    moq: Number(p.moq) || 1,
    price: Number(p.current_price ?? p.price) || 0,
    stock: Number(p.stock) || 0,
  };
}

/**
 * 商品列表。
 * @param {object} q
 * @param {string} q.category  按分类过滤
 * @param {number} q.limit      分页大小（传入即启用分页契约）
 * @param {number} q.page       页码（从 1 起）
 * @param {string} q.tag        按标签过滤（预留：后端未实现时前端本地过滤）
 * @returns {Promise<{products:Array,total:number,page:number,limit:number}>}
 */
export async function fetchProducts({ category, limit, page, tag } = {}) {
  const data = await http.get('/products', {
    auth: false,
    params: { category, limit, page },
  });
  const products = (data.products || []).map(normalizeProduct);
  const filtered = tag ? products.filter((p) => p.tags.includes(tag)) : products;
  return {
    products: filtered,
    total: data.total ?? filtered.length,
    page: data.page ?? 1,
    limit: data.limit ?? filtered.length,
  };
}

/** 全部商品（不分页，模块级缓存可选） */
export async function fetchAllProducts() {
  const { products } = await fetchProducts();
  return products;
}

/** 商品详情 */
export async function fetchProduct(id) {
  const data = await http.get(buildPath('getProduct', { id }), { auth: false });
  return normalizeProduct(data.product);
}

/** 单商品存储明细（admin） */
export async function fetchProductStorage(id) {
  return http.get(buildPath('productStorage', { id }));
}

/** 新建商品（editor） */
export async function createProduct(body) {
  const data = await http.post('/products', body);
  return { ...data, product: normalizeProduct(data.product) };
}

/** 部分更新商品（editor）：未提交字段后端保留旧值 */
export async function updateProduct(id, body) {
  return http.put(buildPath('updateProduct', { id }), body);
}

/** 删除商品（editor） */
export async function deleteProduct(id) {
  return http.del(buildPath('deleteProduct', { id }));
}
