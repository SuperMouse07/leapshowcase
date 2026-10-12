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
    <h1>Admin Sign In</h1>
    <p class="auth-sub">Authorized accounts only · All actions are logged</p>
    <form id="loginForm" novalidate>
      <label>Username
        <input id="username" name="username" type="text" autocomplete="username" required>
      </label>
      <label>Password
        <input id="password" name="password" type="password" autocomplete="current-password" required>
      </label>
      <p class="form-msg" id="msg" role="status"></p>
      <button class="btn" type="submit" id="submitBtn"><span>Sign In</span></button>
    </form>
    <p class="auth-note">Access is restricted to provisioned accounts. Contact the main-account administrator to request editor permission.</p>
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
    msg.textContent = 'Please enter both username and password.';
    msg.classList.add('err');
    return;
  }
  btn.disabled = true;
  msg.textContent = 'Signing in…';
  try {
    const user = await signIn(username, password);
    if (!isEditor(user)) {
      msg.textContent = 'This account has no backend access.';
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
    msg.textContent = err?.message || 'Sign-in failed. Please try again.';
    msg.classList.add('err');
    btn.disabled = false;
  }
}

/* 首登强制改密视图（沿用刚验证过的密码作为当前密码） */
function changeView(currentPassword) {
  root.innerHTML = `<div class="auth-card">
    <div class="auth-icon">🔒</div>
    <h2>Set a New Password</h2>
    <p class="auth-sub">For security, please change the initial password before continuing.</p>
    <form id="pwForm" novalidate>
      <label>New Password
        <input id="np" type="password" autocomplete="new-password" minlength="6" required>
      </label>
      <label>Confirm New Password
        <input id="np2" type="password" autocomplete="new-password" minlength="6" required>
      </label>
      <p class="form-msg" id="msg" role="status"></p>
      <button class="btn" type="submit" id="submitBtn"><span>Update &amp; Continue</span></button>
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
      msg.textContent = 'Password must be at least 6 characters.';
      return msg.classList.add('err');
    }
    if (np !== np2) {
      msg.textContent = 'The two passwords do not match.';
      return msg.classList.add('err');
    }
    btn.disabled = true;
    msg.textContent = 'Updating…';
    try {
      await changePassword(currentPassword, np);
      goAdmin();
    } catch (err) {
      msg.textContent = err?.message || 'Failed to update password.';
      msg.classList.add('err');
      btn.disabled = false;
    }
  });
}

if (root && !readyForAdmin()) {
  loginView();
}
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason) toastErr(e.reason.message || 'Unexpected error');
});
