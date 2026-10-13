/**
 * ui/dialog.js · Styled modal dialogs (replaces native confirm/prompt)
 * ------------------------------------------------------------
 * Provides confirmDialog() and promptDialog() that return Promises.
 * Uses existing theme tokens for consistent admin styling.
 */
import { $ } from '../core/dom.js';

let overlay = null;
// Settle hook for the currently open dialog, so Escape/backdrop dismissal
// resolves the pending promise (with null) instead of leaving callers hanging.
let activeSettle = null;

function ensureOverlay() {
  if (overlay && document.body.contains(overlay)) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';
  overlay.innerHTML = '<div class="dialog-card"></div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) close();
  });
  return overlay;
}

function open() {
  const el = ensureOverlay();
  requestAnimationFrame(() => el.classList.add('open'));
}

function close() {
  // Escape key / backdrop click: settle the pending promise with null
  // (cancellation) so the awaiting caller is never left hanging.
  if (activeSettle) {
    const settle = activeSettle;
    activeSettle = null;
    settle(null);
  }
  if (overlay) overlay.classList.remove('open');
}

/**
 * Styled confirmation dialog.
 * @param  title?: string, message: string, confirmText?: string, cancelText?: string, danger?: boolean  opts
 * @returns {Promise<boolean>}
 */
export function confirmDialog({ title = '确认', message, confirmText = '确认', cancelText = '取消', danger = false } = {}) {
  return new Promise((resolve) => {
    const el = ensureOverlay();
    const card = el.querySelector('.dialog-card');
    card.innerHTML = `
      <h3 class="dialog-title">${title}</h3>
      <p class="dialog-msg">${message}</p>
      <div class="dialog-actions">
        <button class="btn btn-ghost btn-small" data-act="cancel">${cancelText}</button>
        <button class="btn btn-small${danger ? ' btn-danger' : ''}" data-act="ok">${confirmText}</button>
      </div>`;
    open();
    activeSettle = resolve;
    const cleanup = (val) => { activeSettle = null; close(); resolve(val); };
    card.querySelector('[data-act="ok"]').onclick = () => cleanup(true);
    card.querySelector('[data-act="cancel"]').onclick = () => cleanup(false);
    // Focus the confirm button
    setTimeout(() => card.querySelector('[data-act="ok"]')?.focus(), 100);
  });
}

/**
 * Styled prompt dialog with input field.
 * @param  title?: string, label?: string, placeholder?: string, confirmText?: string, cancelText?: string, validate?: (v:string)=>string|null  opts
 * @returns {Promise<string|null>} null if cancelled
 */
export function promptDialog({ title = '请输入', label = '', placeholder = '', confirmText = '提交', cancelText = '取消', validate = null } = {}) {
  return new Promise((resolve) => {
    const el = ensureOverlay();
    const card = el.querySelector('.dialog-card');
    card.innerHTML = `
      <h3 class="dialog-title">${title}</h3>
      ${label ? `<p class="dialog-msg">${label}</p>` : ''}
      <input class="dialog-input" type="text" placeholder="${placeholder}" autocomplete="off" />
      <p class="dialog-msg dialog-error" style="color:var(--danger);font-size:var(--fs-sm);display:none;margin-bottom:var(--space-md);"></p>
      <div class="dialog-actions">
        <button class="btn btn-ghost btn-small" data-act="cancel">${cancelText}</button>
        <button class="btn btn-small" data-act="ok">${confirmText}</button>
      </div>`;
    open();
    activeSettle = resolve;
    const input = card.querySelector('.dialog-input');
    const errEl = card.querySelector('.dialog-error');
    setTimeout(() => input.focus(), 100);

    const trySubmit = () => {
      const val = input.value.trim();
      if (validate) {
        const err = validate(val);
        if (err) { errEl.textContent = err; errEl.style.display = 'block'; input.focus(); return; }
      }
      activeSettle = null; close(); resolve(val);
    };
    card.querySelector('[data-act="ok"]').onclick = trySubmit;
    card.querySelector('[data-act="cancel"]').onclick = () => { activeSettle = null; close(); resolve(null); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') trySubmit(); });
  });
}
