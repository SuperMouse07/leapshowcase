/**
 * ui/carousel.js · Hero 轮播组件
 * ------------------------------------------------------------
 * full-bleed 淡入淡出轮播：8s 自动播放 + 手动深浅点；页面隐藏时暂停。
 * JS 仅切换 .is-active 状态类，过渡动画由 CSS 完成。
 */
import { escapeHtml } from '../core/dom.js';

/**
 * 初始化轮播。
 * @param {object} opts
 * @param {HTMLElement} opts.stage  轮播容器（渲染 .slide）
 * @param {HTMLElement} opts.dots   指示点容器（渲染 .dot）
 * @param {Array<{image:string,alt?:string}>} opts.slides
 * @param {number} opts.interval    自动播放间隔，默认 8000
 * @returns {{stop:Function}|null}  无有效数据时返回 null
 */
export function createCarousel({ stage, dots, slides, interval = 8000 }) {
  if (!stage || !Array.isArray(slides) || !slides.length) return null;

  stage.innerHTML = slides
    .map(
      (s, i) =>
        `<div class="slide${i === 0 ? ' is-active' : ''}"><img src="${escapeHtml(s.image)}" alt="${escapeHtml(s.alt || '')}"${i ? ' loading="lazy"' : ''}></div>`
    )
    .join('');

  if (dots) {
    dots.innerHTML = slides
      .map((_, i) => `<button class="dot${i === 0 ? ' is-active' : ''}" data-i="${i}" aria-label="Switch to slide ${i + 1}"></button>`)
      .join('');
  }

  const els = [...stage.querySelectorAll('.slide')];
  const dotEls = dots ? [...dots.querySelectorAll('.dot')] : [];
  let current = 0;
  let timer = null;

  function go(i) {
    current = (i + slides.length) % slides.length;
    els.forEach((el, k) => el.classList.toggle('is-active', k === current));
    dotEls.forEach((el, k) => el.classList.toggle('is-active', k === current));
  }
  function start() {
    stop();
    timer = setInterval(() => go(current + 1), interval);
  }
  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  if (dots) {
    dots.addEventListener('click', (e) => {
      const d = e.target.closest('.dot');
      if (!d) return;
      go(Number(d.dataset.i));
      start();
    });
  }
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  start();
  return { stop, go };
}
