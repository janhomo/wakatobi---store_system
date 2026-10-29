/* smoke test: hapus permanen unit dan jenis (mesin) */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const { makeEnv } = require('./gas_mock');
const SITE = path.resolve(__dirname, '../site'), OUT = path.resolve(__dirname, '../out');
fs.mkdirSync(OUT, { recursive: true });
const { env, ss } = makeEnv();
const setRow = k => ss.getSheetByName('Pengaturan').data.find(r => r && r[0] === k);
const PIN = setRow('PIN')[1];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(SITE, p);
  if (!f.startsWith(SITE) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  let body = fs.readFileSync(f);
  if (p === '/config.js') body = 'window.CONFIG={API_URL:"https://script.google.com/macros/s/TEST/exec"};';
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); res.end(body);
}).listen(8129);
const log = [];
const check = (n, c, extra) => log.push((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : (extra !== undefined ? '  -> ' + extra : '')));
const raw = body => JSON.parse(env.doPost({ postData: { contents: JSON.stringify(body) } }).getContent());
const TOKEN = raw({ action: 'login', pin: PIN }).token;
const srv = body => raw({ token: TOKEN, oleh: 'Abidin', ...body });
const rows = n => ss.getSheetByName(n).data.slice(1).filter(r => r && r[0]);
const txt = async (page, sel) => ((await page.textContent(sel)) || '').replace(/\s+/g, ' ').trim();

srv({ action: 'savePekerja', pekerja: [{ n: 'Budi', d: 'Mekanik' }] });
const u1 = srv({ action: 'addUnit', jenis: { c: 'Bor/Breker', n: 'Gerinda', b: 'Makita', m: 'GA4030' }, f: { sl: 'Normal' } });
const u2 = srv({ action: 'addUnit', jenisId: u1.jenisId, f: { sl: 'Normal' } });

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 400, height: 900 } });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts|favicon|ERR_FAILED|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.route('https://script.google.com/**', async route => {
    const out = env.doPost({ postData: { contents: route.request().postData() } }).getContent();
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: out });
  });
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));

  await page.goto('http://localhost:8129/'); await page.waitForSelector('#pin:not([hidden])');
  await page.fill('#pinInput', PIN); await page.click('#pinBtn'); await page.waitForSelector('#jlist .jcard');

  // ===== coba hapus jenis selagi masih ada 2 unit -> tombol tidak ada, cuma pesan
  await page.evaluate(jid => go('jedit', { jid }), u1.jenisId);
  await page.waitForSelector('h3:has-text("Hapus jenis")');
  check('belum bisa hapus jenis: tombol tidak ada', (await page.locator('[data-action="jhapus"]').count()) === 0);
  check('pesan menyebut jumlah unit', (await txt(page, '#app')).includes('Masih ada 2 unit'));

  // ===== hapus unit kedua (tidak sedang dibawa)
  await page.evaluate(k => go('profil', { kode: k, tab: 'unit' }), u2.kode);
  await page.evaluate(k => go('unit', { kode: k }), u2.kode);
  await page.waitForSelector('[data-action="uhapus"]');
  await page.click('[data-action="uhapus"]'); // langkah 1: tombol berubah jadi "Ya, hapus permanen"
  await page.waitForFunction(() => document.querySelector('[data-action="uhapus"]').textContent.includes('Ya, hapus permanen'));
  await page.click('[data-action="uhapus"]'); // langkah 2: konfirmasi
  await page.waitForSelector('#picker:not([hidden])');
  await page.click('#picker button:has-text("Abidin")');
  await page.waitForFunction(k => !U[k], u2.kode);
  check('unit kedua hilang dari state klien', await page.evaluate(k => !U[k], u2.kode));
  check('unit kedua hilang dari sheet', !rows('Unit').some(r => r[0] === u2.kode));

  // ===== unit yang masih dibawa tidak bisa dihapus
  srv({ action: 'addPengambilan', id: 'p1', tgl: '2026-10-29', nama: 'Budi', kode: u1.kode, waktu: '2026-10-29T08:00:00' });
  await page.evaluate(() => loadAll(true)); await page.waitForTimeout(300);
  await page.evaluate(k => go('unit', { kode: k }), u1.kode);
  await page.waitForSelector('h3:has-text("Hapus unit")');
  check('unit sedang dibawa: tombol hapus tidak ada, muncul peringatan', (await page.locator('[data-action="uhapus"]').count()) === 0 && (await txt(page, '#app')).includes('masih dibawa'));
  srv({ action: 'returnPengambilan', id: 'p1', waktu: '2026-10-29T10:00:00', kondisi: 'Baik' });
  await page.evaluate(() => loadAll(true)); await page.waitForTimeout(300);

  // ===== sekarang hapus unit terakhir, lalu jenis bisa dihapus
  await page.evaluate(k => go('unit', { kode: k }), u1.kode);
  await page.waitForSelector('[data-action="uhapus"]');
  await page.click('[data-action="uhapus"]');
  await page.waitForFunction(() => document.querySelector('[data-action="uhapus"]').textContent.includes('Ya, hapus permanen'));
  await page.click('[data-action="uhapus"]');
  await page.waitForFunction(k => !U[k], u1.kode);
  check('unit pertama hilang dari state klien', await page.evaluate(k => !U[k], u1.kode));
  check('unit pertama juga hilang dari sheet', !rows('Unit').some(r => r[0] === u1.kode));

  await page.evaluate(jid => go('jedit', { jid }), u1.jenisId);
  await page.waitForSelector('[data-action="jhapus"]');
  check('0 unit: tombol hapus jenis muncul', await page.isVisible('[data-action="jhapus"]'));
  await page.click('[data-action="jhapus"]');
  await page.waitForFunction(() => document.querySelector('[data-action="jhapus"]').textContent.includes('Ya, hapus permanen'));
  await page.click('[data-action="jhapus"]');
  await page.waitForFunction(() => S.view === 'mesin');
  check('kembali ke daftar mesin setelah hapus jenis', await page.evaluate(() => S.view) === 'mesin');
  check('jenis hilang dari sheet', !rows('Jenis').some(r => r[0] === u1.jenisId));

  check('no console/page errors the whole run', errors.length === 0, errors.join(' | '));
  await browser.close(); server.close();
  console.log(log.join('\n'));
  const f = log.filter(x => x.startsWith('FAIL')).length;
  console.log(f ? f + ' GAGAL' : 'SEMUA LULUS (' + log.length + ')');
  process.exit(f ? 1 : 0);
})();
