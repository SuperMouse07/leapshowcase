/**
 * ui/reveal.js · 滚动显现与计数动画触发
 * ------------------------------------------------------------
 * JS 仅负责在元素进入视口时添加 `.in-view` 类，动画本身由 CSS 完成。
 * 支持 .reveal 渐显与 .stats 计数动画；内容异步渲染后可重复调用 observe()。
 */

let observer = null;

function ensureObserver() {
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in-view');
          observer.unobserve(e.target);
        }
      }
    },
    { threshold: 0.15 }
  );
  return observer;
}

/** 观察当前文档内所有尚未显现的 .reveal / .stats 元素 */
export function observe(root = document) {
  const io = ensureObserver();
  root.querySelectorAll('.reveal:not(.in-view), .stats:not(.in-view)').forEach((el) => io.observe(el));
}
