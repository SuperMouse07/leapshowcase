/**
 * api/endpoints.js · 接口契约映射
 * ------------------------------------------------------------
 * 单一事实源：集中声明前端依赖的所有后端端点，严格对齐
 * specs/contracts/README.md（旧生产基线 v0.2）与 ADR-0004/0005 规划字段。
 *
 * `status` 标注契约成熟度，供联调与降级判断：
 *   - stable   ：旧生产基线已实现，可直接调用；
 *   - reserved ：新站规划、后端尚未实现，前端已预留调用入口与数据结构，
 *                失败时（404/501）由 api 层返回空值 / 抛出 notImplemented，
 *                保证前后端联调时的兼容性。
 *
 * 正式 openapi.yaml 将在产品决策与 P0/P1 修复完成后冻结（tasks D7）。
 */

export const ENDPOINTS = {
  // ---- 认证与会话 ----
  login: { method: 'POST', path: '/auth/login', status: 'stable' },
  me: { method: 'GET', path: '/auth/me', status: 'stable' },
  changePassword: { method: 'PUT', path: '/auth/password', status: 'stable' },
  logout: { method: 'POST', path: '/auth/logout', status: 'reserved' },
  createAccount: { method: 'POST', path: '/auth/register', status: 'stable' },

  // ---- 账号（子账号体系，ADR-0005） ----
  listUsers: { method: 'GET', path: '/users', status: 'stable' },
  deleteUser: { method: 'DELETE', path: '/users/:id', status: 'stable' },
  resetPassword: { method: 'PUT', path: '/users/:id/password', status: 'stable' },
  // 子账号权限矩阵写入：新站规划（旧基线以固定角色注册，无按账号权限）
  updateUserPermissions: { method: 'PUT', path: '/users/:id/permissions', status: 'reserved' },

  // ---- 审计（activity_logs，ADR-0005 增强） ----
  reportActivity: { method: 'POST', path: '/activity', status: 'stable' },
  listActivity: { method: 'GET', path: '/activity', status: 'stable' },

  // ---- 商品（含 tags 标签数组，ADR-0004） ----
  listProducts: { method: 'GET', path: '/products', status: 'stable' },
  getProduct: { method: 'GET', path: '/products/:id', status: 'stable' },
  productStorage: { method: 'GET', path: '/products/:id/storage', status: 'stable' },
  productsStorageBulk: { method: 'GET', path: '/products/storage', status: 'stable' },
  createProduct: { method: 'POST', path: '/products', status: 'stable' },
  updateProduct: { method: 'PUT', path: '/products/:id', status: 'stable' },
  deleteProduct: { method: 'DELETE', path: '/products/:id', status: 'stable' },

  // ---- 轮播 ----
  listSlides: { method: 'GET', path: '/slides', status: 'stable' },
  createSlide: { method: 'POST', path: '/slides', status: 'stable' },
  updateSlide: { method: 'PUT', path: '/slides/:id', status: 'stable' },
  deleteSlide: { method: 'DELETE', path: '/slides/:id', status: 'stable' },

  // ---- 全站设置（含 hero_products / 受控标签词表 product_tags） ----
  getSettings: { method: 'GET', path: '/settings', status: 'stable' },
  updateSetting: { method: 'PUT', path: '/settings', status: 'stable' },
  uploadLogo: { method: 'POST', path: '/settings/logo', status: 'stable' },

  // ---- 运维 ----
  storageStats: { method: 'GET', path: '/stats/storage', status: 'stable' },
  health: { method: 'GET', path: '/health', status: 'stable' },
};

/** 用参数替换 `:name` 占位符，生成实际路径 */
export function buildPath(key, params = {}) {
  let path = ENDPOINTS[key].path;
  for (const [k, v] of Object.entries(params)) {
    path = path.replace(`:${k}`, encodeURIComponent(v));
  }
  return path;
}

/** 该端点是否为“后端尚未实现”的预留契约 */
export const isReserved = (key) => ENDPOINTS[key]?.status === 'reserved';
