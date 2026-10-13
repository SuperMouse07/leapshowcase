/**
 * api/settings.js · 全站设置数据访问层
 * ------------------------------------------------------------
 * settings 表键值对：site_title / logo_url / announcement_html /
 * contact_email / contact_social / hero_products（主推款 ID 数组）。
 * 规划：product_tags（受控标签词表，ADR-0004 可选），旧基线缺失时补默认。
 */
import { http } from '../core/http.js';

/** 归一化设置对象：hero_products / product_tags 保证为数组 */
export function normalizeSettings(s = {}) {
  const hero = Array.isArray(s.hero_products)
    ? s.hero_products.map(String)
    : safeParseArray(s.hero_products);
  const vocab = Array.isArray(s.product_tags)
    ? s.product_tags
    : safeParseArray(s.product_tags);
  return {
    ...s,
    site_title: s.site_title || '',
    logo_url: s.logo_url || '',
    announcement_html: s.announcement_html || '',
    contact_email: s.contact_email || '',
    contact_social: s.contact_social || '',
    hero_products: hero,
    // ADR-0004 可选受控词表；缺省时给出建议标签，供后台快速选用
    product_tags: vocab.length ? vocab : ['降价促销', '可支持定制', '新品上市'],
  };
}

function safeParseArray(value) {
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((x) => (typeof x === 'string' ? x : String(x))) : [];
  } catch {
    return [];
  }
}

/** 读取全站设置（公开） */
export async function fetchSettings() {
  const data = await http.get('/settings', { auth: false });
  return normalizeSettings(data.settings || data || {});
}

/** 单项更新（editor）：白名单键 */
export async function updateSetting(key, value) {
  return http.put('/settings', { key, value });
}

/**
 * 批量更新：单次 PUT { settings: {...} }，后端在单事务内原子写入并记一条合并审计。
 * @param {Object|Array} pairs 键值对象 { site_title: '...' }，或兼容旧调用的 [[key, value], ...] 数组
 * @returns {Promise<{ok: boolean, updated: string[]}>}
 */
export async function updateSettings(pairs) {
  const settings = Array.isArray(pairs) ? Object.fromEntries(pairs) : { ...pairs };
  return http.put('/settings', { settings });
}

/** 保存主推款 ID 数组（editor） */
export async function saveHeroProducts(ids) {
  return updateSetting('hero_products', JSON.stringify(ids.map(String)));
}

/** 上传 LOGO（editor）：dataURL → 返回 { url } */
export async function uploadLogo(imageDataUrl) {
  return http.post('/settings/logo', { image: imageDataUrl });
}
