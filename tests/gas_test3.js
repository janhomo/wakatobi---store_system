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
const T = rows('Tempat');
ok('racks Rak 001..050 with LOK codes', T.length === 50 && T[0][0] === 'LOK-001' && T[0][1] === 'Rak 001' && T[49][0] === 'LOK-050' && T[49][1] === 'Rak 050');
ok('racks idempotent', call({ action: 'buatRak', oleh: 'Abidin' }).dibuat === 0 && rows('Tempat').length === 50);
ok('unit can be placed in rack', call({ action: 'editUnit', oleh: 'Abidin', kode: 'BOR-001', f: { loc: 'LOK-007' } }).changed === 1);
ok('next new tempat is LOK-051', call({ action: 'addTempat', oleh: 'Abidin', nama: 'Gudang Utara' }).id === 'LOK-051');
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
console.log(t.join('\n')); const f = t.filter(x => x.startsWith('FAIL')).length; console.log(f ? f + ' GAGAL' : 'SEMUA LULUS (' + t.length + ')'); process.exit(f ? 1 : 0);
