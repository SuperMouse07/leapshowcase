/**
 * admin/panels/stats.js · 服务器监控面板（能力：stats:view）
 * ------------------------------------------------------------
 * 展示数据库类型、Volume 挂载点、磁盘容量/剩余/使用率与商品数量。
 * 数据来自 /stats/storage；不可达时降级为占位文案，不阻塞后台其余功能。
 * 每 60s 自动刷新，磁盘使用率 >80% 显示告警色（gold-deep），>95% 显示危险色（danger）。
 */
import { $, formatBytes } from '../../core/dom.js';
import { http } from '../../core/http.js';

export default {
  id: 'statsPanel',
  nav: '♖ 服务器监控',
  capability: 'stats:view',
  panelClass: 'admin-stats',

  mount(host) {
    host.innerHTML = `
      <div class="stat"><span>卷挂载点</span><b id="statMountPoint">…</b></div>
      <div class="stat"><span>磁盘总量（卷）</span><b id="statDiskTotal">…</b></div>
      <div class="stat"><span>磁盘剩余（卷）</span><b id="statDiskFree">…</b></div>
      <div class="stat"><span>磁盘使用率</span><b id="statDiskPct" class="gold">…</b></div>
      <div class="stat"><span>数据库</span><b id="statDbType">…</b></div>
      <div class="stat"><span>商品数量</span><b id="statCount">…</b></div>
      <div class="stat-bars">
        <div class="stat-bar-wrap">
          <div class="stat-bar"><i id="diskBar"></i></div>
          <span class="stat-bar-label" id="diskBarLabel"></span>
        </div>
      </div>`;

    const load = () => this.load();
    load();

    // Auto-refresh every 60s, with cleanup on page unload
    const refreshInterval = setInterval(load, 60000);
    window.addEventListener('beforeunload', () => clearInterval(refreshInterval), { once: true });
  },

  async load() {
    try {
      const s = await http.get('/stats/storage');
      $('#statMountPoint').textContent = s.volumeMountPoint || '—';
      $('#statDiskTotal').textContent = s.volumeTotalBytes > 0 ? formatBytes(s.volumeTotalBytes) : '—';
      $('#statDiskFree').textContent = s.volumeFreeBytes > 0 ? formatBytes(s.volumeFreeBytes) : '—';
      $('#statDbType').textContent = s.dbType === 'postgresql' ? 'PostgreSQL' : 'SQLite';
      $('#statCount').textContent = `${s.productCount} 件`;

      // Disk used % — prefer server-computed value, fall back to local calc
      const used = s.volumeUsedBytes != null
        ? s.volumeUsedBytes
        : Math.max(0, (s.volumeTotalBytes || 0) - (s.volumeFreeBytes || 0));
      const diskPct = s.volumeUsedPercent != null
        ? s.volumeUsedPercent
        : (s.volumeTotalBytes > 0 ? (used / s.volumeTotalBytes) * 100 : 0);

      const pctEl = $('#statDiskPct');
      pctEl.textContent = s.volumeTotalBytes > 0 ? `${diskPct.toFixed(1)}%` : '—';
      // Warning color on the readout: >95% danger, >80% gold-deep
      pctEl.classList.remove('gold');
      if (diskPct > 95) pctEl.style.color = 'var(--danger)';
      else if (diskPct > 80) pctEl.style.color = 'var(--gold-deep)';
      else { pctEl.style.color = ''; pctEl.classList.add('gold'); }

      const bar = $('#diskBar');
      bar.style.width = `${Math.min(100, diskPct).toFixed(1)}%`;
      // Warning color on the bar fill
      if (diskPct > 95) bar.style.background = 'var(--danger)';
      else if (diskPct > 80) bar.style.background = 'var(--gold-deep)';
      else bar.style.background = '';

      $('#diskBarLabel').textContent =
        s.volumeTotalBytes > 0
          ? `卷磁盘已用 ${formatBytes(used)} / ${formatBytes(s.volumeTotalBytes)}（${diskPct.toFixed(1)}%）`
          : '磁盘容量不可用';
    } catch {
      $('#diskBarLabel').textContent = '存储统计不可用';
    }
  },
};
