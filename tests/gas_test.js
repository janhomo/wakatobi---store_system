const { makeEnv } = require('./gas_mock');
const { env, ss } = makeEnv();
const setting = k => { const r = ss.getSheetByName('Pengaturan').data.find(r => r && r[0] === k); return r ? r[1] : undefined; };
const setSet = (k, v) => { const r = ss.getSheetByName('Pengaturan').data.find(r => r && r[0] === k); r[1] = v; };
const raw = body => JSON.parse(env.doPost({ postData: { contents: JSON.stringify(body) } }).getContent());
const PIN = setting('PIN');
const t = []; const ok = (n, c, x) => t.push((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  -> ' + JSON.stringify(x)));
const rows = n => ss.getSheetByName(n).data.slice(1).filter(r => r && r[0]);

// ---- setup + login
ok('sheets created', ['Jenis', 'Unit', 'Kategori', 'Pengambilan', 'Arsip', 'Maintenance', 'Pekerja', 'Log Perubahan', 'Pengaturan'].every(n => ss.getSheetByName(n)));
ok('PIN is 6 digits, SECRET + PIN VERSI + JAM PULANG set', /^\d{6}$/.test(PIN) && setting('SECRET').length >= 30 && setting('PIN VERSI') === '1' && setting('JAM PULANG') === '17:00');
ok('9 default categories with prefixes', rows('Kategori').length === 9 && rows('Kategori').some(r => r[0] === 'Bor/Breker' && r[1] === 'BOR'));
ok('no token -> pin error', raw({ action: 'bootstrap' }).error === 'pin');
ok('fake token rejected', raw({ action: 'bootstrap', token: '1.1.abcd' }).error === 'pin');
let l = raw({ action: 'login', pin: '000000' });
ok('wrong pin: error pin, 4 attempts left', l.ok === false && l.error === 'pin' && l.sisa === 4, l);
for (let i = 0; i < 3; i++) l = raw({ action: 'login', pin: '111111' });
ok('4th wrong: 1 left', l.sisa === 1, l);
l = raw({ action: 'login', pin: '222222' });
ok('5th wrong: locked 15 minutes', l.error === 'kunci' && l.menit === 15, l);
l = raw({ action: 'login', pin: PIN });
ok('correct PIN refused while locked', l.error === 'kunci' && !l.token, l);
setSet('KUNCI SAMPAI', String(Date.now() - 1000));
l = raw({ action: 'login', pin: PIN });
ok('after lock expires, correct PIN gives token', l.ok && /^\d+\.\d+\.[0-9a-f]{64}$/.test(l.token), l);
ok('GAGAL reset after success', setting('GAGAL') === '0');
const TOKEN = l.token;
const call = body => raw({ token: TOKEN, ...body });
const adm = body => call({ oleh: 'Abidin', ...body });
const boot = (tgl) => call({ action: 'bootstrap', tgl });
ok('token works', boot().ok === true);
const parts = TOKEN.split('.');
ok('tampered token rejected', raw({ action: 'bootstrap', token: parts[0] + '.' + parts[1] + '.' + parts[2].replace(/.$/, c => c === 'a' ? 'b' : 'a') }).error === 'pin');
ok('token with other time rejected (signature covers time)', raw({ action: 'bootstrap', token: (Number(parts[0]) + 1) + '.' + parts[1] + '.' + parts[2] }).error === 'pin');
ok('old token (91 days) rejected', (() => { const old = String(Date.now() - 91 * 86400000) + '.1'; const sig = require('crypto').createHmac('sha256', setting('SECRET')).update(old).digest('hex'); return raw({ action: 'bootstrap', token: old + '.' + sig }).error === 'pin'; })());
ok('empty data at start', boot().jenis.length === 0 && boot().unit.length === 0 && boot().kategori.length === 9);

// ---- tambah unit
ok('addUnit needs oleh', call({ action: 'addUnit', jenis: { c: 'Bor/Breker', n: 'Bor Breaker 550W', b: 'Bosch', m: 'GBH 2-28 DFV' } }).ok === false);
let a1 = adm({ action: 'addUnit', jenis: { c: 'Bor/Breker', n: 'Bor breaker kecil', b: 'Bosch', m: 'GBH 2-28 DFV' }, f: { sn: 'ABC1' } });
ok('new jenis + first unit: BOR-001, J0001, unit 1', a1.ok && a1.kode === 'BOR-001' && a1.jenisId === 'J0001', a1);
let b = boot();
ok('jenis + unit listed; defaults Normal/no place', b.jenis.length === 1 && b.jenis[0].n === 'Bor breaker kecil' && b.jenis[0].b === 'Bosch' && b.unit.length === 1 && b.unit[0].u === 1 && b.unit[0].sl === 'Normal' && b.unit[0].loc === '' && b.unit[0].sn === 'ABC1', b);
let a2 = adm({ action: 'addUnit', jenisId: 'J0001', f: {} });
ok('second unit auto numbered 2, BOR-002', a2.ok && a2.kode === 'BOR-002' && boot().unit.find(u => u.k === 'BOR-002').u === 2, a2);
ok('explicit unit number 5 ok', adm({ action: 'addUnit', jenisId: 'J0001', f: { u: '5', sl: 'Servis' } }).kode === 'BOR-003');
ok('next auto number is max+1 = 6', adm({ action: 'addUnit', jenisId: 'J0001', f: {} }).ok && boot().unit.find(u => u.k === 'BOR-004').u === 6);
ok('duplicate unit number refused', adm({ action: 'addUnit', jenisId: 'J0001', f: { u: '2' } }).ok === false);
ok('unit number must be integer >= 1', adm({ action: 'addUnit', jenisId: 'J0001', f: { u: '0' } }).ok === false && adm({ action: 'addUnit', jenisId: 'J0001', f: { u: 'x' } }).ok === false);
ok('same jenis (case-insensitive) refused as new jenis', adm({ action: 'addUnit', jenis: { c: 'Bor/Breker', n: 'BOR BREAKER KECIL', b: 'bosch', m: 'gbh 2-28 dfv' } }).ok === false);
let a3 = adm({ action: 'addUnit', jenis: { c: 'Bor/Breker', n: 'Bor breaker sedang', b: 'Bosch', m: 'GBH 5-40 D' }, f: { sl: 'Rusak' } });
ok('other jenis, same category continues BOR numbering (BOR-005), J0002', a3.kode === 'BOR-005' && a3.jenisId === 'J0002', a3);
ok('unknown jenisId refused', adm({ action: 'addUnit', jenisId: 'J9999', f: {} }).ok === false);
ok('invalid kondisi / date refused, nothing created', adm({ action: 'addUnit', jenisId: 'J0001', f: { sl: 'Hancur' } }).ok === false && adm({ action: 'addUnit', jenisId: 'J0001', f: { tb: '1/2/26' } }).ok === false && boot().unit.length === 5);
ok('invalid unit leaves no orphan jenis', (() => { const n = boot().jenis.length; const r = adm({ action: 'addUnit', jenis: { c: 'Bor/Breker', n: 'Orphan', b: 'X', m: 'Y' }, f: { tb: 'salah' } }); return r.ok === false && boot().jenis.length === n; })());
ok('new category needs prefix', adm({ action: 'addUnit', jenis: { c: 'Alat Listrik', n: 'Kabel Roll', b: '', m: '' } }).ok === false);
ok('LOK and MAT prefixes reserved', adm({ action: 'addUnit', jenis: { c: 'Alat Listrik', n: 'Kabel Roll', awalan: 'LOK' } }).ok === false && adm({ action: 'addUnit', jenis: { c: 'Alat Listrik', n: 'Kabel Roll', awalan: 'mat' } }).ok === false);
ok('prefix used by other category refused', adm({ action: 'addUnit', jenis: { c: 'Alat Listrik', n: 'Kabel Roll', awalan: 'BOR' } }).ok === false);
ok('new category with prefix -> LST-001, Kategori row added, then LST-002 without prefix', (() => {
  const x = adm({ action: 'addUnit', jenis: { c: 'Alat Listrik', n: 'Kabel Roll', b: 'Eterna', m: '50m', awalan: 'lst' } });
  const y = adm({ action: 'addUnit', jenis: { c: 'alat listrik', n: 'Stop Kontak', b: '', m: '' } });
  return x.kode === 'LST-001' && y.kode === 'LST-002' && boot().kategori.some(k => k.c === 'Alat Listrik' && k.p === 'LST') && rows('Kategori').length === 10;
})());
ok('jenis with empty merek/model allowed', boot().jenis.some(j => j.n === 'Stop Kontak' && j.b === '' && j.m === ''));

// ---- ubah unit
const tK = adm({ action: 'addTempat', nama: 'Gudang Karpenter', lokasi: 'Site' });
ok('addTempat gives LOK-001', tK.ok && tK.id === 'LOK-001', tK);
let e1 = adm({ action: 'editUnit', kode: 'BOR-002', f: { sl: 'Servis', loc: 'LOK-001', sn: 'XYZ', cat: 'kabel baik', tb: '2025-03-12', gs: '2027-03-12' } });
ok('editUnit changes 6 fields, code stays', e1.ok && e1.changed === 6 && (() => { const u = boot().unit.find(x => x.k === 'BOR-002'); return u.sl === 'Servis' && u.loc === 'LOK-001' && u.sn === 'XYZ' && u.cat === 'kabel baik' && u.tb === '2025-03-12' && u.gs === '2027-03-12' && u.j === 'J0001' && u.u === 2; })(), e1);
ok('no-op edit = 0 changes', adm({ action: 'editUnit', kode: 'BOR-002', f: { sl: 'Servis', loc: 'LOK-001' } }).changed === 0);
ok('edit unit number to a free number', adm({ action: 'editUnit', kode: 'BOR-002', f: { u: '3' } }).ok && boot().unit.find(x => x.k === 'BOR-002').u === 3);
ok('edit unit number clash refused', adm({ action: 'editUnit', kode: 'BOR-002', f: { u: '1' } }).ok === false);
ok('edit unknown unit refused', adm({ action: 'editUnit', kode: 'ZZZ-999', f: { sl: 'Normal' } }).ok === false);
ok('edit invalid kondisi refused', adm({ action: 'editUnit', kode: 'BOR-002', f: { sl: 'aneh' } }).ok === false);
ok('edit needs oleh', call({ action: 'editUnit', kode: 'BOR-002', f: { sl: 'Normal' } }).ok === false);
ok('edit clearing catatan works', adm({ action: 'editUnit', kode: 'BOR-002', f: { cat: '' } }).changed === 1 && boot().unit.find(x => x.k === 'BOR-002').cat === '');

// ---- ubah jenis
let j1 = adm({ action: 'editJenis', id: 'J0001', f: { n: 'Bor breaker kecil 550W', m: 'GBH2-28DFV' } });
ok('editJenis changes name+model, reports unit count', j1.ok && j1.changed === 2 && j1.unit === 4 && boot().jenis.find(j => j.id === 'J0001').n === 'Bor breaker kecil 550W', j1);
ok('editJenis to duplicate refused', adm({ action: 'editJenis', id: 'J0002', f: { n: 'Bor breaker kecil 550W', b: 'Bosch', m: 'GBH2-28DFV' } }).ok === false);
ok('editJenis empty nama refused', adm({ action: 'editJenis', id: 'J0001', f: { n: '' } }).ok === false);
ok('editJenis category to new needs prefix, then works', adm({ action: 'editJenis', id: 'J0002', f: { c: 'Mesin Baru' } }).ok === false && adm({ action: 'editJenis', id: 'J0002', f: { c: 'Mesin Baru', awalan: 'MSB' } }).ok && boot().kategori.some(k => k.p === 'MSB'));
ok('units keep codes after category change', boot().unit.find(u => u.k === 'BOR-005').j === 'J0002');
adm({ action: 'editJenis', id: 'J0002', f: { c: 'Bor/Breker' } });

// ---- merek
adm({ action: 'addUnit', jenis: { c: 'Bor/Breker', n: 'Bor impak', b: 'MAKITA', m: 'DTW 300' } });
adm({ action: 'addUnit', jenis: { c: 'Bor/Breker', n: 'Bor cas', b: 'Makta', m: 'DF 333D' } });
let rm = adm({ action: 'renameMerek', from: 'makta', to: 'Makita' });
ok('renameMerek fixes typo (case-insensitive match)', rm.ok && rm.changed === 1 && boot().jenis.find(j => j.n === 'Bor cas').b === 'Makita', rm);
rm = adm({ action: 'renameMerek', from: 'MAKITA', to: 'Makita' });
ok('merge brand: MAKITA -> Makita counts only changed', rm.changed === 1 && boot().jenis.filter(j => j.b === 'Makita').length === 2);
ok('rename to same name = 0 changed', adm({ action: 'renameMerek', from: 'Makita', to: 'Makita' }).changed === 0);
ok('renameMerek needs both', adm({ action: 'renameMerek', from: '', to: 'X' }).ok === false);

// ---- gabung jenis
adm({ action: 'addUnit', jenis: { c: 'Bor/Breker', n: 'Bor cas', b: 'Makita', m: 'DF 33 D' }, f: { u: '1' } });
const idCas = boot().jenis.find(j => j.n === 'Bor cas' && j.m === 'DF 333D').id, idCas2 = boot().jenis.find(j => j.n === 'Bor cas' && j.m === 'DF 33 D').id;
adm({ action: 'addUnit', jenisId: idCas, f: { u: '1' } });
ok('gabung refused on unit number clash', (() => { const r = adm({ action: 'gabungJenis', dari: idCas2, ke: idCas }); return r.ok === false && r.error.includes('1'); })());
adm({ action: 'editUnit', kode: boot().unit.find(u => u.j === idCas2).k, f: { u: '7' } });
let g = adm({ action: 'gabungJenis', dari: idCas2, ke: idCas });
ok('gabung moves units, hides old jenis', g.ok && g.moved === 1 && !boot().jenis.some(j => j.id === idCas2) && boot().unit.filter(u => u.j === idCas).length === 2, g);
ok('gabung same / unknown refused', adm({ action: 'gabungJenis', dari: idCas, ke: idCas }).ok === false && adm({ action: 'gabungJenis', dari: 'J9999', ke: idCas }).ok === false);
ok('merged jenis cannot get new unit', adm({ action: 'addUnit', jenisId: idCas2, f: {} }).ok === false);
ok('merged jenis can be re-created as new jenis? (dup check ignores merged)', adm({ action: 'addUnit', jenis: { c: 'Bor/Breker', n: 'Bor cas', b: 'Makita', m: 'DF 33 D' } }).ok);

// ---- nonaktif
call({ action: 'addPengambilan', id: 'h1', tgl: '2026-10-18', nama: 'Budi', kode: 'BOR-003', mesin: 'Bor', waktu: '2026-10-20T08:00:00' });
ok('nonaktif refused while held', adm({ action: 'nonaktifUnit', kode: 'BOR-003', alasan: 'hilang' }).ok === false);
call({ action: 'returnPengambilan', id: 'h1', waktu: '2026-10-20T09:00:00' });
ok('nonaktif needs alasan', adm({ action: 'nonaktifUnit', kode: 'BOR-003' }).ok === false);
ok('nonaktif ok: flagged off, still in sheet, rows kept', adm({ action: 'nonaktifUnit', kode: 'BOR-003', alasan: 'dijual' }).ok && boot().unit.find(u => u.k === 'BOR-003').off === true);
ok('code of nonaktif unit is never reused', (() => { const all = rows('Unit').map(r => r[0]); const x = adm({ action: 'addUnit', jenisId: 'J0001', f: {} }); return x.ok && !all.includes(x.kode); })());
ok('aktifkan kembali', adm({ action: 'aktifkanUnit', kode: 'BOR-003' }).ok && boot().unit.find(u => u.k === 'BOR-003').off === false);

// ---- pengambilan
ok('add ambil for unknown code refused', call({ action: 'addPengambilan', id: 'zz', tgl: '2026-10-20', nama: 'Budi', kode: 'ZZZ-001' }).ok === false);
ok('add ambil a1', call({ action: 'addPengambilan', id: 'a1', tgl: '2026-10-20', nama: 'Budi', dept: 'Karpenter', kode: 'BOR-001', mesin: 'Bor', model: 'X', waktu: '2026-10-20T08:00:00' }).ok);
ok('dedupe', call({ action: 'addPengambilan', id: 'a1', tgl: '2026-10-20', nama: 'Budi', kode: 'BOR-001' }).duplicate === true);
call({ action: 'addPengambilan', id: 'a2', tgl: '2026-10-19', nama: 'Andi', dept: 'Pembesian', kode: 'BOR-002', mesin: 'Bor', waktu: '2026-10-19T09:00:00' });
b = boot('2026-10-20');
ok('belum lists open rows across dates, pengambilan filtered by date', b.belum.length === 2 && b.pengambilan.length === 1 && b.pengambilan[0].dept === 'Karpenter', b);
ok('return stored', call({ action: 'returnPengambilan', id: 'a1', waktu: '2026-10-20T15:30:00', kondisi: 'Baik' }).ok && boot('2026-10-20').pengambilan[0].kembali === '2026-10-20T15:30:00');
ok('second return w/o ubah does not overwrite', (call({ action: 'returnPengambilan', id: 'a1', waktu: '2026-10-20T16:00:00', kondisi: 'Rusak' }), boot('2026-10-20').pengambilan[0].kembali === '2026-10-20T15:30:00'));
call({ action: 'returnPengambilan', id: 'a1', waktu: '2026-10-20T16:00:00', kondisi: 'Rusak', ubah: true });
ok('ubah to Rusak flags Unit + logs by Sistem', boot().unit.find(u => u.k === 'BOR-001').sl === 'Rusak' && rows('Log Perubahan').some(r => r[1] === 'BOR-001' && r[2] === 'Kondisi unit' && r[4] === 'Sistem'));
ok('batalKembali reopens', call({ action: 'batalKembali', id: 'a1' }).ok && boot('2026-10-20').belum.length === 2);
ok('return unknown id idempotent', (() => { const x = call({ action: 'returnPengambilan', id: 'zzz', waktu: '2026-10-20T10:00:00' }); return x.ok && x.missing; })());
ok('ringkasan', (() => { const x = call({ action: 'ringkasan' }).ringkasan; return x.length === 3 && x[0].tgl === '2026-10-20' && x[0].belum === 1 && x[1].jumlah === 1 && x[2].tgl === '2026-10-18'; })());
ok('riwayat unit', (() => { const x = call({ action: 'riwayat', kode: 'BOR-001' }).riwayat; return x.length === 1 && x[0].nama === 'Budi'; })());
ok('riwayatJenis: all units of the jenis', (() => { const x = call({ action: 'riwayatJenis', id: 'J0001' }).riwayat; return x.length === 3 && ['BOR-001', 'BOR-002', 'BOR-003'].every(k => x.some(e => e.kode === k)); })());
ok('arsipkan refused when open rows', call({ action: 'arsipkan', tgl: '2026-10-20' }).ok === false);
ok('hapusHari no longer exists', call({ action: 'hapusHari', tgl: '2026-10-19' }).ok === false && rows('Pengambilan').length === 3);
call({ action: 'returnPengambilan', id: 'a1', waktu: '2026-10-20T16:00:00', kondisi: 'Baik' });
call({ action: 'returnPengambilan', id: 'a2', waktu: '2026-10-19T17:00:00', kondisi: 'Baik' });
ok('arsipkan moves to Arsip', (() => { const r = call({ action: 'arsipkan', tgl: '2026-10-19' }); return r.ok && r.jumlah === 1 && rows('Pengambilan').length === 2 && rows('Arsip').length === 1 && rows('Arsip')[0][11]; })());

// ---- maintenance, pekerja, log
ok('maint add/invalid/list/delete', call({ action: 'addMaintenance', id: 'm1', kode: 'BOR-001', tgl: '2026-10-01', jenis: 'Servis rutin', oleh: 'Tono', cat: 'oli', next: '2026-11-01' }).ok && call({ action: 'addMaintenance', id: 'm2', kode: 'BOR-001', tgl: '1/2/26' }).ok === false && boot().maintenance.length === 1 && call({ action: 'deleteMaintenance', id: 'm1' }).ok && boot().maintenance.length === 0);
ok('savePekerja objects sorted+dedupe', (() => { call({ action: 'savePekerja', pekerja: [{ n: 'Budi', d: 'Karpenter' }, { n: 'andi', d: 'Pembesian' }, { n: 'BUDI', d: 'X' }, { n: ' Citra ', d: '' }] }); const p = boot().pekerja; return p.length === 3 && p.some(x => x.n === 'Budi' && x.d === 'Karpenter'); })());
ok('logList newest first with who', (() => { const lg = call({ action: 'logList' }).log; return lg.length > 10 && lg[0].t >= lg[lg.length - 1].t && lg.some(x => x.a === 'Ubah unit' && x.o === 'Abidin' && x.d.includes('Gudang Karpenter (LOK-001)')) && lg.some(x => x.a === 'Gabung jenis') && lg.some(x => x.a === 'Ubah merek'); })());

// ---- harga tidak bocor
ss.getSheetByName('Unit').data[1][10] = 98765432;
ok('Harga column never sent to app', !JSON.stringify(boot()).includes('98765432') && !JSON.stringify(call({ action: 'logList' })).includes('98765432'));

// ---- setup idempotent, buatPinBaru, resetDataLama
ok('setup idempotent: PIN/SECRET/rows kept, token still valid', (() => { const n = rows('Unit').length, s = setting('SECRET'); env.setup(); return rows('Unit').length === n && setting('PIN') === PIN && setting('SECRET') === s && boot().ok; })());
ok('old 4-digit PIN replaced by 6 digits on setup, tokens invalidated', (() => { setSet('PIN', '1234'); env.setup(); const p = setting('PIN'); return /^\d{6}$/.test(p) && p !== '1234' && boot().error === 'pin' && setting('PIN VERSI') === '2'; })());
const NEWPIN = setting('PIN');
const tok2 = raw({ action: 'login', pin: NEWPIN }).token;
ok('login with new PIN works', !!tok2 && raw({ action: 'bootstrap', token: tok2 }).ok);
env.buatPinBaru();
ok('buatPinBaru: new PIN, version bumped, old token dead', setting('PIN') !== NEWPIN && /^\d{6}$/.test(setting('PIN')) && raw({ action: 'bootstrap', token: tok2 }).error === 'pin' && setting('PIN VERSI') === '3');
// resetDataLama: pretend v2 sheets exist
const old = ss.getSheetByName('Pengambilan'); const oldCount = old.data.length;
ss.insertSheet('Mesin').data = [['Kode Aset'], ['BOR-001']];
const pekerjaBefore = JSON.stringify(ss.getSheetByName('Pekerja').data), pinBefore = setting('PIN');
env.resetDataLama(true);
const names = ss.getSheets().map(s => s.getName());
ok('resetDataLama moves old sheets to "Lama ..." (nothing deleted)', names.some(n => /^Lama Mesin \d{8}$/.test(n)) && names.some(n => /^Lama Pengambilan \d{8}$/.test(n)) && names.some(n => /^Lama Log Perubahan \d{8}$/.test(n)) && ss.getSheetByName(names.find(n => /^Lama Pengambilan/.test(n))).data.length === oldCount, names);
ok('resetDataLama recreates empty Pengambilan/Log, keeps Pekerja, Pengaturan, Jenis, Unit', rows('Pengambilan').length === 0 && rows('Log Perubahan').length === 0 && JSON.stringify(ss.getSheetByName('Pekerja').data) === pekerjaBefore && setting('PIN') === pinBefore && rows('Unit').length > 0);
ok('resetDataLama needs UI confirm when not forced (no UI in test -> throws, nothing changes)', (() => { try { env.resetDataLama(); return false; } catch (e) { return true; } })());

console.log(t.join('\n'));
console.log(t.filter(x => x.startsWith('FAIL')).length ? '\nADA YANG GAGAL' : '\nSEMUA LULUS (' + t.length + ')');
