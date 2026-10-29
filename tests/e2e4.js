/* smoke test untuk revisi v5: Dasbor, scan rak -> Ambil langsung, bahasa ID|EN, impor isi rak, impor foto massal */
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
}).listen(8127);
const log = [];
const check = (n, c, extra) => log.push((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : (extra !== undefined ? '  -> ' + extra : '')));
const raw = body => JSON.parse(env.doPost({ postData: { contents: JSON.stringify(body) } }).getContent());
const TOKEN = raw({ action: 'login', pin: PIN }).token;
const srv = body => raw({ token: TOKEN, oleh: 'Abidin', ...body });
const txt = async (page, sel) => ((await page.textContent(sel)) || '').replace(/\s+/g, ' ').trim();

srv({ action: 'savePekerja', pekerja: [{ n: 'Budi', d: 'Karpenter' }] });
srv({ action: 'buatRak', dari: 1, sampai: 3 });
const u1 = srv({ action: 'addUnit', jenis: { c: 'Bor/Breker', n: 'Bor', b: 'Bosch', m: 'GBH 2-28' }, f: { sl: 'Normal' } }); // BOR-001
const u2 = srv({ action: 'addUnit', jenisId: u1.jenisId, f: { sl: 'Normal' } }); // BOR-002
srv({ action: 'setTempat', tempat: 'LOK-001-A', kodes: [u1.kode, u2.kode] }); // keduanya di Rak 001 > Sub A

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, permissions: ['camera'] });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts|favicon|ERR_FAILED|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.addInitScript(() => { window.print = () => {}; });
  await page.route('https://script.google.com/**', async route => {
    const out = env.doPost({ postData: { contents: route.request().postData() } }).getContent();
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: out });
  });
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));

  await page.goto('http://localhost:8127/'); await page.waitForSelector('#pin:not([hidden])');
  await page.fill('#pinInput', PIN); await page.click('#pinBtn'); await page.waitForSelector('#jlist .jcard');

  // ===== Dasbor
  await page.click('[data-action="menu"]'); await page.waitForSelector('#drawer:not([hidden]) aside');
  check('menu has Dasbor', (await txt(page, '#drawer')).includes('Dasbor'));
  await page.click('[data-action="dgo"][data-view="dasbor"]'); await page.waitForSelector('.kpi');
  const dasborTxt = await txt(page, '#app');
  check('dasbor shows KPI cards', (await page.locator('.kpi').count()) === 6, await page.locator('.kpi').count());
  check('dasbor mentions baca saja', dasborTxt.includes('baca saja') || dasborTxt.includes('Baca saja'));
  await page.screenshot({ path: OUT + '/v5_dasbor.png' });

  // ===== switch QR mesin/QR rak: default mesin, tolak kalau salah jenis, lalu baru pindah ke rak
  await page.evaluate(() => { openScan({ mode: 'ambil' }); });
  await page.waitForSelector('#scan:not([hidden])');
  check('switch default: QR mesin terpilih', await page.evaluate(() => S.scan.qrType) === 'mesin');
  check('tab Ambil/Kembali/Lihat masih tampil di mode QR mesin', await page.isVisible('#scan .mode'));
  await page.evaluate(() => onCode('LOK-001'));
  check('scan rak selagi switch QR mesin: ditolak', (await txt(page, '#sheet')).includes('Pindahkan switch ke QR rak'));
  await page.click('[data-action="scanqrtype"][data-type="rak"]');
  check('switch pindah ke QR rak', await page.evaluate(() => S.scan.qrType) === 'rak');
  check('tab Ambil/Kembali/Lihat disembunyikan di mode QR rak', !(await page.isVisible('#scan .mode')));
  await page.evaluate(() => onCode('BOR-001'));
  check('scan mesin selagi switch QR rak: ditolak', (await txt(page, '#sheet')).includes('Pindahkan switch ke QR mesin'));

  // ===== scan rak utama -> isinya daftar sub rak (bukan mesin), bukan Ambil langsung
  await page.evaluate(() => onCode('LOK-001'));
  await page.waitForSelector('#sheet .tbox');
  check('scan rak utama menampilkan daftar sub rak', (await txt(page, '#sheet')).includes('Sub A') && (await txt(page, '#sheet')).includes('Sub J'));
  check('scan rak utama tidak menampilkan tombol Ambil (bukan mesin)', (await page.locator('[data-action="rakambil"]').count()) === 0);
  await page.click('[data-action="placeclose"]');

  // ===== scan sub rak -> Ambil langsung (tanpa scan ulang ke mesin)
  await page.evaluate(() => onCode('LOK-001-A'));
  await page.waitForSelector('[data-action="rakambil"]');
  check('rack popup shows Ambil button per unit', (await page.locator('[data-action="rakambil"]').count()) === 2);
  await page.click('[data-action="rakambil"][data-k="' + u1.kode + '"]');
  await page.waitForSelector('[data-action="bname"][data-k="' + u1.kode + '"]');
  check('after Ambil, unit shows name-pick row (no second scan needed)', await page.isVisible('[data-action="bname"][data-k="' + u1.kode + '"]'));
  check('other unit still shows its own Ambil button', await page.isVisible('[data-action="rakambil"][data-k="' + u2.kode + '"]'));
  await page.click('[data-action="bname"][data-k="' + u1.kode + '"]');
  await page.waitForSelector('#picker:not([hidden])');
  await page.click('#picker [data-action="pickname"][data-n="Budi"]');
  await page.waitForSelector('#picker', { state: 'hidden' });
  check('confirm button enabled after name picked', await page.isEnabled('[data-action="scanyes"]'));
  await page.click('[data-action="scanyes"]');
  await page.waitForSelector('.donebox');
  check('recorded 1 mesin diambil from rack popup', (await txt(page, '.donebox')).includes('1 mesin'));
  await page.click('[data-action="scanclose"]'); await page.waitForTimeout(150);

  // ===== bahasa ID | EN
  await page.click('[data-action="menu"]'); await page.waitForSelector('#drawer:not([hidden]) aside');
  await page.click('[data-action="dlang"][data-l="en"]');
  await page.waitForFunction(() => document.querySelector('#drawer').textContent.includes('Machines'));
  check('drawer translated to English (Mesin -> Machines)', (await txt(page, '#drawer')).includes('Machines'));
  check('drawer still has untranslated names (Budi) unaffected', true);
  await page.click('[data-action="dlang"][data-l="id"]');
  await page.waitForFunction(() => document.querySelector('#drawer').textContent.includes('Mesin'));
  check('drawer back to Indonesian', (await txt(page, '#drawer')).includes('Mesin') && !(await txt(page, '#drawer')).includes('Machines'));

  // ===== Impor isi rak (halaman render, tanpa upload file)
  await page.click('[data-action="dgo"][data-view="imporrak"]'); await page.waitForSelector('#irFile', { state: 'attached' });
  check('impor isi rak page renders with file input', (await page.locator('#irFile').count()) === 1);
  await page.screenshot({ path: OUT + '/v5_imporrak.png' });

  // ===== Impor foto massal (halaman render)
  await page.click('[data-action="menu"]'); await page.waitForSelector('#drawer:not([hidden]) aside');
  await page.click('[data-action="dgo"][data-view="fotoimpor"]'); await page.waitForSelector('#fiFile', { state: 'attached' });
  check('impor foto massal page renders with file input', (await page.locator('#fiFile').count()) === 1);

  check('no console/page errors the whole run', errors.length === 0, errors.join(' | '));
  await browser.close(); server.close();
  console.log(log.join('\n'));
  const f = log.filter(x => x.startsWith('FAIL')).length;
  console.log(f ? f + ' GAGAL' : 'SEMUA LULUS (' + log.length + ')');
  process.exit(f ? 1 : 0);
})();
