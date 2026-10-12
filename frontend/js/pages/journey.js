/**
 * pages/journey.js · Our Journey 控制器
 * ------------------------------------------------------------
 * 将编辑性品牌全文（data/content.js JOURNEY_DOC）渲染为居中长文档。
 * 纯静态内容，无后端依赖；渲染后触发滚动显现。
 */
import { initShell } from '../ui/shell.js';
import { observe } from '../ui/reveal.js';
import { $, escapeHtml } from '../core/dom.js';
import { JOURNEY_DOC } from '../data/content.js';

initShell();

function render() {
  const doc = $('#journeyDoc');
  if (!doc) return;
  doc.innerHTML = JOURNEY_DOC.map(
    (sec) => `<section class="reveal">
      <h2 class="jd-h">${escapeHtml(sec.h)}</h2>
      ${sec.ps.map((p) => `<p class="jd-p">${escapeHtml(p)}</p>`).join('')}
      ${sec.bullets && sec.bullets.length ? `<ul class="jd-ul">${sec.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : ''}
    </section>`
  ).join('');
  observe();
}

render();
