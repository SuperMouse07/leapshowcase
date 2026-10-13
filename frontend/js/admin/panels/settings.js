/**
 * admin/panels/settings.js · 全站设置面板（能力：settings:write）
 * ------------------------------------------------------------
 * 站点标题 / LOGO 上传 / 首页公告 / 联系方式，单次批量 PUT 原子保存（契约见 api/settings.js）。
 * 保存后经 BroadcastChannel 通知前台标签页即时同步（core/events.broadcastSettings）。
 */
import { $ } from '../../core/dom.js';
import { SITE } from '../../core/config.js';
import { broadcastSettings } from '../../core/events.js';
import { fetchSettings, updateSettings, uploadLogo } from '../../api/settings.js';
import { toastOk, toastErr } from '../../ui/toast.js';

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
let pickedLogoData = '';

export default {
  id: 'settingsPanel',
  nav: '♛ Site Settings',
  capability: 'settings:write',
  panelClass: 'admin-settings',

  mount(host) {
    host.innerHTML = `
      <div class="panel-head">
        <h2>♛ Site Settings</h2>
        <button class="btn btn-small btn-ghost" type="button" id="settingsRefreshBtn">Refresh ⟳</button>
      </div>
      <form id="settingsForm">
        <label class="field">Site Title
          <input type="text" id="setSiteTitle" maxlength="120" placeholder="LEAP">
        </label>
        <div class="field">LOGO — shown in the navbar &amp; footer
          <div class="logo-row">
            <img id="setLogoPreview" src="${SITE.defaultLogo}" alt="Current LOGO">
            <input type="file" id="setLogoFile" accept="image/*" hidden>
            <button class="btn btn-small btn-ghost" type="button" id="setLogoPickBtn">Choose Image…</button>
            <button class="btn btn-small" type="button" id="setLogoUploadBtn" disabled>Upload &amp; Apply</button>
          </div>
        </div>
        <label class="field">Home Announcement — supports &lt;strong&gt; / &lt;em&gt; / &lt;br&gt;
          <textarea id="setAnnouncement" rows="3" placeholder="Welcome to LEAP — new arrivals every month."></textarea>
        </label>
        <label class="field">Contact Email
          <input type="email" id="setContactEmail" placeholder="hello@example.com">
        </label>
        <label class="field">Contact / Social Links
          <textarea id="setContactSocial" rows="2" placeholder="Instagram @leapchess · WeChat LEAP_Chess"></textarea>
        </label>
        <button class="btn" type="submit" id="settingsSaveBtn"><span>Save Settings</span></button>
      </form>`;

    $('#settingsRefreshBtn', host).addEventListener('click', () => this.load());
    $('#setLogoPickBtn', host).addEventListener('click', () => $('#setLogoFile', host).click());
    $('#setLogoFile', host).addEventListener('change', (e) => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      if (f.size > MAX_IMAGE_SIZE) return toastErr('Image exceeds the 8MB limit.');
      const rd = new FileReader();
      rd.onload = () => {
        pickedLogoData = String(rd.result || '');
        $('#setLogoPreview', host).src = pickedLogoData;
        $('#setLogoUploadBtn', host).disabled = false;
      };
      rd.readAsDataURL(f);
    });
    $('#setLogoUploadBtn', host).addEventListener('click', async () => {
      if (!pickedLogoData) return;
      const btn = $('#setLogoUploadBtn', host);
      btn.disabled = true;
      try {
        const { url } = await uploadLogo(pickedLogoData);
        pickedLogoData = '';
        $('#setLogoPreview', host).src = url;
        toastOk('Logo uploaded — applied site-wide.');
        broadcastSettings();
      } catch (err) {
        toastErr(`Logo upload failed: ${err.message}`);
        btn.disabled = false;
      }
    });
    $('#settingsForm', host).addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#settingsSaveBtn', host);
      btn.disabled = true;
      // 单次批量提交：后端原子写入，要么全部生效、要么整体失败（不再有“部分成功”假象）
      const settings = {
        site_title: $('#setSiteTitle', host).value.trim(),
        announcement_html: $('#setAnnouncement', host).value,
        contact_email: $('#setContactEmail', host).value.trim(),
        contact_social: $('#setContactSocial', host).value.trim(),
      };
      try {
        await updateSettings(settings);
        toastOk('Settings saved — live on the frontend.');
        broadcastSettings();
      } catch (err) {
        toastErr(err.message || 'Save failed');
      } finally {
        btn.disabled = false;
      }
    });

    this.load();
  },

  async load() {
    try {
      const s = await fetchSettings();
      $('#setSiteTitle').value = s.site_title || '';
      $('#setAnnouncement').value = s.announcement_html || '';
      $('#setContactEmail').value = s.contact_email || '';
      $('#setContactSocial').value = s.contact_social || '';
      $('#setLogoPreview').src = s.logo_url || SITE.defaultLogo;
      const navLogo = document.querySelector('.nav-logo img');
      if (navLogo) navLogo.src = s.logo_url || SITE.defaultLogo;
    } catch (err) {
      toastErr(`Load settings failed: ${err.message}`);
    }
  },
};
