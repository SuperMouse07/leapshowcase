/**
 * pages/products.js · Product Overview 控制器
 * ------------------------------------------------------------
 * 全量商品瀑布流 + 分类筛选条（前端本地收敛，后端 /products 亦支持 category）。
 */
import { initShell } from '../ui/shell.js';
import { observe } from '../ui/reveal.js';
import { masonryItem, emptyState } from '../ui/cards.js';
import { $, $$, escapeHtml } from '../core/dom.js';
import { CATS } from '../data/content.js';
import { withRatios } from '../data/content.js';
import { fetchAllProducts } from '../api/products.js';

initShell();

let ALL = [];
const state = { cat: 'all' };

function buildFilters() {
  const bar = $('#filterBar');
  if (!bar) return;
  bar.innerHTML = [
    `<button class="chip is-active" type="button" data-cat="all">All Series</button>`,
    ...CATS.map((c) => `<button class="chip" type="button" data-cat="${escapeHtml(c.id)}">${escapeHtml(c.label)}</button>`),
  ].join('');

  bar.addEventListener('click', (e) => {
    const catBtn = e.target.closest('[data-cat]');
    if (!catBtn) return;
    state.cat = catBtn.dataset.cat;
    $$('[data-cat]', bar).forEach((b) => b.classList.toggle('is-active', b === catBtn));
    render();
  });
}

function currentList() {
  return ALL.filter((p) => state.cat === 'all' || p.category === state.cat);
}

function render() {
  const grid = $('#grid');
  const count = $('#ovCount');
  if (!grid) return;
  const list = currentList();
  if (count) count.textContent = `${list.length} ${list.length === 1 ? 'Piece' : 'Pieces'}`;
  grid.innerHTML = list.length
    ? withRatios(list).map(masonryItem).join('')
    : emptyState('No products match this filter ♟');
  observe();
}

async function init() {
  const grid = $('#grid');
  try {
    ALL = await fetchAllProducts();
  } catch {
    ALL = [];
  }
  buildFilters();
  render();
  if (grid && !ALL.length) grid.innerHTML = emptyState('Products are temporarily unavailable ♟');
}

init();
