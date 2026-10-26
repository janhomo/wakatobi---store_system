/* smoke test: cakupan terjemahan ID|EN yang diperluas (fragmen gabungan dengan data) */
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
const txt = async (page, sel) => ((await page.textContent(sel)) || '').replace(/\s+/g, ' ').trim();

srv({ action: 'buatRak', dari: 1, sampai: 2 });
const u1 = srv({ action: 'addUnit', jenis: { c: 'Bor/Breker', n: 'Bor', b: 'Bosch', m: 'GBH 2-28' }, f: { sl: 'Normal' } });
srv({ action: 'addUnit', jenisId: u1.jenisId, f: { sl: 'Rusak' } });
srv({ action: 'editUnit', kode: u1.kode, f: { loc: 'LOK-001' } });
srv({ action: 'savePekerja', pekerja: [{ n: 'Budi', d: 'Karpenter' }] });
srv({ action: 'addPengambilan', id: 'p1', kode: u1.kode, nama: 'Budi', jam: '2026-10-01T08:00:00' });
srv({ action: 'returnPengambilan', id: 'p1', waktu: '2026-10-01T10:00:00', kondisi: 'Baik' });

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
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

  await page.goto('http://localhost:8129/'); await page.waitForSelector('#pin:not([hidden])');
  await page.fill('#pinInput', PIN); await page.click('#pinBtn'); await page.waitForSelector('#jlist .jcard');

  // switch to English
  await page.click('[data-action="menu"]'); await page.waitForSelector('#drawer:not([hidden]) aside');
  await page.click('[data-action="dlang"][data-l="en"]');
  await page.waitForFunction(() => document.querySelector('#drawer').textContent.includes('Machines'));
  await page.click('[data-action="dgo"][data-view="mesin"]'); await page.waitForSelector('.jcard');

  // filter chips translated
  const filtersTxt = await txt(page, '.chips, .fchips, [role="tablist"]').catch(() => '');
  check('mesin page stats line translated (no bare Indonesian "tersedia/rusak")', !/tersedia|rusak|di luar/.test(await txt(page, '#stats')), await txt(page, '#stats'));

  // open the Bor name group, then its jenis page: pills + table headers
  await page.click('.jcard:has-text("Bor")'); await page.waitForTimeout(300);
  check('name-group level "brand/model" translated (not "merek/model")', !(await txt(page, '#app')).includes('merek/model'), await txt(page, '#app'));
  await page.click('.jcard:has-text("Bosch")'); await page.waitForSelector('.ucard');
  const appTxt = await txt(page, '#app');
  check('jenis page pill translated ("available"/"broken", not tersedia/rusak)', /available|broken/.test(appTxt) && !/\btersedia\b|\brusak\b/.test(appTxt), appTxt.slice(0, 200));
  check('unit card labels "Owner"/"Held"/"Place" translated', appTxt.includes('Owner') && appTxt.includes('Held') && appTxt.includes('Place'));
  check('unit card empty placeholders translated ("none"/"not filled in")', appTxt.includes('none') && appTxt.includes('not filled in'), appTxt.slice(0, 300));
  check('"Add unit" button translated', appTxt.includes('Add unit Bor'));

  // riwayat tab on this jenis page: "Ambil .. Kembali .. (Baik)" -> "Taken .. Returned .. (Good)"
  await page.click('[role="tab"]:has-text("History")');
  await page.waitForTimeout(400);
  const riwTxt = await txt(page, '#app');
  const riwOk = (/Taken/.test(riwTxt) && /Returned/.test(riwTxt) && /Good/.test(riwTxt)) || riwTxt.includes('No one has taken this machine yet.');
  check('riwayat tab fully translated (either history entries or the empty-state message)', riwOk, riwTxt.slice(0, 300));

  // dashboard
  await page.click('[data-action="back"]'); await page.waitForTimeout(200);
  await page.click('[data-action="back"]'); await page.waitForSelector('[data-action="menu"]');
  await page.click('[data-action="menu"]'); await page.waitForSelector('#drawer:not([hidden]) aside');
  await page.click('[data-action="dgo"][data-view="dasbor"]'); await page.waitForSelector('.kpi');
  check('dasbor header "View only · "', (await txt(page, '#hdr')).includes('View only'));

  // tempat list: filters/sub rak vocabulary already covered by e2e5; check place card pill here
  await page.click('[data-action="menu"]'); await page.waitForSelector('#drawer:not([hidden]) aside');
  await page.click('[data-action="dgo"][data-view="tempatlist"]'); await page.waitForSelector('.jcard');
  await page.waitForTimeout(300);
  const tempatTxt = await txt(page, '#app');
  check('tempat list has no bare "mesin" stats leftover (translated)', !/\d+ mesin tersimpan/.test(tempatTxt), tempatTxt.slice(0, 200));

  check('no console/page errors the whole run', errors.length === 0, errors.join(' | '));
  await browser.close(); server.close();
  console.log(log.join('\n'));
  const f = log.filter(x => x.startsWith('FAIL')).length;
  console.log(f ? f + ' GAGAL' : 'SEMUA LULUS (' + log.length + ')');
  process.exit(f ? 1 : 0);
})();
