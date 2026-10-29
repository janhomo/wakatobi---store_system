// Tes server: kolom maintenance custom per jenis (Skema Maintenance) + data tambahan/lampiran di Maintenance
const { makeEnv } = require('./gas_mock');
const { env, ss } = makeEnv();
const setting = k => { const r = ss.getSheetByName('Pengaturan').data.find(r => r && r[0] === k); return r ? r[1] : undefined; };
const raw = body => JSON.parse(env.doPost({ postData: { contents: JSON.stringify(body) } }).getContent());
const PIN = setting('PIN');
const t = []; const ok = (n, c, x) => t.push((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  -> ' + JSON.stringify(x)));
const rows = n => ss.getSheetByName(n).data.slice(1).filter(r => r && r[0]);
const TOKEN = raw({ action: 'login', pin: PIN }).token;
const call = body => raw({ token: TOKEN, ...body });
const adm = body => call({ oleh: 'Abidin', ...body });
const boot = () => call({ action: 'bootstrap' });

ok('Skema Maintenance sheet exists after setup', !!ss.getSheetByName('Skema Maintenance'));
ok('bootstrap carries empty skema map', JSON.stringify(boot().skema) === '{}');

const jenis = adm({ action: 'addUnit', jenis: { c: 'Bor/Breker', n: 'Genset 5000W', b: 'Honda', m: 'EG5000' }, f: { sl: 'Normal' } });
const jid = jenis.jenisId;

// ---- tambah kolom
ok('non-editor refused', call({ oleh: 'Budi', action: 'skemaAddKolom', jenisId: jid, label: 'Jam operasi', tipe: 'angka' }).ok === false);
const k1 = adm({ action: 'skemaAddKolom', jenisId: jid, label: 'Jam operasi', tipe: 'angka' });
ok('kolom 1 dibuat', k1.ok === true && k1.id === 'k1');
const k2 = adm({ action: 'skemaAddKolom', jenisId: jid, label: 'Ganti oli terakhir', tipe: 'tanggal' });
ok('kolom 2 dibuat, id lanjut', k2.id === 'k2');
const k3 = adm({ action: 'skemaAddKolom', jenisId: jid, label: 'Tekanan oli normal?', tipe: 'centang' });
ok('kolom 3 dibuat', k3.id === 'k3');
ok('jenis lain tidak kebagian kolom ini', boot().skema[jid].length === 3);
ok('skemaList sesuai urutan dibuat', call({ action: 'skemaList', id: jid }).skema.map(x => x.label).join(',') === 'Jam operasi,Ganti oli terakhir,Tekanan oli normal?');
ok('nama kolom wajib', adm({ action: 'skemaAddKolom', jenisId: jid, label: '', tipe: 'teks' }).ok === false);
ok('tipe tidak dikenal ditolak', adm({ action: 'skemaAddKolom', jenisId: jid, label: 'Kolom X', tipe: 'rahasia' }).ok === false);
ok('kolom duplikat nama ditolak', adm({ action: 'skemaAddKolom', jenisId: jid, label: 'jam operasi', tipe: 'teks' }).ok === false);
ok('jenis tidak ada ditolak', adm({ action: 'skemaAddKolom', jenisId: 'J999', label: 'Kolom Y', tipe: 'teks' }).ok === false);

// ---- edit kolom
const e1 = adm({ action: 'skemaEditKolom', jenisId: jid, kolomId: 'k1', label: 'Jam operasi mesin', tipe: 'angka' });
ok('edit label kolom', e1.ok === true && e1.changed === 1 && call({ action: 'skemaList', id: jid }).skema[0].label === 'Jam operasi mesin');
ok('edit kolom tak dikenal ditolak', adm({ action: 'skemaEditKolom', jenisId: jid, kolomId: 'k9', label: 'X', tipe: 'teks' }).ok === false);
ok('edit tanpa perubahan: changed 0', adm({ action: 'skemaEditKolom', jenisId: jid, kolomId: 'k1', label: 'Jam operasi mesin', tipe: 'angka' }).changed === 0);

// ---- hapus kolom (tetap bisa, soft delete)
const h1 = adm({ action: 'skemaHapusKolom', jenisId: jid, kolomId: 'k2' });
ok('hapus kolom k2', h1.ok === true);
ok('kolom terhapus tidak muncul lagi di skemaList', call({ action: 'skemaList', id: jid }).skema.length === 2 && !call({ action: 'skemaList', id: jid }).skema.some(x => x.id === 'k2'));
ok('bootstrap skema juga tidak memuat kolom terhapus', boot().skema[jid].length === 2);
ok('hapus kolom yang sudah terhapus: aman (missing)', adm({ action: 'skemaHapusKolom', jenisId: jid, kolomId: 'k2' }).missing === true);
ok('baris di sheet tidak hilang (soft delete)', rows('Skema Maintenance').some(r => r[1] === 'k2' && r[4] === 'nonaktif'));
ok('nama lama (k2) bisa dipakai lagi oleh kolom baru karena sudah nonaktif', adm({ action: 'skemaAddKolom', jenisId: jid, label: 'Ganti oli terakhir', tipe: 'tanggal' }).ok === true);
ok('id kolom baru tidak memakai ulang k2 (id tetap unik)', !adm({ action: 'skemaAddKolom', jenisId: jid, label: 'Kolom lagi', tipe: 'teks' }).id.match(/^k[12]$/));

// ---- maintenance: data tambahan (JSON per kolom) + link lampiran
const u1 = rows('Unit')[0][0];
const add = adm({ action: 'addMaintenance', id: 'm1', kode: u1, tgl: '2026-10-29', jenis: 'Servis rutin', oleh: 'Budi', cat: 'Servis 500 jam', next: '2027-01-29',
  data: { k1: '2140', k3: true }, lampiran: 'https://drive.google.com/laporan-gen002.pdf' });
ok('addMaintenance dengan data tambahan + lampiran', add.ok === true);
const mlist = boot().maintenance;
ok('data tambahan tersimpan', (() => { const m = mlist.find(x => x.id === 'm1'); return m.data.k1 === '2140' && m.data.k3 === true && m.lampiran === 'https://drive.google.com/laporan-gen002.pdf'; })());
ok('maintenance tanpa data/lampiran tetap jalan', adm({ action: 'addMaintenance', id: 'm2', kode: u1, tgl: '2026-10-30', jenis: 'Cek rutin', oleh: 'Budi' }).ok === true);
ok('default data kosong object, lampiran kosong', (() => { const m = boot().maintenance.find(x => x.id === 'm2'); return JSON.stringify(m.data) === '{}' && m.lampiran === ''; })());
ok('lampiran terlalu panjang ditolak', adm({ action: 'addMaintenance', id: 'm3', kode: u1, tgl: '2026-10-31', lampiran: 'x'.repeat(501) }).ok === false);

// ---- hapus permanen unit + jenis
const u2res = adm({ action: 'addUnit', jenisId: jid, f: { sl: 'Normal' } });
const u2 = u2res.kode;
ok('unit kedua dibuat', u2res.ok === true);
ok('non-editor tidak bisa hapus unit', call({ oleh: 'Budi', action: 'hapusUnit', kode: u2 }).ok === false);
adm({ action: 'addPengambilan', id: 'p1', tgl: '2026-10-29', nama: 'Budi', kode: u2, waktu: '2026-10-29T08:00:00' });
ok('unit yang sedang dibawa tidak bisa dihapus', (() => { const x = adm({ action: 'hapusUnit', kode: u2 }); return x.ok === false && /dibawa/.test(x.error); })());
adm({ action: 'returnPengambilan', id: 'p1', waktu: '2026-10-29T10:00:00', kondisi: 'Baik' });
ok('tidak bisa hapus jenis selagi masih ada unit', (() => { const x = adm({ action: 'hapusJenis', id: jid }); return x.ok === false && /unit/.test(x.error); })());
ok('hapus unit kedua berhasil setelah dikembalikan', adm({ action: 'hapusUnit', kode: u2 }).ok === true);
ok('unit kedua benar-benar hilang dari Unit sheet', !rows('Unit').some(r => r[0] === u2));
ok('hapus unit yang sudah tidak ada: aman (missing)', adm({ action: 'hapusUnit', kode: u2 }).missing === true);
ok('riwayat pengambilan lama tetap ada (tidak ikut terhapus)', rows('Pengambilan').some(r => r[0] === 'p1'));
ok('hapus unit tercatat di Log Perubahan', call({ action: 'logList' }).log.some(x => x.a === 'Hapus unit' && x.k === u2));
ok('masih tidak bisa hapus jenis, 1 unit tersisa', adm({ action: 'hapusJenis', id: jid }).ok === false);
ok('hapus unit pertama', adm({ action: 'hapusUnit', kode: u1 }).ok === true);
ok('sekarang jenis bisa dihapus (0 unit)', adm({ action: 'hapusJenis', id: jid }).ok === true);
ok('jenis hilang dari bootstrap', !boot().jenis.some(x => x.id === jid));
ok('skema maintenance jenis ini ikut terhapus', !rows('Skema Maintenance').some(r => r[0] === jid));
ok('hapus jenis yang tidak ada ditolak', adm({ action: 'hapusJenis', id: jid }).ok === false);
ok('hapus jenis yang benar-benar tidak pernah ada ditolak', adm({ action: 'hapusJenis', id: 'J999' }).ok === false);

console.log(t.join('\n')); const f = t.filter(x => x.startsWith('FAIL')).length;
console.log(f ? f + ' GAGAL' : 'SEMUA LULUS (' + t.length + ')'); process.exit(f ? 1 : 0);
