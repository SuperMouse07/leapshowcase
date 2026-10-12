/**
 * core/auth.js · 会话编排与权限模型（ADR-0005 主账号/子账号体系）
 * ------------------------------------------------------------
 * 在 core/session.js（纯存储）之上提供：
 *   - 登录/登出编排（含审计上报、会话失效广播）；
 *   - 能力(capability)模型：主账号拥有全部能力并独占子账号管理与审计查看；
 *     子账号按权限矩阵授权，默认仅商品 CRUD；
 *   - 向后兼容：旧基线仍以固定角色(admin/tester/demo)返回时，按映射推导能力，
 *     使前端在后端权限矩阵落地前后均可运行。
 */
import * as session from './session.js';
import * as sessionApi from '../api/session.js';
import { reportActivity } from '../api/activity.js';
import { emit, EVENTS } from './events.js';

/* ---------- 能力清单（权限矩阵的能力项） ---------- */
export const CAPABILITIES = {
  'products:write': { label: '商品管理', desc: '新增 / 编辑 / 删除商品与标签' },
  'slides:write': { label: '轮播管理', desc: '首页轮播图增删改与排序' },
  'settings:write': { label: '全站设置', desc: '站点标题、LOGO、公告、联系方式、主推款' },
  'accounts:manage': { label: '子账号管理', desc: '创建、授权、删除子账号（主账号独占）' },
  'audit:view': { label: '操作审计', desc: '查看全部账号操作记录并按时间/用户筛选' },
  'stats:view': { label: '服务器监控', desc: '数据库与图片存储统计' },
};

/** 主账号拥有的全部能力 */
export const ALL_CAPABILITIES = Object.keys(CAPABILITIES);

/** 子账号默认能力：仅商品 CRUD（ADR-0005 决策 3） */
export const DEFAULT_SUB_CAPABILITIES = ['products:write'];

/** 旧固定角色 → 能力集合的兼容映射（后端权限矩阵落地前的回退） */
const ROLE_FALLBACK = {
  admin: ALL_CAPABILITIES,
  tester: ['products:write', 'slides:write', 'settings:write'],
  demo: [],
};

/* ---------- 会话存储透传 ---------- */
export const getToken = session.getToken;
export const getUser = session.getUser;
export const clearSession = session.clearSession;
export const hasSession = session.hasSession;

/* ---------- 用户判定 ---------- */

/** 是否主账号：显式 account_type='main' / 用户名 P001 / 旧基线 admin 角色 */
export function isMainAccount(user = session.getUser()) {
  if (!user) return false;
  if (user.account_type) return user.account_type === 'main';
  return user.role === 'admin' || user.username === 'P001';
}

/**
 * 解析用户能力集合。
 * 优先使用后端下发的 permissions（权限矩阵）；缺失时按角色回退推导。
 */
export function resolveCapabilities(user = session.getUser()) {
  if (!user) return [];
  if (isMainAccount(user)) return [...ALL_CAPABILITIES];
  if (Array.isArray(user.permissions)) {
    return user.permissions.filter((c) => c in CAPABILITIES);
  }
  return ROLE_FALLBACK[user.role] || [];
}

/** 当前用户是否具备某能力 */
export function can(capability, user = session.getUser()) {
  return resolveCapabilities(user).includes(capability);
}

/** 是否为“可进入后台的编辑者”：具备任一写能力或为主账号 */
export function isEditor(user = session.getUser()) {
  if (!user) return false;
  if (isMainAccount(user)) return true;
  return resolveCapabilities(user).some((c) => c.endsWith(':write'));
}

/** 是否需在首次登录后强制改密（ADR-0005 / tasks E7） */
export function mustChangePassword(user = session.getUser()) {
  return Boolean(user && user.must_change_password);
}

/** 角色/账号类型的展示标签 */
export function accountLabel(user = session.getUser()) {
  if (!user) return '';
  if (isMainAccount(user)) return '主账号';
  return '子账号';
}

/* ---------- 登录 / 登出编排 ---------- */

/**
 * 登录并保存会话；成功后上报登录审计事件（时间戳由后端截取）。
 * @returns {Promise<object>} 归一化后的 user
 */
export async function signIn(username, password) {
  const { token, user } = await sessionApi.login(username, password);
  session.saveSession(token, user);
  emit(EVENTS.sessionChanged, { user });
  reportActivity('login', `用户 ${user?.username || username} 登录`);
  return user;
}

/**
 * 登出：上报退出审计（用于推导会话时长）→ 调用预留 logout 端点 → 清理本地会话。
 * 后端 logout 未实现时静默降级，仍完成本地清理。
 */
export async function signOut({ redirect = null } = {}) {
  const user = session.getUser();
  reportActivity('logout', `用户 ${user?.username || ''} 退出`);
  try {
    await sessionApi.logout();
  } catch {
    /* 预留端点未实现：忽略 */
  }
  session.clearSession();
  emit(EVENTS.sessionChanged, { user: null });
  if (redirect) window.location.replace(redirect);
}

/** 拉取并刷新当前用户资料（/auth/me），失败时清理会话并抛出 */
export async function refreshCurrentUser() {
  const user = await sessionApi.fetchMe();
  session.saveUser(user);
  return user;
}

/** 修改本人密码（首登强制改密复用） */
export async function changePassword(currentPassword, newPassword) {
  await sessionApi.changePassword(currentPassword, newPassword);
  const user = session.getUser();
  if (user) session.saveUser({ ...user, must_change_password: false });
}

export { sessionApi };
