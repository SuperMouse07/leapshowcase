/**
 * admin/admin.js · 后台入口（访问守卫 + 布局 + 能力门控面板注册表）
 * ------------------------------------------------------------
 * ADR-0005：后台仅经直接 URL /admin.html 进入，前台无任何隐蔽入口。
 * 访问守卫：
 *   - 无会话 / 需强制改密 → 跳转 login.html?next=admin.html；
 *   - 无任何可见面板（无后台权限）→ 渲染拒绝卡片；
 *   - 否则 → 渲染工作区，按能力矩阵仅挂载有权面板。
 * 面板注册表：产品 / 轮播 / 设置 / 子账号 / 审计 / 监控，每项声明
 *   { id, nav, capability, panelClass, mount }，侧栏锚点堆叠展示（无哈希路由）。
 * 子账号仅见其被授权的面板；子账号管理与审计为主账号独占。
 */
import { $, escapeHtml } from '../core/dom.js';
import { SITE } from '../core/config.js';
import { hasSession, getUser, mustChangePassword, can, accountLabel, signOut } from '../core/auth.js';
import { fetchSettings } from '../api/settings.js';
import { toastErr } from '../ui/toast.js';
import { BRAND } from '../data/content.js';

import productsPanel from './panels/products.js';
import slidesPanel from './panels/slides.js';
import settingsPanel from './panels/settings.js';
import accountsPanel from './panels/accounts.js';
import auditPanel from './panels/audit.js';
import statsPanel from './panels/stats.js';

/** 面板注册表（展示顺序：内容编辑 → 账号治理 → 运维监控） */
const PANELS = [productsPanel, slidesPanel, settingsPanel, accountsPanel, auditPanel, statsPanel];

const root = $('#adminRoot');

/* ---------- 访问守卫：返回可进入后台的用户，否则跳转登录并返回 null ---------- */
function guard() {
  if (!hasSession()) {
    location.replace('/login?next=/admin');
    return null;
  }
  const user = getUser();
  // 首登强制改密：回到登录页完成改密流程（改密需当前密码，无法在后台内联处理）
  if (mustChangePassword(user)) {
    location.replace('/login?next=/admin');
    return null;
  }
  return user;
}

/* ---------- 后台导航（LOGO + Admin 标记 + 用户槽） ---------- */
function renderNav(user) {
  document.body.insertAdjacentHTML(
    'afterbegin',
    `<header class="nav" id="nav">
      <div class="nav-inner">
        <a class="nav-logo" href="/" aria-label="${escapeHtml(BRAND.name)} 首页">
          <img src="${SITE.defaultLogo}" alt="${escapeHtml(BRAND.name)} LOGO" />
        </a>
        <nav class="nav-links" aria-label="后台导航">
          <span class="admin-tag">后台管理</span>
        </nav>
        <span class="admin-user-slot">
          <span class="nav-user"><b>${escapeHtml(user.display_name || user.username)}</b><span class="acct-type">${escapeHtml(accountLabel(user))}</span></span>
          <a class="btn btn-small btn-ghost" href="/" target="_blank" rel="noopener" title="在新标签页打开前台网站"><span>查看前台</span></a>
          <button class="btn btn-small" id="signOutBtn" type="button"><span>退出登录</span></button>
        </span>
      </div>
    </header>`
  );
  $('#signOutBtn')?.addEventListener('click', () => signOut({ redirect: '/login' }));
}

/* ---------- 拒绝访问卡片（无后台权限的账号） ---------- */
function renderDenied() {
  root.innerHTML = `<div class="auth-shell">
    <div class="denied-card">
      <div class="denied-icon">♚</div>
      <h2>无访问权限</h2>
      <p>该账号没有后台管理权限，请联系主账号管理员申请编辑权限。</p>
      <button class="btn" id="deniedSignOut" type="button"><span>切换账号</span></button>
    </div>
  </div>`;
  $('#deniedSignOut').addEventListener('click', () => signOut({ redirect: '/login' }));
}

/* ---------- 工作区（侧栏锚点 + 能力门控面板堆叠） ---------- */
function renderWorkspace(user) {
  const permitted = PANELS.filter((p) => can(p.capability, user));
  if (!permitted.length) return renderDenied();

  root.innerHTML = `<main class="admin-main">
    <aside class="admin-side">
      ${permitted.map((p) => `<a href="#${p.id}">${p.nav}</a>`).join('')}
    </aside>
    <div class="admin-content">
      ${permitted
        .map((p) => `<section class="${p.panelClass ? `panel ${p.panelClass}` : ''}" id="${p.id}"></section>`)
        .join('')}
    </div>
  </main>`;

  permitted.forEach((p) => {
    const host = document.getElementById(p.id);
    try {
      p.mount(host, { user });
    } catch (err) {
      host.innerHTML = `<p class="loading">面板加载失败：${escapeHtml(err.message)}</p>`;
    }
  });

  // ── Scroll spy: highlight active panel in side nav ──
  // 观察面板宿主 section 本身（商品面板 panelClass 为空，不带 .panel 类）
  const sideLinks = document.querySelectorAll('.admin-side a[href^="#"]');
  const panels = document.querySelectorAll('.admin-content > section[id]');
  if (sideLinks.length && panels.length && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          sideLinks.forEach((a) => a.classList.remove('is-active'));
          const active = document.querySelector(`.admin-side a[href="#${entry.target.id}"]`);
          if (active) active.classList.add('is-active');
        }
      });
    }, { rootMargin: '-96px 0px -60% 0px', threshold: 0.1 });
    panels.forEach((p) => obs.observe(p));
  }
}

/* ---------- 应用全站设置到后台导航（LOGO + 标题），失败静默 ---------- */
function applyAdminSettings() {
  fetchSettings()
    .then((s) => {
      const logo = String(s.logo_url || '').trim();
      document.querySelectorAll('.nav-logo img').forEach((img) => {
        img.src = logo || SITE.defaultLogo;
      });
      const title = String(s.site_title || '').trim();
      if (title) document.title = `${title} · 后台管理`;
    })
    .catch(() => {});
}

/* ---------- 启动 ---------- */
const user = guard();
if (user) {
  renderNav(user);
  renderWorkspace(user);
  applyAdminSettings();
}

window.addEventListener('unhandledrejection', (e) => {
  if (e.reason) toastErr(e.reason.message || '发生未知错误');
});
