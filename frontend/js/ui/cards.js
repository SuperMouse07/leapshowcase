/**
 * ui/cards.js · 商品卡片渲染器
 * ------------------------------------------------------------
 * 首页主推交错卡与 Product Overview / 系列页瀑布流共用的纯字符串渲染，
 * 统一输出 data-add（加入清单）与标签徽标（ADR-0004），供各页面拼装。
 */
import { escapeHtml, money } from '../core/dom.js';
import { SITE } from '../core/config.js';
import { catMeta } from '../data/content.js';
import { badgesHtml } from './badges.js';

/** 商品详情链接 */
export const productHref = (id) => `product.html?id=${encodeURIComponent(id)}`;

/** 分类展示名（未知分类回退原始值） */
export function catLabel(catId) {
  return catMeta(catId).title || catId || 'Collection';
}

/**
 * 主推交错编辑卡（首页 .p-grid）。
 * @param {object} p  归一化商品
 * @param {object} opts
 * @param {boolean} opts.hero  是否为主推高亮款（描金边）
 */
export function featureCard(p, { hero = false } = {}) {
  const badges = badgesHtml(p.tags, { max: 2, className: 'media-badges' });
  return `<article class="p-card reveal${hero ? ' is-hero' : ''}">
    <a class="p-media" href="${productHref(p.id)}" aria-label="${escapeHtml(p.name)}">
      ${badges}
      <img src="${escapeHtml(p.cover || SITE.placeholder)}" alt="${escapeHtml(p.name)}" loading="lazy">
    </a>
    <p class="p-cat">${escapeHtml(catLabel(p.category))}</p>
    <h3 class="p-name"><a href="${productHref(p.id)}">${escapeHtml(p.name)}</a></h3>
    <p class="p-desc">${escapeHtml(p.description || '')}</p>
    <div class="p-foot">
      <span class="p-price"><small>USD</small>${money(p.price)}</span>
      <button class="btn-add" type="button" data-add="${escapeHtml(p.id)}">Add to List</button>
    </div>
  </article>`;
}

/**
 * 瀑布流卡片（Product Overview / 系列页 .masonry）。
 * @param {object} p  归一化商品（可含 ratio 供纵横比节奏）
 */
export function masonryItem(p) {
  const badges = badgesHtml(p.tags, { max: 3, className: 'media-badges' });
  const ratio = p.ratio ? ` style="aspect-ratio:${p.ratio}"` : '';
  return `<a class="m-item reveal" href="${productHref(p.id)}">
    <span class="p-media"${ratio}>
      ${badges}
      <img src="${escapeHtml(p.cover || SITE.placeholder)}" alt="${escapeHtml(p.name)}" loading="lazy">
    </span>
    <span class="m-name">${escapeHtml(p.name)}</span>
    <span class="m-meta">
      <span>${escapeHtml(catLabel(p.category))}</span>
      <span class="price">${money(p.price)}</span>
    </span>
    ${p.tags && p.tags.length ? `<span class="m-tags">${badgesHtml(p.tags, { max: 3 })}</span>` : ''}
  </a>`;
}

/** 空态占位 */
export function emptyState(message = 'No products yet ♟') {
  return `<p class="empty-state">${escapeHtml(message)}</p>`;
}
