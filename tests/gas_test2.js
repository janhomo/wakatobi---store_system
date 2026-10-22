// Tes server: tempat (LOK), foto, panduan, material + stok, impor Excel
const { makeEnv } = require('./gas_mock');
const { env, ss } = makeEnv();
const setting = k => { const r = ss.getSheetByName('Pengaturan').data.find(r => r && r[0] === k); return r ? r[1] : undefined; };
const raw = body => JSON.parse(env.doPost({ postData: { contents: JSON.stringify(body) } }).getContent());
const PIN = setting('PIN');
const t = []; const ok = (n, c, x) => t.push((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  -> ' + JSON.stringify(x)));
const rows = n => ss.getSheetByName(n).data.slice(1).filter(r => r && r[0]);
const TOKEN = raw({ action: 'login', pin: PIN }).token;
const call = body => raw({ token: TOKEN, ...body });
const adm = body => call({ oleh: 'Pak Admin', ...body });
const boot = () => call({ action: 'bootstrap' });

ok('new sheets exist after setup', ['Foto', 'Tempat', 'Panduan', 'Material', 'Stok Log'].every(n => ss.getSheetByName(n)));
ok('bootstrap has tempat + material lists (empty)', boot().tempat.length === 0 && boot().material.length === 0);

// ---- data awal
const bor = adm({ action: 'addUnit', jenis: { c: 'Bor/Breker', n: 'Bor Breaker 550W', b: 'Bosch', m: 'GBH 2-28' }, f: { sl: 'Normal' } });
adm({ action: 'addUnit', jenisId: bor.jenisId, f: { sl: 'Normal' } });
adm({ action: 'addUnit', jenisId: bor.jenisId, f: { sl: 'Rusak' } });
const grd = adm({ action: 'addUnit', jenis: { c: 'Gurinda/Mesin Potong', n: 'Gerinda 4"', b: 'Makita', m: '9553' }, f: {} });

// ---- tempat
ok('tempat needs a name (oleh)', call({ action: 'addTempat', nama: 'Rak 1' }).ok === false);
ok('tempat name required', adm({ action: 'addTempat', nama: '  ' }).ok === false);
const r1 = adm({ action: 'addTempat', nama: 'Rak 1', lokasi: 'Gudang A' });
const r2 = adm({ action: 'addTempat', nama: 'Rak 2', lokasi: 'Gudang A' });
ok('LOK-001 and LOK-002, in order', r1.id === 'LOK-001' && r2.id === 'LOK-002', [r1, r2]);
ok('duplicate place name refused (case-insensitive)', adm({ action: 'addTempat', nama: 'rak 1' }).ok === false);
ok('listed in bootstrap', boot().tempat.length === 2 && boot().tempat[0].n === 'Rak 1' && boot().tempat[0].l === 'Gudang A' && boot().tempat[0].off === false);
ok('rename place logs old > new', adm({ action: 'editTempat', id: 'LOK-001', nama: 'Rak Satu' }).changed === 1 && rows('Log Perubahan').some(r => r[2] === 'Ubah tempat' && r[3].includes('Rak 1 > Rak Satu')));
ok('rename to existing name refused', adm({ action: 'editTempat', id: 'LOK-001', nama: 'Rak 2' }).ok === false);
ok('same values: 0 changes', adm({ action: 'editTempat', id: 'LOK-001', nama: 'Rak Satu', lokasi: 'Gudang A' }).changed === 0);
const st = adm({ action: 'setTempat', tempat: 'LOK-001', kodes: ['BOR-001', 'BOR-002', 'GRD-001'], mats: [] });
ok('setTempat moves 3 units', st.ok && st.units === 3 && boot().unit.filter(u => u.loc === 'LOK-001').length === 3, st);
ok('setTempat same place again moves 0 (no log noise)', adm({ action: 'setTempat', tempat: 'LOK-001', kodes: ['BOR-001'] }).units === 0);
ok('setTempat to another place moves it (one place per unit)', adm({ action: 'setTempat', tempat: 'LOK-002', kodes: ['BOR-002'] }).units === 1 && boot().unit.find(u => u.k === 'BOR-002').loc === 'LOK-002' && boot().unit.find(u => u.k === 'BOR-001').loc === 'LOK-001');
ok('setTempat unknown unit refused, nothing written', (() => { const before = JSON.stringify(ss.getSheetByName('Unit').data); const x = adm({ action: 'setTempat', tempat: 'LOK-002', kodes: ['BOR-001', 'XXX-999'] }); return x.ok === false && JSON.stringify(ss.getSheetByName('Unit').data) === before; })());
ok('setTempat unknown place refused', adm({ action: 'setTempat', tempat: 'LOK-099', kodes: ['BOR-001'] }).ok === false);
ok('setTempat needs something selected', adm({ action: 'setTempat', tempat: 'LOK-001', kodes: [], mats: [] }).ok === false);
ok('log row for move names place and codes', rows('Log Perubahan').some(r => r[2] === 'Pindah ke tempat' && r[3].includes('BOR-001') && r[3].includes('Rak Satu (LOK-001)')));
ok('editUnit loc must be a known place', adm({ action: 'editUnit', kode: 'BOR-003', f: { loc: 'Rak liar' } }).ok === false);
ok('editUnit loc to a place ok, log shows place name', adm({ action: 'editUnit', kode: 'BOR-003', f: { loc: 'LOK-002' } }).changed === 1 && rows('Log Perubahan').some(r => r[2] === 'Ubah unit' && r[3].includes('Tempat: (kosong) > Rak 2 (LOK-002)')));
ok('addUnit with unknown loc refused', adm({ action: 'addUnit', jenisId: bor.jenisId, f: { loc: 'Rak liar' } }).ok === false);
ok('addUnit with place ok', adm({ action: 'addUnit', jenisId: bor.jenisId, f: { loc: 'LOK-002' } }).ok === true);
ok('cannot deactivate place that still holds units', adm({ action: 'nonaktifTempat', id: 'LOK-002' }).ok === false);
const r3 = adm({ action: 'addTempat', nama: 'Kosong' });
ok('empty place can be deactivated, then reactivated', adm({ action: 'nonaktifTempat', id: r3.id }).ok && boot().tempat.find(x => x.id === r3.id).off === true && adm({ action: 'aktifTempat', id: r3.id }).ok && boot().tempat.find(x => x.id === r3.id).off === false);
ok('deactivated place cannot receive units', (() => { adm({ action: 'nonaktifTempat', id: r3.id }); return adm({ action: 'setTempat', tempat: r3.id, kodes: ['BOR-001'] }).ok === false; })());
ok('setTempat empty = release from place', adm({ action: 'setTempat', tempat: '', kodes: ['GRD-001'] }).units === 1 && boot().unit.find(u => u.k === 'GRD-001').loc === '');

// ---- migrasi tempat teks lama
(() => {
  const sh = ss.getSheetByName('Unit');
  const i = sh.data.findIndex(r => r && r[0] === 'GRD-001');
  sh.data[i][4] = 'Gudang Karpenter';
  const j = sh.data.findIndex(r => r && r[0] === 'BOR-003');
  sh.data[j][4] = 'Gudang';
  const k = sh.data.findIndex(r => r && r[0] === 'BOR-001');
  sh.data[k][4] = 'Kontainer 9';
  const res = env.migrasiTempat_();
  const u = n => rows('Unit').find(r => r[0] === n)[4];
  ok('migrasi: Gudang Karpenter text -> new LOK place', res.made === 2 && /^LOK-\d{3}$/.test(u('GRD-001')) && rows('Tempat').some(r => r[1] === 'Gudang Karpenter' && r[0] === u('GRD-001')), res);
  ok('migrasi: "Gudang" stays (= belum punya tempat)', u('BOR-003') === 'Gudang');
  ok('migrasi: another text place created once', rows('Tempat').filter(r => r[1] === 'Kontainer 9').length === 1 && u('BOR-001') === rows('Tempat').find(r => r[1] === 'Kontainer 9')[0]);
  ok('migrasi twice does nothing more', env.migrasiTempat_().made === 0 && env.migrasiTempat_().moved === 0);
})();
ok('editUnit keeping legacy "Gudang" untouched is allowed', adm({ action: 'editUnit', kode: 'BOR-003', f: { loc: 'Gudang', cat: 'x' } }).ok === true);

// ---- foto
const px = 'data:image/jpeg;base64,' + Buffer.from('fake-jpeg-bytes-1234567890').toString('base64');
ok('foto needs a name', call({ action: 'fotoSet', jid: bor.jenisId, foto: px }).ok === false);
ok('foto only jpeg data URL', adm({ action: 'fotoSet', jid: bor.jenisId, foto: 'http://x/y.jpg' }).ok === false && adm({ action: 'fotoSet', jid: bor.jenisId, foto: 'data:image/jpeg;base64,<script>' }).ok === false);
ok('foto too big refused', adm({ action: 'fotoSet', jid: bor.jenisId, foto: 'data:image/jpeg;base64,' + 'A'.repeat(48100) }).ok === false);
ok('foto for unknown jenis refused', adm({ action: 'fotoSet', jid: 'J9999', foto: px }).ok === false);
const f1 = adm({ action: 'fotoSet', jid: bor.jenisId, foto: px });
ok('foto saved, version stamp returned', f1.ok && /^\d{4}-\d{2}-\d{2}T/.test(f1.t));
ok('bootstrap carries only the version (no image data)', (() => { const b = boot(); const j = b.jenis.find(x => x.id === bor.jenisId); return j.f === f1.t && !JSON.stringify(b).includes('fake-jpeg') && !JSON.stringify(b).includes(Buffer.from('fake-jpeg-bytes-1234567890').toString('base64')); })());
ok('fotoGet returns the image', call({ action: 'fotoGet', ids: [bor.jenisId, 'J9999'] }).foto[bor.jenisId].d === px);
const px2 = 'data:image/jpeg;base64,' + Buffer.from('second-photo').toString('base64');
adm({ action: 'fotoSet', jid: bor.jenisId, foto: px2 });
ok('replacing keeps one row per jenis', rows('Foto').length === 1 && call({ action: 'fotoGet', ids: [bor.jenisId] }).foto[bor.jenisId].d === px2);
ok('foto log written', rows('Log Perubahan').some(r => r[2] === 'Tambah foto') && rows('Log Perubahan').some(r => r[2] === 'Ganti foto'));
ok('jenis without photo has empty f', boot().jenis.find(x => x.id === grd.jenisId).f === '');
ok('fotoHapus removes it', adm({ action: 'fotoHapus', jid: bor.jenisId }).ok && rows('Foto').length === 0 && boot().jenis.find(x => x.id === bor.jenisId).f === '');

// ---- panduan
ok('panduan needs content', adm({ action: 'panduanSimpan', jid: bor.jenisId, p: '', a: '', l: '' }).ok === false);
ok('panduan interval must be a number', adm({ action: 'panduanSimpan', jid: bor.jenisId, l: 'x', i: 'abc' }).ok === false);
ok('panduan link must be http(s)', adm({ action: 'panduanSimpan', jid: bor.jenisId, l: 'x', u: 'javascript:alert(1)' }).ok === false);
const p1 = adm({ action: 'panduanSimpan', jid: bor.jenisId, p: 'Cabut kabel.', a: 'Kuas, gemuk', l: '1. Matikan\n2. Buka penutup', i: '3', u: 'bosch.com/manual' });
ok('panduan v1 saved, link gets https://', p1.ok && p1.v === 1 && call({ action: 'panduanGet', id: bor.jenisId }).panduan[0].u === 'https://bosch.com/manual');
ok('same content again = no new version', adm({ action: 'panduanSimpan', jid: bor.jenisId, p: 'Cabut kabel.', a: 'Kuas, gemuk', l: '1. Matikan\n2. Buka penutup', i: '3', u: 'https://bosch.com/manual' }).changed === 0 && rows('Panduan').length === 1);
const p2 = adm({ action: 'panduanSimpan', jid: bor.jenisId, p: 'Cabut kabel.', a: 'Kuas, gemuk, kunci 13', l: '1. Matikan\n2. Buka penutup\n3. Periksa karbon', i: '3', u: '' });
ok('changed content = version 2, v1 kept', p2.v === 2 && rows('Panduan').length === 2 && call({ action: 'panduanGet', id: bor.jenisId }).panduan.map(x => x.v).join() === '2,1');
ok('latest version keeps line breaks, who and when', (() => { const x = call({ action: 'panduanGet', id: bor.jenisId }).panduan[0]; return x.l.split('\n').length === 3 && x.o === 'Pak Admin' && /^\d{4}-/.test(x.t) && x.i === 3; })());
ok('bootstrap jenis carries panduan version + interval', (() => { const j = boot().jenis.find(x => x.id === bor.jenisId); return j.pv === 2 && j.pi === 3; })());
ok('jenis without panduan: pv 0', boot().jenis.find(x => x.id === grd.jenisId).pv === 0);
ok('panduan for unknown jenis refused', adm({ action: 'panduanSimpan', jid: 'J9999', l: 'x' }).ok === false);
ok('panduan text starting with = stays text (column is text format)', adm({ action: 'panduanSimpan', jid: grd.jenisId, l: '=1+1' }).ok === true);

// ---- material
ok('material needs name + satuan', adm({ action: 'addMaterial', nama: 'Semen', satuan: '' }).ok === false && adm({ action: 'addMaterial', nama: '', satuan: 'sak' }).ok === false);
ok('material negative stock refused', adm({ action: 'addMaterial', nama: 'Semen', satuan: 'sak', stok: '-5' }).ok === false);
ok('material unknown place refused', adm({ action: 'addMaterial', nama: 'Semen', satuan: 'sak', tempat: 'LOK-099' }).ok === false);
const m1 = adm({ action: 'addMaterial', nama: 'Kabel NYM 3x2,5 mm', kategori: 'Listrik', merek: 'Supreme', satuan: 'meter', stok: '100', batas: '100', tempat: 'LOK-002' });
const m2 = adm({ action: 'addMaterial', nama: 'Semen Tiga Roda 50 kg', kategori: 'Semen', merek: 'Tiga Roda', satuan: 'sak', stok: '120', batas: '20', tempat: '' });
ok('MAT-001 and MAT-002', m1.id === 'MAT-001' && m2.id === 'MAT-002', [m1, m2]);
ok('duplicate material refused', adm({ action: 'addMaterial', nama: 'kabel nym 3x2,5 mm', merek: 'supreme', satuan: 'Meter' }).ok === false);
ok('listed with numbers', (() => { const m = boot().material.find(x => x.id === 'MAT-001'); return m.n === 'Kabel NYM 3x2,5 mm' && m.q === 100 && m.lo === 100 && m.s === 'meter' && m.loc === 'LOK-002' && m.c === 'Listrik' && m.b === 'Supreme' && m.off === false; })());
ok('initial stock logged as Masuk', call({ action: 'stokLog', id: 'MAT-001' }).log.length === 1 && call({ action: 'stokLog', id: 'MAT-001' }).log[0].cat === 'Stok awal');
const s1 = adm({ action: 'stok', id: 's-1', mat: 'MAT-001', tipe: 'Keluar', jumlah: '10', nama: 'Budi Santoso', cat: 'lantai 2' });
ok('Keluar 10: stock 90', s1.ok && s1.stok === 90 && boot().material.find(x => x.id === 'MAT-001').q === 90, s1);
ok('same op id sent again is not counted twice', adm({ action: 'stok', id: 's-1', mat: 'MAT-001', tipe: 'Keluar', jumlah: '10', nama: 'Budi Santoso' }).duplicate === true && boot().material.find(x => x.id === 'MAT-001').q === 90);
ok('Masuk adds', adm({ action: 'stok', id: 's-2', mat: 'MAT-001', tipe: 'Masuk', jumlah: '5', nama: 'Andi' }).stok === 95);
ok('decimals ok (comma)', adm({ action: 'stok', id: 's-3', mat: 'MAT-001', tipe: 'Keluar', jumlah: '2,5', nama: 'Andi' }).stok === 92.5);
ok('Koreksi sets the exact number', adm({ action: 'stok', id: 's-4', mat: 'MAT-001', tipe: 'Koreksi', jumlah: '80', nama: 'Pak Admin', cat: 'hitung ulang' }).stok === 80);
ok('cannot take more than stock; stock unchanged, nothing logged', (() => { const n = rows('Stok Log').length; const x = adm({ action: 'stok', id: 's-5', mat: 'MAT-001', tipe: 'Keluar', jumlah: '81', nama: 'Andi' }); return x.ok === false && /tidak cukup/.test(x.error) && boot().material.find(y => y.id === 'MAT-001').q === 80 && rows('Stok Log').length === n; })());
ok('zero / text amount refused for Keluar', adm({ action: 'stok', id: 's-6', mat: 'MAT-001', tipe: 'Keluar', jumlah: '0', nama: 'A' }).ok === false && adm({ action: 'stok', id: 's-7', mat: 'MAT-001', tipe: 'Keluar', jumlah: 'abc', nama: 'A' }).ok === false);
ok('stok needs the worker name', adm({ action: 'stok', id: 's-8', mat: 'MAT-001', tipe: 'Keluar', jumlah: '1', nama: '' }).ok === false);
ok('stok works without oleh (workers use it)', call({ action: 'stok', id: 's-9', mat: 'MAT-001', tipe: 'Keluar', jumlah: '1', nama: 'Budi Santoso' }).ok === true);
ok('stokLog newest first, with who and after-stock', (() => { const l = call({ action: 'stokLog', id: 'MAT-001' }).log; return l.length === 6 && l[0].t >= l[l.length - 1].t && l.some(x => x.o === 'Budi Santoso' && x.tipe === 'Keluar' && x.j === 10 && x.q === 90 && x.cat === 'lantai 2'); })());
ok('stock log is per material', call({ action: 'stokLog', id: 'MAT-002' }).log.length === 1);
ok('editMaterial: batas + tempat + merek', adm({ action: 'editMaterial', id: 'MAT-002', f: { lo: '30', loc: 'LOK-001', b: 'Tiga Roda Baru' } }).changed === 3 && (() => { const m = boot().material.find(x => x.id === 'MAT-002'); return m.lo === 30 && m.loc === 'LOK-001' && m.b === 'Tiga Roda Baru'; })());
ok('editMaterial does not touch stock', boot().material.find(x => x.id === 'MAT-002').q === 120);
ok('editMaterial unknown place refused', adm({ action: 'editMaterial', id: 'MAT-002', f: { loc: 'LOK-099' } }).ok === false);
ok('setTempat moves material too', adm({ action: 'setTempat', tempat: 'LOK-002', mats: ['MAT-002'] }).mats === 1 && boot().material.find(x => x.id === 'MAT-002').loc === 'LOK-002');
ok('statusMaterial off blocks stok', adm({ action: 'statusMaterial', id: 'MAT-002', off: true }).ok && adm({ action: 'stok', id: 's-10', mat: 'MAT-002', tipe: 'Keluar', jumlah: '1', nama: 'A' }).ok === false);
ok('statusMaterial on again', adm({ action: 'statusMaterial', id: 'MAT-002', off: false }).ok && adm({ action: 'stok', id: 's-11', mat: 'MAT-002', tipe: 'Keluar', jumlah: '1', nama: 'A' }).ok === true);
ok('cannot deactivate a place that holds material', adm({ action: 'nonaktifTempat', id: 'LOK-002' }).ok === false);

// ---- impor Excel
const nUnit = rows('Unit').length, nJenis = rows('Jenis').length;
const imp = adm({ action: 'imporUnit', rows: [
  { c: 'Bor/Breker', n: 'Bor Breaker 550W', b: 'Bosch', m: 'GBH 2-28', u: '', sl: 'normal', loc: '', sn: 'S1', cat: '' },
  { c: 'Bor/Breker', n: 'Bor Breaker 550W', b: 'Bosch', m: 'GBH 2-28', u: '1', sl: 'Normal' },
  { c: 'Mesin Amplas', n: 'Amplas Baru', b: 'Makita', m: 'X1', u: '5', sl: 'Servis', loc: 'Rak 2' },
  { c: 'Mesin Amplas', n: 'Amplas Baru', b: 'Makita', m: 'X1', u: '', sl: '' },
  { c: 'Kategori Hantu', n: 'Alat', b: '', m: '' },
  { c: 'Bor/Breker', n: 'Alat Salah', b: '', m: '', sl: 'Setengah rusak' },
  { c: 'Bor/Breker', n: '', b: '', m: '' }
] });
ok('imporUnit: 3 imported, 1 duplicate skipped, 3 errors', imp.ok && imp.unit === 3 && imp.nSkipped === 1 && imp.nErrors === 3 && imp.jenis === 1, imp);
ok('imporUnit: rows written with next number, condition, place', (() => { const u = rows('Unit'); return u.length === nUnit + 3 && rows('Jenis').length === nJenis + 1 && u.some(r => r[2] === 5 && r[3] === 'Servis' && r[4] === 'LOK-002') && u.some(r => r[2] === 6 && r[3] === 'Belum dicek') && u.some(r => r[5] === 'S1'); })());
ok('imporUnit: codes continue the prefix sequence, no clash', (() => { const codes = rows('Unit').map(r => r[0]); return new Set(codes).size === codes.length; })());
ok('imporUnit: logged', rows('Log Perubahan').some(r => r[2] === 'Impor Excel' && r[3].includes('3 unit')));
ok('imporUnit needs a name', call({ action: 'imporUnit', rows: [{ c: 'Bor/Breker', n: 'X' }] }).ok === false);
ok('imporUnit empty refused', adm({ action: 'imporUnit', rows: [] }).ok === false);
ok('imporUnit over 400 refused', adm({ action: 'imporUnit', rows: new Array(401).fill({ c: 'Bor/Breker', n: 'X' }) }).ok === false);
ok('imporUnit again: all duplicates, nothing added', (() => { const n = rows('Unit').length; const x = adm({ action: 'imporUnit', rows: [{ c: 'Mesin Amplas', n: 'Amplas Baru', b: 'Makita', m: 'X1', u: '5' }] }); return x.unit === 0 && x.nSkipped === 1 && rows('Unit').length === n; })());

// ---- tanpa login / setup ulang
ok('new actions need a token', raw({ action: 'addTempat', nama: 'X' }).error === 'pin' && raw({ action: 'stok', mat: 'MAT-001' }).error === 'pin' && raw({ action: 'fotoGet', ids: ['J0001'] }).error === 'pin');
env.setup();
ok('setup again keeps all data', rows('Tempat').length >= 3 && rows('Material').length === 2 && rows('Panduan').length >= 2);
ok('Harga never sent', !JSON.stringify(boot().unit).includes('Harga'));

console.log(t.join('\n')); const f = t.filter(x => x.startsWith('FAIL')).length; console.log(f ? f + ' GAGAL' : 'SEMUA LULUS (' + t.length + ')'); process.exit(f ? 1 : 0);
