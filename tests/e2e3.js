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
}).listen(8126);
const log = [];
const check = (n, c, extra) => log.push((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : (extra !== undefined ? '  -> ' + extra : '')));
const rows = name => ss.getSheetByName(name).data.slice(1).filter(r => r && r[0]);
const raw = body => JSON.parse(env.doPost({ postData: { contents: JSON.stringify(body) } }).getContent());
const TOKEN = raw({ action: 'login', pin: PIN }).token;
const srv = body => raw({ token: TOKEN, oleh: 'Abidin', ...body });
const txt = async (page, sel) => ((await page.textContent(sel)) || '').replace(/\s+/g, ' ').trim();
const unitRow = k => rows('Unit').find(r => r[0] === k);

// ---- data awal: Bor punya 2 merek; dua gurinda dengan merek+model sama tapi nama beda; kipas tanpa merek
srv({ action: 'addTempat', nama: 'Gudang Karpenter' });
srv({ action: 'savePekerja', pekerja: [{ n: 'Budi', d: 'Karpenter' }, { n: 'Andi', d: 'Pembesian' }, { n: 'Citra', d: 'Listrik' }] });
const bor = srv({ action: 'addUnit', jenis: { c: 'Bor/Breker', n: 'Bor', b: 'Bosch', m: 'GBH 2-28' }, f: { sl: 'Normal', loc: 'LOK-001' } });
srv({ action: 'addUnit', jenisId: bor.jenisId, f: { sl: 'Normal' } });
const bor2 = srv({ action: 'addUnit', jenis: { c: 'Bor/Breker', n: 'Bor', b: 'Makita', m: 'HR2470' }, f: { sl: 'Servis' } });
const g1 = srv({ action: 'addUnit', jenis: { c: 'Gurinda/Mesin Potong', n: 'Gurinda K 710 W', b: 'Bosch', m: 'GWS 700' }, f: { sl: 'Normal', u: '1' } });
srv({ action: 'addUnit', jenisId: g1.jenisId, f: { sl: 'Normal', u: '2' } });
const g2 = srv({ action: 'addUnit', jenis: { c: 'Gurinda/Mesin Potong', n: 'Gurinda K 700 W', b: 'Bosch', m: 'GWS 700' }, f: { sl: 'Rusak', u: '3' } });
const kip = srv({ action: 'addUnit', jenis: { c: 'Peralatan Udara', n: 'Kipas Angin 16 inci', b: '', m: '' }, f: { sl: 'Normal' } });

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-file-for-fake-video-capture=' + path.resolve(__dirname, 'cam4.y4m')]
  });
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, permissions: ['camera'] });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts|favicon|ERR_FAILED|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.addInitScript(() => { window.print = () => {}; });
  let delay = 0;
  await page.route('https://script.google.com/**', async route => {
    if (delay) await new Promise(r => setTimeout(r, delay));
    const out = env.doPost({ postData: { contents: route.request().postData() } }).getContent();
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: out });
  });
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  const pickEd = async (n) => { await page.waitForSelector('#picker:not([hidden]) [data-action="pickitem"]'); await page.click('#picker [data-action="pickitem"]:has-text("' + n + '")'); await page.waitForSelector('#picker', { state: 'hidden' }); };

  await page.goto('http://localhost:8126/'); await page.waitForSelector('#pin:not([hidden])');
  await page.fill('#pinInput', PIN); await page.click('#pinBtn'); await page.waitForSelector('#jlist .jcard');

  // ===== 1. + Mesin baru di header, tidak ada "Tambah mesin baru" di menu
  check('header has + Mesin baru button', (await txt(page, '#hdr [data-action="tambah"]')).includes('Mesin baru'));
  check('no floating button on Mesin', await page.isHidden('#fab'));
  await page.click('[data-action="menu"]'); await page.waitForSelector('#drawer:not([hidden]) aside');
  check('menu has no "Tambah mesin baru"', !(await txt(page, '#drawer')).includes('Tambah mesin baru'));
  check('menu has Saran with badge', (await txt(page, '#drawer')).includes('Saran') && await page.isVisible('#drawer .cnt.soft'));
  await page.goBack(); await page.waitForTimeout(150);

  // ===== 2. tiga tingkat
  check('list: one bar per name (4 names)', (await page.locator('#jlist .jcard').count()) === 4 , await page.locator('#jlist .jcard').count());
  const borBar = await txt(page, '.jcard[data-nm="bor"]');
  check('Bor bar: 2 merek/model, 3 unit', borBar.includes('2 merek/model') && borBar.includes('3 unit'), borBar);
  await page.screenshot({ path: OUT + '/v4_mesin.png' });
  await page.click('.jcard[data-nm="bor"]'); await page.waitForSelector('.jcard[data-id]');
  check('level 2: one bar per merek/model', (await page.locator('.jcard[data-id]').count()) === 2 && (await txt(page, '#app')).includes('Bosch') && (await txt(page, '#app')).includes('Makita'));
  check('level 2: panduan status shown', (await txt(page, '#app')).includes('Belum ada panduan'));
  check('level 2: Tambah merek/model', await page.isVisible('[data-action="tambahjenis"]'));
  check('level 2 header: name + counts', (await txt(page, '#hdr')).includes('Bor') && (await txt(page, '#hdr')).includes('2 merek/model'), await txt(page, '#hdr'));
  await page.screenshot({ path: OUT + '/v4_nama.png' });
  await page.click('.jcard[data-id="' + bor.jenisId + '"]'); await page.waitForSelector('.ucard');
  const tabs = await txt(page, '.utabs');
  check('level 3 tabs: Unit | Maintenance | Riwayat', tabs.includes('Unit') && tabs.includes('Maintenance') && tabs.includes('Riwayat'), tabs);
  const c1 = await txt(page, '#u-BOR-001');
  check('unit card: "Unit 1 · BOR-001", Pemilik, Dipegang, Ambil, edit', c1.includes('Unit 1') && c1.includes('BOR-001') && c1.includes('Pemilik') && c1.includes('Dipegang') && await page.isVisible('[data-action="uambil"][data-k="BOR-001"]') && await page.isVisible('[data-action="uedit"][data-k="BOR-001"]'), c1);
  check('"Ubah merek, tipe, dan nama" button', (await txt(page, 'button[data-action="jedit"].btn')).includes('Ubah merek, tipe, dan nama'));
  await page.click('[data-action="jtab"][data-t="panduan"]'); await page.waitForSelector('#live-pd');
  check('Maintenance tab shows panduan area', (await txt(page, '#app')).includes('Catatan maintenance unit'));
  await page.click('[data-action="jtab"][data-t="unit"]');
  await page.screenshot({ path: OUT + '/v4_jenis.png', fullPage: true });

  // ===== 3. hanya 3 pengedit + pemilik
  await page.click('[data-action="uedit"][data-k="BOR-001"]'); await page.waitForSelector('#upm-l');
  await page.click('[data-action="pickpm"]'); await page.waitForSelector('#picker:not([hidden]) [data-action="pickitem"]');
  const dep = await txt(page, '#picker');
  check('Pemilik picker lists departments from Pekerja', dep.includes('Karpenter') && dep.includes('Pembesian') && dep.includes('Listrik') && dep.includes('Belum diisi'), dep);
  await page.click('#picker [data-action="pickitem"]:has-text("Karpenter")'); await page.waitForSelector('#picker', { state: 'hidden' });
  check('Pemilik label updated', (await txt(page, '#upm-l')) === 'Karpenter');
  await page.click('[data-action="usave"]'); await page.waitForSelector('#picker:not([hidden]) [data-action="pickitem"]');
  const who = await txt(page, '#picker');
  check('"Siapa Anda?" lists only the 3 editors', who.includes('Abidin') && who.includes('Vikar') && who.includes('La Ode Riyan Syaputra') && !who.includes('Budi') && (await page.locator('#picker [data-action="pickitem"]').count()) === 3, who);
  await page.screenshot({ path: OUT + '/v4_siapa.png' });
  await pickEd('Vikar'); await page.waitForSelector('.ucard'); await page.waitForTimeout(300);
  check('Pemilik saved in sheet (column L), log by Vikar', unitRow('BOR-001')[11] === 'Karpenter' && rows('Log Perubahan').some(r => r[1] === 'BOR-001' && r[4] === 'Vikar' && String(r[3]).includes('Pemilik')), JSON.stringify(unitRow('BOR-001')));
  check('card shows Pemilik Karpenter', (await txt(page, '#u-BOR-001')).includes('Karpenter'));
  check('server refuses a non-editor name', srv({ action: 'editUnit', kode: 'BOR-001', f: { sl: 'Servis' }, oleh: 'Budi' }).ok === false);

  // ===== 4. loading
  delay = 900;
  await page.click('[data-action="uedit"][data-k="BOR-002"]'); await page.waitForSelector('#uu');
  await page.click('#uk [data-v="Servis"]');
  await page.click('[data-action="usave"]'); await page.waitForTimeout(250);
  check('loading: progress bar visible', await page.isVisible('#prog'));
  check('loading: button disabled with spinner + Menyimpan', await page.isDisabled('[data-action="usave"]') && (await txt(page, '[data-action="usave"]')).includes('Menyimpan') && await page.isVisible('[data-action="usave"] .spin'));
  check('loading: status line says wait, do not close', (await txt(page, '#savebar')).includes('Menyimpan ke Sheet') && (await txt(page, '#savebar')).includes('jangan tutup'));
  await page.screenshot({ path: OUT + '/v4_loading.png' });
  await page.click('[data-action="usave"]', { force: true, timeout: 500 }).catch(() => {});
  await page.waitForSelector('.ucard'); delay = 0; await page.waitForTimeout(300);
  check('after save: progress gone, "Tersimpan" shown', await page.isHidden('#prog') && (await txt(page, '#savebar')).includes('Tersimpan'), await txt(page, '#savebar'));
  check('only one save happened', rows('Log Perubahan').filter(r => r[1] === 'BOR-002' && r[2] === 'Ubah unit').length === 1);

  // ===== 5. Saran
  await page.goto('http://localhost:8126/'); await page.waitForSelector('#jlist .jcard');
  await page.click('[data-action="menu"]'); await page.click('#drawer [data-view="saran"]'); await page.waitForSelector('.saran');
  const sr = await txt(page, '#live-saran');
  check('Saran: same merek+model different names', sr.includes('Merek dan model sama, nama berbeda') && sr.includes('Gurinda K 710 W') && sr.includes('Gurinda K 700 W'), sr);
  check('Saran: default name Gurinda kecil', (await page.inputValue('.saran[data-sid="n:bosch|gws 700"] input')) === 'Gurinda kecil');
  check('Saran: empty merek and model for Kipas', sr.includes('Merek masih kosong') && sr.includes('Model masih kosong') && sr.includes('Kipas Angin 16 inci'));
  check('Saran: nothing changed yet', rows('Jenis').filter(r => r[2].startsWith('Gurinda')).length === 2 && unitRow('BOR-001') !== undefined);
  await page.screenshot({ path: OUT + '/v4_saran.png', fullPage: true });
  await page.click('.saran[data-sid="m:' + kip.jenisId + '"] [data-action="srtolak"]'); await page.waitForTimeout(500);
  check('Tolak remembered in Pengaturan and card hidden', String(ss.getSheetByName('Pengaturan').data.find(r => r && r[0] === 'SARAN DITOLAK')[1]).includes('m:' + kip.jenisId) && (await page.locator('.saran[data-sid="m:' + kip.jenisId + '"]').count()) === 0);
  await page.fill('.saran[data-sid="b:' + kip.jenisId + '"] input', 'Krisbow');
  await page.click('.saran[data-sid="b:' + kip.jenisId + '"] [data-action="srterima"]'); await page.waitForTimeout(700);
  check('Terima merek: saved in sheet', rows('Jenis').find(r => r[0] === kip.jenisId)[3] === 'Krisbow');
  await page.click('.saran[data-sid="n:bosch|gws 700"] [data-action="srterima"]'); await page.waitForTimeout(1200);
  const gj = rows('Jenis').filter(r => r[2].startsWith('Gurinda') && !String(r[5]).startsWith('Digabung'));
  const gu = rows('Unit').filter(r => gj.some(j => j[0] === r[1]));
  check('Terima nama: merged into one "Gurinda kecil" with 3 units', gj.length >= 1 && rows('Unit').filter(r => r[1] === gj.find(j => j[2] === 'Gurinda kecil')[0]).length === 3 && gu.length === 3, JSON.stringify(rows('Jenis')));
  check('Saran card for names gone', (await page.locator('.saran[data-sid="n:bosch|gws 700"]').count()) === 0);

  // ===== 6. rak otomatis + baris per unit
  await page.click('[data-action="menu"]'); await page.click('#drawer [data-view="tempatlist"]'); await page.waitForSelector('[data-action="rakbuat"]');
  await page.click('[data-action="rakbuat"]'); await page.waitForTimeout(1200);
  check('50 racks created (Rak 001..Rak 050)', rows('Tempat').filter(r => /^Rak \d{3}$/.test(r[1])).length === 50 && rows('Tempat').some(r => r[1] === 'Rak 001') && rows('Tempat').some(r => r[1] === 'Rak 050'), rows('Tempat').length);
  check('create-racks button gone after', (await page.locator('[data-action="rakbuat"]').count()) === 0);
  srv({ action: 'editUnit', kode: 'BOR-001', f: { loc: 'LOK-002' } }); srv({ action: 'editUnit', kode: 'BOR-002', f: { loc: 'LOK-002' } });
  await page.click('[data-action="dgo"]', { timeout: 500 }).catch(() => {});
  await page.reload(); await page.waitForSelector('#jlist');
  await page.goto('http://localhost:8126/#LOK-002'); await page.waitForSelector('.trow');
  const rk = await txt(page, '.tbox');
  check('rack page: one row per unit with "Unit 1 · BOR-001" and Milik', (await page.locator('.tbox .trow').count()) === 2 && rk.includes('Unit 1 · BOR-001') && rk.includes('Unit 2 · BOR-002') && rk.includes('Milik Karpenter'), rk);
  await page.screenshot({ path: OUT + '/v4_rak.png' });

  // ===== 7. QR hanya di dalam kotak
  await page.goto('http://localhost:8126/'); await page.waitForSelector('#jlist');
  await page.click('[data-action="scan"]'); await page.waitForSelector('#scan:not([hidden])');
  await page.waitForTimeout(6000);
  check('QR outside the small box is NOT read', (await page.locator('#sheet .bitem').count()) === 0 && (await txt(page, '#hint')).includes('Arahkan'), await txt(page, '#sheet'));
  await page.addStyleTag({ content: '#scan .frame{position:fixed!important;left:50%;top:50%;transform:translate(-50%,-50%)}' });
  await page.waitForSelector('#sheet .bitem', { timeout: 20000 });
  check('QR inside the box IS read', (await page.locator('#sheet .bitem').count()) === 1);
  await page.click('[data-action="scanclose"]');

  // ===== 8. label roll
  const lab = await ctx.newPage();
  await lab.route('https://script.google.com/**', async route => { const out = env.doPost({ postData: { contents: route.request().postData() } }).getContent(); await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: out }); });
  await lab.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await lab.goto('http://localhost:8126/'); await lab.waitForSelector('#jlist .jcard');
  await lab.goto('http://localhost:8126/label.html'); await lab.waitForSelector('.lab');
  await lab.selectOption('#kertas', 'roll'); await lab.selectOption('#tipe', 'tempat'); await lab.selectOption('#rsize', '50x30');
  await lab.fill('#from', 'LOK-002'); await lab.fill('#to', 'LOK-011');
  check('roll: range gives 10 labels, button says Cetak 10 label', (await lab.locator('.lab').count()) === 10 && (await txt(lab, '#print')) === 'Cetak 10 label', await txt(lab, '#print'));
  check('roll: page size 50x30 mm margin 0', (await lab.textContent('#pagestyle')).includes('size:50mm 30mm') && (await lab.textContent('#pagestyle')).includes('margin:0'));
  const box = await lab.evaluate(() => { const r = document.querySelector('.lab').getBoundingClientRect(); return [Math.round(r.width / 3.7795), Math.round(r.height / 3.7795)]; });
  check('roll: each label 50 x 30 mm', Math.abs(box[0] - 50) <= 1 && Math.abs(box[1] - 30) <= 1, box.join('x'));
  await lab.fill('#copies', '2');
  check('roll: copies x2 => 20 labels', (await lab.locator('.lab').count()) === 20);
  await lab.selectOption('#rsize', '40x30'); await lab.selectOption('#kertas', 'a4');
  check('A4 mode restores sheet', (await lab.textContent('#pagestyle')).includes('A4') && !(await lab.getAttribute('#sheet', 'class')).includes('roll'));
  await lab.screenshot({ path: OUT + '/v4_label.png' });

  check('no JS errors', errors.length === 0, errors.join(' | '));
  console.log(log.join('\n')); console.log(log.filter(l => l.startsWith('FAIL')).length + ' FAIL / ' + log.length);
  await browser.close(); server.close();
})().catch(e => { console.log(log.join('\n')); console.error('CRASH', e); process.exit(1); });
