/**
 * api/activity.js · 操作审计数据访问层（ADR-0005）
 * ------------------------------------------------------------
 * 记录与查询 activity_logs。展示最小必要字段：操作类型 / 时间 / 操作人用户名。
 * 登录、退出成对记录时间戳（会话时长由二者推导，不单独存储）；
 * 商品增改删记录时间点与操作人；轮播/设置变更沿用基线摘要。
 * 查看为主账号专属，支持按时间/用户筛选。
 */
import { http } from '../core/http.js';
import { getToken } from '../core/session.js';

/** 审计操作类型词表（对齐后端 action 取值；含新站扩展枚举） */
export const AUDIT_ACTIONS = {
  login: { label: '登录', kind: 'login' },
  logout: { label: '退出登录', kind: 'logout' },
  product_create: { label: '新建商品', kind: 'create' },
  product_update: { label: '更新商品', kind: 'update' },
  product_delete: { label: '删除商品', kind: 'delete' },
  slide_change: { label: '轮播变更', kind: 'update' },
  settings_change: { label: '设置变更', kind: 'update' },
  account_create: { label: '新建子账号', kind: 'create' },
  account_delete: { label: '删除子账号', kind: 'delete' },
  permission_change: { label: '权限变更', kind: 'update' },
  page_view: { label: '页面浏览', kind: 'view' },
  add_to_cart: { label: '加入清单', kind: 'view' },
};

/** 取操作类型的展示元数据（未知类型回退为原始值） */
export function actionMeta(action) {
  return AUDIT_ACTIONS[action] || { label: action || '—', kind: 'other' };
}

/**
 * 上报行为日志（仅登录用户；失败静默，不影响体验）。
 * @param {string} action  操作类型（见 AUDIT_ACTIONS）
 * @param {string} detail  附加描述
 * @param {object} target  可选 { target_type, target_id }
 */
export async function reportActivity(action, detail = '', target = {}) {
  if (!getToken()) return; // 未登录不上报
  try {
    await http.post('/activity', { action, detail, ...target });
  } catch {
    /* 静默：审计上报失败不阻塞交互 */
  }
}

/**
 * 查询审计日志（主账号专属）。
 * @param {object} q
 * @param {number} q.limit    默认 100，上限 500
 * @param {number|string} q.user_id  按用户过滤
 * @param {string} q.action   按操作类型过滤（预留：后端未支持时前端本地过滤）
 * @param {string} q.from     起始时间（预留）
 * @param {string} q.to       结束时间（预留）
 */
export async function fetchActivity({ limit = 100, user_id, action, from, to } = {}) {
  const data = await http.get('/activity', { params: { limit, user_id } });
  let logs = data.logs || data.activities || [];
  // 时间/类型筛选：后端未支持相应参数时在前端本地收敛，保证 UI 一致
  if (action) logs = logs.filter((l) => l.action === action);
  if (from) {
    const t = new Date(from).getTime();
    logs = logs.filter((l) => !l.created_at || new Date(l.created_at).getTime() >= t);
  }
  if (to) {
    const t = new Date(to).getTime();
    logs = logs.filter((l) => !l.created_at || new Date(l.created_at).getTime() <= t);
  }
  return logs;
}
