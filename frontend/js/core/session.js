/**
 * core/session.js · 会话存储（Token / User）
 * ------------------------------------------------------------
 * 仅负责凭据的读写，不含权限判断（见 core/auth.js）。
 * localStorage 不可用（隐私模式）时自动降级为内存态，保证前台可公开浏览。
 */
import { SITE } from './config.js';

let memoryToken = '';
let memoryUser = null;
let storageOk = true;

try {
  const probe = '__leap_probe__';
  localStorage.setItem(probe, '1');
  localStorage.removeItem(probe);
} catch {
  storageOk = false;
}

export function getToken() {
  if (!storageOk) return memoryToken;
  try {
    return localStorage.getItem(SITE.tokenKey) || '';
  } catch {
    return memoryToken;
  }
}

export function getUser() {
  if (!storageOk) return memoryUser;
  try {
    return JSON.parse(localStorage.getItem(SITE.userKey) || 'null');
  } catch {
    return null;
  }
}

export function saveSession(token, user) {
  memoryToken = token || '';
  memoryUser = user || null;
  if (!storageOk) return;
  try {
    localStorage.setItem(SITE.tokenKey, memoryToken);
    localStorage.setItem(SITE.userKey, JSON.stringify(memoryUser));
  } catch {
    /* 写入失败 → 保持内存态 */
  }
}

/** 仅更新缓存的用户对象（如首登改密后刷新资料） */
export function saveUser(user) {
  memoryUser = user || null;
  if (!storageOk) return;
  try {
    localStorage.setItem(SITE.userKey, JSON.stringify(memoryUser));
  } catch {
    /* noop */
  }
}

export function clearSession() {
  memoryToken = '';
  memoryUser = null;
  if (!storageOk) return;
  try {
    localStorage.removeItem(SITE.tokenKey);
    localStorage.removeItem(SITE.userKey);
  } catch {
    /* noop */
  }
}

export function hasSession() {
  return Boolean(getToken());
}
