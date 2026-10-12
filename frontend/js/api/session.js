/**
 * api/session.js · 认证与会话数据访问层
 * ------------------------------------------------------------
 * 覆盖登录、当前用户、改密、登出与账号创建。
 * 登出(/auth/logout)为 ADR-0005 规划端点，旧基线可能未实现，
 * 失败时按 notImplemented 静默处理，不阻塞前端清理会话。
 */
import { http, ApiError } from '../core/http.js';
import { buildPath } from './endpoints.js';

/** 登录：仅用户名 + 密码（ADR-0005，登录信息最小化） */
export async function login(username, password) {
  return http.post('/auth/login', { username, password }, { auth: false });
}

/** 当前 Token 对应的用户信息 */
export async function fetchMe() {
  const data = await http.get('/auth/me');
  return data.user || data;
}

/** 修改本人密码（首登强制改密复用此接口） */
export async function changePassword(currentPassword, newPassword) {
  // 兼容旧基线字段命名：优先新契约字段，回退旧字段
  return http.put('/auth/password', {
    currentPassword,
    newPassword,
    current_password: currentPassword,
    new_password: newPassword,
  });
}

/**
 * 登出：上报登出事件用于审计（会话时长由登录/退出时间戳推导，ADR-0005）。
 * 端点为预留契约，后端未实现时静默降级。
 */
export async function logout() {
  try {
    return await http.post('/auth/logout', {});
  } catch (err) {
    if (err instanceof ApiError && err.notImplemented) return { skipped: true };
    throw err;
  }
}

/**
 * 创建账号（主账号专属）。
 * 旧基线：POST /auth/register 创建 tester/demo；
 * 新站：附 account_type='sub' 与 permissions 权限矩阵（ADR-0005），
 *      后端未识别的新字段应被忽略，保持向后兼容。
 */
export async function createAccount({ username, password, display_name, role, permissions, account_type }) {
  return http.post('/auth/register', {
    username,
    password,
    display_name,
    role,
    // 新站规划字段（预留）：后端未实现时忽略
    permissions,
    account_type,
  });
}

export { buildPath };
