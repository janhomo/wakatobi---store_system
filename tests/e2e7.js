// Tes label.html: tombol Unduh PNG / PDF / Word
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

srv({ action: 'addTempat', nama: 'Gudang' });
const bor = srv({ action: 'addUnit', jenis: { c: 'Bor/Breker', n: 'Bor', b: 'Bosch', m: 'GBH 2-28' }, f: { sl: 'Normal' } });
srv({ action: 'addUnit', jenisId: bor.jenisId, f: { sl: 'Normal' } });

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 500, height: 900 }, acceptDownloads: true });
  const lab = await ctx.newPage();
  const errors = []; lab.on('pageerror', e => errors.push(e.message));
  lab.on('console', m => { if (m.type() === 'error' && !/fonts|favicon|ERR_FAILED|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await lab.route('https://script.google.com/**', async route => { const out = env.doPost({ postData: { contents: route.request().postData() } }).getContent(); await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: out }); });
  await lab.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));

  await lab.goto('http://localhost:8127/'); await lab.waitForSelector('#pin:not([hidden])');
  await lab.fill('#pinInput', PIN); await lab.click('#pinBtn'); await lab.waitForSelector('#jlist .jcard');
  await lab.goto('http://localhost:8127/label.html'); await lab.waitForSelector('.lab');
  check('2 unit mesin tampil, tombol unduh aktif', (await lab.locator('.lab').count()) === 2 && !(await lab.isDisabled('#unduh')) && !(await lab.isDisabled('#unduhpdf')) && !(await lab.isDisabled('#unduhword')));

  // satu klik "Unduh PNG" mengunduh SEMUA label yang tampil (di sini 2 unit), satu file per unit
  const pngDownloads = [];
  const onDl = d => pngDownloads.push(d);
  lab.on('download', onDl);
  await lab.click('#unduh');
  await lab.waitForFunction(() => document.querySelector('#unduh').textContent === 'Unduh 2 PNG', { timeout: 8000 });
  lab.off('download', onDl);
  const pngNames = pngDownloads.map(d => d.suggestedFilename()).sort();
  check('unduh PNG: 2 file terunduh, nama sesuai kode (BOR-001.png, BOR-002.png)', pngNames.length === 2 && pngNames[0] === 'BOR-001.png' && pngNames[1] === 'BOR-002.png', pngNames);

  const [dlPdf] = await Promise.all([lab.waitForEvent('download'), lab.click('#unduhpdf')]);
  check('unduh PDF: nama file label.pdf', dlPdf.suggestedFilename() === 'label.pdf', dlPdf.suggestedFilename());
  const pdfPath = path.join(OUT, 'e2e7_label.pdf'); await dlPdf.saveAs(pdfPath);
  const pdfBuf = fs.readFileSync(pdfPath);
  check('unduh PDF: file valid (header %PDF, ukuran > 1KB)', pdfBuf.slice(0, 4).toString() === '%PDF' && pdfBuf.length > 1000, pdfBuf.length);

  const [dlWord] = await Promise.all([lab.waitForEvent('download'), lab.click('#unduhword')]);
  check('unduh Word: nama file label.doc', dlWord.suggestedFilename() === 'label.doc', dlWord.suggestedFilename());
  const docPath = path.join(OUT, 'e2e7_label.doc'); await dlWord.saveAs(docPath);
  const docTxt = fs.readFileSync(docPath, 'utf8');
  check('unduh Word: berisi kode BOR-001/002 dan gambar base64', (docTxt.includes('BOR-001') || docTxt.includes('BOR-002')) && docTxt.includes('data:image/png;base64'), docTxt.length);

  // filter sampai tidak ada hasil: tombol unduh nonaktif
  await lab.fill('#codes', 'TIDAK-ADA-999');
  check('filter kosong: tombol unduh nonaktif', await lab.isDisabled('#unduh') && await lab.isDisabled('#unduhpdf') && await lab.isDisabled('#unduhword'));

  check('no JS errors', errors.length === 0, errors.join(' | '));
  console.log(log.join('\n')); console.log(log.filter(l => l.startsWith('FAIL')).length + ' FAIL / ' + log.length);
  await browser.close(); server.close();
})().catch(e => { console.log(log.join('\n')); console.error('CRASH', e); process.exit(1); });
