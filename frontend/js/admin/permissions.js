/**
 * admin/permissions.js · 权限矩阵 UI 辅助（ADR-0005）
 * ------------------------------------------------------------
 * 子账号可被授予的能力仅限内容编辑类（商品 / 轮播 / 设置）；
 * 子账号管理、操作审计、服务器监控为主账号独占，不在矩阵中开放勾选。
 * 本模块只负责矩阵的 HTML 生成与读取，落库经 api/users.js。
 */
import { escapeHtml } from '../core/dom.js';
import { CAPABILITIES, DEFAULT_SUB_CAPABILITIES } from '../core/auth.js';

/** 可授予子账号的能力项（主账号独占项不在此列） */
export const GRANTABLE = ['products:write', 'slides:write', 'settings:write'];

/**
 * 权限矩阵复选框组 HTML。
 * @param {string[]} selected  已选能力
 * @param {string} group       同组标识（便于读取时定位容器）
 */
export function permMatrixHtml(selected = [], group = 'perm') {
  const set = new Set(selected);
  return GRANTABLE.map((cap) => {
    const meta = CAPABILITIES[cap] || { label: cap };
    return `<label title="${escapeHtml(meta.desc || '')}">
      <input type="checkbox" data-perm="${escapeHtml(cap)}" data-group="${escapeHtml(group)}"${set.has(cap) ? ' checked' : ''}>
      ${escapeHtml(meta.label)}
    </label>`;
  }).join('');
}

/** 从容器读取勾选的能力数组 */
export function readPermMatrix(container, group = 'perm') {
  const boxes = container.querySelectorAll(`input[data-perm][data-group="${group}"]`);
  return [...boxes].filter((b) => b.checked).map((b) => b.dataset.perm);
}

/** 权限徽标展示（只读列表用） */
export function permTagsHtml(permissions) {
  const list = Array.isArray(permissions) && permissions.length ? permissions : DEFAULT_SUB_CAPABILITIES;
  return `<span class="perm-tags">${list
    .map((c) => `<span class="badge">${escapeHtml((CAPABILITIES[c] && CAPABILITIES[c].label) || c)}</span>`)
    .join('')}</span>`;
}
