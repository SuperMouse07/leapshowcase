/**
 * ui/shell.js · 全站共享外壳（导航 / 采购清单抽屉 / 页脚 / 设置）
 * ------------------------------------------------------------
 * 每个前台页面调用 initShell() 注入一致的布局骨架，并：
 *   - 将购物车抽屉接入 core/cart.js（订阅 cartChanged 自动重渲染）；
 *   - 经 core/catalog.js 解析清单商品信息；
 *   - 应用后端全站设置（标题 / LOGO / 公告 / 联系方式），并经 BroadcastChannel 跨标签页同步；
 *   - 上报页面浏览审计事件。
 * 依据 ADR-0005：不再提供“连敲空格”等隐蔽后台入口，后台仅通过直接访问 /admin.html 进入。
 */
import { $, escapeHtml, sanitizeInline, money } from '../core/dom.js';
import { SITE } from '../core/config.js';
import { on, EVENTS } from '../core/events.js';
import { loadCatalog } from '../core/catalog.js';
import * as cart from '../core/cart.js';
import { fetchSettings } from '../api/settings.js';
import { reportActivity } from '../api/activity.js';
import { clearSession } from '../core/session.js';
import { CATS, seriesHref, BRAND } from '../data/content.js';

/* ---------- 导航项（LOGO 左 / 跳转中 / 购物车右，每页一致） ---------- */
const NAV = [
  { href: 'index.html', key: 'home', label: 'Home' },
  { href: 'products.html', key: 'products', label: 'Product Overview' },
  ...CATS.map((c) => ({ href: seriesHref(c.id), key: c.id, label: c.label })),
  { href: 'journey.html', key: 'journey', label: 'Our Journey' },
];

const CART_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" aria-hidden="true">
  <path d="M6 7h12l1 14H5L6 7z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>`;

function activeKey() {
  const page = document.body.dataset.page || 'home';
  if (page === 'product') return 'products';
  if (page === 'series') return document.body.dataset.cat || '';
  return page;
}

function injectNav() {
  const key = activeKey();
  document.body.insertAdjacentHTML(
    'afterbegin',
    `<header class="nav" id="nav">
      <div class="nav-inner">
        <a class="nav-logo" href="index.html" aria-label="${escapeHtml(BRAND.name)} Home">
          <img src="${SITE.defaultLogo}" alt="${escapeHtml(BRAND.name)} LOGO" />
        </a>
        <nav class="nav-links" id="navLinks" aria-label="Main navigation">
          ${NAV.map((n) => `<a href="${n.href}" class="${n.key === key ? 'is-active' : ''}">${escapeHtml(n.label)}</a>`).join('')}
        </nav>
        <button class="nav-cart" id="cartBtn" aria-label="Open shopping list">
          ${CART_ICON}<span class="cart-badge" id="cartCount">0</span>
        </button>
        <button class="nav-burger" id="burger" aria-label="Menu"><span></span><span></span><span></span></button>
      </div>
    </header>`
  );
}

function injectDrawerAndFooter() {
  document.body.insertAdjacentHTML(
    'beforeend',
    `<div class="overlay" id="overlay"></div>
    <aside class="drawer" id="drawer" aria-label="Shopping list">
      <div class="cart-head">
        <h3>Shopping List</h3>
        <button class="cart-close" id="cartClose" aria-label="Close">×</button>
      </div>
      <div class="cart-list" id="cartList"></div>
      <div class="cart-foot">
        <div class="cart-total"><span class="t">Total</span><span class="v" id="cartTotal">$0.00</span></div>
        <button class="btn" id="exportBtn" disabled><span>Export Shopping List</span></button>
        <p class="cart-note">B2B enquiry list · No online checkout — export and send to our team</p>
      </div>
    </aside>
    <footer class="footer">
      <div class="wrap footer-inner">
        <img src="${SITE.defaultLogo}" alt="${escapeHtml(BRAND.name)} LOGO" />
        <nav class="footer-links" aria-label="Footer navigation">
          <a href="index.html">Home</a>
          <a href="products.html">Products</a>
          <a href="journey.html">Journey</a>
        </nav>
        <div class="footer-copy">
          <span>© 2026 ${escapeHtml(BRAND.name)} · Affordable Luxury Editorial Gallery</span>
          <span>${escapeHtml(BRAND.microTop)}</span>
        </div>
      </div>
    </footer>`
  );
}

/* ---------- 采购清单抽屉渲染 ---------- */
function renderCart() {
  const badge = $('#cartCount');
  const list = $('#cartList');
  const totalEl = $('#cartTotal');
  const exportBtn = $('#exportBtn');
  if (!badge || !list) return;

  const snap = cart.snapshot();
  const rawCount = cart.count();
  badge.textContent = String(rawCount);
  badge.classList.toggle('show', rawCount > 0);
  totalEl.textContent = money(snap.total);
  exportBtn.disabled = snap.count === 0;

  list.innerHTML = snap.items.length
    ? snap.items
        .map(
          ({ id, qty, product }) => `
        <div class="cart-item">
          <img src="${escapeHtml(product.cover || SITE.placeholder)}" alt="${escapeHtml(product.name)}" />
          <div class="ci-body">
            <p class="ci-name">${escapeHtml(product.name)}</p>
            <p class="ci-price">${money(product.price)} / each</p>
            <span class="stepper">
              <button data-step="-1" data-id="${escapeHtml(id)}" aria-label="Decrease">−</button>
              <output>${qty}</output>
              <button data-step="1" data-id="${escapeHtml(id)}" aria-label="Increase">+</button>
            </span>
          </div>
          <div class="ci-side">
            <span class="ci-sub">${money(product.price * qty)}</span>
            <button class="ci-remove" data-remove="${escapeHtml(id)}">Remove</button>
          </div>
        </div>`
        )
        .join('')
    : '<p class="cart-empty">Your list is empty ♟<br>Add products from the grid to build your enquiry.</p>';
}

function openDrawer() {
  $('#drawer')?.classList.add('open');
  $('#overlay')?.classList.add('show');
}
function closeDrawer() {
  $('#drawer')?.classList.remove('open');
  $('#overlay')?.classList.remove('show');
}

/* ---------- 全站事件委托 ---------- */
function bindGlobalEvents() {
  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) {
      cart.add(add.dataset.add, Number(add.dataset.qty) || 1);
      openDrawer();
      return;
    }
    const st = e.target.closest('[data-step]');
    if (st) {
      cart.step(st.dataset.id, Number(st.dataset.step));
      return;
    }
    const rm = e.target.closest('[data-remove]');
    if (rm) {
      cart.remove(rm.dataset.remove);
      return;
    }
    if (e.target.closest('#cartBtn')) return openDrawer();
    if (e.target.closest('#cartClose') || e.target === $('#overlay')) return closeDrawer();
    if (e.target.closest('#burger')) return $('#nav')?.classList.toggle('open');
    if (e.target.closest('#navLinks a')) $('#nav')?.classList.remove('open');
  });

  $('#exportBtn')?.addEventListener('click', () => {
    if (cart.exportList()) closeDrawer();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });

  // 购物车状态变更 → 重渲染抽屉与角标
  cart.subscribe(renderCart);

  // 会话失效（http 401）→ 清理本地态并轻提示，不打断公开浏览
  on(EVENTS.sessionExpired, () => {
    clearSession();
  });
}

/* ---------- 全站设置应用 ---------- */
function applySettings(s) {
  const siteTitle = String(s.site_title || '').trim();
  if (siteTitle) {
    const suffix = document.title.split('·').slice(1).join('·').trim();
    document.title = suffix ? `${siteTitle} · ${suffix}` : siteTitle;
  }
  const logo = String(s.logo_url || '').trim();
  document.querySelectorAll('.nav-logo img, .footer-inner > img').forEach((img) => {
    img.src = logo || SITE.defaultLogo;
  });

  // 首页公告栏（仅首页，空内容时移除）
  const page = document.body.dataset.page || 'home';
  const ann = String(s.announcement_html || '').trim();
  let bar = $('#announceBar');
  if (ann && page === 'home') {
    if (!bar) {
      $('#nav')?.insertAdjacentHTML('afterend', '<div class="announce-bar" id="announceBar" role="status"></div>');
      bar = $('#announceBar');
    }
    if (bar) bar.innerHTML = sanitizeInline(ann);
  } else if (bar) {
    bar.remove();
  }

  // 页脚联系方式
  const email = String(s.contact_email || '').trim();
  const social = String(s.contact_social || '').trim();
  let contact = $('#footerContact');
  if (email || social) {
    const text = [email ? `✉ ${escapeHtml(email)}` : '', social ? escapeHtml(social) : ''].filter(Boolean).join(' · ');
    if (!contact) {
      $('.footer-copy')?.insertAdjacentHTML('beforeend', '<span id="footerContact"></span>');
      contact = $('#footerContact');
    }
    if (contact) contact.innerHTML = text;
  } else if (contact) {
    contact.remove();
  }
}

/**
 * 初始化全站外壳。每个前台页面在模块顶部调用一次。
 * @param {object} [opts]
 * @param {boolean} [opts.settings=true]  是否拉取并应用全站设置
 */
export function initShell({ settings = true } = {}) {
  injectNav();
  injectDrawerAndFooter();
  bindGlobalEvents();
  renderCart();

  // 商品目录到位后重渲染购物车（此前清单商品无法解析名称/价格）
  loadCatalog().then(renderCart).catch(() => {});

  if (settings) {
    fetchSettings().then(applySettings).catch(() => {});
    on(EVENTS.settingsChanged, () => fetchSettings().then(applySettings).catch(() => {}));
  }

  const page = document.body.dataset.page || 'home';
  reportActivity('page_view', `${page} — ${document.title}`);
}

export { openDrawer, closeDrawer, applySettings, renderCart };
