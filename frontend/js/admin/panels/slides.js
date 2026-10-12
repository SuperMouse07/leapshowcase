/**
 * admin/panels/slides.js · 首页轮播管理面板（能力：slides:write）
 * ------------------------------------------------------------
 * 列表（缩略图 + alt + 排序 + 启停 + 删除）与新增（选图预览 → 提交）。
 * 排序通过交换两条记录的 sort 值实现（api/slides.swapSlides）。
 */
import { $, escapeHtml } from '../../core/dom.js';
import { fetchSlides, createSlide, updateSlide, deleteSlide, swapSlides } from '../../api/slides.js';
import { toastOk, toastErr } from '../../ui/toast.js';

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
let slides = [];
let pendingDataUrl = '';

export default {
  id: 'slidesPanel',
  nav: '♞ Home Carousel',
  capability: 'slides:write',
  panelClass: 'admin-slides',

  mount(host) {
    host.innerHTML = `
      <div class="panel-head">
        <h2>♞ Home Carousel</h2>
        <button class="btn btn-small btn-ghost" type="button" id="slidesRefreshBtn">Refresh ⟳</button>
      </div>
      <div class="slide-rows" id="slideRows"><p class="loading">Loading…</p></div>
      <form class="slide-add" id="slideAddForm">
        <input type="file" id="slideFile" accept="image/*" hidden>
        <button class="btn btn-small btn-ghost" type="button" id="slidePickBtn">Choose Image…</button>
        <img class="slide-preview hidden" id="slidePreview" alt="Slide preview">
        <input type="text" id="slideAlt" placeholder="Alt text (optional)">
        <button class="btn btn-small" type="submit" id="slideAddBtn" disabled>Add Slide</button>
      </form>`;

    $('#slidesRefreshBtn', host).addEventListener('click', () => this.load());
    $('#slidePickBtn', host).addEventListener('click', () => $('#slideFile', host).click());
    $('#slideFile', host).addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      if (file.size > MAX_IMAGE_SIZE) return toastErr(`"${file.name}" is too large (max 8MB).`);
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
        toastOk('Slide added.');
        await this.load();
      } catch (err) {
        toastErr(`Add slide failed: ${err.message}`);
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
          if (!confirm('Delete this slide?')) return;
          await deleteSlide(s.id);
          toastOk('Slide deleted.');
        }
        await this.load();
      } catch (err) {
        toastErr(`Slide update failed: ${err.message}`);
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
      } catch (err) {
        toastErr(`Slide update failed: ${err.message}`);
      }
    });

    this.load();
  },

  async load() {
    const box = $('#slideRows');
    try {
      slides = await fetchSlides({ all: true });
    } catch (err) {
      box.innerHTML = `<p class="loading">Failed to load: ${escapeHtml(err.message)}</p>`;
      return;
    }
    if (!slides.length) {
      box.innerHTML = '<p class="loading">No slides yet — add the first hero image below.</p>';
      return;
    }
    box.innerHTML = slides
      .map(
        (s, i) => `<div class="slide-row ${s.enabled ? '' : 'disabled'}" data-id="${escapeHtml(s.id)}">
          <img class="slide-thumb" src="${escapeHtml(s.image)}" alt="">
          <input type="text" class="slide-alt" value="${escapeHtml(s.alt || '')}" placeholder="Alt text…">
          <span class="slide-idx">#${i + 1}</span>
          <div class="slide-ops">
            <button type="button" data-act="up" title="Move up" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" data-act="down" title="Move down" ${i === slides.length - 1 ? 'disabled' : ''}>↓</button>
            <button type="button" data-act="toggle">${s.enabled ? 'Disable' : 'Enable'}</button>
            <button type="button" data-act="del" class="danger">Delete</button>
          </div>
        </div>`
      )
      .join('');
  },
};
