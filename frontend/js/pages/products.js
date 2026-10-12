/**
 * pages/products.js · Product Overview 控制器
 * ------------------------------------------------------------
 * 全量商品瀑布流 + 分类/标签筛选条（ADR-0004 标签在前台可筛选）。
 * 筛选为前端本地收敛：后端 /products 支持 category，标签在归一化后本地过滤，
 * 待后端补齐 tag 查询参数后无缝切换（见 api/products.js fetchProducts）。
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
const state = { cat: 'all', tag: 'all' };

/** 汇总所有商品实际使用的标签（用于筛选条，避免出现空结果标签） */
function collectTags(products) {
  const set = new Set();
  products.forEach((p) => (p.tags || []).forEach((t) => t && set.add(t)));
  return [...set];
}

function buildFilters() {
  const bar = $('#filterBar');
  if (!bar) return;
  const tags = collectTags(ALL);
  const catChips = [
    `<button class="chip is-active" type="button" data-cat="all">All Series</button>`,
    ...CATS.map((c) => `<button class="chip" type="button" data-cat="${escapeHtml(c.id)}">${escapeHtml(c.label)}</button>`),
  ];
  const tagChips = tags.length
    ? [
        `<span class="filter-sep" aria-hidden="true">·</span>`,
        `<button class="chip is-active" type="button" data-tag="all">All Tags</button>`,
        ...tags.map((t) => `<button class="chip" type="button" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`),
      ]
    : [];
  bar.innerHTML = [...catChips, ...tagChips].join('');

  bar.addEventListener('click', (e) => {
    const catBtn = e.target.closest('[data-cat]');
    const tagBtn = e.target.closest('[data-tag]');
    if (catBtn) {
      state.cat = catBtn.dataset.cat;
      $$('[data-cat]', bar).forEach((b) => b.classList.toggle('is-active', b === catBtn));
    } else if (tagBtn) {
      state.tag = tagBtn.dataset.tag;
      $$('[data-tag]', bar).forEach((b) => b.classList.toggle('is-active', b === tagBtn));
    } else {
      return;
    }
    render();
  });
}

function currentList() {
  return ALL.filter((p) => {
    const catOk = state.cat === 'all' || p.category === state.cat;
    const tagOk = state.tag === 'all' || (p.tags || []).includes(state.tag);
    return catOk && tagOk;
  });
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
