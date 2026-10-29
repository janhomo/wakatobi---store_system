/* smoke test: kolom maintenance custom per jenis (Atur kolom) + link PDF laporan servis */
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

srv({ action: 'savePekerja', pekerja: [{ n: 'Budi', d: 'Mekanik' }] });
const u1 = srv({ action: 'addUnit', jenis: { c: 'Bor/Breker', n: 'Genset 5000W', b: 'Honda', m: 'EG5000' }, f: { sl: 'Normal' } });

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

  await page.goto('http://localhost:8128/'); await page.waitForSelector('#pin:not([hidden])');
  await page.fill('#pinInput', PIN); await page.click('#pinBtn'); await page.waitForSelector('#jlist .jcard');

  // ===== buka halaman jenis -> tab Maintenance -> Atur kolom
  await page.evaluate(jid => go('jenis', { jid, tab: 'panduan' }), u1.jenisId);
  await page.waitForSelector('[data-action="skemaopen"]');
  check('tombol Atur kolom ada di tab Maintenance jenis', await page.isVisible('[data-action="skemaopen"]'));
  await page.click('[data-action="skemaopen"]');
  await page.waitForSelector('[data-action="skadd"]');
  check('belum ada kolom khusus', (await txt(page, '#app')).includes('Belum ada kolom khusus'));

  // tambah kolom "Jam operasi" (angka)
  await page.click('[data-action="skadd"]'); await page.waitForSelector('#skLabel');
  await page.fill('#skLabel', 'Jam operasi'); await page.selectOption('#skTipe', 'angka');
  await page.click('[data-action="sksave"]');
  await page.waitForSelector('#picker:not([hidden])');
  await page.click('#picker button:has-text("Abidin")');
  await page.waitForSelector('.skrow');
  check('kolom "Jam operasi" muncul dengan tipe Angka', (await txt(page, '.skrow')).includes('Jam operasi') && (await txt(page, '.skrow')).includes('Angka'));

  // tambah kolom "Tekanan oli normal?" (centang)
  await page.click('[data-action="skadd"]'); await page.waitForSelector('#skLabel');
  await page.fill('#skLabel', 'Tekanan oli normal'); await page.selectOption('#skTipe', 'centang');
  await page.click('[data-action="sksave"]');
  await page.waitForFunction(() => document.querySelectorAll('.skrow').length === 2);
  check('2 kolom sekarang ada', (await page.locator('.skrow').count()) === 2);

  // ubah nama kolom pertama
  await page.click('.skrow >> nth=0 >> [data-action="skedit"]'); await page.waitForSelector('#skLabel');
  check('form ubah terisi nilai lama', await page.inputValue('#skLabel') === 'Jam operasi');
  await page.fill('#skLabel', 'Jam operasi mesin'); await page.click('[data-action="sksave"]');
  await page.waitForFunction(() => document.querySelector('.skrow').textContent.includes('Jam operasi mesin'));
  check('nama kolom berubah', (await txt(page, '.skrow >> nth=0')).includes('Jam operasi mesin'));

  // hapus kolom kedua (butuh konfirmasi dua kali klik)
  await page.click('.skrow >> nth=1 >> [data-action="skdel"]');
  await page.waitForSelector('.skrow >> nth=1 >> [data-action="skdel"]:has-text("Yakin?")');
  await page.click('.skrow >> nth=1 >> [data-action="skdel"]');
  await page.waitForFunction(() => document.querySelectorAll('.skrow').length === 1);
  check('kolom terhapus, tersisa 1', (await page.locator('.skrow').count()) === 1);

  // ===== isi riwayat maintenance: kolom khusus + link PDF harus muncul di form
  await page.evaluate(k => go('profil', { kode: k, tab: 'maint' }), u1.kode);
  await page.click('[data-action="maintopen"]'); await page.waitForSelector('#maintForm:not([hidden])');
  check('kolom khusus "Jam operasi mesin" tampil di form isi maintenance', await page.isVisible('label[for="mx_k1"]'));
  check('field link PDF laporan servis tampil', await page.isVisible('#mPdf'));
  await page.fill('#mOleh', 'Budi'); await page.fill('#mCat', 'Servis rutin 500 jam');
  await page.fill('#mx_k1', '2140'); await page.fill('#mPdf', 'https://drive.google.com/laporan-gen002.pdf');
  await page.click('#maintForm button[type="submit"]');
  await page.waitForFunction(() => document.querySelector('#live-maint').textContent.includes('2140'));
  const maintTxt = await txt(page, '#live-maint');
  check('riwayat menunjukkan nilai kolom khusus (2140)', maintTxt.includes('Jam operasi mesin: 2140'), maintTxt);
  check('riwayat menunjukkan tautan laporan PDF', await page.isVisible('#live-maint a:has-text("Lihat laporan PDF")'));

  check('no console/page errors the whole run', errors.length === 0, errors.join(' | '));
  await browser.close(); server.close();
  console.log(log.join('\n'));
  const f = log.filter(x => x.startsWith('FAIL')).length;
  console.log(f ? f + ' GAGAL' : 'SEMUA LULUS (' + log.length + ')');
  process.exit(f ? 1 : 0);
})();
