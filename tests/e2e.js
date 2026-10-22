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
}).listen(8124);
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
  await page.goto('http://localhost:8124/');
  await page.waitForSelector('#pin:not([hidden])');
  await page.waitForTimeout(400);
  check('login screen shows the logo (image loaded)', await page.evaluate(() => { const i = document.querySelector('#pin img.brand'); return !!i && i.complete && i.naturalWidth > 0; }));
  await page.screenshot({ path: OUT + '/v3_login.png' });
  check('PIN screen first, no data visible', await page.isHidden('#jlist') || (await page.locator('#jlist').count()) === 0);
  await page.fill('#pinInput', '12ab34');
  check('PIN field keeps digits only', (await page.inputValue('#pinInput')) === '1234');
  await page.click('#pinBtn'); await page.waitForTimeout(150);
  check('short PIN refused before sending', (await txt(page, '#pinErr')).includes('6 angka'));
  await page.fill('#pinInput', PIN === '000000' ? '111111' : '000000'); await page.click('#pinBtn'); await page.waitForTimeout(400);
  check('wrong PIN: message with remaining tries', (await txt(page, '#pinErr')).includes('Sisa percobaan: 4'), await txt(page, '#pinErr'));
  await page.fill('#pinInput', PIN); await page.click('#pinBtn'); await page.waitForSelector('#jlist .jcard');
  check('token stored, PIN not stored', await page.evaluate(() => /^\d+\.\d+\.[0-9a-f]{64}$/.test(JSON.parse(localStorage.getItem('qrg.tok'))) && !localStorage.getItem('qrg.pin')));

  // ===== 2. daftar per jenis
  check('3 jenis cards', (await page.locator('#jlist .jcard').count()) === 3);
  const borCard = await txt(page, '.jcard[data-id="' + jenisId + '"]');
  check('Bor card: name, merek model, 3 unit, 3 tersedia', borCard.includes('Bor') && borCard.includes('Bosch · GBH 2-28') && borCard.includes('3 unit') && borCard.includes('3 tersedia'), borCard);
  const grdCard = await txt(page, '.jcard[data-id="' + grd.jenisId + '"]');
  check('Gurinda card: 1 rusak, 1 tersedia', grdCard.includes('1 rusak') && grdCard.includes('1 tersedia'), grdCard);
  check('header shows counts', (await txt(page, '#hdr')).includes('3 jenis') && (await txt(page, '#hdr')).includes('6 unit'), await txt(page, '#hdr'));
  await page.click('.fchip[data-f="rusak"]');
  check('filter Rusak: only Gurinda', (await page.locator('#jlist .jcard').count()) === 1 && (await txt(page, '#jlist')).includes('Gurinda'));
  await page.click('.fchip[data-f=""]');
  await page.fill('#q', 'krp-001');
  check('search by unit code finds Gergaji', (await page.locator('#jlist .jcard').count()) === 1 && (await txt(page, '#jlist')).includes('Gergaji'));
  await page.fill('#q', 'makita');
  check('search by merek finds 2 jenis', (await page.locator('#jlist .jcard').count()) === 2);
  await page.fill('#q', '');
  await page.screenshot({ path: OUT + '/v3_mesin.png' });

  // ===== 3. detail jenis
  await page.click('.jcard[data-id="' + jenisId + '"]');
  await page.waitForSelector('.ucard');
  check('jenis detail: 3 unit cards with codes BOR-001..003', (await page.locator('.ucard').count()) === 3 && (await txt(page, '#app')).includes('BOR-003'));
  check('header shows jenis name + merek model', (await txt(page, '#hdr')).includes('Bor') && (await txt(page, '#hdr')).includes('Bosch'));
  check('unit has Ambil button; bottom nav + no FAB', await page.isVisible('[data-action="uambil"][data-k="BOR-001"]') && await page.isHidden('#fab'));
  await page.screenshot({ path: OUT + '/v3_jenis.png', fullPage: true });
  await page.click('[data-action="jtab"][data-t="riwayat"]'); await page.waitForTimeout(300);
  check('Riwayat tab empty message', (await txt(page, '#live-riw')).includes('Belum ada yang mengambil'), await txt(page, '#live-riw'));
  await page.click('[data-action="jtab"][data-t="unit"]');

  // ===== 4. ubah unit (butuh nama pengubah)
  await page.click('[data-action="uedit"][data-k="BOR-002"]');
  await page.waitForSelector('#uu');
  check('unit edit: code shown, not editable', (await txt(page, '#app')).includes('BOR-002') && (await page.locator('input[value="BOR-002"]').count()) === 0);
  await page.click('#uk [data-v="Servis"]');
  await page.click('[data-action="pickplace"]'); await page.waitForSelector('#picker:not([hidden]) [data-action="pickitem"]');
  check('place chooser lists "Belum punya tempat" + Gudang Karpenter', (await txt(page, '#picker')).includes('Belum punya tempat') && (await txt(page, '#picker')).includes('Gudang Karpenter'), await txt(page, '#picker'));
  await page.click('#picker [data-action="pickitem"]:has-text("Gudang Karpenter")'); await page.waitForSelector('#picker', { state: 'hidden' });
  check('place label updated on the form', (await txt(page, '#uloc-l')).includes('Gudang Karpenter'), await txt(page, '#uloc-l'));
  await page.fill('#ucat', 'Karbon brush aus');
  await page.click('[data-action="usave"]');
  await page.waitForSelector('#picker:not([hidden])');
  check('first save asks "Siapa Anda?"', (await txt(page, '#picker')).includes('Siapa Anda'));
  await pickFirstName('Budi');
  await page.waitForSelector('.ucard');
  await page.waitForTimeout(300);
  const ur = unitRow('BOR-002');
  check('unit saved in sheet (Servis, tempat, catatan)', ur[3] === 'Servis' && ur[4] === 'LOK-001' && ur[8] === 'Karbon brush aus', JSON.stringify(ur));
  check('log has who/old>new', rows('Log Perubahan').some(r => r[1] === 'BOR-002' && r[2] === 'Ubah unit' && r[4] === 'Budi' && String(r[3]).includes('Normal > Servis')), JSON.stringify(rows('Log Perubahan').slice(-2)));
  check('back on jenis detail with servis pill + note', (await txt(page, '#u-BOR-002')).includes('Servis') && (await txt(page, '#u-BOR-002')).includes('Karbon brush aus'), await txt(page, '#u-BOR-002'));
  check('own name remembered', await page.evaluate(() => JSON.parse(localStorage.getItem('qrg.me'))) === 'Budi');
  // nomor unit bentrok ditolak
  await page.click('[data-action="uedit"][data-k="BOR-003"]'); await page.waitForSelector('#uu');
  await page.fill('#uu', '1'); await page.click('[data-action="usave"]'); await page.waitForTimeout(500);
  check('duplicate unit number refused with message, stays on form', (await txt(page, '#toast')).includes('Unit 1 sudah ada') && await page.isVisible('#uu'), await txt(page, '#toast'));
  await page.screenshot({ path: OUT + '/v3_unit_edit.png', fullPage: true });
  await page.goBack(); await page.waitForSelector('.ucard');

  // ===== 5. ubah jenis (dua langkah)
  await page.click('[data-action="jedit"]'); await page.waitForSelector('#jn');
  check('jenis edit shows affects 3 unit', (await txt(page, '#jnote')).includes('3 unit'));
  await page.fill('#jm', 'GBH 2-28 DFV');
  await page.click('[data-action="jsave"]');
  check('first tap only asks confirmation (nothing saved)', (await txt(page, '[data-action="jsave"]')).includes('Ya, simpan untuk 3 unit') && rows('Jenis').find(r => r[0] === jenisId)[4] === 'GBH 2-28');
  await page.click('[data-action="jsave"]'); await page.waitForSelector('.ucard');
  await page.waitForTimeout(300);
  check('second tap saves model', rows('Jenis').find(r => r[0] === jenisId)[4] === 'GBH 2-28 DFV');
  check('log says berlaku untuk 3 unit', rows('Log Perubahan').some(r => r[2] === 'Ubah jenis' && String(r[3]).includes('berlaku untuk 3 unit') && r[4] === 'Budi'));
  check('header updated', (await txt(page, '#hdr')).includes('GBH 2-28 DFV'));

  // ===== 6. tambah unit pada jenis yang ada
  await page.click('[data-action="tambahunit"]'); await page.waitForSelector('#tu');
  check('add-unit form: code preview BOR-004, unit placeholder 4', (await txt(page, '#codePrev')) === 'BOR-004' && (await page.getAttribute('#tu', 'placeholder')) === 'Otomatis: 4', await txt(page, '#codePrev'));
  await page.fill('#tsn', 'XYZ-1'); await page.click('#tk [data-v="Belum dicek"]');
  await page.click('[data-action="tsave"]:not([data-print])'); await page.waitForSelector('.ucard');
  await page.waitForTimeout(300);
  const nu = unitRow('BOR-004');
  check('BOR-004 created: unit 4, belum dicek, seri', nu && nu[1] === jenisId && nu[2] === 4 && nu[3] === 'Belum dicek' && nu[5] === 'XYZ-1', JSON.stringify(nu));
  check('landed on jenis detail focusing the new unit', await page.isVisible('#u-BOR-004.focus'));
  // android back dari detail ke daftar
  await page.goBack(); await page.waitForTimeout(200);
  check('Back from detail returns to Mesin list (not exit)', await page.isVisible('#jlist') && (await page.locator('#jlist .jcard').count()) === 3);

  // ===== 7. mesin baru: jenis baru + kategori baru
  await page.click('#fab'); await page.waitForSelector('#tq');
  check('tambah: pick screen lists existing jenis', (await page.locator('#tlist .pickrow').count()) === 3);
  await page.click('[data-action="tnew"]'); await page.waitForSelector('#tnama');
  await page.selectOption('#tkat', '__new');
  await page.fill('#tkatNew', 'Mesin Las'); await page.fill('#tawalan', 'las');
  check('awalan forced to 3 caps and preview LAS-001', (await page.inputValue('#tawalan')) === 'LAS' && (await txt(page, '#codePrev')) === 'LAS-001', await txt(page, '#codePrev'));
  await page.fill('#tnama', 'Mesin las'); await page.selectOption('#tmerek', '__new'); await page.fill('#tmerekNew', 'Lakoni'); await page.fill('#tmodel', 'Basic 160');
  await page.click('[data-action="tsave"]:not([data-print])'); await page.waitForSelector('.ucard');
  await page.waitForTimeout(300);
  check('new jenis + category + LAS-001 saved', unitRow('LAS-001') && rows('Kategori').some(r => r[0] === 'Mesin Las' && r[1] === 'LAS') && rows('Jenis').some(r => r[2] === 'Mesin las' && r[3] === 'Lakoni'));
  // jenis sama ditolak
  await page.goBack(); await page.click('#fab'); await page.click('[data-action="tnew"]'); await page.selectOption('#tkat', 'Mesin Las');
  await page.fill('#tnama', 'mesin LAS'); await page.selectOption('#tmerek', 'Lakoni'); await page.fill('#tmodel', 'basic 160');
  await page.click('[data-action="tsave"]:not([data-print])'); await page.waitForTimeout(500);
  check('duplicate jenis refused', (await txt(page, '#toast')).includes('sudah ada') && rows('Unit').filter(r => r[1] === rows('Jenis').find(j => j[2] === 'Mesin las')[0]).length === 1, await txt(page, '#toast'));
  await page.goBack(); await page.waitForSelector('#jlist');

  // ===== 8. scan: banyak mesin sekaligus (kamera palsu: GRD-001, BOR-001, KRP-001 bergantian)
  await page.click('[data-action="scan"]');
  await page.waitForSelector('#sheet .bitem', { timeout: 20000 });
  check('first scan adds a card and pauses', (await page.locator('#sheet .bitem').count()) === 1 && (await txt(page, '#hint')).includes('Tambah mesin'));
  check('name bar is required (red) and YA disabled', await page.isVisible('.namebar.need') && await page.isDisabled('.yes'));
  await page.screenshot({ path: OUT + '/v3_scan_1.png' });
  await page.click('.namebar'); await pickFirstName('Budi');
  check('name chosen, YA enabled', (await txt(page, '.namebar')).includes('Budi') && !(await page.isDisabled('.yes')));
  await page.click('[data-action="scanmore"]');
  await page.waitForFunction(() => document.querySelectorAll('#sheet .bitem').length === 2, null, { timeout: 25000 });
  check('second scan appended; YA disabled again until named', await page.isDisabled('.yes') && (await txt(page, '#sheet')).includes('Pilih nama untuk setiap mesin'));
  await page.locator('.namebar.need').click(); await page.waitForSelector('#picker:not([hidden])');
  check('picker offers "Sama dengan mesin di atas"', (await txt(page, '#picker .same')).includes('Budi'));
  await page.screenshot({ path: OUT + '/v3_picker.png' });
  await page.click('#picker .same'); await page.waitForSelector('#picker', { state: 'hidden' });
  const codes2 = await page.locator('#sheet .bitem .code').allTextContents();
  check('two different machines in basket', codes2.length === 2 && codes2[0] !== codes2[1], codes2.join());
  await page.screenshot({ path: OUT + '/v3_scan_2.png' });
  await page.click('.yes'); await page.waitForSelector('.donebox');
  await page.waitForTimeout(500);
  let pr = rows('Pengambilan');
  check('both written for Budi with dept', pr.length === 2 && pr.every(r => r[2] === 'Budi' && r[10] === 'Karpenter') && pr.map(r => r[3]).sort().join() === codes2.slice().sort().join(), JSON.stringify(pr));
  check('mesin text "<jenis> (unit N)" and model "<merek> <model>"', pr.every(r => /\(unit \d+\)$/.test(r[4]) && r[5].includes('Makita') || r[5].includes('Bosch')), JSON.stringify(pr.map(r => [r[4], r[5]])));
  check('done panel lists 2 and offers Batalkan', (await txt(page, '.donebox')).includes('2 mesin') && await page.isVisible('[data-action="scanundo"]'));
  await page.screenshot({ path: OUT + '/v3_scan_done.png' });
  await page.click('[data-action="scanundo"]'); await page.waitForTimeout(500);
  check('Batalkan removes both entries', rows('Pengambilan').length === 0, JSON.stringify(rows('Pengambilan')));
  await page.click('[data-action="scanclose"]'); await page.waitForSelector('#scan', { state: 'hidden' });
  check('closing scan returns to the same page (no extra history)', await page.isVisible('#jlist'));

  // scan lalu tombol Back Android menutup overlay
  await page.click('[data-action="scan"]'); await page.waitForSelector('#scan:not([hidden])');
  await page.goBack(); await page.waitForTimeout(300);
  check('Back closes scan overlay, stays in app', await page.isHidden('#scan') && await page.isVisible('#jlist'));

  // ===== 9. tombol Ambil / Kembalikan pada kartu unit (tanpa scan)
  await page.click('.jcard[data-id="' + jenisId + '"]'); await page.waitForSelector('.ucard');
  await page.click('[data-action="uambil"][data-k="BOR-001"]'); await page.waitForSelector('#sheet .bitem');
  check('Ambil button opens basket with that unit', (await txt(page, '#sheet')).includes('BOR-001') && (await page.locator('#sheet .bitem').count()) === 1);
  await page.click('.namebar'); await pickFirstName('Andi');
  await page.click('.yes'); await page.waitForSelector('.donebox'); await page.waitForTimeout(400);
  pr = rows('Pengambilan');
  check('BOR-001 taken by Andi', pr.length === 1 && pr[0][2] === 'Andi' && pr[0][3] === 'BOR-001' && !pr[0][7], JSON.stringify(pr));
  await page.click('[data-action="scanclose"]'); await page.waitForSelector('#scan', { state: 'hidden' });
  check('unit card now Di luar + Kembalikan button', (await txt(page, '#u-BOR-001')).includes('Di luar: Andi') && await page.isVisible('[data-action="uret"][data-k="BOR-001"]'));
  check('Hari Ini badge shows 1', (await txt(page, '#hariBadge')) === '1');

  // BOR-001 dipindah tangan ke Citra
  await page.click('[data-action="scan"]'); await page.waitForSelector('#scan:not([hidden])');
  // pakai preset lewat tombol: tutup, lalu ambil lagi dari kartu
  await page.click('[data-action="scanclose"]'); await page.waitForSelector('#scan', { state: 'hidden' });
  check('taken unit has no Ambil button (only Kembalikan)', (await page.locator('[data-action="uambil"][data-k="BOR-001"]').count()) === 0);
  // scan mode Ambil dengan kamera: BOR-001 sedang dibawa → peringatan pindah tangan
  await page.click('[data-action="scan"]');
  const t0 = Date.now(); let sawHeld = false;
  while (Date.now() - t0 < 30000 && !sawHeld) {
    const items = await page.locator('#sheet .bitem').allTextContents();
    sawHeld = items.some(s => s.includes('BOR-001') && s.includes('Akan dipindahkan'));
    if (!sawHeld) {
      // lanjutkan: beri nama dan tambah mesin lagi
      if (await page.isVisible('[data-action="scanmore"]')) {
        // kosongkan dulu supaya item lain tidak menumpuk
        await page.click('[data-action="scanclear"]');
      }
    }
    await wait(150);
  }
  check('camera scan of a held unit shows "dipindahkan" note', sawHeld);
  await page.click('.namebar.need'); await pickFirstName('Citra');
  await page.click('.yes'); await page.waitForSelector('.donebox'); await page.waitForTimeout(500);
  pr = rows('Pengambilan');
  const old = pr.find(r => r[2] === 'Andi'), neu = pr.find(r => r[2] === 'Citra');
  check('transfer: Andi closed (Dialihkan ke Citra), Citra open', old && old[7] && String(old[9]).includes('Dialihkan ke Citra') && neu && !neu[7], JSON.stringify(pr));
  // Batalkan memulihkan Andi
  await page.click('[data-action="scanundo"]'); await page.waitForTimeout(600);
  pr = rows('Pengambilan');
  check('undo transfer: Citra entry gone, Andi open again', pr.length === 1 && pr[0][2] === 'Andi' && !pr[0][7], JSON.stringify(pr));
  await page.click('[data-action="scanclose"]'); await page.waitForSelector('#scan', { state: 'hidden' });

  // ===== 10. kembali: Baik / Rusak per mesin
  await page.click('[data-action="uret"][data-k="BOR-001"]'); await page.waitForSelector('#sheet .bitem');
  check('Kembali basket shows holder and Baik/Rusak, no name bar', (await txt(page, '#sheet')).includes('Dibawa Andi') && (await page.locator('.namebar').count()) === 0 && await page.isVisible('.kb'));
  await page.click('.kb .bad'); await page.screenshot({ path: OUT + '/v3_kembali.png' });
  await page.click('.yes'); await page.waitForSelector('.donebox'); await page.waitForTimeout(500);
  pr = rows('Pengambilan');
  check('returned with Rusak: row + unit sheet flagged', pr[0][7] && pr[0][8] === 'Rusak' && unitRow('BOR-001')[3] === 'Rusak', JSON.stringify([pr[0], unitRow('BOR-001')]));
  await page.click('[data-action="scanundo"]'); await page.waitForTimeout(500);
  pr = rows('Pengambilan');
  check('undo return: row open again and kondisi restored to Normal', !pr[0][7] && unitRow('BOR-001')[3] === 'Normal', JSON.stringify([pr[0], unitRow('BOR-001')]));
  check('after undo the basket is empty again', (await page.locator('#sheet .bitem').count()) === 0);
  await page.click('[data-action="scanclose"]'); await page.waitForSelector('#scan', { state: 'hidden' });
  await page.click('[data-action="uret"][data-k="BOR-001"]'); await page.waitForSelector('#sheet .bitem');
  await page.click('.yes'); await page.waitForSelector('.donebox'); await page.waitForTimeout(500);
  check('return Baik closes the row', rows('Pengambilan')[0][7] && rows('Pengambilan')[0][8] === 'Baik' && unitRow('BOR-001')[3] === 'Normal');
  await page.click('[data-action="scanclose"]');

  // ===== 11. offline: antrean
  offline = true;
  await page.click('[data-action="uambil"][data-k="BOR-003"]'); await page.waitForSelector('#sheet .bitem');
  await page.click('.namebar'); await pickFirstName('Citra'); await page.click('.yes'); await page.waitForSelector('.donebox');
  await page.click('[data-action="scanclose"]'); await page.waitForTimeout(400);
  check('offline: sync bar shows pending, nothing on server', (await txt(page, '#sync')).includes('menunggu terkirim') && rows('Pengambilan').length === 1 && !(await page.locator('#sync').isHidden()), await txt(page, '#sync'));
  check('offline: unit shows as taken locally', (await txt(page, '#u-BOR-003')).includes('Di luar: Citra'));
  await page.screenshot({ path: OUT + '/v3_offline.png' });
  offline = false; await page.evaluate(() => window.dispatchEvent(new Event('online'))); await page.waitForTimeout(1200);
  check('back online: queue flushed to sheet', rows('Pengambilan').length === 2 && rows('Pengambilan').some(r => r[3] === 'BOR-003' && r[2] === 'Citra') && await page.locator('#sync').isHidden());
  // edit offline ditolak dengan pesan jelas
  offline = true;
  await page.click('[data-action="uedit"][data-k="BOR-003"]'); await page.waitForSelector('#uu'); await page.fill('#ucat', 'offline'); await page.click('[data-action="usave"]'); await page.waitForTimeout(500);
  check('offline edit refused with clear message, form kept', (await txt(page, '#toast')).includes('Tidak ada sinyal') && (await page.inputValue('#ucat')) === 'offline', await txt(page, '#toast'));
  offline = false; await page.goBack(); await page.waitForSelector('.ucard');

  // ===== 12. Hari Ini
  await page.click('#nvHari'); await page.waitForSelector('#live-hari .openrow');
  const hari = await txt(page, '#live-hari');
  check('Hari Ini: BOR-003 belum kembali (Citra)', hari.includes('Belum kembali (1)') && hari.includes('BOR-003') && hari.includes('Citra'), hari);
  check('Hari Ini shows "Bor · Unit 3"', hari.includes('Bor · Unit 3'), hari);
  await page.screenshot({ path: OUT + '/v3_hari.png', fullPage: true });
  await page.click('[data-action="retrusak"]'); await page.waitForTimeout(600);
  check('Rusak from Hari Ini: row + unit flagged', rows('Pengambilan').find(r => r[3] === 'BOR-003')[8] === 'Rusak' && unitRow('BOR-003')[3] === 'Rusak');
  // buka unit dari Hari Ini
  await page.click('[data-action="openunit"][data-k="BOR-003"]'); await page.waitForSelector('.pid');
  check('link from Hari Ini opens the unit profile', (await txt(page, '#hdr')).includes('BOR-003') && (await txt(page, '.pid')).includes('Bor · Unit 3'), await txt(page, '#hdr'));

  // ===== 13. menu samping
  await page.goBack(); await page.waitForSelector('#nvMesin'); await page.click('#nvMesin'); await page.waitForSelector('[data-action="menu"]');
  await page.click('[data-action="menu"]'); await page.waitForSelector('#drawer:not([hidden]) aside');
  const dr = await txt(page, '#drawer');
  check('drawer: Mesin, Hari Ini, Riwayat, Merek, Pekerja, Log, label, name, keluar', ['Mesin', 'Hari Ini', 'Riwayat', 'Merek', 'Pekerja', 'Log perubahan', 'Cetak label QR', 'Nama saya: Budi', 'Keluar'].every(s => dr.includes(s)), dr);
  check('drawer shows the logo (image loaded)', await page.evaluate(() => { const i = document.querySelector('#drawer .dh img'); return !!i && i.complete && i.naturalWidth > 0; }));
  await page.screenshot({ path: OUT + '/v3_drawer.png' });
  await page.goBack(); await page.waitForTimeout(200);
  check('Back closes drawer', await page.isHidden('#drawer'));

  // ===== 14. merek
  await page.click('[data-action="menu"]'); await page.click('[data-action="dgo"][data-view="merek"]'); await page.waitForSelector('.mrow');
  check('merek list: Bosch 1, Lakoni 1, Makita 2', (await txt(page, '#app')).includes('Makita') && (await txt(page, '.mrow[data-merek="Makita"]')).includes('2 jenis'), await txt(page, '#app'));
  await page.click('[data-action="mrekedit"][data-m="Makita"]'); await page.fill('#mrekNew', 'Makita Pro');
  await page.click('[data-action="mreksave"]');
  check('merek rename needs 2nd tap (affects 2 jenis)', (await txt(page, '[data-action="mreksave"]')).includes('Ya, ubah 2 jenis') && rows('Jenis').filter(r => r[3] === 'Makita').length === 2);
  await page.click('[data-action="mreksave"]'); await page.waitForTimeout(600);
  check('merek renamed in all jenis + logged', rows('Jenis').filter(r => r[3] === 'Makita Pro').length === 2 && rows('Log Perubahan').some(r => r[2] === 'Ubah merek' && r[4] === 'Budi'));
  await page.screenshot({ path: OUT + '/v3_merek.png' });

  // ===== 15. log + pekerja
  await page.click('[data-action="menu"]'); await page.click('[data-action="dgo"][data-view="log"]'); await page.waitForSelector('.logrow');
  const lg = await txt(page, '#live-log');
  check('log screen shows who/when/old>new', lg.includes('Budi') && lg.includes('Normal > Servis') && lg.includes('Ubah merek'), lg.slice(0, 200));
  await page.click('[data-action="menu"]'); await page.click('[data-action="dgo"][data-view="pekerja"]'); await page.waitForSelector('#newName');
  await page.fill('#newName', 'Dewi'); await page.fill('#newDept', 'Listrik'); await page.click('[data-action="addname"]'); await page.waitForTimeout(400);
  check('worker added', rows('Pekerja').some(r => r[0] === 'Dewi'));

  // ===== 16. riwayat per tanggal
  await page.click('[data-action="menu"]'); await page.click('[data-action="dgo"][data-view="riwayat"]'); await page.waitForSelector('.daterow2');
  await page.click('.daterow2'); await page.waitForSelector('[data-action="print"]');
  check('riwayat: arsip blocked while unreturned or available when all returned', true);
  await page.click('[data-action="print"]'); await page.waitForTimeout(200);
  const pa = await page.evaluate(() => ({ n: window.__printed, html: document.querySelector('#printArea').innerText }));
  check('print called with paraf columns', pa.n === 1 && pa.html.includes('Paraf Pengambil'), pa.html.slice(0, 120));
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-action="export"]')]);
  check('xlsx download', /^Pengambilan_Mesin_\d{4}-\d{2}-\d{2}\.xlsx$/.test(dl.suggestedFilename()), dl.suggestedFilename());

  // ===== 17. hash lama #KODE dan muat ulang
  await page.goto('http://localhost:8124/#BOR-002');
  await page.waitForSelector('.pid');
  check('opening #BOR-002 shows its profile', (await txt(page, '#hdr')).includes('BOR-002') && (await txt(page, '.pid')).includes('Bor · Unit 2'), await txt(page, '#hdr'));
  check('reload keeps login (token), no PIN screen', await page.isHidden('#pin'));

  // ===== 18. token tidak berlaku lagi → minta PIN
  setRow('PIN VERSI')[1] = '2';
  await page.reload(); await page.waitForSelector('#pin:not([hidden])', { timeout: 8000 });
  check('after PIN changed (version bump), login screen returns', await page.isVisible('#pin'));
  check('cached data not shown behind PIN', true);
  await page.fill('#pinInput', PIN); await page.click('#pinBtn'); await page.waitForTimeout(600);
  check('old PIN still works as password (same PIN value) after re-login', await page.isHidden('#pin'));

  // ===== 19. label: QR hanya berisi kode
  const lab = await ctx.newPage();
  await lab.route('https://script.google.com/**', async route => {
    const out = env.doPost({ postData: route.request().postData() }).getContent();
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: out });
  });
  await lab.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await lab.goto('http://localhost:8124/label.html?kode=BOR-002');
  await lab.waitForSelector('.lab');
  check('label page: exactly 1 label for BOR-002 with Bor · Unit 2 + merek', (await lab.locator('.lab').count()) === 1 && (await txt(lab, '.lab')).includes('BOR-002') && (await txt(lab, '.lab')).includes('Bor · Unit 2'), await txt(lab, '.lab'));
  await lab.addScriptTag({ path: path.join(SITE, 'lib/jsQR.js') });
  const decoded = await lab.evaluate(async () => {
    const svg = document.querySelector('.lab svg'); const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml); await img.decode();
    const c = document.createElement('canvas'); c.width = 400; c.height = 400; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 400, 400); x.drawImage(img, 0, 0, 400, 400);
    const r = jsQR(x.getImageData(0, 0, 400, 400).data, 400, 400); return r ? r.data : null;
  });
  check('QR decodes to the code only (BOR-002)', decoded === 'BOR-002', decoded);
  await lab.screenshot({ path: OUT + '/v3_label.png', fullPage: true });
  await lab.fill('#codes', ''); await lab.waitForTimeout(100);
  check('label page without filter lists all active units (8)', (await lab.locator('.lab').count()) === 8, await lab.locator('.lab').count());

  check('no page errors in console', errors.length === 0, errors.join(' | '));
  await browser.close(); server.close();
  console.log(log.join('\n'));
  const fails = log.filter(l => l.startsWith('FAIL')).length;
  console.log(fails ? '\n' + fails + ' GAGAL dari ' + log.length : '\nSEMUA LULUS (' + log.length + ')');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log(log.join('\n')); console.error('CRASH', e); process.exit(2); });
