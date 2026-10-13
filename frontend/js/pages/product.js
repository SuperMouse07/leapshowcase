/**
 * pages/product.js · 商品详情控制器（product.html?id=N）
 * ------------------------------------------------------------
 * 左侧主图 1:1 左右滑动（scroll-snap + 循环箭头）+ 下方详情图；
 * 右侧标题/价格/数量/加入清单 + Product Information（Markdown 卖点）。
 * 主图与详情图共用同一 Lightbox 浏览序列，桌面端叠加悬停放大镜。
 */
import { initShell, openDrawer } from '../ui/shell.js';
import { observe } from '../ui/reveal.js';
import { renderMarkdown } from '../ui/markdown.js';
import { setupZoomLens, bindImageClicks } from '../ui/lightbox.js';
import { $, $$, escapeHtml, money, queryParam } from '../core/dom.js';
import { SITE } from '../core/config.js';
import { catMeta, seriesHref } from '../data/content.js';
import { fetchProduct } from '../api/products.js';
import * as cart from '../core/cart.js';

initShell();

const id = queryParam('id');
const root = $('#pdRoot');

function notFound() {
  if (!root) return;
  root.innerHTML = `<div class="wrap pd-wrap">
      <p class="cart-empty">Product not found ♟<br>
        <a class="link-more" href="/products"><span>Back to Product Overview</span><span class="arr">→</span></a>
      </p>
    </div>`;
}

/* 主图左右箭头：循环切换（末张→首张、首张→末张） */
function bindMainArrows(mainEl, prevBtn, nextBtn) {
  if (!mainEl || !prevBtn || !nextBtn) return;
  const imgs = $$('img', mainEl);
  const stepW = () => {
    const img = mainEl.querySelector('img');
    return img ? Math.round(img.getBoundingClientRect().width) + 12 : 300;
  };
  const currentIndex = () => Math.round(mainEl.scrollLeft / stepW());
  const goTo = (i) => mainEl.scrollTo({ left: i * stepW(), behavior: 'smooth' });
  prevBtn.addEventListener('click', () => goTo(currentIndex() <= 0 ? imgs.length - 1 : currentIndex() - 1));
  nextBtn.addEventListener('click', () => goTo(currentIndex() >= imgs.length - 1 ? 0 : currentIndex() + 1));
}

async function init() {
  let p = null;
  try {
    if (id) p = await fetchProduct(id);
  } catch {
    /* 404 / 网络异常 → notFound */
  }
  if (!p || !root) return notFound();

  const meta = catMeta(p.category);
  const main = p.images?.length ? [...p.images] : [SITE.placeholder];
  const detail = p.details?.length ? [...p.details] : [];
  let qty = 1;

  document.title = `${p.name} · ${meta.title}`;

  root.innerHTML = `<div class="wrap pd-wrap">
      <p class="pd-crumb">
        <a class="link-more" href="${seriesHref(p.category)}"><span>← ${escapeHtml(meta.title)}</span></a>
      </p>
      <div class="pd-grid">
        <div class="pd-media">
          ${main.length > 1 ? '<p class="pd-swipe-hint">← Swipe · Main images 1:1 →</p>' : ''}
          <div class="pd-gallery">
            <div class="pd-main" id="pdMain" aria-label="Main images (swipe)">
              ${main.map((src) => `<img src="${escapeHtml(src)}" alt="${escapeHtml(p.name)} main image">`).join('')}
            </div>
            ${main.length > 1 ? `
            <button class="pd-arrow pd-prev" id="pdPrev" type="button" aria-label="Previous image">‹</button>
            <button class="pd-arrow pd-next" id="pdNext" type="button" aria-label="Next image">›</button>` : ''}
          </div>
          ${detail.length ? `<div class="pd-detail">
            ${detail.map((src) => `<img src="${escapeHtml(src)}" alt="${escapeHtml(p.name)} detail image" loading="lazy">`).join('')}
          </div>` : ''}
        </div>
        <div class="pd-info">
          <span class="micro-label left solo">${escapeHtml(meta.kicker)}</span>
          <h1 class="pd-name">${escapeHtml(p.name)}</h1>
          <p class="pd-price">${money(p.price)}</p>
          <p class="pd-desc">${escapeHtml(p.description || '')}</p>
          <div class="pd-buy">
            <span class="stepper">
              <button id="qMinus" type="button" aria-label="Decrease quantity">−</button>
              <output id="qOut">1</output>
              <button id="qPlus" type="button" aria-label="Increase quantity">+</button>
            </span>
            <button class="btn" id="pdAdd" type="button"><span>Add to List</span></button>
          </div>
          ${p.info?.length ? `<div class="pd-block2">
            <h3 class="micro-label left solo">Product Information</h3>
            ${renderMarkdown(p.info.join('\n'))}
          </div>` : ''}
        </div>
      </div>
    </div>`;

  $('#qMinus').addEventListener('click', () => {
    qty = Math.max(1, qty - 1);
    $('#qOut').textContent = String(qty);
  });
  $('#qPlus').addEventListener('click', () => {
    qty = Math.min(999, qty + 1);
    $('#qOut').textContent = String(qty);
  });
  $('#pdAdd').addEventListener('click', () => {
    cart.add(p.id, qty);
    openDrawer();
  });

  const mainEl = $('#pdMain');
  bindMainArrows(mainEl, $('#pdPrev'), $('#pdNext'));

  // 悬停放大镜 + Lightbox：主图与详情图共用同一浏览序列
  const mainImgs = mainEl ? $$('img', mainEl) : [];
  const detailImgs = $$('.pd-detail img', root);
  const all = [...mainImgs, ...detailImgs];
  setupZoomLens(all);
  bindImageClicks(all);

  observe();
}

init();
