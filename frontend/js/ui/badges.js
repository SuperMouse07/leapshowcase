/**
 * ui/badges.js · 商品标签徽标渲染（ADR-0004）
 * ------------------------------------------------------------
 * products.tags 为字符串数组，前台以徽标呈现。为不同语义标签赋予色调：
 * 促销/降价 → sale（红底白字），定制 → custom（金底黑字），新品 → new（绿描边），
 * 其余 → 默认金描边。仅做展示层归类，不引入专用字段。
 */
import { escapeHtml } from '../core/dom.js';

/** 关键词 → 色调(tone) 归类规则（大小写不敏感，中英文关键词） */
const TONE_RULES = [
  { tone: 'sale', keys: ['促销', '降价', '特价', 'sale', 'discount', 'offer', 'promo'] },
  { tone: 'custom', keys: ['定制', 'custom', 'personaliz', 'bespoke', 'oem', 'odm'] },
  { tone: 'new', keys: ['新品', '上新', 'new', 'latest'] },
];

/** 依据标签文本推断色调 */
export function toneOf(tag) {
  const t = String(tag || '').toLowerCase();
  for (const rule of TONE_RULES) {
    if (rule.keys.some((k) => t.includes(k))) return rule.tone;
  }
  return '';
}

/** 单个徽标 HTML */
export function badgeHtml(tag) {
  const tone = toneOf(tag);
  return `<span class="badge"${tone ? ` data-tone="${tone}"` : ''}>${escapeHtml(tag)}</span>`;
}

/**
 * 徽标组 HTML。
 * @param {string[]} tags
 * @param {object} opts
 * @param {number} opts.max   最多展示数量（超出以 +N 收尾）
 * @param {string} opts.className  外层附加类名
 */
export function badgesHtml(tags, { max = 0, className = '' } = {}) {
  const list = Array.isArray(tags) ? tags.filter(Boolean) : [];
  if (!list.length) return '';
  const shown = max > 0 ? list.slice(0, max) : list;
  const rest = list.length - shown.length;
  const inner = shown.map(badgeHtml).join('') + (rest > 0 ? `<span class="badge">+${rest}</span>` : '');
  return `<span class="badges${className ? ` ${className}` : ''}">${inner}</span>`;
}
