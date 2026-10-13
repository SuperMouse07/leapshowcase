/**
 * pages/login.js · 后台登录控制器（login.html）
 * ------------------------------------------------------------
 * 依据 ADR-0005：仅用户名 + 密码登录（不再展示任何示例凭据）；
 * 首次登录（must_change_password）强制改密后方可进入后台；
 * 成功后跳转 admin.html（或 ?next= 指定的内部页面）。
 * 本页不使用前台外壳，独立渲染于 .auth-shell / #authRoot。
 */
import { $ } from '../core/dom.js';
import { signIn, changePassword, mustChangePassword, isEditor, hasSession, getUser } from '../core/auth.js';
import { toastErr } from '../ui/toast.js';

const root = $('#authRoot');
const next = new URLSearchParams(location.search).get('next');

/** 已具备可直接进入后台的会话（已登录 + 编辑者 + 无需强制改密） */
function readyForAdmin() {
  const u = getUser();
  return hasSession() && isEditor(u) && !mustChangePassword(u);
}

/** 仅允许跳转站内相对页面，杜绝开放重定向 */
function safeNext() {
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  if (next && !/^https?:/i.test(next) && !next.startsWith('//')) return next;
  return '/admin';
}

function goAdmin() {
  location.replace(safeNext());
}

/* 已登录且为编辑者（无需强制改密）→ 直接进入后台 */
if (readyForAdmin()) {
  goAdmin();
}

function loginView() {
  root.innerHTML = `<div class="auth-card">
    <div class="auth-icon">♞</div>
    <h1>后台登录</h1>
    <p class="auth-sub">仅限授权账号 · 所有操作均会被记录</p>
    <form id="loginForm" novalidate>
      <label>用户名
        <input id="username" name="username" type="text" autocomplete="username" placeholder="请输入后台用户名" required>
      </label>
      <label>密码
        <input id="password" name="password" type="password" autocomplete="current-password" placeholder="请输入密码" required>
      </label>
      <p class="form-msg" id="msg" role="status"></p>
      <button class="btn" type="submit" id="submitBtn"><span>登录后台</span></button>
    </form>
    <p class="auth-note">仅限已开通的账号访问。如需开通或调整编辑权限，请联系主账号管理员。</p>
  </div>`;
  $('#username').focus();
  $('#loginForm').addEventListener('submit', onLogin);
}

async function onLogin(e) {
  e.preventDefault();
  const msg = $('#msg');
  const btn = $('#submitBtn');
  const username = $('#username').value.trim();
  const password = $('#password').value;
  msg.className = 'form-msg';
  if (!username || !password) {
    msg.textContent = '请输入用户名和密码。';
    msg.classList.add('err');
    return;
  }
  btn.disabled = true;
  msg.textContent = '登录中…';
  try {
    const user = await signIn(username, password);
    if (!isEditor(user)) {
      msg.textContent = '该账号没有后台访问权限。';
      msg.classList.add('err');
      btn.disabled = false;
      return;
    }
    if (mustChangePassword(user)) {
      changeView(password);
    } else {
      goAdmin();
    }
  } catch (err) {
    msg.textContent = err?.message || '登录失败，请重试。';
    msg.classList.add('err');
    btn.disabled = false;
  }
}

/* 首登强制改密视图（沿用刚验证过的密码作为当前密码） */
function changeView(currentPassword) {
  root.innerHTML = `<div class="auth-card">
    <div class="auth-icon">🔒</div>
    <h2>设置新密码</h2>
    <p class="auth-sub">为保障账号安全，请先修改初始密码再进入后台。</p>
    <form id="pwForm" novalidate>
      <label>新密码
        <input id="np" type="password" autocomplete="new-password" minlength="6" placeholder="至少 6 位字符" required>
      </label>
      <label>确认新密码
        <input id="np2" type="password" autocomplete="new-password" minlength="6" placeholder="请再次输入新密码" required>
      </label>
      <p class="form-msg" id="msg" role="status"></p>
      <button class="btn" type="submit" id="submitBtn"><span>更新密码并进入后台</span></button>
    </form>
  </div>`;
  $('#np').focus();
  $('#pwForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#msg');
    const btn = $('#submitBtn');
    const np = $('#np').value;
    const np2 = $('#np2').value;
    msg.className = 'form-msg';
    if (np.length < 6) {
      msg.textContent = '密码至少需要 6 位。';
      return msg.classList.add('err');
    }
    if (np !== np2) {
      msg.textContent = '两次输入的密码不一致。';
      return msg.classList.add('err');
    }
    btn.disabled = true;
    msg.textContent = '更新中…';
    try {
      await changePassword(currentPassword, np);
      goAdmin();
    } catch (err) {
      msg.textContent = err?.message || '密码更新失败，请重试。';
      msg.classList.add('err');
      btn.disabled = false;
    }
  });
}

if (root && !readyForAdmin()) {
  loginView();
}
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason) toastErr(e.reason.message || '发生未知错误');
});
