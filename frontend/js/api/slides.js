/**
 * api/slides.js · 首页轮播数据访问层
 * ------------------------------------------------------------
 * 公开默认仅返回启用项；editor 携 Token 且 all=1 可见全部（含停用）。
 */
import { http } from '../core/http.js';
import { buildPath } from './endpoints.js';

/**
 * 轮播列表。
 * @param {object} opts
 * @param {boolean} opts.all  是否包含停用项（需 editor 权限）
 */
export async function fetchSlides({ all = false } = {}) {
  const data = await http.get('/slides', { auth: all, params: all ? { all: 1 } : {} });
  return data.slides || [];
}

export async function createSlide(body) {
  return http.post('/slides', body);
}

export async function updateSlide(id, body) {
  return http.put(buildPath('updateSlide', { id }), body);
}

export async function deleteSlide(id) {
  return http.del(buildPath('deleteSlide', { id }));
}

/** 交换两张轮播的 sort 值（逐条 PUT） */
export async function swapSlides(a, b) {
  const sortA = a.sort ?? 0;
  const sortB = b.sort ?? 0;
  await updateSlide(a.id, { sort: sortB });
  await updateSlide(b.id, { sort: sortA });
}
