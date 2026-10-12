/**
 * core/events.js · 轻量事件总线与跨标签页广播
 * ------------------------------------------------------------
 * - bus：进程内发布/订阅，用于 http 401 → 登录态失效、购物车变更等解耦通知；
 * - BroadcastChannel：后台保存设置后通知已打开的前台标签页即时同步（无则静默降级）。
 */
import { SITE } from './config.js';

const handlers = new Map();

/** 订阅事件，返回取消订阅函数 */
export function on(event, handler) {
  if (!handlers.has(event)) handlers.set(event, new Set());
  handlers.get(event).add(handler);
  return () => off(event, handler);
}

export function off(event, handler) {
  handlers.get(event)?.delete(handler);
}

export function emit(event, payload) {
  handlers.get(event)?.forEach((fn) => {
    try {
      fn(payload);
    } catch (err) {
      console.error(`[bus] handler for "${event}" failed:`, err);
    }
  });
}

/** 全站约定事件名 */
export const EVENTS = {
  sessionExpired: 'session:expired',
  sessionChanged: 'session:changed',
  cartChanged: 'cart:changed',
  settingsChanged: 'settings:changed',
};

/* ---------- 跨标签页广播（设置同步） ---------- */
let channel = null;
try {
  channel = new BroadcastChannel(SITE.settingsChannel);
  channel.onmessage = (e) => {
    if (e.data && e.data.type === 'settings') emit(EVENTS.settingsChanged, e.data);
  };
} catch {
  /* 不支持 BroadcastChannel 的环境静默降级 */
}

/** 向其他标签页广播设置已变更 */
export function broadcastSettings() {
  try {
    channel?.postMessage({ type: 'settings' });
  } catch {
    /* noop */
  }
}
