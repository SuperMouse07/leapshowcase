/**
 * core/config.js · 运行时配置与 API 基址探测
 * ------------------------------------------------------------
 * 单镜像同源部署时直连 /api；同源不可达（本地前后端分离开发）时
 * 回退到独立后端端口。探测结果模块级缓存，全站仅探测一次。
 */

/** 独立开发后端端口（同源 /api/health 不通时回退） */
const DEV_BACKEND_PORT = 3000;

let resolvedBase = null;

/** 同源 /api 是否可用；不可用则回退 hostname:3000/api。结果缓存。 */
export async function discoverApiBase() {
  if (resolvedBase) return resolvedBase;
  try {
    const res = await fetch('/api/health');
    if (res.ok) {
      resolvedBase = '/api';
      return resolvedBase;
    }
  } catch {
    /* 同源不可达 → 回退独立后端 */
  }
  resolvedBase = `${location.protocol}//${location.hostname}:${DEV_BACKEND_PORT}/api`;
  return resolvedBase;
}

/** 同步读取已探测基址（未探测时假定同源 /api） */
export function getApiBase() {
  return resolvedBase || '/api';
}

/** 允许覆盖基址（测试或特殊部署） */
export function setApiBase(base) {
  resolvedBase = base;
}

/** 站点级静态常量 */
export const SITE = {
  defaultLogo: 'assets/logo.svg',
  placeholder: 'assets/placeholder.svg',
  cartKey: 'leap_cart_v1',
  settingsChannel: 'leap_settings',
  tokenKey: 'lc_token',
  userKey: 'lc_user',
};
