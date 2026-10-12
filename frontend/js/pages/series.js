/**
 * pages/series.js · 系列页控制器（series.html?cat=<id>）
 * ------------------------------------------------------------
 * 单一参数化路由取代旧版四个分类 HTML（ADR-0005 精简结构）。
 * 读取 ?cat= 设定页头文案与导航高亮，展示该分类商品瀑布流。
 */
import { initShell } from '../ui/shell.js';
import { observe } from '../ui/reveal.js';
import { masonryItem, emptyState } from '../ui/cards.js';
import { $, escapeHtml, queryParam } from '../core/dom.js';
import { catMeta, seriesHref, CATS, withRatios } from '../data/content.js';
import { fetchProducts } from '../api/products.js';

// 导航高亮依赖 body[data-cat]，须在 initShell 注入前设定
const cat = queryParam('cat') || CATS[0].id;
document.body.dataset.cat = cat;

initShell();

const meta = catMeta(cat);

function renderHead() {
  const titleEl = $('#catTitle');
  const kickerEl = $('#catKicker');
  const taglineEl = $('#catTagline');
  if (kickerEl) kickerEl.textContent = meta.kicker;
  if (titleEl) titleEl.textContent = meta.title;
  if (taglineEl) taglineEl.textContent = meta.tagline;
  document.title = `${meta.title} · LEAP`;

  // 分类切换条（当前分类高亮）
  const nav = $('#catNav');
  if (nav) {
    nav.innerHTML = CATS.map(
      (c) =>
        `<a class="chip${c.id === cat ? ' is-active' : ''}" href="${seriesHref(c.id)}">${escapeHtml(c.label)}</a>`
    ).join('');
  }
}

async function init() {
  renderHead();
  const grid = $('#grid');
  const count = $('#catCount');
  let products = [];
  try {
    ({ products } = await fetchProducts({ category: cat }));
  } catch {
    products = [];
  }
  if (count) count.textContent = `${products.length} ${products.length === 1 ? 'Piece' : 'Pieces'}`;
  if (grid) {
    grid.innerHTML = products.length
      ? withRatios(products).map(masonryItem).join('')
      : emptyState('No products in this series yet ♟');
  }
  observe();
}

init();
