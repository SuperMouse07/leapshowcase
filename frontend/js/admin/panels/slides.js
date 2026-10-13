/**
 * admin/panels/slides.js · 首页轮播管理面板（能力：slides:write）
 * ------------------------------------------------------------
 * 列表（缩略图 + alt + 排序 + 启停 + 删除）与新增（选图预览 → 提交）。
 * 排序通过交换两条记录的 sort 值实现（api/slides.swapSlides）。
 */
import { $, escapeHtml } from '../../core/dom.js';
import { fetchSlides, createSlide, updateSlide, deleteSlide, swapSlides } from '../../api/slides.js';
import { toastOk, toastErr } from '../../ui/toast.js';
import { confirmDialog } from '../../ui/dialog.js';

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
let slides = [];
let pendingDataUrl = '';

export default {
  id: 'slidesPanel',
  nav: '♞ 首页轮播',
  capability: 'slides:write',
  panelClass: 'admin-slides',

  mount(host) {
    host.innerHTML = `
      <div class="panel-head">
        <h2>♞ 首页轮播</h2>
        <button class="btn btn-small btn-ghost" type="button" id="slidesRefreshBtn">刷新列表 ⟳</button>
      </div>
      <p class="panel-hint">按列表顺序在首页轮播展示；停用的图片保留但不在前台显示。修改图片说明后点击输入框外即自动保存。</p>
      <div class="slide-rows" id="slideRows"><p class="loading">加载中…</p></div>
      <form class="slide-add" id="slideAddForm">
        <input type="file" id="slideFile" accept="image/*" hidden>
        <button class="btn btn-small btn-ghost" type="button" id="slidePickBtn">选择图片…</button>
        <img class="slide-preview hidden" id="slidePreview" alt="轮播图预览">
        <input type="text" id="slideAlt" placeholder="图片说明（alt，选填，用于无障碍与 SEO）">
        <button class="btn btn-small" type="submit" id="slideAddBtn" disabled>添加轮播图</button>
      </form>`;

    $('#slidesRefreshBtn', host).addEventListener('click', () => this.load());
    $('#slidePickBtn', host).addEventListener('click', () => $('#slideFile', host).click());
    $('#slideFile', host).addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      if (file.size > MAX_IMAGE_SIZE) return toastErr(`「${file.name}」超过 8MB 上限。`);
      const reader = new FileReader();
      reader.onload = () => {
        pendingDataUrl = reader.result;
        const prev = $('#slidePreview', host);
        prev.src = pendingDataUrl;
        prev.classList.remove('hidden');
        $('#slideAddBtn', host).disabled = false;
      };
      reader.readAsDataURL(file);
    });
    $('#slideAddForm', host).addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!pendingDataUrl) return;
      const btn = $('#slideAddBtn', host);
      btn.disabled = true;
      try {
        await createSlide({ image: pendingDataUrl, alt: $('#slideAlt', host).value.trim() });
        pendingDataUrl = '';
        $('#slideAlt', host).value = '';
        $('#slidePreview', host).classList.add('hidden');
        toastOk('轮播图已添加。');
        await this.load();
      } catch (err) {
        toastErr(`添加失败：${err.message}`);
        btn.disabled = false;
      }
    });

    $('#slideRows', host).addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const row = btn.closest('.slide-row');
      const idx = slides.findIndex((s) => String(s.id) === row.dataset.id);
      const s = slides[idx];
      if (!s) return;
      try {
        if (btn.dataset.act === 'up') await swapSlides(s, slides[idx - 1]);
        else if (btn.dataset.act === 'down') await swapSlides(s, slides[idx + 1]);
        else if (btn.dataset.act === 'toggle') await updateSlide(s.id, { enabled: s.enabled ? 0 : 1 });
        else if (btn.dataset.act === 'del') {
          const ok = await confirmDialog({ title: '删除轮播图', message: '确定从首页轮播中移除这张图片吗？此操作不可撤销。', confirmText: '确认删除', danger: true });
          if (!ok) return;
          await deleteSlide(s.id);
          toastOk('轮播图已删除。');
        }
        await this.load();
      } catch (err) {
        toastErr(`轮播更新失败：${err.message}`);
      }
    });

    // alt 失焦即保存
    $('#slideRows', host).addEventListener('change', async (e) => {
      if (!e.target.classList.contains('slide-alt')) return;
      const row = e.target.closest('.slide-row');
      const s = slides.find((x) => String(x.id) === row.dataset.id);
      if (!s || e.target.value === (s.alt || '')) return;
      try {
        await updateSlide(s.id, { alt: e.target.value });
        s.alt = e.target.value;
        toastOk('图片说明已保存。');
      } catch (err) {
        toastErr(`轮播更新失败：${err.message}`);
      }
    });

    this.load();
  },

  async load() {
    const box = $('#slideRows');
    if (box) box.innerHTML = Array(3).fill('<div class="skeleton-row" style="height:64px"></div>').join('');
    try {
      slides = await fetchSlides({ all: true });
    } catch (err) {
      box.innerHTML = `<p class="loading">加载失败：${escapeHtml(err.message)}</p>`;
      return;
    }
    if (!slides.length) {
      box.innerHTML = '<p class="loading">暂无轮播图——请在下方添加第一张首页大图。</p>';
      return;
    }
    box.innerHTML = slides
      .map(
        (s, i) => `<div class="slide-row ${s.enabled ? '' : 'disabled'}" data-id="${escapeHtml(s.id)}">
          <img class="slide-thumb" src="${escapeHtml(s.image)}" alt="">
          <input type="text" class="slide-alt" value="${escapeHtml(s.alt || '')}" placeholder="图片说明…（失焦自动保存）">
          <span class="slide-idx">#${i + 1}${s.enabled ? '' : ' · 已停用'}</span>
          <div class="slide-ops">
            <button type="button" data-act="up" title="上移" aria-label="上移" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" data-act="down" title="下移" aria-label="下移" ${i === slides.length - 1 ? 'disabled' : ''}>↓</button>
            <button type="button" data-act="toggle">${s.enabled ? '停用' : '启用'}</button>
            <button type="button" data-act="del" class="danger">删除</button>
          </div>
        </div>`
      )
      .join('');
  },
};
