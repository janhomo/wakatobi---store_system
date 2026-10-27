const { makeEnv } = require('./gas_mock'); const vm = require('vm'), fs = require('fs'), path = require('path');
const { env, ss } = makeEnv();
vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/MesinLembar.gs'), 'utf8'), env);
const rows = n => ss.getSheetByName(n).data.slice(1).filter(r => r && r[0]);
const t = []; const ok = (n, c, x) => t.push((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  -> ' + JSON.stringify(x)));
const PIN = ss.getSheetByName('Pengaturan').data.find(r => r && r[0] === 'PIN')[1];
const raw = b => JSON.parse(env.doPost({ postData: { contents: JSON.stringify(b) } }).getContent());
const TOKEN = raw({ action: 'login', pin: PIN }).token;
const call = b => raw({ token: TOKEN, ...b });
ok('Unit has Pemilik column', ss.getSheetByName('Unit').data[0][11] === 'Pemilik');
// pengedit
const J = { c: 'Bor/Breker', n: 'Bor X', b: 'Bosch', m: 'M1' };
ok('non-editor refused', call({ action: 'addUnit', oleh: 'Budi', jenis: J, f: {} }).ok === false);
ok('editor name case-insensitive', call({ action: 'addUnit', oleh: 'la ode riyan syaputra', jenis: J, f: {} }).ok === true);
ok('Vikar allowed', call({ action: 'addUnit', oleh: 'Vikar', jenisId: 'J0001', f: {} }).ok === true);
ok('borrower name not restricted', call({ action: 'addPengambilan', id: 'p1', kode: 'BOR-001', nama: 'Budi', jam: '2026-10-01T08:00:00' }).error !== 'Hanya Abidin, Vikar, dan La Ode Riyan Syaputra yang boleh mengubah data.');
ok('bootstrap lists pengedit', call({ action: 'bootstrap' }).cfg.pengedit.length === 3);
// pemilik
call({ action: 'savePekerja', pekerja: [{ n: 'Budi', d: 'Pembesian' }, { n: 'Andi', d: 'Karpenter' }] });
ok('Pemilik must be a department', call({ action: 'editUnit', oleh: 'Abidin', kode: 'BOR-001', f: { pm: 'Dapur' } }).ok === false);
ok('Pemilik set (case-insensitive)', call({ action: 'editUnit', oleh: 'Abidin', kode: 'BOR-001', f: { pm: 'pembesian' } }).changed === 1);
ok('Pemilik served as pm', call({ action: 'bootstrap' }).unit.find(u => u.k === 'BOR-001').pm === 'Pembesian');
ok('Pemilik cleared', call({ action: 'editUnit', oleh: 'Abidin', kode: 'BOR-001', f: { pm: '' } }).changed === 1 && call({ action: 'bootstrap' }).unit.find(u => u.k === 'BOR-001').pm === '');
ok('addUnit with Pemilik', (() => { const a = call({ action: 'addUnit', oleh: 'Abidin', jenisId: 'J0001', f: { pm: 'Karpenter' } }); return a.ok && call({ action: 'bootstrap' }).unit.find(u => u.k === a.kode).pm === 'Karpenter'; })());
ok('addUnit bad Pemilik', call({ action: 'addUnit', oleh: 'Abidin', jenisId: 'J0001', f: { pm: 'Dapur' } }).ok === false);
ok('import with Pemilik', call({ action: 'imporUnit', oleh: 'Abidin', rows: [{ c: 'Bor/Breker', n: 'Bor Y', b: 'B', m: 'M', pm: 'Andi' }] }).nErrors === 1);
ok('import with Pemilik ok', call({ action: 'imporUnit', oleh: 'Abidin', rows: [{ c: 'Bor/Breker', n: 'Bor Y', b: 'B', m: 'M', pm: 'Karpenter' }] }).unit === 1);
// rak
let r = call({ action: 'buatRak', oleh: 'Abidin' });
ok('50 racks created', r.dibuat === 50, r);
const topRaks = () => rows('Tempat').filter(r => !r[4]);
const T = topRaks();
ok('racks Rak 001..050 with LOK codes', T.length === 50 && T[0][0] === 'LOK-001' && T[0][1] === 'Rak 001' && T[49][0] === 'LOK-050' && T[49][1] === 'Rak 050');
ok('each new rak auto-filled with 10 sub rak A..J', rows('Tempat').filter(r => r[4] === 'LOK-001').length === 10 && rows('Tempat').find(r => r[0] === 'LOK-001-J'));
ok('racks idempotent', call({ action: 'buatRak', oleh: 'Abidin' }).dibuat === 0 && topRaks().length === 50);
ok('unit can be placed in rack', call({ action: 'editUnit', oleh: 'Abidin', kode: 'BOR-001', f: { loc: 'LOK-007' } }).changed === 1);
ok('next new tempat is LOK-051', call({ action: 'addTempat', oleh: 'Abidin', nama: 'Gudang Utara' }).id === 'LOK-051');
ok('plain addTempat does not auto-fill sub rak', rows('Tempat').filter(r => r[4] === 'LOK-051').length === 0);
// impor isi rak (Kode Mesin -> Kode/Nama Rak). Hanya BOR-001..003 ada di titik ini.
ok('imporRak by LOK id', call({ action: 'imporRak', oleh: 'Abidin', rows: [{ kode: 'BOR-002', rak: 'LOK-008' }] }).changed === 1);
ok('imporRak unit moved to LOK-008', rows('Unit').find(r => r[0] === 'BOR-002')[4] === 'LOK-008');
ok('imporRak by rack name', call({ action: 'imporRak', oleh: 'Abidin', rows: [{ kode: 'BOR-003', rak: 'Rak 009' }] }).changed === 1);
ok('imporRak unit moved by name', rows('Unit').find(r => r[0] === 'BOR-003')[4] === 'LOK-009');
ok('imporRak unknown kode errors', call({ action: 'imporRak', oleh: 'Abidin', rows: [{ kode: 'XXX-999', rak: 'Rak 001' }] }).nErrors === 1);
ok('imporRak unknown rak errors', call({ action: 'imporRak', oleh: 'Abidin', rows: [{ kode: 'BOR-001', rak: 'Rak 999' }] }).nErrors === 1);
ok('imporRak empty rak skipped', call({ action: 'imporRak', oleh: 'Abidin', rows: [{ kode: 'BOR-001', rak: '' }] }).nSkipped === 1);
ok('imporRak already there skipped', call({ action: 'imporRak', oleh: 'Abidin', rows: [{ kode: 'BOR-002', rak: 'LOK-008' }] }).nSkipped === 1);
ok('imporRak duplicate row in same batch skipped', (() => { const r2 = call({ action: 'imporRak', oleh: 'Abidin', rows: [{ kode: 'BOR-001', rak: 'Rak 010' }, { kode: 'BOR-001', rak: 'Rak 011' }] }); return r2.changed === 1 && r2.nSkipped === 1; })());
ok('imporRak non-editor refused', call({ action: 'imporRak', oleh: 'Budi', rows: [{ kode: 'BOR-001', rak: 'Rak 001' }] }).ok === false);
// sub rak (satu level di bawah rak, kode permanen induk-huruf, tidak terbatas, punya QR sendiri)
// pakai LOK-051 (dibuat lewat addTempat biasa, jadi belum ada sub rak otomatis di dalamnya)
let sr = call({ action: 'addTempat', oleh: 'Abidin', nama: 'Tingkat 1', induk: 'LOK-051' });
ok('sub rak created under Gudang Utara', sr.ok === true, sr);
const subId = sr.id;
ok('sub rak gets permanent code LOK-051-A', subId === 'LOK-051-A', sr);
ok('listTempat exposes ind for sub rak', call({ action: 'bootstrap' }).tempat.find(x => x.id === subId).ind === 'LOK-051');
ok('sub rak cannot have its own sub rak', call({ action: 'addTempat', oleh: 'Abidin', nama: 'Tingkat 1a', induk: subId }).ok === false);
ok('2nd sub rak under same rak gets -B', call({ action: 'addTempat', oleh: 'Abidin', nama: 'Tingkat 2', induk: 'LOK-051' }).id === 'LOK-051-B');
ok('sub rak name can repeat under a different rak (LOK-001, 10 auto subs already use A..J)', call({ action: 'addTempat', oleh: 'Abidin', nama: 'Tingkat 1', induk: 'LOK-001' }).id === 'LOK-001-K');
ok('sub rak name cannot repeat under the same rak', call({ action: 'addTempat', oleh: 'Abidin', nama: 'Tingkat 1', induk: 'LOK-051' }).ok === false);
ok('unit can be placed directly in a sub rak', call({ action: 'editUnit', oleh: 'Abidin', kode: 'BOR-001', f: { loc: subId } }).changed === 1);
ok('rak with active sub rak cannot be deactivated', call({ action: 'nonaktifTempat', oleh: 'Abidin', id: 'LOK-051' }).ok === false);
ok('sub rak with a unit inside cannot be deactivated', call({ action: 'nonaktifTempat', oleh: 'Abidin', id: subId }).ok === false);
ok('move unit out of sub rak', call({ action: 'editUnit', oleh: 'Abidin', kode: 'BOR-001', f: { loc: 'LOK-001' } }).changed === 1);
ok('empty sub rak can now be deactivated', call({ action: 'nonaktifTempat', oleh: 'Abidin', id: subId }).ok === true);
ok('2nd sub rak (LOK-051-B) still empty, must be deactivated too', call({ action: 'nonaktifTempat', oleh: 'Abidin', id: 'LOK-051-B' }).ok === true);
ok('rak can be deactivated once all its sub rak are inactive', call({ action: 'nonaktifTempat', oleh: 'Abidin', id: 'LOK-051' }).ok === true);
call({ action: 'aktifTempat', oleh: 'Abidin', id: 'LOK-051' }); call({ action: 'aktifTempat', oleh: 'Abidin', id: subId });
// saran tolak
ok('saranTolak stored and served', call({ action: 'saranTolak', oleh: 'Vikar', id: 'm:a|b' }).ok && JSON.parse(call({ action: 'bootstrap' }).cfg.saranTolak).includes('m:a|b'));
ok('saranTolak undo', call({ action: 'saranTolak', oleh: 'Vikar', id: 'm:a|b', batal: true }).ok && JSON.parse(call({ action: 'bootstrap' }).cfg.saranTolak).length === 0);
ok('saranTolak non-editor refused', call({ action: 'saranTolak', oleh: 'Budi', id: 'x' }).ok === false);
// data lembar
const before = rows('Unit').length;
const res = env.isiMesinLembar();
ok('21 machines from sheets entered', res.unit === 21 && res.nErrors === 0 && rows('Unit').length === before + 21, res);
const b = call({ action: 'bootstrap' }); const jm = Object.fromEntries(b.jenis.map(j => [j.id, j]));
const gws700 = b.unit.filter(u => jm[u.j].b === 'Bosch' && jm[u.j].m === 'GWS 700');
ok('GWS 700: 3 units, two names, kondisi as written', gws700.length === 3 && new Set(gws700.map(u => jm[u.j].n)).size === 2 && gws700.filter(u => u.sl === 'Servis').length === 1 && gws700.filter(u => u.sl === 'Rusak').length === 1);
ok('No. lembar in Catatan', b.unit.filter(u => /^No\. lembar: \d+$/.test(u.cat)).length === 21);
ok('marble cutter has no merek, model K 1601', b.jenis.some(j => /Marble/.test(j.n) && j.b === '' && j.m === 'K 1601'));
ok('5 kipas unit 1..5', b.unit.filter(u => /Kipas/.test(jm[u.j].n)).map(u => Number(u.u)).sort().join() === '1,2,3,4,5');
ok('run again skips all', env.isiMesinLembar().unit === 0 && rows('Unit').length === before + 21);
// migrasi sub rak lama (kode LOK-xxx bebas dari sebelum fitur ini ada) ke kode permanen induk-huruf
const tsh = ss.getSheetByName('Tempat');
const randRak = call({ action: 'addTempat', oleh: 'Abidin', nama: 'Rak Uji Migrasi' }).id; // LOK-052, tanpa sub rak otomatis
tsh.appendRow(['LOK-777', 'Sub Lama 1', '', '', randRak]); // kode lama gaya rak biasa, padahal sub rak
tsh.appendRow(['LOK-778', 'Sub Lama 2', '', '', randRak]);
const kodeTest = rows('Unit')[0][0];
call({ action: 'editUnit', oleh: 'Abidin', kode: kodeTest, f: { loc: 'LOK-777' } });
env.setup();
const T2 = rows('Tempat');
ok('old-style sub rak 1 renamed to ' + randRak + '-A', T2.some(r => r[0] === randRak + '-A' && r[1] === 'Sub Lama 1'));
ok('old-style sub rak 2 renamed to ' + randRak + '-B', T2.some(r => r[0] === randRak + '-B' && r[1] === 'Sub Lama 2'));
ok('old LOK-777/778 codes gone', !T2.some(r => r[0] === 'LOK-777' || r[0] === 'LOK-778'));
ok('unit placed in old sub rak code follows the rename', rows('Unit').find(r => r[0] === kodeTest)[4] === randRak + '-A');
ok('migration is idempotent (setup again, no more renames)', (() => { env.setup(); const T3 = rows('Tempat'); return T3.filter(r => r[4] === randRak).length === 10; })());
console.log(t.join('\n')); const f = t.filter(x => x.startsWith('FAIL')).length; console.log(f ? f + ' GAGAL' : 'SEMUA LULUS (' + t.length + ')'); process.exit(f ? 1 : 0);
