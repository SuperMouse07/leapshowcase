/**
 * pages/home.js · 首页控制器
 * ------------------------------------------------------------
 * Hero full-bleed 轮播（服务器 slides，无数据则隐藏）/ Featured 主推交错四卡 /
 * Why Choose Leap / 品牌历程计数动画 / CTA。布局骨架由 ui/shell 注入，
 * 本页仅填充数据容器并触发滚动显现。
 */
import { initShell } from '../ui/shell.js';
import { createCarousel } from '../ui/carousel.js';
import { observe } from '../ui/reveal.js';
import { featureCard, emptyState } from '../ui/cards.js';
import { $, escapeHtml } from '../core/dom.js';
import { CATS, WHY, STATS, HERITAGE } from '../data/content.js';
import { fetchSlides } from '../api/slides.js';
import { fetchProducts } from '../api/products.js';
import { fetchSettings } from '../api/settings.js';

initShell();

/* ---------- Hero 轮播 ---------- */
async function initCarousel() {
  const stage = $('#carousel');
  const dots = $('#dots');
  let slides = [];
  try {
    slides = await fetchSlides();
  } catch {
    /* 后端不可达 → 隐藏轮播 */
  }
  if (!slides.length) {
    const hero = $('.hero');
    if (hero) hero.style.display = 'none';
    return;
  }
  createCarousel({
    stage,
    dots,
    slides: slides.map((s) => ({ image: s.image, alt: s.alt || '' })),
  });
}

/* ---------- Featured：主推款（settings.hero_products）+ 系列代表品补足 ---------- */
function pickFeatured(products, heroIds) {
  const heroSet = new Set((heroIds || []).map(String));
  const heroes = products.filter((p) => heroSet.has(String(p.id)));
  const featured = [...heroes];
  for (const c of CATS) {
    if (featured.length >= CATS.length) break;
    if (featured.some((p) => p.category === c.id)) continue;
    const rep = products.find((p) => p.category === c.id && !heroSet.has(String(p.id)));
    if (rep) featured.push(rep);
  }
  // 仍不足则以其余商品补齐
  for (const p of products) {
    if (featured.length >= CATS.length) break;
    if (!featured.includes(p)) featured.push(p);
  }
  return { list: featured.slice(0, CATS.length), heroSet };
}

function renderFeatured(products, heroIds) {
  const grid = $('#featGrid');
  if (!grid) return;
  if (!products.length) {
    grid.innerHTML = emptyState('Products are temporarily unavailable ♟');
    return;
  }
  const { list, heroSet } = pickFeatured(products, heroIds);
  grid.innerHTML = list.map((p) => featureCard(p, { hero: heroSet.has(String(p.id)) })).join('');
}

/* ---------- 编辑性常量区块 ---------- */
function renderStatic() {
  const why = $('#whyGrid');
  if (why) {
    why.innerHTML = WHY.map(
      (w) => `<div class="why-item reveal">
        <span class="n">${escapeHtml(w.n)}</span>
        <h3>${escapeHtml(w.t)}</h3>
        <p>${escapeHtml(w.d)}</p>
      </div>`
    ).join('');
  }
  const stats = $('#stats');
  if (stats) {
    stats.innerHTML = STATS.map(
      (s) => `<div class="stat">
        <span class="stat-num" style="--to:${s.to}"></span><span class="stat-suf">${escapeHtml(s.suffix)}</span>
        <span class="stat-label">${escapeHtml(s.label)}</span>
      </div>`
    ).join('');
  }
  const heritage = $('#heritage');
  if (heritage) heritage.innerHTML = HERITAGE.map((t) => `<p>${escapeHtml(t)}</p>`).join('');
}

async function init() {
  renderStatic();
  await initCarousel();
  try {
    const [{ products }, settings] = await Promise.all([fetchProducts(), fetchSettings().catch(() => ({}))]);
    renderFeatured(products, settings.hero_products || []);
  } catch {
    const grid = $('#featGrid');
    if (grid) grid.innerHTML = emptyState('Products are temporarily unavailable ♟');
  } finally {
    observe();
  }
}

init();
