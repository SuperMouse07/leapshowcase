/**
 * pages/series.js · 分类系列页控制器
 * ------------------------------------------------------------
 * 驱动四个专属分类页（/chess-clock、/chess-board、/stopwatch、/lifestyle），
 * 并兼容旧的参数化 series.html?cat=<id> 链接。
 * 依 body[data-cat] 设定页头文案与导航高亮，展示该分类商品瀑布流。
 */
import { initShell } from '../ui/shell.js';
import { observe } from '../ui/reveal.js';
import { masonryItem, emptyState } from '../ui/cards.js';
import { $, queryParam } from '../core/dom.js';
import { catMeta, CATS, withRatios } from '../data/content.js';
import { fetchProducts } from '../api/products.js';

// 分类优先取 body[data-cat]（专属分类页硬编码，须在 initShell 注入前确定以驱动导航高亮）；
// 旧 /series?cat=<id> 链接回退查询参数，保持向后兼容。
const cat = document.body.dataset.cat || queryParam('cat') || CATS[0].id;
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
