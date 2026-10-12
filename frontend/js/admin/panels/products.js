/**
 * admin/panels/products.js · 商品管理面板（能力：products:write）
 * ------------------------------------------------------------
 * 左：新建/编辑表单（名称、分类、价格、库存、主推、描述、卖点、双图集、标签 tags）；
 * 右：商品列表（封面、标签、价格、库存、图数、存储明细 tooltip、主推、↑↓ 排序、增删改）
 *    + 分类筛选 + 分页。
 * 新增能力（ADR-0004）：标签编辑器，随商品 tags 数组提交；受控词表取自 settings.product_tags。
 * 主推款（settings.hero_products）在表单勾选与列表 Set/Clear 双入口联动。
 * 商品增改删上报审计（ADR-0005：记录操作人与时间点）。
 */
import { $, escapeHtml, formatBytes } from '../../core/dom.js';
import { SITE } from '../../core/config.js';
import { CATS } from '../../data/content.js';
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchProductStorage,
} from '../../api/products.js';
import { fetchSettings, saveHeroProducts } from '../../api/settings.js';
import { reportActivity } from '../../api/activity.js';
import { badgesHtml } from '../../ui/badges.js';
import { toastOk, toastErr } from '../../ui/toast.js';
import { catLabel } from '../../ui/cards.js';

const KNOWN_CATS = CATS.map((c) => c.id);
const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_TOTAL_IMAGE_SIZE = 50 * 1024 * 1024;
const MAX_BODY_CHARS = 75 * 1024 * 1024;

let pendingImages = [];
let pendingDetails = [];
let pendingTags = [];
let heroIds = [];
let tagVocab = [];
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
  nav: '♜ Products',
  capability: 'products:write',
  panelClass: '',

  mount(host) {
    host.classList.add('admin-products-host');
    host.innerHTML = `<div class="admin-grid">
      <form class="panel" id="productForm">
        <h2 id="formTitle">♟ New Product</h2>
        <input type="hidden" id="editId">
        <label class="field">Product Name *
          <input type="text" id="pName" placeholder="e.g. Tournament Pro Chess Clock" required>
        </label>
        <div class="form-row">
          <label class="field">Category
            <select id="pCategory">
              ${CATS.map((c) => `<option value="${c.id}">${escapeHtml(c.label)}</option>`).join('')}
              <option value="__custom">Custom…</option>
            </select>
          </label>
          <label class="field">Current Price ($)
            <input type="number" id="pPrice" min="0" step="0.01" placeholder="0.00">
          </label>
          <label class="field">Stock
            <input type="number" id="pStock" min="0" step="1" placeholder="0">
          </label>
        </div>
        <div class="form-row">
          <label class="field">Original Price ($) — shown struck-through
            <input type="number" id="pOrigPrice" min="0" step="0.01" placeholder="empty = not discounted">
          </label>
          <label class="field">MOQ (Minimum Order Quantity)
            <input type="number" id="pMoq" min="1" step="1" placeholder="1">
          </label>
        </div>
        <label class="field hidden" id="customCatRow">Custom Category Id
          <input type="text" id="pCustomCat" placeholder="e.g. chess-set">
        </label>
        <div class="form-row form-row-ops">
          <label class="check-label">Featured as Hero
            <input type="checkbox" id="pHero">
            <span class="field-hint">Adds to the home featured set · order via ↑↓ in the list</span>
          </label>
        </div>
        <label class="field">Description
          <textarea id="pDesc" rows="3" placeholder="One line about what makes it great…"></textarea>
        </label>
        <label class="field">Selling Points (Product Information) — one bullet per line
          <textarea id="pInfo" rows="3" placeholder="First selling point…"></textarea>
        </label>
        <div class="field">Tags — e.g. 可支持定制 / 降价促销
          <div class="tag-editor">
            <div class="tag-list" id="tagList"></div>
            <div class="tag-add-row">
              <input type="text" id="tagInput" placeholder="Add a tag and press Enter">
              <button class="btn btn-small btn-ghost" type="button" id="tagAddBtn">Add</button>
            </div>
            <div class="tag-suggest" id="tagSuggest"></div>
          </div>
        </div>
        <label class="field">Main Images (gallery) — up to ${MAX_IMAGES}, first = cover
          <input type="file" id="pImages" accept="image/*" multiple hidden>
        </label>
        <div class="img-gallery" id="imgGallery"></div>
        <label class="field">Detail Images — shown below the main gallery (optional)
          <input type="file" id="pDetails" accept="image/*" multiple hidden>
        </label>
        <div class="img-gallery" id="detailGallery"></div>
        <p class="form-msg" id="formMsg"></p>
        <div class="form-actions">
          <button class="btn" type="submit" id="submitBtn"><span>Save Product</span></button>
          <button class="btn btn-ghost" type="button" id="cancelEdit"><span>Cancel</span></button>
        </div>
      </form>

      <div class="panel">
        <div class="panel-head">
          <h2>♜ Products <span class="count" id="productCount"></span></h2>
          <button class="btn btn-small btn-ghost" type="button" id="refreshBtn">Refresh ⟳</button>
        </div>
        <div class="list-toolbar">
          <label>Category
            <select id="listCatFilter">
              <option value="">All</option>
              ${CATS.map((c) => `<option value="${c.id}">${escapeHtml(c.label)}</option>`).join('')}
            </select>
          </label>
          <label>Per page
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
              <th>Cover</th><th>Name</th><th>Category</th><th>Tags</th>
              <th class="th-num">Price</th><th class="th-num">Stock</th>
              <th class="th-num">Main</th><th class="th-num">Detail</th>
              <th class="th-num">Size</th><th>Hero</th><th>Order</th><th>Actions</th>
            </tr></thead>
            <tbody id="productRows"><tr><td colspan="12" class="loading">Loading…</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>`;

    this.bindForm(host);
    this.bindList(host);
    this.renderGalleries();
    this.renderTags();
    this.loadSettingsMeta();
    this.loadList();
  },

  /* ---------- 设置元数据（hero_products + 标签词表） ---------- */
  async loadSettingsMeta() {
    try {
      const s = await fetchSettings();
      heroIds = (s.hero_products || []).map(String);
      tagVocab = s.product_tags || [];
      this.renderTagSuggest();
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

    $('#tagAddBtn', host).addEventListener('click', () => {
      this.addTag($('#tagInput', host).value);
      $('#tagInput', host).value = '';
    });
    $('#tagInput', host).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addTag(e.target.value);
        e.target.value = '';
      }
    });
    $('#tagList', host).addEventListener('click', (e) => {
      const rm = e.target.closest('[data-rm-tag]');
      if (rm) {
        pendingTags.splice(Number(rm.dataset.rmTag), 1);
        this.renderTags();
      }
    });
    $('#tagSuggest', host).addEventListener('click', (e) => {
      const b = e.target.closest('[data-suggest]');
      if (b) this.addTag(b.dataset.suggest);
    });

    this.bindGallery(host, 'imgGallery', 'pImages', 'galleryAdd', () => pendingImages);
    this.bindGallery(host, 'detailGallery', 'pDetails', 'detailAdd', () => pendingDetails);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const category = $('#pCategory', host).value === '__custom' ? $('#pCustomCat', host).value.trim() : $('#pCategory', host).value;
      if (!category) return this.setMsg('Please enter a custom category id.', false);
      if (!pendingImages.length) return this.setMsg('Please upload at least 1 main image.', false);

      const editId = $('#editId', host).value;
      const body = {
        name: $('#pName', host).value,
        category,
        price: $('#pPrice', host).value || 0,
        current_price: $('#pPrice', host).value || 0,
        original_price: $('#pOrigPrice', host).value ? Number($('#pOrigPrice', host).value) : null,
        moq: Number($('#pMoq', host).value) || 1,
        stock: $('#pStock', host).value || 0,
        description: $('#pDesc', host).value,
        info: $('#pInfo', host).value.split('\n').map((s) => s.trim()).filter(Boolean),
        images: pendingImages,
        details: pendingDetails,
        tags: pendingTags, // ADR-0004 新增契约字段
      };
      try {
        const payload = JSON.stringify(body);
        if (payload.length > MAX_BODY_CHARS) {
          return this.setMsg('Images are too large in total (limit ≈ 50MB per product).', false);
        }
        let savedId = editId;
        if (editId) {
          await updateProduct(editId, body);
          reportActivity('product_update', `Updated product #${editId} ${body.name}`, { target_type: 'product', target_id: editId });
          this.setMsg(`Product #${editId} updated ✓`);
        } else {
          const { product } = await createProduct(body);
          savedId = String(product.id);
          reportActivity('product_create', `Created product #${savedId} ${product.name}`, { target_type: 'product', target_id: savedId });
          this.setMsg(`Product "${product.name}" uploaded ✓`);
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
    pendingTags = [];
    this.renderGalleries();
    this.renderTags();
    this.syncCustomCat();
    $('#formTitle').textContent = '♟ New Product';
    $('#submitBtn').innerHTML = '<span>Save Product</span>';
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
    $('#pPrice').value = p.current_price ?? p.price;
    $('#pOrigPrice').value = p.original_price ?? '';
    $('#pMoq').value = p.moq ?? 1;
    $('#pStock').value = p.stock ?? '';
    $('#pHero').checked = heroIds.includes(String(p.id));
    $('#pDesc').value = p.description || '';
    $('#pInfo').value = (p.info || []).join('\n');
    pendingImages = [...(p.images || [])];
    pendingDetails = [...(p.details || [])];
    pendingTags = [...(p.tags || [])];
    this.renderGalleries();
    this.renderTags();
    $('#formTitle').textContent = `♟ Edit Product #${p.id}`;
    $('#submitBtn').innerHTML = '<span>Save Changes</span>';
    this.setMsg('');
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  /* ---------- 标签编辑器（ADR-0004） ---------- */
  addTag(text) {
    const t = String(text || '').trim();
    if (!t) return;
    if (pendingTags.includes(t)) return this.setMsg('That tag is already added.', false);
    pendingTags.push(t);
    if (!tagVocab.includes(t)) tagVocab.push(t);
    this.renderTags();
    this.renderTagSuggest();
    this.setMsg('');
  },

  renderTags() {
    const box = $('#tagList');
    if (!box) return;
    box.innerHTML = pendingTags.length
      ? pendingTags
          .map((t, i) => `<span class="tag-pill">${escapeHtml(t)}<button type="button" data-rm-tag="${i}" aria-label="Remove ${escapeHtml(t)}">×</button></span>`)
          .join('')
      : '<span class="gallery-hint">No tags yet</span>';
  },

  renderTagSuggest() {
    const box = $('#tagSuggest');
    if (!box) return;
    const suggestions = tagVocab.filter((t) => !pendingTags.includes(t)).slice(0, 12);
    box.innerHTML = suggestions
      .map((t) => `<button type="button" data-suggest="${escapeHtml(t)}">+ ${escapeHtml(t)}</button>`)
      .join('');
  },

  /* ---------- 图集 ---------- */
  galleryHtml(list, galleryId, addId, label) {
    const items = list
      .map(
        (src, i) => `<div class="gallery-item">
          ${i === 0 && galleryId === 'imgGallery' ? '<span class="main-flag">Cover</span>' : ''}
          <img src="${escapeHtml(src)}" alt="${label} ${i + 1}">
          <button class="rm-img" type="button" data-i="${i}" title="Remove">×</button>
        </div>`
      )
      .join('');
    const addTile = list.length < MAX_IMAGES ? `<div class="gallery-add" id="${addId}" title="Add image">＋</div>` : '';
    return `${items}${addTile}<span class="gallery-hint">${list.length}/${MAX_IMAGES}</span>`;
  },

  renderGalleries() {
    const g = $('#imgGallery');
    if (g) g.innerHTML = this.galleryHtml(pendingImages, 'imgGallery', 'galleryAdd', 'Main image');
    const d = $('#detailGallery');
    if (d) d.innerHTML = this.galleryHtml(pendingDetails, 'detailGallery', 'detailAdd', 'Detail image');
    this.renderTagSuggest();
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
          this.setMsg(`Max ${MAX_IMAGES} images per group — extra files skipped.`, false);
          break;
        }
        if (file.size > MAX_IMAGE_SIZE) {
          this.setMsg(`"${file.name}" is too large (max 8MB) and was skipped.`, false);
          continue;
        }
        if (pendingImageBytes() + file.size > MAX_TOTAL_IMAGE_SIZE) {
          this.setMsg(`Total images exceed the 50MB per-product limit — "${file.name}" skipped.`, false);
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
      if (list.length) this.setMsg('Images ready — stored on the server when you save.');
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
          toastErr(`Hero update failed: ${err.message}`);
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
          toastErr(`Sort failed: ${err.message}`);
        }
        return;
      }
      if (act === 'edit' && product) return this.fillForm(product);
      if (act === 'del' && product) {
        if (!confirm(`Delete product "${product.name}"? This cannot be undone.`)) return;
        try {
          await deleteProduct(product.id);
          reportActivity('product_delete', `Deleted product #${product.id} ${product.name}`, { target_type: 'product', target_id: product.id });
          toastOk('Product deleted.');
          this.loadList();
        } catch (err) {
          toastErr(`Delete failed: ${err.message}`);
        }
      }
    });
  },

  async loadList() {
    const tbody = $('#productRows');
    const limit = $('#listLimit').value;
    const catFilter = $('#listCatFilter').value;
    try {
      const { products, total, limit: pageSize } = await fetchProducts({ category: catFilter || undefined, limit: Number(limit), page: currentPage });
      cachedProducts = products;
      $('#productCount').textContent = `${total} item(s)`;
      const totalPages = Math.max(1, Math.ceil(total / (pageSize || Number(limit))));
      $('#listPager').innerHTML = `
        <button data-pg="prev" ${currentPage <= 1 ? 'disabled' : ''}>← Prev</button>
        <span class="pager-info">${currentPage} / ${totalPages}</span>
        <button data-pg="next" ${currentPage >= totalPages ? 'disabled' : ''}>Next →</button>`;

      if (!products.length) {
        tbody.innerHTML = '<tr><td colspan="12" class="loading">No products found.</td></tr>';
        return;
      }
      tbody.innerHTML = products
        .map((p, idx) => {
          const img = p.cover && p.cover !== SITE.placeholder ? p.cover : (p.images || [])[0] || '';
          const isHero = heroIds.includes(String(p.id));
          const heroCell = isHero
            ? `<span class="hero-flag" title="Featured">♕</span><button class="btn btn-small btn-ghost" data-act="unhero" data-id="${p.id}">Clear</button>`
            : `<button class="btn btn-small btn-ghost" data-act="hero" data-id="${p.id}">Set</button>`;
          return `<tr>
            <td>${img ? `<img class="thumb" src="${escapeHtml(img)}" alt="">` : '<span class="thumb-ph">♟</span>'}</td>
            <td>${escapeHtml(p.name)}</td>
            <td>${escapeHtml(catLabel(p.category))}</td>
            <td><span class="cell-tags">${badgesHtml(p.tags, { max: 3 }) || '<span class="gallery-hint">—</span>'}</span></td>
            <td class="td-num">$ ${Number(p.current_price ?? p.price).toFixed(2)}${p.original_price ? ` <s class="price-was">${Number(p.original_price).toFixed(2)}</s>` : ''}</td>
            <td class="td-num">${Number(p.stock) || 0}</td>
            <td class="td-num">${(p.images || []).length}</td>
            <td class="td-num">${(p.details || []).length}</td>
            <td class="td-num tip-cell" id="rowSize-${p.id}" data-tip="">…</td>
            <td class="td-hero">${heroCell}</td>
            <td><span class="sort-btns">
              <button data-act="move-up" data-id="${p.id}" title="Move up" ${idx === 0 ? 'disabled' : ''}>↑</button>
              <button data-act="move-down" data-id="${p.id}" title="Move down" ${idx === products.length - 1 ? 'disabled' : ''}>↓</button>
            </span></td>
            <td class="row-actions">
              <button class="btn btn-small btn-ghost" data-act="edit" data-id="${p.id}">Edit</button>
              <button class="btn btn-small btn-danger" data-act="del" data-id="${p.id}">Delete</button>
            </td>
          </tr>`;
        })
        .join('');
      this.loadRowStorage(products);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="12" class="loading">Failed to load: ${escapeHtml(err.message)}</td></tr>`;
    }
  },

  async loadRowStorage(products) {
    await Promise.all(
      products.map(async (p) => {
        let d = null;
        try {
          d = await fetchProductStorage(p.id);
        } catch {
          return;
        }
        const cell = $(`#rowSize-${p.id}`);
        if (!d || !cell) return;
        cell.textContent = formatBytes(d.totalBytes);
        cell.dataset.tip = `Images: ${d.imageFileCount} files | ${formatBytes(d.imageFileBytes)} on disk | JSON: ${formatBytes(d.jsonBytes)} | Total: ${formatBytes(d.totalBytes)}`;
      })
    );
  },
};
