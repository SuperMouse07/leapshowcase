/**
 * core/http.js · 统一 API 客户端
 * ------------------------------------------------------------
 * 全站唯一的网络出口，职责（对齐验收标准）：
 *   1. 自动探测并拼接后端基址（见 core/config.js）；
 *   2. 自动注入 `Authorization: Bearer <token>` 鉴权头（可显式关闭）；
 *   3. 统一错误处理：非 2xx 抛出 ApiError（含 status / 后端 error 文案）；
 *   4. 401 自动广播会话失效事件，由页面决定跳转；
 *   5. 契约兼容：后端尚未实现的接口（tags / 子账号 / logout 等）
 *      统一走此处，调用方按 `notImplemented` 标记优雅降级（见 api/ 层）。
 */
import { discoverApiBase, getApiBase } from './config.js';
import { getToken } from './session.js';
import { emit, EVENTS } from './events.js';

/** 统一错误对象：携带 HTTP 状态码与后端返回的 error 文案 */
export class ApiError extends Error {
  constructor(message, { status = 0, data = null, notImplemented = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    /** 404/501：后端尚未实现该契约端点，调用方可据此静默降级 */
    this.notImplemented = notImplemented;
  }
}

/**
 * 底层请求。
 * @param {string} path   以 / 开头的接口路径（不含基址），如 `/products`
 * @param {object} opts
 * @param {string} opts.method    HTTP 方法，默认 GET
 * @param {*}      opts.body      请求体（对象自动 JSON 序列化）
 * @param {boolean} opts.auth      是否注入鉴权头，默认 true
 * @param {object} opts.headers    额外请求头
 * @param {object} opts.params     query 参数（对象 → URLSearchParams）
 * @param {AbortSignal} opts.signal
 * @returns {Promise<any>} 解析后的 JSON（无内容时返回 {}）
 */
export async function request(path, opts = {}) {
  const { method = 'GET', body, auth = true, headers = {}, params, signal } = opts;

  const base = (await discoverApiBase()) || getApiBase();
  let url = `${base}${path}`;
  if (params) {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') usp.set(k, v);
    }
    const qs = usp.toString();
    if (qs) url += `?${qs}`;
  }

  const finalHeaders = { ...headers };
  let payload;
  if (body !== undefined) {
    // 已序列化的字符串（如超大 JSON）直接透传，否则序列化对象
    payload = typeof body === 'string' ? body : JSON.stringify(body);
    if (!finalHeaders['Content-Type']) finalHeaders['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (auth && token) finalHeaders.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, { method, headers: finalHeaders, body: payload, signal });
  } catch (networkErr) {
    throw new ApiError('Network unreachable', { status: 0, data: null });
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    if (res.status === 401) emit(EVENTS.sessionExpired, { path });
    const notImplemented = res.status === 404 || res.status === 501;
    throw new ApiError(message, { status: res.status, data, notImplemented });
  }
  return data;
}

/* ---------- 便捷方法 ---------- */
export const http = {
  get: (path, opts = {}) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts = {}) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts = {}) => request(path, { ...opts, method: 'PUT', body }),
  del: (path, opts = {}) => request(path, { ...opts, method: 'DELETE' }),
};

export default http;
