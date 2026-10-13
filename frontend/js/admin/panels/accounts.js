/**
 * admin/panels/accounts.js · 子账号管理面板（能力：accounts:manage，主账号独占）
 * ------------------------------------------------------------
 * ADR-0005：主账号 P001 独占子账号的创建 / 授权 / 删除；子账号默认仅商品 CRUD。
 * - 列表：账号类型（主/子）、权限徽标、创建时间、操作；主账号受保护不可删。
 * - 权限编辑：选中子账号 → 下方矩阵编辑（可授予项见 permissions.js），落库经预留契约
 *   /users/:id/permissions；后端未实现时提示“未就绪”而非崩溃。
 * - 新建子账号：用户名 + 密码 + 显示名 + 权限矩阵；向后兼容附带 role 与 account_type。
 * - 密码重置、删除均上报审计。
 */
import { $, escapeHtml, dateOnly } from '../../core/dom.js';
import { isMainAccount, accountLabel, DEFAULT_SUB_CAPABILITIES } from '../../core/auth.js';
import { fetchUsers, deleteUser, resetUserPassword, updateUserPermissions } from '../../api/users.js';
import { createAccount } from '../../api/session.js';
import { reportActivity } from '../../api/activity.js';
import { permMatrixHtml, readPermMatrix, permTagsHtml } from '../permissions.js';
import { toastOk, toastErr } from '../../ui/toast.js';
import { confirmDialog, promptDialog } from '../../ui/dialog.js';

let users = [];
let editingId = null;

export default {
  id: 'accountsPanel',
  nav: '♚ 子账号管理',
  capability: 'accounts:manage',
  panelClass: 'admin-users',

  mount(host) {
    host.innerHTML = `
      <div class="panel-head">
        <h2>♚ 子账号管理</h2>
        <button class="btn btn-small btn-ghost" type="button" id="usersRefreshBtn">刷新列表 ⟳</button>
      </div>
      <p class="panel-hint">主账号 P001 独占子账号管理。子账号默认仅可管理商品，可在下方按需授予轮播 / 设置等权限。</p>
      <div class="table-wrap">
        <table class="admin-table">
          <thead><tr>
            <th>ID</th><th>用户名</th><th>显示名称</th><th>类型</th><th>权限</th><th>创建时间</th><th>操作</th>
          </tr></thead>
          <tbody id="userRows"><tr><td colspan="7" class="loading">加载中…</td></tr></tbody>
        </table>
      </div>

      <div class="panel hidden" id="permEditor" style="margin-top:16px;">
        <h2 id="permEditorTitle">编辑权限</h2>
        <div class="perm-matrix" id="permEditorMatrix"></div>
        <p class="form-msg" id="permEditorMsg"></p>
        <div class="form-actions">
          <button class="btn btn-small" type="button" id="permSaveBtn"><span>保存权限</span></button>
          <button class="btn btn-small btn-ghost" type="button" id="permCancelBtn"><span>取消</span></button>
        </div>
      </div>

      <h3 class="panel-subtitle">新建子账号</h3>
      <form class="acct-add" id="acctAddForm">
        <label class="field">用户名
          <input type="text" id="newUsername" placeholder="例如：editor01（登录用，建议英文 / 数字）" autocomplete="off" required>
        </label>
        <label class="field">显示名称
          <input type="text" id="newDisplayName" placeholder="选填，例如：张三">
        </label>
        <label class="field">初始密码（至少 6 位）
          <input type="password" id="newUserPass" minlength="6" placeholder="至少 6 位字符" autocomplete="new-password" required>
        </label>
        <label class="field">确认密码
          <input type="password" id="newUserPass2" minlength="6" placeholder="再次输入初始密码" autocomplete="new-password" required>
        </label>
        <div class="field full">权限
          <div class="perm-matrix" id="newPermMatrix">${permMatrixHtml(DEFAULT_SUB_CAPABILITIES, 'new')}</div>
        </div>
        <div class="full">
          <p class="form-msg" id="acctMsg"></p>
          <button class="btn btn-small" type="submit" id="acctAddBtn"><span>创建子账号</span></button>
        </div>
      </form>`;

    $('#usersRefreshBtn', host).addEventListener('click', () => this.load());
    $('#permCancelBtn', host).addEventListener('click', () => this.closePermEditor());
    $('#permSaveBtn', host).addEventListener('click', () => this.savePermissions());

    $('#userRows', host).addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const u = users.find((x) => String(x.id) === btn.dataset.id);
      if (!u) return;
      const act = btn.dataset.act;
      if (act === 'perms') return this.openPermEditor(u);
      if (act === 'reset') {
        const pw = await promptDialog({
          title: '重置密码',
          label: `为 ${u.username} 设置新密码：`,
          placeholder: '至少 6 位字符',
          confirmText: '确认重置',
          validate: (v) => v.length < 6 ? '密码至少需要 6 位' : null
        });
        if (!pw) return;
        try {
          await resetUserPassword(u.id, pw);
          toastOk('密码已重置。');
        } catch (err) {
          toastErr(err.message || '重置失败');
        }
        return;
      }
      if (act === 'del') {
        const ok = await confirmDialog({ title: '删除子账号', message: `确定删除子账号「${u.username}」吗？此操作不可撤销。`, confirmText: '确认删除', danger: true });
        if (!ok) return;
        try {
          await deleteUser(u.id);
          reportActivity('account_delete', `删除子账号 ${u.username}`, { target_type: 'user', target_id: u.id });
          toastOk('账号已删除。');
          this.load();
        } catch (err) {
          toastErr(err.message || '删除失败');
        }
      }
    });

    $('#acctAddForm', host).addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = $('#acctMsg', host);
      msg.className = 'form-msg';
      const username = $('#newUsername', host).value.trim();
      const display_name = $('#newDisplayName', host).value.trim();
      const password = $('#newUserPass', host).value;
      const password2 = $('#newUserPass2', host).value;
      const permissions = readPermMatrix(host, 'new');
      if (!username || !password) {
        msg.textContent = '用户名和密码为必填项。';
        return (msg.className = 'form-msg err');
      }
      if (password.length < 6) {
        msg.textContent = '密码至少需要 6 位。';
        return (msg.className = 'form-msg err');
      }
      if (password !== password2) {
        msg.textContent = '两次输入的密码不一致。';
        return (msg.className = 'form-msg err');
      }
      const btn = $('#acctAddBtn', host);
      btn.disabled = true;
      msg.textContent = '创建中…';
      try {
        await createAccount({
          username,
          password,
          display_name,
          account_type: 'sub',
          permissions: permissions.length ? permissions : DEFAULT_SUB_CAPABILITIES,
          // 向后兼容旧基线：有编辑权限 → tester，否则只读 demo
          role: permissions.length ? 'tester' : 'demo',
        });
        reportActivity('account_create', `新建子账号 ${username}`, { target_type: 'user' });
        msg.textContent = `子账号「${username}」已创建。`;
        msg.className = 'form-msg ok';
        $('#acctAddForm', host).reset();
        $('#newPermMatrix', host).innerHTML = permMatrixHtml(DEFAULT_SUB_CAPABILITIES, 'new');
        this.load();
      } catch (err) {
        msg.textContent = err.message || '创建失败';
        msg.className = 'form-msg err';
      } finally {
        btn.disabled = false;
      }
    });

    this.load();
  },

  async load() {
    const tbody = $('#userRows');
    if (tbody) tbody.innerHTML = Array(3).fill('<tr><td colspan="7"><div class="skeleton-row"></div></td></tr>').join('');
    try {
      users = await fetchUsers();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="loading">加载失败：${escapeHtml(err.message)}</td></tr>`;
      return;
    }
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="loading">暂无账号。</td></tr>';
      return;
    }
    tbody.innerHTML = users
      .map((u) => {
        const main = isMainAccount(u);
        const perms = main
          ? '<span class="gallery-hint">全部权限（主账号）</span>'
          : permTagsHtml(u.permissions);
        const actions = main
          ? '<span class="gallery-hint">受保护</span>'
          : `<div class="row-actions">
              <button class="btn btn-small btn-ghost" data-act="perms" data-id="${u.id}">编辑权限</button>
              <button class="btn btn-small btn-ghost" data-act="reset" data-id="${u.id}">重置密码</button>
              <button class="btn btn-small btn-danger" data-act="del" data-id="${u.id}">删除</button>
            </div>`;
        return `<tr>
          <td>${u.id}</td>
          <td><b>${escapeHtml(u.username)}</b></td>
          <td>${escapeHtml(u.display_name || u.username)}</td>
          <td><span class="badge"${main ? ' data-tone="custom"' : ''}>${escapeHtml(accountLabel(u))}</span></td>
          <td>${perms}</td>
          <td style="font-size:12px;color:var(--muted);">${dateOnly(u.created_at)}</td>
          <td>${actions}</td>
        </tr>`;
      })
      .join('');
  },

  openPermEditor(u) {
    editingId = u.id;
    const box = $('#permEditor');
    box.classList.remove('hidden');
    $('#permEditorTitle').textContent = `编辑权限 — ${u.username}`;
    const current = Array.isArray(u.permissions) && u.permissions.length ? u.permissions : DEFAULT_SUB_CAPABILITIES;
    $('#permEditorMatrix').innerHTML = permMatrixHtml(current, 'edit');
    $('#permEditorMsg').textContent = '';
    $('#permEditorMsg').className = 'form-msg';
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },

  closePermEditor() {
    editingId = null;
    $('#permEditor').classList.add('hidden');
  },

  async savePermissions() {
    if (editingId == null) return;
    const msg = $('#permEditorMsg');
    const permissions = readPermMatrix(document, 'edit');
    const finalPerms = permissions.length ? permissions : DEFAULT_SUB_CAPABILITIES;
    msg.className = 'form-msg';
    msg.textContent = '保存中…';
    try {
      const res = await updateUserPermissions(editingId, finalPerms);
      if (res.notImplemented) {
        msg.textContent = '后端尚未实现权限矩阵接口——界面已就绪，接口上线后自动生效。';
        msg.className = 'form-msg err';
        return;
      }
      const u = users.find((x) => String(x.id) === String(editingId));
      if (u) u.permissions = finalPerms;
      reportActivity('permission_change', `更新子账号 #${editingId} 权限：${finalPerms.join(', ')}`, { target_type: 'user', target_id: editingId });
      toastOk('权限已保存。');
      this.closePermEditor();
      this.load();
    } catch (err) {
      msg.textContent = err.message || '保存失败';
      msg.className = 'form-msg err';
    }
  },
};
