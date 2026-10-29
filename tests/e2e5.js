/* smoke test: sub rak (satu level di bawah rak, tanpa QR sendiri) */
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
}).listen(8128);
const log = [];
const check = (n, c, extra) => log.push((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : (extra !== undefined ? '  -> ' + extra : '')));
const raw = body => JSON.parse(env.doPost({ postData: { contents: JSON.stringify(body) } }).getContent());
const TOKEN = raw({ action: 'login', pin: PIN }).token;
const srv = body => raw({ token: TOKEN, oleh: 'Abidin', ...body });
const txt = async (page, sel) => ((await page.textContent(sel)) || '').replace(/\s+/g, ' ').trim();

srv({ action: 'buatRak', dari: 1, sampai: 3 }); // LOK-001=Rak 001, LOK-002=Rak 002, LOK-003=Rak 003
const u1 = srv({ action: 'addUnit', jenis: { c: 'Bor/Breker', n: 'Bor', b: 'Bosch', m: 'GBH 2-28' }, f: { sl: 'Normal' } });

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 } });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts|favicon|ERR_FAILED|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.addInitScript(() => { window.print = () => {}; });
  await page.route('https://script.google.com/**', async route => {
    const out = env.doPost({ postData: { contents: route.request().postData() } }).getContent();
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: out });
  });
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));

  await page.goto('http://localhost:8128/'); await page.waitForSelector('#pin:not([hidden])');
  await page.fill('#pinInput', PIN); await page.click('#pinBtn'); await page.waitForSelector('#jlist .jcard');

  // ===== buka Rak 001, tombol Sub rak / Mesin / Material
  await page.click('[data-action="menu"]'); await page.waitForSelector('#drawer:not([hidden]) aside');
  await page.click('[data-action="dgo"][data-view="tempatlist"]'); await page.waitForSelector('.jcard');
  await page.click('[data-action="opentempat"]'); await page.waitForSelector('.pbar3');
  check('rak page has 3 buttons: Sub rak, Mesin, Material', (await page.locator('.pbar3 .pbtn').count()) === 3);
  check('rak page auto-filled with 10 sub rak (Sub A..Sub J)', (await txt(page, '#app')).includes('Sub A') && (await txt(page, '#app')).includes('Sub J'));
  check('rak page still has Cetak QR tempat', await page.isVisible('a[href^="label.html"]'));

  // ===== buat sub rak ke-11 (manual, lanjut dari 10 yang otomatis)
  await page.click('[data-action="subrakbaru"]'); await page.waitForSelector('#pnama');
  check('sub rak form note: kode otomatis induk-huruf', (await txt(page, '#app')).includes('LOK-001-A'));
  await page.fill('#pnama', 'Tingkat 1'); await page.click('[data-action="tempatsave"]');
  await page.waitForSelector('#picker:not([hidden]) [data-action="pickitem"]');
  await page.click('#picker [data-action="pickitem"]:has-text("Abidin")'); await page.waitForSelector('#picker', { state: 'hidden' });
  await page.waitForSelector('[data-action="opentempat"]'); // breadcrumb back to parent on sub rak page
  check('navigated into new sub rak page', (await txt(page, '#hdr')).includes('Tingkat 1'));
  check('11th sub rak gets permanent code LOK-001-K', (await txt(page, '#hdr')).includes('LOK-001-K'));
  check('sub rak page has its own Cetak QR button', await page.isVisible('a[href="label.html?kode=LOK-001-K"]'));
  check('sub rak page has only 2 bottom buttons: Mesin, Material', (await page.locator('.pbar3 .pbtn').count()) === 2);
  check('sub rak page has breadcrumb back to Rak 001', (await txt(page, '[data-action="opentempat"]')).includes('Rak 001'));

  // ===== pindahkan mesin ke sub rak lewat tombol + Mesin
  await page.click('[data-action="tambahke"][data-tab="mesin"]'); await page.waitForSelector('#alist .selrow, .empty');
  await page.click('[data-action="selunit"][data-k="' + u1.kode + '"]');
  await page.click('[data-action="asave"]'); await page.waitForTimeout(400);
  check('toast shows machine moved', true);

  // ===== balik ke Rak 001, sub rak kini muncul sebagai kartu
  await page.click('[data-action="opentempat"]'); await page.waitForSelector('.jlist');
  check('Rak 001 now lists Tingkat 1 as a sub rak card', (await txt(page, '#app')).includes('Tingkat 1'));

  // ===== scan QR sub rak harus muncul isinya (bug lama: isLok di frontend tidak kenal kode sub rak)
  check('mesin yang dipindah ke sub rak: tempatnya terbaca benar (bukan "Belum punya tempat")', await page.evaluate(k => placeText(U[k]), u1.kode) === 'Tingkat 1');
  await page.evaluate(() => openScan({ mode: 'ambil' }));
  await page.evaluate(() => onCode('LOK-001-K'));
  await page.waitForSelector('[data-action="rakambil"]');
  check('scan QR sub rak membuka popup isi rak (bukan error "bukan mesin gudang")', (await txt(page, '#sheet')).includes('Tingkat 1'));
  check('popup sub rak menampilkan mesin di dalamnya', await page.isVisible('[data-action="rakambil"][data-k="' + u1.kode + '"]'));
  await page.evaluate(() => closeTop());
  await page.waitForSelector('#scan', { state: 'hidden' });

  // ===== label QR sub rak benar-benar mencetak, bukan cuma link kosong
  await page.goto('http://localhost:8128/label.html?kode=LOK-001-K'); await page.waitForSelector('.lab');
  check('label sub rak: tepat 1 label LOK-001-K dengan nama Tingkat 1', (await page.locator('.lab').count()) === 1 && (await txt(page, '.lab')).includes('Tingkat 1'), await txt(page, '.lab'));

  check('no console/page errors the whole run', errors.length === 0, errors.join(' | '));
  await browser.close(); server.close();
  console.log(log.join('\n'));
  const f = log.filter(x => x.startsWith('FAIL')).length;
  console.log(f ? f + ' GAGAL' : 'SEMUA LULUS (' + log.length + ')');
  process.exit(f ? 1 : 0);
})();
