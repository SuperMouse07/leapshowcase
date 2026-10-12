/**
 * tools/dev-server.mjs · 本地联调 / 联网测试用开发夹具（非生产后端）
 * ------------------------------------------------------------
 * 单一 Node 进程（仅内置模块）同时提供：
 *   1. 静态服务：以 frontend/ 为根（原生 ESM 需经 HTTP 加载，file:// 不可用）；
 *   2. 契约 API：/api/* 按 specs/contracts/README.md 与 frontend/js/api/endpoints.js
 *      的形状返回内存种子数据，供浏览器联调验证。
 *
 * 说明：
 *   - 数据仅存内存，重启即重置；不替代真实后端。
 *   - 预留契约端点（/auth/logout、/users/:id/permissions）故意返回 501，
 *     用于验证前端对“后端尚未实现”接口的优雅降级。
 *   - 种子账号：P001/admin123（主账号）、S001/sub123（子账号，仅商品写）、
 *     S002/temp123（子账号，首登强制改密）。
 * 用法：node tools/dev-server.mjs   （默认端口 3000，可以 PORT=xxxx 覆盖）
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'frontend');
const PORT = Number(process.env.PORT || 3000);
const IMG = '/sandbox/type-f-data/';
const pic = (name) => IMG + encodeURIComponent(name);

/* ---------------- 内存种子数据 ---------------- */
const users = [
  { id: 1, username: 'P001', password: 'admin123', display_name: 'Main Account', role: 'admin', account_type: 'main', permissions: null, must_change_password: false },
  { id: 2, username: 'S001', password: 'sub123', display_name: 'Sub Editor', role: 'tester', account_type: 'sub', permissions: ['products:write'], must_change_password: false },
  { id: 3, username: 'S002', password: 'temp123', display_name: 'Sub Newcomer', role: 'tester', account_type: 'sub', permissions: ['products:write'], must_change_password: true },
];
const ALL_CAPS = ['products:write', 'slides:write', 'settings:write', 'accounts:manage', 'audit:view', 'stats:view'];

let products = [
  { id: 'p-clock-01', name: 'Professional Chess Clock', category: 'chess-clock', price: 39.9, original_price: 49.9, moq: 50, stock: 120, description: 'Tournament-grade digital clock with gold-accent controls.', tags: ['可支持定制', '新品上市'], images: [pic('国际象棋计时器首页展示图.png'), pic('计时器主图轮播_01.png'), pic('计时器详情图_01.png')], details: [pic('计时器详情图_01.png'), pic('计时器详情图_02.png')], info: ['Precision quartz movement', 'High-contrast LCD', '19.6 x 8.5 x 6.8 cm · 350 g'], variants: [] },
  { id: 'p-board-01', name: 'Tournament Chess Board', category: 'chess-board', price: 59.0, original_price: 79.0, moq: 20, stock: 80, description: 'Roll-up vinyl board with regulation contrast squares.', tags: ['降价促销'], images: [pic('国际象棋棋盘首页展示图.png')], details: [], info: ['Regulation 57mm squares', 'Foldable'], variants: [] },
  { id: 'p-mug-01', name: 'Chess Theme Mug', category: 'lifestyle', price: 15.5, moq: 100, stock: 200, description: 'Ceramic mug with engraved chess motifs; club logo optional.', tags: ['可支持定制'], images: [pic('国际象棋主题马克杯首页展示图.png')], details: [], info: ['350ml ceramic', 'Dishwasher safe'], variants: [] },
  { id: 'p-timer-02', name: 'Digital Chess Timer Pro', category: 'chess-clock', price: 45.0, original_price: 60.0, moq: 30, stock: 60, description: 'Advanced timer with increment and delay modes.', tags: ['降价促销', '可支持定制'], images: [pic('计时器主图轮播_02.png'), pic('计时器详情图_02.png')], details: [pic('计时器详情图_03.png')], info: ['Fischer & Bronstein modes', 'AA battery'], variants: [] },
  { id: 'p-stop-01', name: 'Club Stopwatch', category: 'stopwatch', price: 25.0, stock: 150, description: 'Durable stopwatch for training sessions.', tags: ['新品上市'], images: ['/assets/placeholder.svg'], details: [], info: ['1/100s resolution', 'Water resistant'], variants: [] },
  { id: 'p-board-02', name: 'Wooden Foldable Board', category: 'chess-board', price: 49.0, stock: 40, description: 'Classic wooden board with felted base.', tags: [], images: ['/assets/placeholder.svg'], details: [], info: ['Solid wood veneer', 'Folds in half'], variants: [] },
];
let slides = [
  { id: 1, image: pic('国际象棋棋盘首页展示图.png'), alt: 'Tournament chess board', enabled: true, sort: 0 },
  { id: 2, image: pic('国际象棋计时器首页展示图.png'), alt: 'Professional chess clock', enabled: true, sort: 1 },
  { id: 3, image: pic('国际象棋主题马克杯首页展示图.png'), alt: 'Chess theme mug', enabled: true, sort: 2 },
];
const settings = {
  site_title: 'LEAP', logo_url: '/assets/logo.svg', announcement_html: '', contact_email: 'clubs@leap.example',
  contact_social: '@leapchess', hero_products: ['p-clock-01', 'p-board-01', 'p-mug-01'], product_tags: ['降价促销', '可支持定制', '新品上市'],
};
let activity = [];
let seq = 100;

/* ---------------- 工具 ---------------- */
const send = (res, status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
const readBody = (req) => new Promise((resolve) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch { resolve({}); } }); });
const publicUser = (u) => ({ id: u.id, username: u.username, display_name: u.display_name, role: u.role, account_type: u.account_type, permissions: u.permissions, must_change_password: u.must_change_password });
const capsOf = (u) => (u.account_type === 'main' ? ALL_CAPS : Array.isArray(u.permissions) ? u.permissions : []);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8' };

function authUser(req) {
  const m = (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const username = m[1].replace(/^tok-/, '');
  return users.find((u) => u.username === username) || null;
}
function requireCap(req, res, cap) {
  const u = authUser(req);
  if (!u) { send(res, 401, { error: 'Unauthorized' }); return null; }
  if (u.account_type !== 'main' && !capsOf(u).includes(cap)) { send(res, 403, { error: 'Forbidden' }); return null; }
  return u;
}
function log(u, action, detail = '') { activity.unshift({ id: ++seq, action, detail, user_id: u?.id ?? null, username: u?.username ?? 'anonymous', created_at: new Date().toISOString() }); }

/* ---------------- API 路由 ---------------- */
async function handleApi(req, res, pathname, query) {
  const method = req.method;
  const body = method === 'GET' ? {} : await readBody(req);
  const me = authUser(req);

  if (pathname === '/api/health') return send(res, 200, { ok: true, service: 'leap-dev-fixture' });

  if (pathname === '/api/auth/login' && method === 'POST') {
    const u = users.find((x) => x.username === body.username && x.password === body.password);
    if (!u) return send(res, 401, { error: 'Invalid credentials' });
    log(u, 'login', `User ${u.username} signed in`);
    return send(res, 200, { token: `tok-${u.username}`, user: publicUser(u) });
  }
  if (pathname === '/api/auth/me' && method === 'GET') return me ? send(res, 200, { user: publicUser(me) }) : send(res, 401, { error: 'Unauthorized' });
  if (pathname === '/api/auth/password' && method === 'PUT') {
    if (!me) return send(res, 401, { error: 'Unauthorized' });
    if (me.password !== (body.currentPassword ?? body.current_password)) return send(res, 400, { error: 'Current password incorrect' });
    me.password = body.newPassword ?? body.new_password; me.must_change_password = false;
    return send(res, 200, { ok: true });
  }
  if (pathname === '/api/auth/logout') return send(res, 501, { error: 'Not Implemented' }); // 预留契约
  if (pathname === '/api/auth/register' && method === 'POST') {
    const u = requireCap(req, res, 'accounts:manage'); if (!u) return;
    const nu = { id: ++seq, username: body.username, password: body.password, display_name: body.display_name || body.username, role: body.role || 'tester', account_type: body.account_type || 'sub', permissions: Array.isArray(body.permissions) ? body.permissions : ['products:write'], must_change_password: true };
    users.push(nu); log(u, 'account_create', `Created sub-account ${nu.username}`);
    return send(res, 200, { user: publicUser(nu) });
  }

  if (pathname === '/api/users' && method === 'GET') { const u = requireCap(req, res, 'accounts:manage'); if (!u) return; return send(res, 200, { users: users.map(publicUser) }); }
  let m = pathname.match(/^\/api\/users\/([^/]+)\/password$/);
  if (m && method === 'PUT') { const u = requireCap(req, res, 'accounts:manage'); if (!u) return; const t = users.find((x) => String(x.id) === m[1]); if (!t) return send(res, 404, { error: 'Not found' }); t.password = body.password; t.must_change_password = true; return send(res, 200, { ok: true }); }
  if (pathname.match(/^\/api\/users\/[^/]+\/permissions$/)) return send(res, 501, { error: 'Not Implemented' }); // 预留契约
  m = pathname.match(/^\/api\/users\/([^/]+)$/);
  if (m && method === 'DELETE') { const u = requireCap(req, res, 'accounts:manage'); if (!u) return; const t = users.find((x) => String(x.id) === m[1]); if (!t || t.account_type === 'main') return send(res, 400, { error: 'Cannot delete main account' }); users = users.filter((x) => x !== t); log(u, 'account_delete', `Deleted sub-account ${t.username}`); return send(res, 200, { ok: true }); }

  if (pathname === '/api/activity' && method === 'GET') { const u = requireCap(req, res, 'audit:view'); if (!u) return; return send(res, 200, { logs: activity.slice(0, Number(query.get('limit')) || 100) }); }
  if (pathname === '/api/activity' && method === 'POST') { if (!me) return send(res, 401, { error: 'Unauthorized' }); log(me, body.action, body.detail || ''); return send(res, 200, { ok: true }); }

  if (pathname === '/api/products' && method === 'GET') {
    let list = [...products];
    const cat = query.get('category'); if (cat) list = list.filter((p) => p.category === cat);
    const total = list.length;
    const limit = query.get('limit') ? Number(query.get('limit')) : null; const page = query.get('page') ? Number(query.get('page')) : 1;
    if (limit) list = list.slice((page - 1) * limit, page * limit);
    return send(res, 200, { products: list, total, page, limit: limit ?? total });
  }
  if (pathname === '/api/products' && method === 'POST') { const u = requireCap(req, res, 'products:write'); if (!u) return; const p = { variants: [], details: [], info: [], images: [], tags: [], ...body, id: body.id || `p-${++seq}` }; products.push(p); log(u, 'product_create', `Created product ${p.name}`); return send(res, 200, { product: p }); }
  m = pathname.match(/^\/api\/products\/([^/]+)\/storage$/);
  if (m && method === 'GET') { const u = requireCap(req, res, 'products:write'); if (!u) return; return send(res, 200, { product_id: m[1], storage: { images: 3, size_kb: 512 } }); }
  m = pathname.match(/^\/api\/products\/([^/]+)$/);
  if (m && method === 'GET') { const p = products.find((x) => String(x.id) === m[1]); return p ? send(res, 200, { product: p }) : send(res, 404, { error: 'Not found' }); }
  if (m && method === 'PUT') { const u = requireCap(req, res, 'products:write'); if (!u) return; const p = products.find((x) => String(x.id) === m[1]); if (!p) return send(res, 404, { error: 'Not found' }); Object.assign(p, body); log(u, 'product_update', `Updated product ${p.name}`); return send(res, 200, { product: p }); }
  if (m && method === 'DELETE') { const u = requireCap(req, res, 'products:write'); if (!u) return; const p = products.find((x) => String(x.id) === m[1]); if (!p) return send(res, 404, { error: 'Not found' }); products = products.filter((x) => x !== p); log(u, 'product_delete', `Deleted product ${p.name}`); return send(res, 200, { ok: true }); }

  if (pathname === '/api/slides' && method === 'GET') { const all = query.get('all') === '1' && me; return send(res, 200, { slides: (all ? slides : slides.filter((s) => s.enabled)).sort((a, b) => a.sort - b.sort) }); }
  if (pathname === '/api/slides' && method === 'POST') { const u = requireCap(req, res, 'slides:write'); if (!u) return; const s = { enabled: true, sort: slides.length, ...body, id: ++seq }; slides.push(s); log(u, 'slide_change', 'Added slide'); return send(res, 200, { slide: s }); }
  m = pathname.match(/^\/api\/slides\/([^/]+)$/);
  if (m && method === 'PUT') { const u = requireCap(req, res, 'slides:write'); if (!u) return; const s = slides.find((x) => String(x.id) === m[1]); if (!s) return send(res, 404, { error: 'Not found' }); Object.assign(s, body); log(u, 'slide_change', 'Updated slide'); return send(res, 200, { slide: s }); }
  if (m && method === 'DELETE') { const u = requireCap(req, res, 'slides:write'); if (!u) return; slides = slides.filter((x) => String(x.id) !== m[1]); log(u, 'slide_change', 'Removed slide'); return send(res, 200, { ok: true }); }

  if (pathname === '/api/settings' && method === 'GET') return send(res, 200, { settings });
  if (pathname === '/api/settings' && method === 'PUT') { const u = requireCap(req, res, 'settings:write'); if (!u) return; settings[body.key] = body.value; log(u, 'settings_change', `Changed ${body.key}`); return send(res, 200, { ok: true }); }
  if (pathname === '/api/settings/logo' && method === 'POST') { const u = requireCap(req, res, 'settings:write'); if (!u) return; return send(res, 200, { url: '/assets/logo.svg' }); }

  if (pathname === '/api/stats/storage' && method === 'GET') { const u = requireCap(req, res, 'stats:view'); if (!u) return; return send(res, 200, { db: { products: products.length, users: users.length, slides: slides.length, logs: activity.length }, uploads: { count: 12, size_kb: 2048 } }); }

  return send(res, 404, { error: 'Not found' });
}

/* ---------------- 静态服务 ---------------- */
function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
}

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname.startsWith('/api/')) return handleApi(req, res, u.pathname, u.searchParams);
  return serveStatic(req, res, u.pathname);
}).listen(PORT, () => console.log(`[dev-fixture] http://localhost:${PORT}  (static=${ROOT})`));
