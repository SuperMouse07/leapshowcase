/**
 * admin/panels/stats.js · 服务器监控面板（能力：stats:view）
 * ------------------------------------------------------------
 * 展示数据库类型、应用数据/图片占用、磁盘容量与商品数量。
 * 数据来自 /stats/storage；不可达时降级为占位文案，不阻塞后台其余功能。
 */
import { $, formatBytes } from '../../core/dom.js';
import { http } from '../../core/http.js';

export default {
  id: 'statsPanel',
  nav: '♖ Server Monitor',
  capability: 'stats:view',
  panelClass: 'admin-stats',

  mount(host) {
    host.innerHTML = `
      <div class="stat"><span>Database</span><b id="statDbType">…</b></div>
      <div class="stat"><span>App Data (DB + Images)</span><b id="statTotal">…</b></div>
      <div class="stat"><span>Product Share of App Data</span><b id="statRatio" class="gold">…</b></div>
      <div class="stat"><span>Disk Total (Volume)</span><b id="statDiskTotal">…</b></div>
      <div class="stat"><span>Disk Free (Volume)</span><b id="statDiskFree">…</b></div>
      <div class="stat"><span>Products</span><b id="statCount">…</b></div>
      <div class="stat-bars">
        <div class="stat-bar-wrap">
          <div class="stat-bar"><i id="statBar"></i></div>
          <span class="stat-bar-label" id="statBarLabel"></span>
        </div>
        <div class="stat-bar-wrap">
          <div class="stat-bar"><i id="diskBar"></i></div>
          <span class="stat-bar-label" id="diskBarLabel"></span>
        </div>
      </div>`;
    this.reload();
  },

  async reload() {
    try {
      const s = await http.get('/stats/storage');
      $('#statDbType').textContent = s.dbType === 'postgresql' ? 'PostgreSQL' : 'SQLite';
      $('#statTotal').textContent = formatBytes(s.totalBytes);
      const ratio = s.totalBytes > 0 ? (s.productBytes / s.totalBytes) * 100 : 0;
      $('#statRatio').textContent = `${ratio.toFixed(1)}%`;
      $('#statDiskTotal').textContent = s.volumeTotalBytes > 0 ? formatBytes(s.volumeTotalBytes) : '—';
      $('#statDiskFree').textContent = s.volumeFreeBytes > 0 ? formatBytes(s.volumeFreeBytes) : '—';
      $('#statCount').textContent = `${s.productCount} item(s)`;
      $('#statBar').style.width = `${Math.min(100, ratio)}%`;
      $('#statBarLabel').textContent = `Product data ${formatBytes(s.productBytes)} of app data ${formatBytes(s.totalBytes)} (${ratio.toFixed(1)}%)`;
      const used = Math.max(0, (s.volumeTotalBytes || 0) - (s.volumeFreeBytes || 0));
      const diskPct = s.volumeTotalBytes > 0 ? (used / s.volumeTotalBytes) * 100 : 0;
      $('#diskBar').style.width = `${Math.min(100, diskPct).toFixed(1)}%`;
      $('#diskBarLabel').textContent =
        s.volumeTotalBytes > 0
          ? `Disk used (Volume) ${formatBytes(used)} of ${formatBytes(s.volumeTotalBytes)} (${diskPct.toFixed(1)}%)`
          : 'Disk capacity unavailable';
    } catch {
      $('#statBarLabel').textContent = 'Storage stats unavailable';
    }
  },
};
