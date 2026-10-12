/**
 * api/users.js · 账号管理数据访问层（主账号专属，ADR-0005）
 * ------------------------------------------------------------
 * 主账号 P001 独占子账号管理：列表、删除、重置密码、写入权限矩阵。
 * 权限矩阵写入(/users/:id/permissions)为预留契约，旧基线未实现时
 * 抛出 notImplemented，由后台 UI 提示“后端未就绪”，不崩溃。
 */
import { http, ApiError } from '../core/http.js';
import { buildPath } from './endpoints.js';

/** 归一化账号对象：补齐权限矩阵与账号类型 */
export function normalizeUser(u = {}) {
  return {
    ...u,
    // 主账号判定：显式 account_type='main' 或旧基线 role='admin'
    account_type: u.account_type || (u.role === 'admin' ? 'main' : 'sub'),
    permissions: Array.isArray(u.permissions) ? u.permissions : null,
    must_change_password: Boolean(u.must_change_password),
  };
}

/** 账号列表（admin/主账号） */
export async function fetchUsers() {
  const data = await http.get('/users');
  return (data.users || []).map(normalizeUser);
}

/** 删除账号（不可删主账号/admin） */
export async function deleteUser(id) {
  return http.del(buildPath('deleteUser', { id }));
}

/** 重置指定账号密码（admin） */
export async function resetUserPassword(id, password) {
  return http.put(buildPath('resetPassword', { id }), { password });
}

/**
 * 写入子账号权限矩阵（预留契约）。
 * @returns {Promise<{ok:boolean, notImplemented?:boolean}>}
 */
export async function updateUserPermissions(id, permissions) {
  try {
    await http.put(buildPath('updateUserPermissions', { id }), { permissions });
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError && err.notImplemented) return { ok: false, notImplemented: true };
    throw err;
  }
}
