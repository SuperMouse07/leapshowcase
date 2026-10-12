/**
 * ui/lightbox.js · 全屏查看器与悬停放大镜
 * ------------------------------------------------------------
 * 从商品详情解耦为通用组件：传入图片 URL 序列即可全屏浏览（键盘/焦点圈定），
 * 悬停放大镜为桌面端增强（触屏与窄屏自动禁用）。动画由 CSS 完成，JS 仅切换状态类。
 */

/* ================= 悬停放大镜（圆形透镜跟随鼠标） ================= */
const LENS_SIZE = 200; // 透镜直径 px
const LENS_ZOOM = 2.5; // 放大倍率
let lensEl = null;
let lensRaf = 0;
let lensEvt = null;

/** 触屏 / ≤768px 禁用悬停放大镜 */
function hoverEnabled() {
  return window.matchMedia('(hover: hover)').matches && !window.matchMedia('(max-width: 768px)').matches;
}

function hideLens() {
  lensEl?.classList.remove('on');
}

/* 仅在 rAF 帧内更新位置与 background-position，避免 mousemove 高频重绘 */
function lensPaint() {
  lensRaf = 0;
  const e = lensEvt;
  if (!lensEl || !e || !lensEl.classList.contains('on')) return;
  const r = e.target.getBoundingClientRect();
  const px = Math.min(Math.max(e.clientX - r.left, 0), r.width);
  const py = Math.min(Math.max(e.clientY - r.top, 0), r.height);
  lensEl.style.left = `${e.clientX - LENS_SIZE / 2}px`;
  lensEl.style.top = `${e.clientY - LENS_SIZE / 2}px`;
  lensEl.style.backgroundImage = `url("${e.target.currentSrc || e.target.src}")`;
  lensEl.style.backgroundSize = `${r.width * LENS_ZOOM}px ${r.height * LENS_ZOOM}px`;
  lensEl.style.backgroundPosition = `${LENS_SIZE / 2 - px * LENS_ZOOM}px ${LENS_SIZE / 2 - py * LENS_ZOOM}px`;
}

/**
 * 为一组 <img> 绑定悬停放大镜。
 * @param {HTMLImageElement[]} imgs
 */
export function setupZoomLens(imgs) {
  imgs.forEach((img) => {
    img.addEventListener('mouseenter', (e) => {
      if (!hoverEnabled()) return;
      if (!lensEl) {
        lensEl = document.createElement('div');
        lensEl.className = 'pd-lens';
        lensEl.setAttribute('aria-hidden', 'true');
        document.body.appendChild(lensEl);
      }
      lensEvt = e;
      lensEl.classList.add('on');
      if (!lensRaf) lensRaf = requestAnimationFrame(lensPaint);
    });
    img.addEventListener('mousemove', (e) => {
      if (!lensEl || !lensEl.classList.contains('on')) return;
      lensEvt = e;
      if (!lensRaf) lensRaf = requestAnimationFrame(lensPaint);
    });
    img.addEventListener('mouseleave', hideLens);
  });
  // 页面滚动 / 窗口缩放时立即隐藏，避免透镜滞留错位
  document.addEventListener('scroll', hideLens, true);
  window.addEventListener('resize', hideLens);
}

/* ================= Lightbox 全屏查看器 ================= */
let lbEl = null;
let lbSeq = [];
let lbIdx = 0;
let lbLastFocus = null;
let lbKeyBound = false;

function onKeydown(e) {
  if (!lbEl || !lbEl.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  else if (e.key === 'ArrowLeft') lbShow(lbIdx - 1);
  else if (e.key === 'ArrowRight') lbShow(lbIdx + 1);
  else if (e.key === 'Tab') {
    // 焦点圈定在查看器内
    const items = [...lbEl.querySelectorAll('button')];
    const i = items.indexOf(document.activeElement);
    e.preventDefault();
    items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length].focus();
  }
}

function buildLightbox() {
  lbEl = document.createElement('div');
  lbEl.className = 'pd-lightbox';
  lbEl.setAttribute('role', 'dialog');
  lbEl.setAttribute('aria-modal', 'true');
  lbEl.setAttribute('aria-label', 'Fullscreen image viewer');
  lbEl.innerHTML = `
    <button class="lb-close" type="button" aria-label="Close viewer (Esc)">×</button>
    <button class="lb-arrow lb-prev" type="button" aria-label="Previous image">‹</button>
    <figure class="lb-stage"><img class="lb-img" alt="Enlarged view" /></figure>
    <button class="lb-arrow lb-next" type="button" aria-label="Next image">›</button>
    <p class="lb-count" aria-live="polite"></p>`;
  lbEl.addEventListener('click', (e) => {
    if (e.target === lbEl) closeLightbox(); // 点击遮罩关闭
  });
  lbEl.querySelector('.lb-close').addEventListener('click', closeLightbox);
  lbEl.querySelector('.lb-prev').addEventListener('click', () => lbShow(lbIdx - 1));
  lbEl.querySelector('.lb-next').addEventListener('click', () => lbShow(lbIdx + 1));
  document.body.appendChild(lbEl);
  if (!lbKeyBound) {
    document.addEventListener('keydown', onKeydown);
    lbKeyBound = true;
  }
}

/* 切换图片：先淡出再加载，懒预载相邻两张保证切换即时 */
function lbShow(i) {
  if (!lbSeq.length) return;
  lbIdx = ((i % lbSeq.length) + lbSeq.length) % lbSeq.length;
  const img = lbEl.querySelector('.lb-img');
  img.style.opacity = '0';
  const loader = new Image();
  const apply = () => {
    img.src = lbSeq[lbIdx];
    img.style.opacity = '1';
  };
  loader.addEventListener('load', apply);
  loader.addEventListener('error', apply);
  loader.src = lbSeq[lbIdx];
  lbEl.querySelector('.lb-count').textContent = `${lbIdx + 1} / ${lbSeq.length}`;
  [lbIdx + 1, lbIdx - 1].forEach((j) => {
    const pre = new Image();
    pre.src = lbSeq[(j + lbSeq.length) % lbSeq.length];
  });
}

/**
 * 打开全屏查看器。
 * @param {string[]} images  图片 URL 序列
 * @param {number} index     起始索引，默认 0
 */
export function openLightbox(images, index = 0) {
  lbSeq = (Array.isArray(images) ? images : []).filter(Boolean);
  if (!lbSeq.length) return;
  if (!lbEl) buildLightbox();
  hideLens();
  lbLastFocus = document.activeElement;
  lbEl.classList.add('open');
  document.body.style.overflow = 'hidden';
  lbShow(index);
  lbEl.querySelector('.lb-close').focus();
}

export function closeLightbox() {
  if (!lbEl) return;
  lbEl.classList.remove('open');
  document.body.style.overflow = '';
  if (lbLastFocus && lbLastFocus.focus) lbLastFocus.focus();
}

/**
 * 让一组 <img> 点击后进入全屏查看器；主图与详情图可拼成统一序列。
 * 拖拽滑动（位移 > 8px）不触发，键盘 Enter/Space 亦可打开。
 * @param {HTMLImageElement[]} imgs  参与序列的全部图片（按顺序）
 */
export function bindImageClicks(imgs) {
  const seq = imgs.map((img) => img.currentSrc || img.src);
  let downX = 0;
  let downY = 0;
  document.addEventListener(
    'pointerdown',
    (e) => {
      downX = e.clientX;
      downY = e.clientY;
    },
    true
  );
  imgs.forEach((img, i) => {
    img.setAttribute('role', 'button');
    img.tabIndex = 0;
    img.addEventListener('click', (e) => {
      if (e.detail === 0) return; // 键盘触发由 keydown 处理
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) return; // 滑动拖拽不触发
      openLightbox(seq, i);
    });
    img.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(seq, i);
      }
    });
  });
}
