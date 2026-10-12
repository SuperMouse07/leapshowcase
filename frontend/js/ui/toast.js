/**
 * ui/toast.js · 轻量提示条
 * ------------------------------------------------------------
 * 统一的非阻塞反馈（成功/错误/信息），替代散落的 alert。
 * 自动创建宿主容器，超时后淡出移除。
 */
import { escapeHtml } from '../core/dom.js';

let host = null;

function ensureHost() {
  if (host && document.body.contains(host)) return host;
  host = document.createElement('div');
  host.className = 'toast-host';
  host.setAttribute('aria-live', 'polite');
  document.body.appendChild(host);
  return host;
}

/**
 * 显示一条提示。
 * @param {string} message
 * @param {object} opts
 * @param {'ok'|'err'|''} opts.tone
 * @param {number} opts.duration  毫秒，默认 2600
 */
export function toast(message, { tone = '', duration = 2600 } = {}) {
  const h = ensureHost();
  const el = document.createElement('div');
  el.className = `toast${tone ? ` ${tone}` : ''}`;
  el.innerHTML = escapeHtml(message);
  h.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 320);
  }, duration);
  return el;
}

export const toastOk = (msg) => toast(msg, { tone: 'ok' });
export const toastErr = (msg) => toast(msg, { tone: 'err', duration: 3600 });
