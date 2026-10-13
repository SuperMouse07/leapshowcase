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
  nav: '♚ Sub-accounts',
  capability: 'accounts:manage',
  panelClass: 'admin-users',

  mount(host) {
    host.innerHTML = `
      <div class="panel-head">
        <h2>♚ Sub-accounts</h2>
        <button class="btn btn-small btn-ghost" type="button" id="usersRefreshBtn">Refresh ⟳</button>
      </div>
      <p class="panel-hint">Main account P001 exclusively manages sub-accounts. Sub-accounts default to product management only; grant carousel / settings access below as needed.</p>
      <div class="table-wrap">
        <table class="admin-table">
          <thead><tr>
            <th>ID</th><th>Username</th><th>Display Name</th><th>Type</th><th>Permissions</th><th>Created</th><th>Actions</th>
          </tr></thead>
          <tbody id="userRows"><tr><td colspan="7" class="loading">Loading…</td></tr></tbody>
        </table>
      </div>

      <div class="panel hidden" id="permEditor" style="margin-top:16px;">
        <h2 id="permEditorTitle">Edit Permissions</h2>
        <div class="perm-matrix" id="permEditorMatrix"></div>
        <p class="form-msg" id="permEditorMsg"></p>
        <div class="form-actions">
          <button class="btn btn-small" type="button" id="permSaveBtn"><span>Save Permissions</span></button>
          <button class="btn btn-small btn-ghost" type="button" id="permCancelBtn"><span>Cancel</span></button>
        </div>
      </div>

      <form class="acct-add" id="acctAddForm">
        <label class="field">Username
          <input type="text" id="newUsername" placeholder="e.g. editor01" required>
        </label>
        <label class="field">Display Name
          <input type="text" id="newDisplayName" placeholder="Optional">
        </label>
        <label class="field">Password (min 6)
          <input type="password" id="newUserPass" minlength="6" placeholder="Initial password" required>
        </label>
        <label class="field">Confirm Password
          <input type="password" id="newUserPass2" minlength="6" placeholder="Repeat password" required>
        </label>
        <div class="field full">Permissions
          <div class="perm-matrix" id="newPermMatrix">${permMatrixHtml(DEFAULT_SUB_CAPABILITIES, 'new')}</div>
        </div>
        <div class="full">
          <p class="form-msg" id="acctMsg"></p>
          <button class="btn btn-small" type="submit" id="acctAddBtn"><span>Create Sub-account</span></button>
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
          title: 'Reset Password',
          label: `Enter new password for ${u.username}:`,
          placeholder: 'Min 6 characters',
          confirmText: 'Reset',
          validate: (v) => v.length < 6 ? 'Password must be at least 6 characters' : null
        });
        if (!pw) return;
        try {
          await resetUserPassword(u.id, pw);
          toastOk('Password reset.');
        } catch (err) {
          toastErr(err.message || 'Reset failed');
        }
        return;
      }
      if (act === 'del') {
        const ok = await confirmDialog({ title: 'Delete Sub-account', message: `Delete sub-account "${u.username}"? This cannot be undone.`, confirmText: 'Delete', danger: true });
        if (!ok) return;
        try {
          await deleteUser(u.id);
          reportActivity('account_delete', `Deleted sub-account ${u.username}`, { target_type: 'user', target_id: u.id });
          toastOk('Account deleted.');
          this.load();
        } catch (err) {
          toastErr(err.message || 'Delete failed');
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
        msg.textContent = 'Username and password are required.';
        return (msg.className = 'form-msg err');
      }
      if (password.length < 6) {
        msg.textContent = 'Password must be at least 6 characters.';
        return (msg.className = 'form-msg err');
      }
      if (password !== password2) {
        msg.textContent = 'The two passwords do not match.';
        return (msg.className = 'form-msg err');
      }
      const btn = $('#acctAddBtn', host);
      btn.disabled = true;
      msg.textContent = 'Creating…';
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
        reportActivity('account_create', `Created sub-account ${username}`, { target_type: 'user' });
        msg.textContent = `Sub-account "${username}" created.`;
        msg.className = 'form-msg ok';
        $('#acctAddForm', host).reset();
        $('#newPermMatrix', host).innerHTML = permMatrixHtml(DEFAULT_SUB_CAPABILITIES, 'new');
        this.load();
      } catch (err) {
        msg.textContent = err.message || 'Create failed';
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
      tbody.innerHTML = `<tr><td colspan="7" class="loading">Failed to load: ${escapeHtml(err.message)}</td></tr>`;
      return;
    }
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="loading">No accounts found.</td></tr>';
      return;
    }
    tbody.innerHTML = users
      .map((u) => {
        const main = isMainAccount(u);
        const perms = main
          ? '<span class="gallery-hint">All (main account)</span>'
          : permTagsHtml(u.permissions);
        const actions = main
          ? '<span class="gallery-hint">Protected</span>'
          : `<div class="row-actions">
              <button class="btn btn-small btn-ghost" data-act="perms" data-id="${u.id}">Permissions</button>
              <button class="btn btn-small btn-ghost" data-act="reset" data-id="${u.id}">Reset PW</button>
              <button class="btn btn-small btn-danger" data-act="del" data-id="${u.id}">Delete</button>
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
    $('#permEditorTitle').textContent = `Edit Permissions — ${u.username}`;
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
    msg.textContent = 'Saving…';
    try {
      const res = await updateUserPermissions(editingId, finalPerms);
      if (res.notImplemented) {
        msg.textContent = 'Permission matrix endpoint not implemented on the backend yet — the UI is ready and will sync once it lands.';
        msg.className = 'form-msg err';
        return;
      }
      const u = users.find((x) => String(x.id) === String(editingId));
      if (u) u.permissions = finalPerms;
      reportActivity('permission_change', `Updated sub-account #${editingId} permissions: ${finalPerms.join(', ')}`, { target_type: 'user', target_id: editingId });
      toastOk('Permissions saved.');
      this.closePermEditor();
      this.load();
    } catch (err) {
      msg.textContent = err.message || 'Save failed';
      msg.className = 'form-msg err';
    }
  },
};
