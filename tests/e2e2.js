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
}).listen(8125);
const log = [];
const check = (n, c, extra) => log.push((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : (extra !== undefined ? '  -> ' + extra : '')));
const rows = name => ss.getSheetByName(name).data.slice(1).filter(r => r && r[0]);
const raw = body => JSON.parse(env.doPost({ postData: { contents: JSON.stringify(body) } }).getContent());
const TOKEN = raw({ action: 'login', pin: PIN }).token;
const srv = body => raw({ token: TOKEN, oleh: 'Seed', ...body });
const txt = async (page, sel) => ((await page.textContent(sel)) || '').replace(/\s+/g, ' ').trim();
const unitRow = k => rows('Unit').find(r => r[0] === k);
const wait = ms => new Promise(r => setTimeout(r, ms));
const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

// ---- data awal
srv({ action: 'addTempat', nama: 'Gudang Karpenter' });
const bor = srv({ action: 'addUnit', jenis: { c: 'Bor/Breker', n: 'Bor', b: 'Bosch', m: 'GBH 2-28' }, f: { sl: 'Normal' } });
srv({ action: 'addUnit', jenisId: bor.jenisId, f: { sl: 'Normal' } });
srv({ action: 'addUnit', jenisId: bor.jenisId, f: { sl: 'Normal', sn: 'SN-77' } });
const grd = srv({ action: 'addUnit', jenis: { c: 'Gurinda/Mesin Potong', n: 'Gurinda tangan', b: 'Makita', m: '9553' }, f: { sl: 'Normal', loc: 'LOK-001' } });
srv({ action: 'addUnit', jenisId: grd.jenisId, f: { sl: 'Rusak', cat: 'Kabel putus' } });
srv({ action: 'addUnit', jenis: { c: 'Mesin Karpenter', n: 'Gergaji circular', b: 'Makita', m: '5008' }, f: { sl: 'Normal' } });
srv({ action: 'savePekerja', pekerja: [{ n: 'Budi', d: 'Karpenter' }, { n: 'Andi', d: 'Pembesian' }, { n: 'Citra', d: 'Listrik' }] });
const jenisId = bor.jenisId;

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-file-for-fake-video-capture=' + path.resolve(__dirname, 'cam3.y4m')]
  });
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, permissions: ['camera'], acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts|favicon|ERR_FAILED|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.addInitScript(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
  let offline = false;
  await page.route('https://script.google.com/**', async route => {
    if (offline) return route.abort('internetdisconnected');
    const out = env.doPost({ postData: { contents: route.request().postData() } }).getContent();
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: out });
  });
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  const pickFirstName = async (n) => { await page.waitForSelector('#picker:not([hidden])'); await page.click('#picker [data-action="pickname"][data-n="' + n + '"]'); await page.waitForSelector('#picker', { state: 'hidden' }); };

  // ===== 1. login
  // ===== login
  await page.goto('http://localhost:8125/');
  await page.waitForSelector('#pin:not([hidden])');
  await page.fill('#pinInput', PIN); await page.click('#pinBtn'); await page.waitForSelector('#jlist .jcard');
  check('mesin list shows 3 jenis', (await page.locator('#jlist .jcard').count()) === 3, await page.locator('#jlist .jcard').count());

  // ===== FOTO
  await page.click('.jcard[data-id="' + jenisId + '"]'); await page.waitForSelector('.hero');
  await page.click('[data-action="fotoedit"]'); await page.waitForSelector('#fotoSheet:not([hidden]) .bigbtn');
  await page.screenshot({ path: OUT + '/n_foto_pilih.png' });
  await page.setInputFiles('#fileGal', path.resolve(__dirname, 'foto_test.jpg'));
  await page.waitForSelector('#cropCv');
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '/n_foto_crop.png' });
  await page.fill('#cropZoom', '2'); await page.dispatchEvent('#cropZoom', 'input');
  await page.click('[data-action="fotorot"][data-d="1"]');
  await page.click('[data-action="fotosave"]');
  await page.waitForSelector('#picker:not([hidden])'); await pickFirstName('Budi');
  await page.waitForTimeout(800);
  const frow = rows('Foto');
  check('foto stored in sheet <=44000 chars, jpeg', frow.length === 1 && frow[0][0] === jenisId && String(frow[0][1]).startsWith('data:image/jpeg;base64,') && String(frow[0][1]).length <= 44000, frow.length && String(frow[0][1]).length);
  check('hero shows photo', (await page.locator('.hero img').count()) === 1);
  check('sheet closed', await page.isHidden('#fotoSheet'));
  await page.screenshot({ path: OUT + '/n_jenis_foto.png' });
  await page.goBack(); await page.waitForSelector('#jlist .jcard');
  check('list card shows photo thumb', (await page.locator('.jcard[data-id="' + jenisId + '"] img').count()) === 1);
  // ===== TEMPAT
  await page.click('[data-action="menu"]'); await page.waitForSelector('#drawer:not([hidden])');
  await page.screenshot({ path: OUT + '/n_drawer.png' });
  await page.click('#drawer [data-view="tempatlist"]'); await page.waitForSelector('#tlist2');
  check('tempat list shows Gudang Karpenter', (await txt(page, '#tlist2')).includes('Gudang Karpenter'), await txt(page, '#tlist2'));
  check('stats line', (await txt(page, '#tstats')).includes('1 tempat') && (await txt(page, '#tstats')).includes('mesin belum punya tempat'), await txt(page, '#tstats'));
  await page.click('#fab'); await page.waitForSelector('#pnama');
  await page.fill('#pnama', 'Rak 1'); await page.fill('#plokasi', 'Gudang A');
  await page.click('[data-action="tempatsave"]'); await page.waitForTimeout(600);
  check('Rak 1 created', rows('Tempat').some(r => r[1] === 'Rak 1'), JSON.stringify(rows('Tempat')));
  await page.waitForSelector('[data-action="tambahke"]');
  check('on tempat detail', (await txt(page, '#hdr')).includes('Rak 1'));
  await page.screenshot({ path: OUT + '/n_tempat_kosong.png' });
  await page.click('[data-action="tambahke"]'); await page.waitForSelector('#alist .selrow');
  await page.click('#alist .selrow >> nth=0'); await page.click('#alist .selrow >> nth=1');
  await page.screenshot({ path: OUT + '/n_tambah_tempat.png' });
  check('save button text', (await txt(page, '#abar .yes')).includes('Simpan 2 mesin ke Rak 1'), await txt(page, '#abar .yes'));
  await page.click('[data-action="asave"]'); await page.waitForSelector('.stat3'); await page.waitForTimeout(400);
  check('2 units now in Rak 1', rows('Unit').filter(r => r[4] === 'LOK-002').length === 2, JSON.stringify(rows('Unit').map(r => r[4])));
  await page.screenshot({ path: OUT + '/n_tempat_isi.png' });

  // ===== MATERIAL
  await page.click('[data-action="back"]'); await page.waitForTimeout(200);
  await page.evaluate(() => history.length);
  await page.click('[data-action="menu"]'); await page.click('#drawer [data-view="material"]'); await page.waitForSelector('#mlist');
  await page.click('#fab'); await page.waitForSelector('#mnama');
  await page.fill('#mnama', 'Kabel NYM 3x2.5'); await page.fill('#mkat', 'Listrik'); await page.fill('#mmerek', 'Eterna'); await page.fill('#msat', 'meter'); await page.fill('#mstok', '100'); await page.fill('#mbatas', '20');
  await page.click('[data-action="pickplace"]'); await page.waitForSelector('#picker:not([hidden]) [data-action="pickitem"]');
  await page.screenshot({ path: OUT + '/n_chooser.png' });
  await page.click('#picker [data-action="pickitem"]:has-text("Rak 1")');
  await page.waitForTimeout(200);
  check('place label set', (await txt(page, '#mloc-l')) === 'Rak 1 · Gudang A' || (await txt(page, '#mloc-l')).includes('Rak 1'), await txt(page, '#mloc-l'));
  await page.screenshot({ path: OUT + '/n_matform.png' });
  await page.click('[data-action="matsave"]'); await page.waitForSelector('.matbig'); await page.waitForTimeout(500);
  check('material saved MAT-001 stok 100 loc LOK-002', rows('Material').some(r => r[0] === 'MAT-001' && r[5] === 100 && r[7] === 'LOK-002'), JSON.stringify(rows('Material')));
  await page.click('[data-action="stokopen"][data-t="Keluar"]'); await page.waitForSelector('#stokSheet:not([hidden]) #stokJ');
  await page.click('[data-action="stokq"][data-n="10"]');
  await page.screenshot({ path: OUT + '/n_stok_sheet.png' });
  check('after text', (await txt(page, '#stokAfter')).includes('90'), await txt(page, '#stokAfter'));
  await page.click('[data-action="stoknama"]'); await pickFirstName('Andi');
  check('button text', (await txt(page, '#stokGo')).includes('Kurangi 10 meter'), await txt(page, '#stokGo'));
  await page.click('#stokGo'); await page.waitForTimeout(900);
  check('stok 90 in sheet', rows('Material').find(r => r[0] === 'MAT-001')[5] === 90);
  check('stok log row by Andi', rows('Stok Log').some(r => r[2] === 'MAT-001' && r[3] === 'Keluar' && r[6] === 'Andi'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT + '/n_mat_detail.png', fullPage: true });
  // list
  await page.click('[data-action="back"]'); await page.waitForSelector('#mlist .mrow2');
  await page.screenshot({ path: OUT + '/n_mat_list.png' });
  check('list row shows 90', (await txt(page, '#mlist')).includes('90'), await txt(page, '#mlist'));

  // ===== PANDUAN
  await page.click('[data-action="menu"]'); await page.click('#drawer [data-view="mesin"]'); await page.waitForSelector('#jlist .jcard');
  await page.click('.jcard[data-id="' + jenisId + '"]'); await page.waitForSelector('.hero');
  await page.click('[data-action="jtab"][data-t="panduan"]'); await page.waitForSelector('[data-action="pdedit"]');
  await page.click('[data-action="pdedit"]'); await page.waitForSelector('#pdl');
  await page.fill('#pdi', '3'); await page.fill('#pdp', 'Cabut kabel dulu.'); await page.fill('#pda', 'Kunci pas\nGrease'); await page.fill('#pdl', 'Buka casing\nBersihkan\nPasang lagi'); await page.fill('#pdu', 'example.com/bor.pdf');
  check('save button says versi 1', (await txt(page, '[data-action="pdsave"]')).includes('versi 1'));
  await page.click('[data-action="pdsave"]'); await page.waitForSelector('.pdhead'); await page.waitForTimeout(400);
  check('panduan v1 saved', rows('Panduan').length === 1 && rows('Panduan')[0][6] === 'https://example.com/bor.pdf');
  check('servis tiap 3 bulan shown', (await txt(page, '#live-pd')).includes('Servis tiap 3 bulan'), await txt(page, '#live-pd'));
  await page.screenshot({ path: OUT + '/n_panduan.png', fullPage: true });
  await page.click('[data-action="pdmaint"]'); await page.waitForSelector('#picker:not([hidden]) [data-action="pickitem"]');
  await page.click('#picker [data-action="pickitem"] >> nth=0'); await page.waitForSelector('#maintForm', { state: 'attached' });
  check('goes to profil maint tab', (await txt(page, '#hdr')).includes('BOR-001'));
  await page.screenshot({ path: OUT + '/n_profil_maint.png', fullPage: true });

  // ===== PROFIL
  await page.click('[data-action="ptab"][data-t="aset"]');
  await page.screenshot({ path: OUT + '/n_profil.png', fullPage: true });

  // ===== IMPOR
  await page.goto('http://localhost:8125/'); await page.waitForSelector('#jlist .jcard');
  await page.click('[data-action="menu"]'); await page.click('#drawer [data-view="impor"]'); await page.waitForSelector('#impFile', { state: 'attached' });
  const XLSX = require('xlsx');
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Kategori', 'Nama Mesin', 'Merek', 'Model', 'No Unit', 'Kondisi', 'Lokasi', 'No Seri', 'Keterangan'],
    ['Bor/Breker', 'Bor', 'Bosch', 'GBH 2-28 DFV', '', 'baik', 'Rak 1', 'S1', 'x'], ['Bor/Breker', 'Bor', 'Bosch', 'GBH 2-28 DFV', '', 'Servis', 'Rak 9', '', ''], ['Ngawur', 'Palu', '', '', '', '', '', '', ''], ['Mesin Karpenter', 'Planer', 'Makita', '1900B', '', '', '', '', '']]), 'S1');
  const xf = path.resolve(__dirname, 'impor_test.xlsx'); XLSX.writeFile(wb, xf);
  await page.setInputFiles('#impFile', xf); await page.waitForSelector('.tbl');
  await page.screenshot({ path: OUT + '/n_impor_prev.png', fullPage: true });
  check('preview: 3 ready, 1 bad', (await txt(page, '#app')).includes('3 baris siap') && (await txt(page, '#app')).includes('1 bermasalah'), await txt(page, '#app'));
  const before = rows('Unit').length;
  await page.click('[data-action="impgo"]'); await page.waitForSelector('[data-action="impreset"]', { timeout: 8000 }); await page.waitForTimeout(500);
  check('3 units imported', rows('Unit').length === before + 3, rows('Unit').length - before);
  await page.screenshot({ path: OUT + '/n_impor_done.png', fullPage: true });

  // ===== SCAN tempat / material / pilih mesin
  await page.goto('http://localhost:8125/'); await page.waitForSelector('#jlist .jcard');
  await page.click('[data-action="menu"]'); await page.click('#drawer [data-action="dscan"]'); await page.waitForSelector('#scan:not([hidden])');
  await page.evaluate(() => onCode('LOK-002')); await page.waitForSelector('[data-action="placeopen"]');
  const pp = await txt(page, '#sheet');
  check('scan LOK popup: place, machines, material', pp.includes('Rak 1') && pp.includes('BOR-001') && pp.includes('Kabel NYM'), pp);
  await page.screenshot({ path: OUT + '/n_scan_tempat.png' });
  await page.click('[data-action="placeclose"]'); await page.evaluate(() => onCode('MAT-001'));
  await page.waitForSelector('#stokSheet:not([hidden]) #stokJ');
  check('scan MAT opens stok sheet', (await txt(page, '#stokSheet')).includes('Kabel NYM'));
  await page.click('.fsheet [data-action="stokclose"]'); await page.waitForSelector('#stokSheet', { state: 'hidden' });
  check('scan still open after closing stok sheet', await page.isVisible('#scan'));
  await page.evaluate(() => onCode('LOK-002')); await page.waitForSelector('[data-action="placeopen"]');
  await page.click('[data-action="placeopen"]'); await page.waitForSelector('.stat3');
  check('Buka semua goes to tempat page and closes scan', await page.isHidden('#scan') && (await txt(page, '#hdr')).includes('Rak 1'));
  await page.click('[data-action="tambahke"]'); await page.waitForSelector('#alist .selrow');
  await page.click('[data-action="ascan"]'); await page.waitForSelector('#scan:not([hidden])');
  await page.evaluate(() => onCode('BOR-003')); await page.waitForTimeout(200);
  check('scan in tambah mode selects machine', await page.evaluate(() => S.form.sel.includes('BOR-003')), await txt(page, '#sheet'));
  await page.evaluate(() => onCode('MAT-001')); await page.waitForTimeout(200);
  check('tambah mode ignores material QR', !(await page.isVisible('#stokSheet')));
  await page.click('[data-action="scanclose"]'); await page.waitForSelector('#scan', { state: 'hidden' });
  check('selection kept after scan', /Simpan \d+ mesin ke Rak 1/.test(await txt(page, '#abar .yes')) && await page.evaluate(() => S.form.sel.includes('BOR-003')), await txt(page, '#abar .yes'));
  await page.click('[data-action="back"]');
  // nonaktif tempat ditolak selagi berisi
  await page.click('[data-action="tempatedit"]'); await page.waitForSelector('[data-action="tempatoff"]');
  await page.click('[data-action="tempatoff"]'); await page.click('[data-action="tempatoff"]'); await page.waitForTimeout(600);
  check('nonaktif non-empty place refused', (await txt(page, '#toast')).includes('Masih ada') && rows('Tempat').find(r => r[0] === 'LOK-002')[3] === '', await txt(page, '#toast'));
  // rename tempat
  await page.fill('#pnama', 'Rak Satu'); await page.click('[data-action="tempatsave"]'); await page.waitForSelector('.stat3'); await page.waitForTimeout(400);
  check('rename keeps code, updates name', rows('Tempat').find(r => r[0] === 'LOK-002')[1] === 'Rak Satu' && (await txt(page, '#hdr')).includes('Rak Satu'));
  // stok offline lewat tempat (tombol minus)
  offline = true;
  await page.click('.trow.mat [data-action="stokopen"][data-t="Keluar"]'); await page.waitForSelector('#stokJ');
  await page.click('[data-action="stokq"][data-n="5"]'); await page.click('#stokGo'); await page.waitForTimeout(500);
  check('offline stok: shows 85 locally, server still 90', (await txt(page, '.trow.mat .qty')).includes('85') && rows('Material')[0][5] === 90, await txt(page, '.trow.mat .qty'));
  offline = false; await page.evaluate(() => window.dispatchEvent(new Event('online'))); await page.waitForTimeout(1500);
  check('stok flushed once: server 85, one log row', rows('Material')[0][5] === 85 && rows('Stok Log').filter(r => r[3] === 'Keluar').length === 2, JSON.stringify(rows('Stok Log')));
  // stok melebihi sisa: tombol mati
  await page.click('.trow.mat [data-action="stokopen"][data-t="Keluar"]'); await page.waitForSelector('#stokJ');
  await page.fill('#stokJ', '500'); await page.waitForTimeout(100);
  check('stok too big: button disabled + warning', await page.isDisabled('#stokGo') && (await txt(page, '#stokAfter')).includes('tidak cukup'), await txt(page, '#stokAfter'));
  await page.click('[data-action="stoktipe"][data-t="Koreksi"]'); await page.waitForTimeout(100);
  check('koreksi prefilled with current stock', (await page.inputValue('#stokJ')) === '85', await page.inputValue('#stokJ'));
  await page.fill('#stokJ', '80'); await page.click('#stokGo'); await page.waitForTimeout(900);
  check('koreksi sets stok to 80', rows('Material')[0][5] === 80);
  // panduan v2 + riwayat versi
  await page.goto('http://localhost:8125/'); await page.waitForSelector('#jlist .jcard');
  await page.click('.jcard[data-id="' + jenisId + '"]'); await page.click('[data-action="jtab"][data-t="panduan"]'); await page.waitForSelector('[data-action="pdedit"]');
  await page.click('[data-action="pdedit"]'); await page.waitForSelector('#pdl');
  check('edit form prefilled with v1, button says versi 2', (await page.inputValue('#pdi')) === '3' && (await txt(page, '[data-action="pdsave"]')).includes('versi 2'));
  await page.fill('#pdl', 'Buka casing\nBersihkan\nGanti karbon\nPasang lagi'); await page.click('[data-action="pdsave"]'); await page.waitForSelector('.vlist'); await page.waitForTimeout(300);
  check('v2 saved, v1 kept', rows('Panduan').length === 2 && (await txt(page, '#live-pd')).includes('Versi 2 · terbaru'), await txt(page, '#live-pd'));
  await page.click('.vlist li:nth-child(2) button'); await page.waitForTimeout(100);
  check('can view old version v1', (await txt(page, '#live-pd')).includes('versi lama') && !(await txt(page, '#live-pd')).includes('Ganti karbon'));
  // layar ponsel: unit tanpa foto tetap pakai ikon

  // ===== LAYAR LEBAR
  await page.setViewportSize({ width: 1280, height: 800 }); await page.goto('http://localhost:8125/'); await page.waitForSelector('.tbl');
  await page.waitForTimeout(500);
  check('wide: pinned sidebar visible', await page.isVisible('#drawer') && (await page.evaluate(() => document.body.classList.contains('pinned'))));
  check('wide: table rows', (await page.locator('.tbl tbody tr').count()) >= 7, await page.locator('.tbl tbody tr').count());
  await page.screenshot({ path: OUT + '/n_wide.png' });
  await page.click('.tbl tbody tr >> nth=0'); await page.waitForSelector('.pid');
  await page.screenshot({ path: OUT + '/n_wide_profil.png' });

  // ===== LABEL tempat dan material
  const lab = await ctx.newPage();
  await lab.route('https://script.google.com/**', async route => { const out = env.doPost({ postData: { contents: route.request().postData() } }).getContent(); await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: out }); });
  await lab.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await lab.goto('http://localhost:8125/'); await lab.waitForSelector('#jlist .jcard');
  await lab.goto('http://localhost:8125/label.html?kode=LOK-002'); await lab.waitForSelector('.lab');
  check('label tempat: LOK-002 with name', (await lab.locator('.lab').count()) === 1 && (await txt(lab, '.lab')).includes('Rak Satu'), await txt(lab, '.lab'));
  await lab.goto('http://localhost:8125/label.html?kode=MAT-001'); await lab.waitForSelector('.lab');
  check('label material: MAT-001 with name and unit', (await txt(lab, '.lab')).includes('Kabel NYM') && (await txt(lab, '.lab')).includes('meter'), await txt(lab, '.lab'));
  await lab.goto('http://localhost:8125/label.html'); await lab.waitForSelector('.lab');
  check('label default type mesin lists all units', (await lab.locator('.lab').count()) >= 9, await lab.locator('.lab').count());
  await lab.screenshot({ path: OUT + '/n_label.png' });

  check('no JS errors', errors.length === 0, errors.join(' | '));
  console.log(log.join('\n')); console.log(log.filter(l => l.startsWith('FAIL')).length + ' FAIL / ' + log.length);
  await browser.close(); server.close();
})().catch(e => { console.log(log.join('\n')); console.error('CRASH', e); process.exit(1); });
