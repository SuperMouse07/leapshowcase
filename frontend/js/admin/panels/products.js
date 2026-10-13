/**
 * admin/panels/products.js · 商品管理面板（能力：products:write）
 * ------------------------------------------------------------
 * 左：新建/编辑表单（名称、分类、价格、库存、主推、描述、卖点、双图集）；
 * 右：商品列表（封面、价格、库存、图数、存储明细 tooltip、主推、↑↓ 排序、增删改）
 *    + 分类筛选 + 分页。
 * 主推款（settings.hero_products）在表单勾选与列表“设为主推/取消主推”双入口联动。
 * 商品增改删上报审计（ADR-0005：记录操作人与时间点）。
 * 双价 / 起订量 / 商品标签已整体下线（ADR-0008），价格仅使用单一 price。
 */
import { $, escapeHtml, formatBytes } from '../../core/dom.js';
import { SITE } from '../../core/config.js';
import { CATS } from '../../data/content.js';
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchBulkStorage,
} from '../../api/products.js';
import { fetchSettings, saveHeroProducts } from '../../api/settings.js';
import { reportActivity } from '../../api/activity.js';
import { toastOk, toastErr } from '../../ui/toast.js';
import { catLabel } from '../../ui/cards.js';
import { confirmDialog } from '../../ui/dialog.js';

const KNOWN_CATS = CATS.map((c) => c.id);
const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_TOTAL_IMAGE_SIZE = 50 * 1024 * 1024;
const MAX_BODY_CHARS = 75 * 1024 * 1024;
const COLS = 11;

let pendingImages = [];
let pendingDetails = [];
let heroIds = [];
let currentPage = 1;
let cachedProducts = [];

/* dataURL → 估算二进制字节数（服务器 URL 不计入提交体） */
function dataUrlBytes(src) {
  if (typeof src !== 'string' || !src.startsWith('data:')) return 0;
  const i = src.indexOf(',');
  return i < 0 ? 0 : Math.ceil(((src.length - i - 1) * 3) / 4);
}
function pendingImageBytes() {
  return [...pendingImages, ...pendingDetails].reduce((s, src) => s + dataUrlBytes(src), 0);
}

export default {
  id: 'productsGrid',
  nav: '♜ 商品管理',
  capability: 'products:write',
  panelClass: '',

  mount(host) {
    host.classList.add('admin-products-host');
    host.innerHTML = `<div class="admin-grid">
      <form class="panel" id="productForm">
        <h2 id="formTitle">♟ 新建商品</h2>
        <input type="hidden" id="editId">
        <label class="field">商品名称 *
          <input type="text" id="pName" placeholder="例如：Tournament Pro 专业比赛棋钟" required>
        </label>
        <div class="form-row">
          <label class="field">分类
            <select id="pCategory">
              ${CATS.map((c) => `<option value="${c.id}">${escapeHtml(c.label)}</option>`).join('')}
              <option value="__custom">自定义分类…</option>
            </select>
          </label>
          <label class="field">价格（美元）
            <input type="number" id="pPrice" min="0" step="0.01" placeholder="例如：49.90">
          </label>
          <label class="field">库存（件）
            <input type="number" id="pStock" min="0" step="1" placeholder="例如：100">
          </label>
        </div>
        <label class="field hidden" id="customCatRow">自定义分类 ID
          <input type="text" id="pCustomCat" placeholder="仅限小写英文与连字符，例如：chess-set">
        </label>
        <div class="form-row form-row-ops">
          <label class="check-label">设为首页主推
            <input type="checkbox" id="pHero">
            <span class="field-hint">勾选后加入首页主推商品；顺序可在右侧列表用 ↑↓ 调整</span>
          </label>
        </div>
        <label class="field">简介
          <textarea id="pDesc" rows="3" placeholder="一句话概括商品亮点（显示在前台商品卡片与详情页）"></textarea>
        </label>
        <label class="field">卖点（商品信息）— 每行一条
          <textarea id="pInfo" rows="3" placeholder="例如：&#10;专业比赛级计时精度&#10;双模式切换，操作简单"></textarea>
        </label>
        <label class="field">主图（图集）— 最多 ${MAX_IMAGES} 张，第 1 张为封面
          <input type="file" id="pImages" accept="image/*" multiple hidden>
        </label>
        <div class="img-gallery" id="imgGallery"></div>
        <label class="field">详情图 — 显示在主图下方（可选）
          <input type="file" id="pDetails" accept="image/*" multiple hidden>
        </label>
        <div class="img-gallery" id="detailGallery"></div>
        <p class="form-msg" id="formMsg"></p>
        <div class="form-actions">
          <button class="btn" type="submit" id="submitBtn"><span>保存商品</span></button>
          <button class="btn btn-ghost" type="button" id="cancelEdit"><span>取消编辑</span></button>
        </div>
      </form>

      <div class="panel">
        <div class="panel-head">
          <h2>♜ 商品列表 <span class="count" id="productCount"></span></h2>
          <button class="btn btn-small btn-ghost" type="button" id="refreshBtn">刷新列表 ⟳</button>
        </div>
        <div class="list-toolbar">
          <label>分类
            <select id="listCatFilter">
              <option value="">全部</option>
              ${CATS.map((c) => `<option value="${c.id}">${escapeHtml(c.label)}</option>`).join('')}
            </select>
          </label>
          <label>每页
            <select id="listLimit">
              <option value="10">10</option>
              <option value="25" selected>25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </label>
          <div class="pager" id="listPager"></div>
        </div>
        <div class="table-wrap">
          <table class="admin-table">
            <thead><tr>
              <th>封面</th><th>名称</th><th>分类</th>
              <th class="th-num">价格</th><th class="th-num">库存</th>
              <th class="th-num">主图</th><th class="th-num">详情图</th>
              <th class="th-num">占用空间</th><th>主推</th><th>排序</th><th>操作</th>
            </tr></thead>
            <tbody id="productRows"><tr><td colspan="${COLS}" class="loading">加载中…</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>`;

    this.bindForm(host);
    this.bindList(host);
    this.renderGalleries();
    this.loadSettingsMeta();
    this.loadList();
  },

  /* ---------- 设置元数据（hero_products） ---------- */
  async loadSettingsMeta() {
    try {
      const s = await fetchSettings();
      heroIds = (s.hero_products || []).map(String);
    } catch {
      /* 保持默认空 */
    }
  },

  async saveHeroIds(newIds) {
    await saveHeroProducts(newIds);
    heroIds = newIds.map(String);
  },

  /* ---------- 表单 ---------- */
  bindForm(host) {
    const form = $('#productForm', host);
    $('#pCategory', host).addEventListener('change', () => this.syncCustomCat());
    $('#cancelEdit', host).addEventListener('click', () => this.resetForm());

    this.bindGallery(host, 'imgGallery', 'pImages', 'galleryAdd', () => pendingImages);
    this.bindGallery(host, 'detailGallery', 'pDetails', 'detailAdd', () => pendingDetails);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const category = $('#pCategory', host).value === '__custom' ? $('#pCustomCat', host).value.trim() : $('#pCategory', host).value;
      if (!category) return this.setMsg('请输入自定义分类 ID。', false);
      if (!pendingImages.length) return this.setMsg('请至少上传 1 张主图。', false);

      const editId = $('#editId', host).value;
      const body = {
        name: $('#pName', host).value,
        category,
        price: $('#pPrice', host).value || 0,
        stock: $('#pStock', host).value || 0,
        description: $('#pDesc', host).value,
        info: $('#pInfo', host).value.split('\n').map((s) => s.trim()).filter(Boolean),
        images: pendingImages,
        details: pendingDetails,
      };
      try {
        const payload = JSON.stringify(body);
        if (payload.length > MAX_BODY_CHARS) {
          return this.setMsg('图片总体积过大（每个商品上限约 50MB）。', false);
        }
        let savedId = editId;
        if (editId) {
          await updateProduct(editId, body);
          reportActivity('product_update', `更新商品 #${editId} ${body.name}`, { target_type: 'product', target_id: editId });
          this.setMsg(`商品 #${editId} 已更新 ✓`);
        } else {
          const { product } = await createProduct(body);
          savedId = String(product.id);
          reportActivity('product_create', `新建商品 #${savedId} ${product.name}`, { target_type: 'product', target_id: savedId });
          this.setMsg(`商品「${product.name}」已创建 ✓`);
        }
        // 主推款联动
        const wantHero = $('#pHero', host).checked;
        const inHero = heroIds.includes(String(savedId));
        if (wantHero && !inHero) await this.saveHeroIds([...heroIds, String(savedId)]);
        else if (!wantHero && inHero) await this.saveHeroIds(heroIds.filter((x) => x !== String(savedId)));

        this.resetForm();
        this.loadList();
      } catch (err) {
        this.setMsg(err.message, false);
      }
    });
  },

  setMsg(text, ok = true) {
    const msg = $('#formMsg');
    if (!msg) return;
    msg.textContent = text || '';
    msg.className = `form-msg ${text ? (ok ? 'ok' : 'err') : ''}`;
  },

  syncCustomCat() {
    $('#customCatRow').classList.toggle('hidden', $('#pCategory').value !== '__custom');
  },

  resetForm() {
    const form = $('#productForm');
    form.reset();
    form.classList.remove('is-editing');
    $('#editId').value = '';
    pendingImages = [];
    pendingDetails = [];
    this.renderGalleries();
    this.syncCustomCat();
    $('#formTitle').textContent = '♟ 新建商品';
    $('#submitBtn').innerHTML = '<span>保存商品</span>';
    this.setMsg('');
  },

  fillForm(p) {
    const form = $('#productForm');
    form.classList.add('is-editing');
    $('#editId').value = p.id;
    $('#pName').value = p.name;
    if (KNOWN_CATS.includes(p.category)) {
      $('#pCategory').value = p.category;
      $('#pCustomCat').value = '';
    } else {
      $('#pCategory').value = '__custom';
      $('#pCustomCat').value = p.category;
    }
    this.syncCustomCat();
    $('#pPrice').value = p.price;
    $('#pStock').value = p.stock ?? '';
    $('#pHero').checked = heroIds.includes(String(p.id));
    $('#pDesc').value = p.description || '';
    $('#pInfo').value = (p.info || []).join('\n');
    pendingImages = [...(p.images || [])];
    pendingDetails = [...(p.details || [])];
    this.renderGalleries();
    $('#formTitle').textContent = `♟ 编辑商品 #${p.id}`;
    $('#submitBtn').innerHTML = '<span>保存修改</span>';
    this.setMsg('');
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  /* ---------- 图集 ---------- */
  galleryHtml(list, galleryId, addId, label) {
    const items = list
      .map(
        (src, i) => `<div class="gallery-item">
          ${i === 0 && galleryId === 'imgGallery' ? '<span class="main-flag">封面</span>' : ''}
          <img src="${escapeHtml(src)}" alt="${label} ${i + 1}">
          <button class="rm-img" type="button" data-i="${i}" title="移除这张图片">×</button>
        </div>`
      )
      .join('');
    const addTile = list.length < MAX_IMAGES ? `<div class="gallery-add" id="${addId}" title="添加图片">＋</div>` : '';
    return `${items}${addTile}<span class="gallery-hint">${list.length}/${MAX_IMAGES}</span>`;
  },

  renderGalleries() {
    const g = $('#imgGallery');
    if (g) g.innerHTML = this.galleryHtml(pendingImages, 'imgGallery', 'galleryAdd', '主图');
    const d = $('#detailGallery');
    if (d) d.innerHTML = this.galleryHtml(pendingDetails, 'detailGallery', 'detailAdd', '详情图');
  },

  bindGallery(host, boxId, fileInputId, addId, getList) {
    $(`#${boxId}`, host).addEventListener('click', (e) => {
      if (e.target.closest(`#${addId}`)) {
        $(`#${fileInputId}`, host).click();
        return;
      }
      const rm = e.target.closest('.rm-img');
      if (rm) {
        getList().splice(Number(rm.dataset.i), 1);
        this.renderGalleries();
      }
    });
    $(`#${fileInputId}`, host).addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      e.target.value = '';
      const list = getList();
      for (const file of files) {
        if (list.length >= MAX_IMAGES) {
          this.setMsg(`每组最多 ${MAX_IMAGES} 张，多余文件已跳过。`, false);
          break;
        }
        if (file.size > MAX_IMAGE_SIZE) {
          this.setMsg(`「${file.name}」超过 8MB，已跳过。`, false);
          continue;
        }
        if (pendingImageBytes() + file.size > MAX_TOTAL_IMAGE_SIZE) {
          this.setMsg(`图片总量超过每个商品 50MB 上限，「${file.name}」已跳过。`, false);
          continue;
        }
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
        list.push(dataUrl);
      }
      this.renderGalleries();
      if (list.length) this.setMsg('图片已就绪，点击“保存”后上传至服务器。');
    });
  },

  /* ---------- 列表 ---------- */
  bindList(host) {
    $('#refreshBtn', host).addEventListener('click', () => this.loadList());
    $('#listLimit', host).addEventListener('change', () => {
      currentPage = 1;
      this.loadList();
    });
    $('#listCatFilter', host).addEventListener('change', () => {
      currentPage = 1;
      this.loadList();
    });
    $('#listPager', host).addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pg]');
      if (!btn || btn.disabled) return;
      currentPage += btn.dataset.pg === 'prev' ? -1 : 1;
      this.loadList();
    });
    $('#productRows', host).addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const id = String(btn.dataset.id);
      const product = cachedProducts.find((p) => String(p.id) === id);
      const act = btn.dataset.act;

      if (act === 'hero' || act === 'unhero') {
        try {
          await this.saveHeroIds(act === 'hero' ? [...new Set([...heroIds, id])] : heroIds.filter((x) => x !== id));
          await this.loadList();
        } catch (err) {
          toastErr(`主推设置失败：${err.message}`);
        }
        return;
      }
      if (act === 'move-up' || act === 'move-down') {
        if (!product) return;
        const idx = cachedProducts.indexOf(product);
        const swapIdx = act === 'move-up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= cachedProducts.length) return;
        const target = cachedProducts[swapIdx];
        const wA = product.sort_weight ?? idx + 1;
        const wB = target.sort_weight ?? swapIdx + 1;
        try {
          await updateProduct(product.id, { sort_weight: wB });
          await updateProduct(target.id, { sort_weight: wA });
          await this.loadList();
        } catch (err) {
          toastErr(`排序失败：${err.message}`);
        }
        return;
      }
      if (act === 'edit' && product) return this.fillForm(product);
      if (act === 'del' && product) {
        const ok = await confirmDialog({ title: '删除商品', message: `确定删除「${product.name}」吗？此操作不可撤销。`, confirmText: '确认删除', danger: true });
        if (!ok) return;
        try {
          await deleteProduct(product.id);
          reportActivity('product_delete', `删除商品 #${product.id} ${product.name}`, { target_type: 'product', target_id: product.id });
          toastOk('商品已删除。');
          this.loadList();
        } catch (err) {
          toastErr(`删除失败：${err.message}`);
        }
      }
    });
  },

  async loadList() {
    const tbody = $('#productRows');
    if (tbody) tbody.innerHTML = Array(5).fill(`<tr><td colspan="${COLS}"><div class="skeleton-row"></div></td></tr>`).join('');
    const limit = $('#listLimit').value;
    const catFilter = $('#listCatFilter').value;
    try {
      const { products, total, limit: pageSize } = await fetchProducts({ category: catFilter || undefined, limit: Number(limit), page: currentPage });
      cachedProducts = products;
      $('#productCount').textContent = `共 ${total} 件`;
      const totalPages = Math.max(1, Math.ceil(total / (pageSize || Number(limit))));
      $('#listPager').innerHTML = `
        <button data-pg="prev" ${currentPage <= 1 ? 'disabled' : ''}>← 上一页</button>
        <span class="pager-info">第 ${currentPage} / ${totalPages} 页</span>
        <button data-pg="next" ${currentPage >= totalPages ? 'disabled' : ''}>下一页 →</button>`;

      if (!products.length) {
        tbody.innerHTML = `<tr><td colspan="${COLS}" class="loading">暂无商品，请在左侧表单新建。</td></tr>`;
        return;
      }
      tbody.innerHTML = products
        .map((p, idx) => {
          const img = p.cover && p.cover !== SITE.placeholder ? p.cover : (p.images || [])[0] || '';
          const isHero = heroIds.includes(String(p.id));
          const heroCell = isHero
            ? `<span class="hero-flag" title="首页主推中">♕</span><button class="btn btn-small btn-ghost" data-act="unhero" data-id="${p.id}">取消主推</button>`
            : `<button class="btn btn-small btn-ghost" data-act="hero" data-id="${p.id}">设为主推</button>`;
          return `<tr>
            <td>${img ? `<img class="thumb" src="${escapeHtml(img)}" alt="">` : '<span class="thumb-ph">♟</span>'}</td>
            <td>${escapeHtml(p.name)}</td>
            <td>${escapeHtml(catLabel(p.category))}</td>
            <td class="td-num">$ ${Number(p.price).toFixed(2)}</td>
            <td class="td-num">${Number(p.stock) || 0}</td>
            <td class="td-num">${(p.images || []).length}</td>
            <td class="td-num">${(p.details || []).length}</td>
            <td class="td-num tip-cell" id="rowSize-${p.id}" data-tip="">…</td>
            <td class="td-hero">${heroCell}</td>
            <td><span class="sort-btns">
              <button data-act="move-up" data-id="${p.id}" title="上移" aria-label="上移" ${idx === 0 ? 'disabled' : ''}>↑</button>
              <button data-act="move-down" data-id="${p.id}" title="下移" aria-label="下移" ${idx === products.length - 1 ? 'disabled' : ''}>↓</button>
            </span></td>
            <td class="row-actions">
              <button class="btn btn-small btn-ghost" data-act="edit" data-id="${p.id}">编辑</button>
              <button class="btn btn-small btn-danger" data-act="del" data-id="${p.id}">删除</button>
            </td>
          </tr>`;
        })
        .join('');
      this.loadRowStorage(products);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="${COLS}" class="loading">加载失败：${escapeHtml(err.message)}</td></tr>`;
    }
  },

  async loadRowStorage(products) {
    // 单次批量请求取回本页全部商品的存储明细（替代旧版 N 路并发的 /products/:id/storage）
    let storage = null;
    try {
      storage = await fetchBulkStorage(products.map((p) => p.id));
    } catch {
      return; // 明细为辅助信息：失败时保留占位符，不打扰主流程
    }
    for (const p of products) {
      const d = storage && storage[p.id];
      const cell = $(`#rowSize-${p.id}`);
      if (!d || !cell) continue;
      cell.textContent = formatBytes(d.totalBytes);
      cell.dataset.tip = `图片：${d.imageCount} 个文件 | 磁盘 ${formatBytes(d.imageBytes)} | JSON：${formatBytes(d.dbBytes)} | 合计：${formatBytes(d.totalBytes)}`;
    }
  },
};
