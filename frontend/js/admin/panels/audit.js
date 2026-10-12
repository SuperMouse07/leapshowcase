/**
 * admin/panels/audit.js · 操作审计面板（能力：audit:view，主账号专属）
 * ------------------------------------------------------------
 * ADR-0005：展示登录/退出、商品增改删、轮播/设置变更、子账号与权限变更等，
 * 含时间、操作人用户名与目标。支持按用户 / 操作类型 / 时间区间筛选
 * （后端未支持的筛选参数由 api/activity.js 在前端本地收敛，保证 UI 一致）。
 */
import { $, escapeHtml, dateTime } from '../../core/dom.js';
import { fetchActivity, actionMeta, AUDIT_ACTIONS } from '../../api/activity.js';
import { fetchUsers } from '../../api/users.js';
import { toastErr } from '../../ui/toast.js';

export default {
  id: 'auditPanel',
  nav: '♝ Audit Log',
  capability: 'audit:view',
  panelClass: 'admin-activity',

  mount(host) {
    host.innerHTML = `
      <div class="panel-head">
        <h2>♝ Audit Log</h2>
        <button class="btn btn-small btn-ghost" type="button" id="auditRefreshBtn">Refresh ⟳</button>
      </div>
      <div class="audit-filters">
        <label class="field">User
          <select id="auditUserFilter"><option value="">All Users</option></select>
        </label>
        <label class="field">Action
          <select id="auditActionFilter">
            <option value="">All Actions</option>
            ${Object.entries(AUDIT_ACTIONS).map(([k, v]) => `<option value="${k}">${escapeHtml(v.label)}</option>`).join('')}
          </select>
        </label>
        <label class="field">From
          <input type="date" id="auditFrom">
        </label>
        <label class="field">To
          <input type="date" id="auditTo">
        </label>
        <label class="field">Limit
          <select id="auditLimit">
            <option value="50">50</option>
            <option value="100" selected>100</option>
            <option value="200">200</option>
            <option value="500">500</option>
          </select>
        </label>
      </div>
      <div class="table-wrap">
        <table class="admin-table">
          <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Target</th><th>Detail</th></tr></thead>
          <tbody id="auditRows"><tr><td colspan="5" class="loading">Loading…</td></tr></tbody>
        </table>
      </div>`;

    $('#auditRefreshBtn', host).addEventListener('click', () => this.load());
    ['#auditUserFilter', '#auditActionFilter', '#auditLimit'].forEach((sel) =>
      $(sel, host).addEventListener('change', () => this.load())
    );
    ['#auditFrom', '#auditTo'].forEach((sel) => $(sel, host).addEventListener('change', () => this.load()));

    this.loadUserFilter();
    this.load();
  },

  async loadUserFilter() {
    try {
      const users = await fetchUsers();
      const sel = $('#auditUserFilter');
      if (!sel) return;
      sel.innerHTML =
        '<option value="">All Users</option>' +
        users
          .map((u) => `<option value="${u.id}">${escapeHtml(u.display_name || u.username)} (${escapeHtml(u.username)})</option>`)
          .join('');
    } catch {
      /* 用户筛选不可用时保留“All Users” */
    }
  },

  async load() {
    const tbody = $('#auditRows');
    tbody.innerHTML = '<tr><td colspan="5" class="loading">Loading…</td></tr>';
    try {
      const logs = await fetchActivity({
        limit: Number($('#auditLimit').value),
        user_id: $('#auditUserFilter').value || undefined,
        action: $('#auditActionFilter').value || undefined,
        from: $('#auditFrom').value || undefined,
        to: $('#auditTo').value ? `${$('#auditTo').value}T23:59:59` : undefined,
      });
      if (!logs.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading">No activity recorded for this filter.</td></tr>';
        return;
      }
      tbody.innerHTML = logs
        .map((l) => {
          const meta = actionMeta(l.action);
          const target = l.target_type ? `${escapeHtml(l.target_type)}${l.target_id ? ':' + escapeHtml(l.target_id) : ''}` : '—';
          return `<tr>
            <td style="font-size:12px;white-space:nowrap;">${dateTime(l.created_at)}</td>
            <td><b>${escapeHtml(l.display_name || l.username || 'Unknown')}</b></td>
            <td><span class="audit-action" data-kind="${escapeHtml(meta.kind)}">${escapeHtml(meta.label)}</span></td>
            <td style="font-size:11px;color:var(--muted);white-space:nowrap;">${target}</td>
            <td style="font-size:12px;color:var(--ink-2);max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(l.detail || '')}">${escapeHtml(l.detail || '')}</td>
          </tr>`;
        })
        .join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" class="loading">Error: ${escapeHtml(err.message)}</td></tr>`;
      if (err && err.message) toastErr(err.message);
    }
  },
};
