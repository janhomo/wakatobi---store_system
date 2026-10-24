/**
 * QR Aset Gudang - server v3 (Google Apps Script)
 * Data ada di Google Sheet ini:
 *   Jenis, Unit, Kategori, Pengambilan, Arsip, Maintenance, Pekerja, Log Perubahan, Pengaturan,
 *   Foto, Tempat, Panduan, Material, Stok Log.
 *
 * Pasang / perbarui:
 *  1. Tempel seluruh kode ini di Apps Script (ganti kode lama), simpan.
 *  2. Pilih fungsi setup, klik Run. Aman dijalankan ulang, data tidak hilang.
 *     Jika PIN lama kurang dari 6 angka, setup membuat PIN 6 angka yang baru dan menampilkannya.
 *  3. Deploy > Manage deployments > Edit (ikon pensil) > Version: New version > Deploy.
 *     Jangan pilih "New deployment", supaya alamat Web app tetap sama.
 *
 * Fungsi yang dijalankan manual dari editor (bukan dari aplikasi):
 *  - resetDataLama : memindahkan data v2 (Mesin, Pengambilan, Arsip, Maintenance, Log Perubahan)
 *                    ke sheet "Lama ..." lalu membuat sheet baru yang kosong. Tidak ada yang dihapus.
 *  - buatPinBaru   : membuat PIN 6 angka baru. Semua HP harus login ulang.
 */

var TZ = 'Asia/Makassar';
var LOGIN_MAX = 5;      // salah PIN berturut-turut sebelum dikunci
var LOCK_MENIT = 15;    // lama kunci
var TOKEN_HARI = 90;    // masa berlaku login di satu HP
// Hanya tiga orang ini yang boleh mengubah data (nama dipilih di aplikasi, dicek lagi di sini).
var PENGEDIT = ['Abidin', 'Vikar', 'La Ode Riyan Syaputra'];
var KONDISI_OK = ['Normal', 'Servis', 'Rusak', 'Rusak total', 'Belum dicek'];

var HEADERS = {
  'Jenis': ['ID Jenis', 'Kategori', 'Nama Mesin/Alat', 'Merek', 'Model / Tipe', 'Status'],
  'Unit': ['Kode', 'ID Jenis', 'No. Unit', 'Kondisi', 'Tempat', 'No. Seri', 'Tanggal Beli', 'Garansi Sampai', 'Catatan', 'Status', 'Harga', 'Pemilik'],
  'Kategori': ['Kategori', 'Awalan'],
  'Pengambilan': ['ID', 'Tanggal', 'Nama', 'Kode Aset', 'Mesin', 'Model', 'Jam Ambil', 'Jam Kembali', 'Kondisi Kembali', 'Catatan', 'Departemen'],
  'Arsip': ['ID', 'Tanggal', 'Nama', 'Kode Aset', 'Mesin', 'Model', 'Jam Ambil', 'Jam Kembali', 'Kondisi Kembali', 'Catatan', 'Departemen', 'Diarsipkan'],
  'Maintenance': ['ID', 'Kode Aset', 'Tanggal', 'Jenis', 'Dikerjakan Oleh', 'Catatan', 'Jadwal Berikutnya', 'Dicatat'],
  'Pekerja': ['Nama', 'Departemen'],
  'Log Perubahan': ['Waktu', 'Kode Aset', 'Aksi', 'Detail', 'Oleh'],
  'Pengaturan': ['Kunci', 'Nilai'],
  'Foto': ['ID Jenis', 'Foto', 'Diubah'],
  'Tempat': ['ID Tempat', 'Nama', 'Lokasi', 'Status'],
  'Panduan': ['ID Jenis', 'Versi', 'Peringatan', 'Alat dan Bahan', 'Langkah', 'Interval (bulan)', 'Tautan Manual', 'Oleh', 'Waktu'],
  'Material': ['ID Material', 'Nama', 'Kategori', 'Merek', 'Satuan', 'Stok', 'Batas Menipis', 'Tempat', 'Status'],
  'Stok Log': ['ID', 'Waktu', 'ID Material', 'Jenis', 'Jumlah', 'Stok Sesudah', 'Oleh', 'Catatan']
};
var TEXT_COLS = {
  'Unit': ['E:F', 'G:H', 'I:I', 'L:L'],
  'Pengambilan': ['B:B', 'G:H'],
  'Arsip': ['B:B', 'G:H', 'L:L'],
  'Maintenance': ['C:C', 'G:H'],
  'Log Perubahan': ['A:A'],
  'Pengaturan': ['B:B'],
  'Foto': ['C:C'],
  'Panduan': ['C:E', 'G:G', 'I:I'],
  'Tempat': ['B:C'],
  'Material': ['B:E'],
  'Stok Log': ['B:B', 'G:H']
};
var KATEGORI_AWAL = [
  ['Bor/Breker', 'BOR'], ['Gurinda/Mesin Potong', 'GRD'], ['Mesin Amplas', 'AMP'], ['Mesin Karpenter', 'KRP'],
  ['Mesin Pembersihan', 'PBR'], ['Pengaduk', 'PGD'], ['Peralatan Baja/Besi', 'BJA'], ['Peralatan Udara', 'UDR'],
  ['Alat Ukur & Pendeteksi', 'UKR']
];

/* ---------- setup (aman dijalankan ulang) ---------- */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var h = HEADERS[name];
    sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold').setBackground('#1F5F8B').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
    (TEXT_COLS[name] || []).forEach(function (a) { sh.getRange(a).setNumberFormat('@'); });
  });
  var kat = ss.getSheetByName('Kategori');
  if (kat.getLastRow() < 2) kat.getRange(2, 1, KATEGORI_AWAL.length, 2).setValues(KATEGORI_AWAL);
  var made = [];
  var pin = getSetting_('PIN');
  if (!/^\d{6}$/.test(pin)) {
    var p = rand6_();
    setSetting_('PIN', p);
    setSetting_('PIN VERSI', String((Number(getSetting_('PIN VERSI')) || 0) + 1));
    made.push('PIN baru (6 angka): ' + p);
  }
  if (!getSetting_('PIN VERSI')) setSetting_('PIN VERSI', '1');
  if (!getSetting_('SECRET')) setSetting_('SECRET', randKey_());
  if (!getSetting_('JAM PULANG')) setSetting_('JAM PULANG', '17:00');
  var first = ss.getSheets()[0];
  if (['Sheet1', 'Sheet 1', 'Lembar1'].indexOf(first.getName()) >= 0) { try { ss.deleteSheet(first); } catch (e) {} }
  var mg = migrasiTempat_();
  if (mg.made) made.push(mg.made + ' tempat dibuat dari kolom Tempat lama');
  var msg = 'Siap. ' + (made.length ? made.join('. ') + '. Catat PIN ini dan bagikan ke penjaga. ' : 'Pengaturan lama dipertahankan. ') +
    'PIN dan jam pulang ada di sheet Pengaturan.';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
}
function buatPinBaru() {
  var p = rand6_();
  setSetting_('PIN', p);
  setSetting_('PIN VERSI', String((Number(getSetting_('PIN VERSI')) || 0) + 1));
  setSetting_('GAGAL', '0'); setSetting_('KUNCI SAMPAI', '0');
  var msg = 'PIN baru: ' + p + '. Semua HP harus login ulang dengan PIN ini.';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
}
// Pindahkan data lama ke sheet "Lama ..." (tidak ada yang dihapus), lalu buat sheet baru yang kosong.
function resetDataLama(force) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!force) {
    var ui = SpreadsheetApp.getUi();
    var ans = ui.alert('Reset data lama', 'Sheet Mesin, Pengambilan, Arsip, Maintenance, dan Log Perubahan akan dipindah ke sheet "Lama ..." dan diganti sheet kosong. Pekerja dan Pengaturan tidak diubah. Lanjutkan?', ui.ButtonSet.YES_NO);
    if (ans !== ui.Button.YES) return;
  }
  var stamp = today_().replace(/-/g, '');
  var moved = [];
  ['Mesin', 'Pengambilan', 'Arsip', 'Maintenance', 'Log Perubahan'].forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) return;
    var n = 'Lama ' + name + ' ' + stamp, i = 2;
    while (ss.getSheetByName(n)) { n = 'Lama ' + name + ' ' + stamp + ' (' + i + ')'; i++; }
    sh.setName(n);
    moved.push(name);
  });
  setup();
  var msg = 'Selesai. Dipindah ke sheet "Lama ...": ' + (moved.length ? moved.join(', ') : '(tidak ada)') + '.';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
}
function rand6_() { return String(Math.floor(100000 + Math.random() * 900000)); }
function randKey_() { var s = ''; for (var i = 0; i < 40; i++) s += 'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 36)); return s; }

/* ---------- web app ---------- */
function doGet() { return json_({ ok: true, info: 'QR Aset Gudang v3 aktif' }); }

function doPost(e) {
  var out;
  try {
    var req = JSON.parse(e.postData.contents);
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      if (req.action === 'login') out = login_(req);
      else if (!tokenOk_(req.token)) out = { ok: false, error: 'pin' };
      else out = route_(req);
    } finally { lock.releaseLock(); }
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  return json_(out);
}

/* ---------- login: PIN 6 angka, kunci setelah salah berulang, token per HP ---------- */
function hex_(bytes) {
  return bytes.map(function (b) { b = (b < 0 ? b + 256 : b).toString(16); return b.length < 2 ? '0' + b : b; }).join('');
}
function sign_(payload) { return hex_(Utilities.computeHmacSha256Signature(payload, getSetting_('SECRET'))); }
function makeToken_() { var p = String(Date.now()) + '.' + getSetting_('PIN VERSI'); return p + '.' + sign_(p); }
function tokenOk_(t) {
  var parts = str_(t).split('.');
  if (parts.length !== 3 || !getSetting_('SECRET')) return false;
  var p = parts[0] + '.' + parts[1];
  if (sign_(p) !== parts[2]) return false;
  if (parts[1] !== getSetting_('PIN VERSI')) return false;
  var age = Date.now() - Number(parts[0]);
  return age >= 0 && age < TOKEN_HARI * 86400000;
}
function login_(req) {
  var now = Date.now(), until = Number(getSetting_('KUNCI SAMPAI') || 0);
  if (until > now) return { ok: false, error: 'kunci', menit: Math.ceil((until - now) / 60000) };
  var pin = clean_(req.pin);
  if (pin && pin === getSetting_('PIN')) { setSetting_('GAGAL', '0'); return { ok: true, token: makeToken_() }; }
  var n = (Number(getSetting_('GAGAL')) || 0) + 1;
  if (n >= LOGIN_MAX) {
    setSetting_('GAGAL', '0'); setSetting_('KUNCI SAMPAI', String(now + LOCK_MENIT * 60000));
    return { ok: false, error: 'kunci', menit: LOCK_MENIT };
  }
  setSetting_('GAGAL', String(n));
  return { ok: false, error: 'pin', sisa: LOGIN_MAX - n };
}

var BUTUH_NAMA = ['addUnit', 'editUnit', 'editJenis', 'nonaktifUnit', 'aktifkanUnit', 'renameMerek', 'gabungJenis',
  'addTempat', 'editTempat', 'nonaktifTempat', 'aktifTempat', 'setTempat', 'fotoSet', 'fotoHapus', 'panduanSimpan',
  'addMaterial', 'editMaterial', 'statusMaterial', 'imporUnit', 'buatRak', 'saranTolak'];
function route_(req) {
  if (BUTUH_NAMA.indexOf(req.action) >= 0 && !clean_(req.oleh)) return { ok: false, error: 'Pilih nama Anda dulu.' };
  if (BUTUH_NAMA.indexOf(req.action) >= 0 && !PENGEDIT.some(function (n) { return same_(n, req.oleh); })) return { ok: false, error: 'Hanya Abidin, Vikar, dan La Ode Riyan Syaputra yang boleh mengubah data.' };
  switch (req.action) {
    case 'bootstrap':
      return { ok: true, jenis: listJenis_(), unit: listUnit_(), kategori: listKategori_(), pekerja: listPekerja_(), maintenance: listMaintenance_(),
               tempat: listTempat_(), material: listMaterial_(),
               pengambilan: listPengambilan_(req.tgl), belum: listBelum_(), cfg: { jamPulang: getSetting_('JAM PULANG') || '17:00', saranTolak: getSetting_('SARAN DITOLAK') || '', pengedit: PENGEDIT }, serverDate: today_() };
    case 'pengambilan': return { ok: true, pengambilan: listPengambilan_(req.tgl) };
    case 'ringkasan': return { ok: true, ringkasan: ringkasan_() };
    case 'riwayat': return { ok: true, riwayat: riwayat_([clean_(req.kode)]) };
    case 'riwayatJenis': return { ok: true, riwayat: riwayat_(kodeJenis_(clean_(req.id))) };
    case 'logList': return { ok: true, log: logList_() };
    case 'addPengambilan': return addPengambilan_(req);
    case 'returnPengambilan': return returnPengambilan_(req);
    case 'batalKembali': return batalKembali_(req);
    case 'cancelPengambilan': return deleteById_('Pengambilan', req.id);
    case 'addMaintenance': return addMaintenance_(req);
    case 'deleteMaintenance': return deleteById_('Maintenance', req.id);
    case 'savePekerja': return savePekerja_(req.pekerja);
    case 'addUnit': return addUnit_(req);
    case 'editUnit': return editUnit_(req);
    case 'editJenis': return editJenis_(req);
    case 'nonaktifUnit': return statusUnit_(req, true);
    case 'aktifkanUnit': return statusUnit_(req, false);
    case 'renameMerek': return renameMerek_(req);
    case 'gabungJenis': return gabungJenis_(req);
    case 'arsipkan': return arsipkan_(req.tgl);
    case 'addTempat': return addTempat_(req);
    case 'editTempat': return editTempat_(req);
    case 'nonaktifTempat': return statusTempat_(req, true);
    case 'aktifTempat': return statusTempat_(req, false);
    case 'setTempat': return setTempat_(req);
    case 'fotoGet': return fotoGet_(req.ids);
    case 'fotoSet': return fotoSet_(req);
    case 'fotoHapus': return fotoHapus_(req);
    case 'panduanGet': return { ok: true, panduan: panduanList_(clean_(req.id)) };
    case 'panduanSimpan': return panduanSimpan_(req);
    case 'addMaterial': return addMaterial_(req);
    case 'editMaterial': return editMaterial_(req);
    case 'statusMaterial': return statusMaterial_(req);
    case 'stok': return stok_(req);
    case 'stokLog': return { ok: true, log: stokLog_(clean_(req.id)) };
    case 'imporUnit': return imporUnit_(req);
    case 'buatRak': return buatRak_(req);
    case 'pulihKondisi': return pulihKondisi_(req);
    case 'saranTolak': return saranTolak_(req);
  }
  return { ok: false, error: 'aksi tidak dikenal' };
}

/* ---------- helpers ---------- */
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function sheet_(name) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); }
function today_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function stamp_() { return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ss"); }
function ds_(v) { return v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : (v === null || v === undefined ? '' : String(v)); }
function ts_(v) { return v instanceof Date ? Utilities.formatDate(v, TZ, "yyyy-MM-dd'T'HH:mm:ss") : (v === null || v === undefined ? '' : String(v)); }
function str_(v) { return v === null || v === undefined ? '' : String(v); }
function clean_(s) { return str_(s).replace(/\s+/g, ' ').trim(); }
function same_(a, b) { return clean_(a).toLowerCase() === clean_(b).toLowerCase(); }
function okTime_(t) { t = clean_(t); return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(t) ? t : stamp_(); }
function err_(m) { return { ok: false, error: m }; }
function rows_(name) {
  var sh = sheet_(name);
  if (!sh) return [];
  var n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, HEADERS[name].length).getValues();
}
function filled_(name) { return rows_(name).filter(function (r) { return str_(r[0]) !== ''; }); }
function getSetting_(key) {
  var sh = sheet_('Pengaturan');
  if (!sh) return '';
  var rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues() : [];
  for (var i = 0; i < rows.length; i++) if (String(rows[i][0]) === key) return String(rows[i][1]);
  return '';
}
function setSetting_(key, val) {
  var sh = sheet_('Pengaturan');
  var rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues() : [];
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) === key) { sh.getRange(i + 2, 2, 1, 1).setValues([[String(val)]]); return; }
  }
  sh.appendRow([key, String(val)]);
}
function entry_(r) {
  return { id: str_(r[0]), tgl: ds_(r[1]), nama: str_(r[2]), kode: str_(r[3]), mesin: str_(r[4]), model: str_(r[5]), ts: ts_(r[6]),
           kembali: ts_(r[7]), kondisi: str_(r[8]), cat: str_(r[9]), dept: str_(r[10]) };
}
function numOrStr_(v) { var s = clean_(v); return /^\d+$/.test(s) ? Number(s) : s; }

/* ---------- baca ---------- */
function isMerged_(r) { return str_(r[5]).indexOf('Digabung') === 0; }
function listJenis_() {
  var fm = fotoMeta_(), pm = panduanMeta_();
  return filled_('Jenis').filter(function (r) { return !isMerged_(r); }).map(function (r) {
    var id = str_(r[0]), p = pm[id];
    return { id: id, c: clean_(r[1]), n: clean_(r[2]), b: clean_(r[3]), m: clean_(r[4]), f: fm[id] || '', pv: p ? p.v : 0, pi: p ? p.i : 0 };
  });
}
function listUnit_() {
  // Harga (kolom 11) sengaja tidak dikirim ke aplikasi
  return filled_('Unit').map(function (r) {
    return { k: str_(r[0]), j: str_(r[1]), u: numOrStr_(r[2]), sl: clean_(r[3]), loc: clean_(r[4]), sn: clean_(r[5]), tb: ds_(r[6]), gs: ds_(r[7]), cat: str_(r[8]), pm: clean_(r[11]), off: str_(r[9]).toLowerCase() === 'nonaktif' };
  });
}
function listKategori_() { return filled_('Kategori').map(function (r) { return { c: clean_(r[0]), p: clean_(r[1]).toUpperCase() }; }); }
function listPekerja_() {
  return rows_('Pekerja').map(function (r) { return { n: clean_(r[0]), d: clean_(r[1]) }; }).filter(function (p) { return p.n; });
}
function listMaintenance_() {
  return filled_('Maintenance').map(function (r) {
    return { id: str_(r[0]), k: str_(r[1]), tgl: ds_(r[2]), jenis: str_(r[3]), oleh: str_(r[4]), cat: str_(r[5]), next: ds_(r[6]), ts: ts_(r[7]) };
  });
}
function listPengambilan_(tgl) {
  tgl = tgl || today_();
  return filled_('Pengambilan').filter(function (r) { return ds_(r[1]) === tgl; }).map(entry_);
}
function listBelum_() {
  return filled_('Pengambilan').filter(function (r) { return ts_(r[7]) === ''; }).map(entry_).slice(-400);
}
function ringkasan_() {
  var map = {};
  filled_('Pengambilan').forEach(function (r) {
    var t = ds_(r[1]);
    if (!map[t]) map[t] = { tgl: t, jumlah: 0, belum: 0 };
    map[t].jumlah++;
    if (ts_(r[7]) === '') map[t].belum++;
  });
  return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return a.tgl < b.tgl ? 1 : -1; }).slice(0, 120);
}
function kodeJenis_(id) {
  return filled_('Unit').filter(function (r) { return str_(r[1]) === id; }).map(function (r) { return str_(r[0]); });
}
function riwayat_(kodes) {
  var set = {}; kodes.forEach(function (k) { set[k] = 1; });
  var list = filled_('Pengambilan').filter(function (r) { return set[str_(r[3])]; }).map(entry_);
  list.sort(function (a, b) { return a.ts < b.ts ? 1 : -1; });
  return list.slice(0, 60);
}
function logList_() {
  return filled_('Log Perubahan').slice(-300).reverse().map(function (r) {
    return { t: ts_(r[0]), k: str_(r[1]), a: str_(r[2]), d: str_(r[3]), o: str_(r[4]) };
  });
}

/* ---------- pengambilan, maintenance, pekerja (sama seperti v2) ---------- */
function findRow_(name, id) {
  var rows = rows_(name);
  for (var i = 0; i < rows.length; i++) if (str_(rows[i][0]) === str_(id)) return { i: i, row: rows[i] };
  return null;
}
function addPengambilan_(r) {
  var id = clean_(r.id), tgl = clean_(r.tgl), nama = clean_(r.nama), kode = clean_(r.kode);
  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(tgl) || !nama || !kode) return err_('data pengambilan tidak lengkap');
  if (findRow_('Pengambilan', id)) return { ok: true, duplicate: true };
  if (!findRow_('Unit', kode)) return err_('Kode ' + kode + ' tidak ada di daftar unit.');
  sheet_('Pengambilan').appendRow([id, tgl, nama, kode, clean_(r.mesin), clean_(r.model), okTime_(r.waktu), '', '', '', clean_(r.dept)]);
  return { ok: true };
}
function returnPengambilan_(r) {
  var f = findRow_('Pengambilan', r.id);
  if (!f) return { ok: true, missing: true };
  var already = ts_(f.row[7]);
  if (already && !r.ubah) return { ok: true, duplicate: true };
  var kondisi = clean_(r.kondisi) || 'Baik';
  var cat = r.cat !== undefined && r.cat !== null && clean_(r.cat) ? clean_(r.cat) : str_(f.row[9]);
  sheet_('Pengambilan').getRange(f.i + 2, 8, 1, 3).setValues([[already || okTime_(r.waktu), kondisi, cat]]);
  if (kondisi.toLowerCase() === 'rusak') setKondisiUnit_(str_(f.row[3]), 'Rusak', 'Dikembalikan rusak oleh ' + str_(f.row[2]));
  return { ok: true };
}
function batalKembali_(r) {
  var f = findRow_('Pengambilan', r.id);
  if (!f) return { ok: true, missing: true };
  sheet_('Pengambilan').getRange(f.i + 2, 8, 1, 2).setValues([['', '']]);
  return { ok: true };
}
function setKondisiUnit_(kode, kondisi, alasan) {
  var f = findRow_('Unit', kode);
  if (!f) return;
  var before = clean_(f.row[3]);
  if (before === kondisi) return;
  sheet_('Unit').getRange(f.i + 2, 4, 1, 1).setValues([[kondisi]]);
  log_(kode, 'Kondisi unit', before + ' > ' + kondisi + (alasan ? ' (' + alasan + ')' : ''), 'Sistem');
}
function addMaintenance_(r) {
  var id = clean_(r.id), kode = clean_(r.kode), tgl = clean_(r.tgl), next = clean_(r.next);
  if (!id || !kode || !/^\d{4}-\d{2}-\d{2}$/.test(tgl)) return err_('data maintenance tidak lengkap');
  if (next && !/^\d{4}-\d{2}-\d{2}$/.test(next)) return err_('tanggal berikutnya tidak valid');
  if (findRow_('Maintenance', id)) return { ok: true, duplicate: true };
  sheet_('Maintenance').appendRow([id, kode, tgl, clean_(r.jenis), clean_(r.oleh), str_(r.cat).trim(), next, stamp_()]);
  return { ok: true };
}
function deleteById_(name, id) {
  var f = findRow_(name, id);
  if (!f) return { ok: true, missing: true };
  sheet_(name).deleteRow(f.i + 2);
  return { ok: true };
}
function savePekerja_(list) {
  var sh = sheet_('Pekerja'), seen = {}, out = [];
  (list || []).forEach(function (p) {
    var n = clean_(p && p.n), d = clean_(p && p.d);
    if (n && !seen[n.toLowerCase()]) { seen[n.toLowerCase()] = 1; out.push([n, d]); }
  });
  out.sort(function (a, b) { return (a[1] + '|' + a[0]).toLowerCase() < (b[1] + '|' + b[0]).toLowerCase() ? -1 : 1; });
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 2).clearContent();
  if (out.length) sh.getRange(2, 1, out.length, 2).setValues(out);
  return { ok: true };
}
// Pindahkan semua catatan satu tanggal ke sheet Arsip. Ditolak kalau masih ada mesin yang belum kembali.
function arsipkan_(tgl) {
  tgl = clean_(tgl);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl)) return err_('tanggal tidak valid');
  var rows = rows_('Pengambilan'), pick = [];
  for (var i = 0; i < rows.length; i++) if (str_(rows[i][0]) !== '' && ds_(rows[i][1]) === tgl) pick.push(i);
  if (!pick.length) return { ok: true, jumlah: 0 };
  for (var k = 0; k < pick.length; k++) {
    if (ts_(rows[pick[k]][7]) === '') return err_('Masih ada mesin yang belum kembali pada tanggal ini.');
  }
  var sh = sheet_('Pengambilan'), arsip = sheet_('Arsip'), s = stamp_();
  pick.forEach(function (i) {
    var r = rows[i];
    arsip.appendRow([str_(r[0]), ds_(r[1]), str_(r[2]), str_(r[3]), str_(r[4]), str_(r[5]), ts_(r[6]), ts_(r[7]), str_(r[8]), str_(r[9]), str_(r[10]), s]);
  });
  for (var j = pick.length - 1; j >= 0; j--) sh.deleteRow(pick[j] + 2);
  return { ok: true, jumlah: pick.length };
}

/* ---------- jenis dan unit: tambah, ubah, nonaktifkan (semua tercatat di Log Perubahan) ---------- */
var ISO_ = /^\d{4}-\d{2}-\d{2}$/;
function log_(kode, aksi, detail, oleh) { sheet_('Log Perubahan').appendRow([stamp_(), kode, aksi, detail, clean_(oleh)]); }
function pad3_(n) { return ('000' + n).slice(-3); }
function pad4_(n) { return ('0000' + n).slice(-4); }

function prefixOf_(kat) {
  var rows = filled_('Kategori');
  for (var i = 0; i < rows.length; i++) if (same_(rows[i][0], kat)) return clean_(rows[i][1]).toUpperCase();
  return '';
}
function prefixFor_(kat, awalan) {
  var p = prefixOf_(kat);
  if (p) return { p: p, isNew: false };
  awalan = clean_(awalan).toUpperCase();
  if (!/^[A-Z]{3}$/.test(awalan)) return { err: 'Kategori baru perlu awalan kode 3 huruf (contoh: LST).' };
  if (awalan === 'LOK' || awalan === 'MAT') return { err: 'Awalan LOK dan MAT dipakai untuk tempat dan material.' };
  var kats = filled_('Kategori');
  for (var i = 0; i < kats.length; i++) if (clean_(kats[i][1]).toUpperCase() === awalan) return { err: 'Awalan ' + awalan + ' sudah dipakai kategori lain.' };
  var units = filled_('Unit');
  for (var k = 0; k < units.length; k++) if (str_(units[k][0]).indexOf(awalan + '-') === 0) return { err: 'Awalan ' + awalan + ' sudah dipakai kode lama.' };
  return { p: awalan, isNew: true };
}
function dupJenis_(rows, n, b, m, exceptId) {
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (str_(r[0]) === exceptId || isMerged_(r)) continue;
    if (same_(r[2], n) && same_(r[3], b) && same_(r[4], m)) return str_(r[0]);
  }
  return '';
}
function parseUnitNo_(v) {
  var s = clean_(v);
  if (!/^\d+$/.test(s) || Number(s) < 1) return 0;
  return Number(s);
}
function normUnit_(f) {
  f = f || {};
  var o = {};
  ['u', 'sl', 'loc', 'sn', 'tb', 'gs', 'pm'].forEach(function (k) { if (f[k] !== undefined && f[k] !== null) o[k] = clean_(f[k]); });
  if (f.cat !== undefined && f.cat !== null) o.cat = str_(f.cat).trim();
  return o;
}
function checkUnit_(o) {
  if (o.u !== undefined && o.u !== '' && !parseUnitNo_(o.u)) return 'No. unit harus angka 1 atau lebih.';
  if (o.sl !== undefined && o.sl !== '' && KONDISI_OK.indexOf(o.sl) < 0) return 'Kondisi tidak dikenal.';
  if (o.tb && !ISO_.test(o.tb)) return 'Tanggal beli tidak valid.';
  if (o.gs && !ISO_.test(o.gs)) return 'Tanggal garansi tidak valid.';
  return '';
}
function deptOf_(v) {
  var d = clean_(v), out = null;
  if (!d) return '';
  rows_('Pekerja').forEach(function (r) { if (!out && same_(r[1], d)) out = clean_(r[1]); });
  return out;
}
function unitNosOf_(jenisId, exceptKode) {
  var out = [];
  filled_('Unit').forEach(function (r) {
    if (str_(r[1]) === jenisId && str_(r[0]) !== exceptKode) { var n = parseUnitNo_(r[2]); if (n) out.push(n); }
  });
  return out;
}

function addUnit_(r) {
  var f = normUnit_(r.f), bad = checkUnit_(f);
  if (bad) return err_(bad);
  if (f.loc && !tempatOk_(f.loc)) return err_('Pilih tempat dari daftar.');
  if (f.pm) { var dp = deptOf_(f.pm); if (dp === null) return err_('Pemilik harus departemen dari daftar pekerja.'); f.pm = dp; }
  var jrows = filled_('Jenis'), jenis, kat, awalan = '', newJenis = false;
  if (clean_(r.jenisId)) {
    var jf = findRow_('Jenis', clean_(r.jenisId));
    if (!jf || isMerged_(jf.row)) return err_('Jenis tidak ditemukan.');
    jenis = { id: str_(jf.row[0]), c: clean_(jf.row[1]), n: clean_(jf.row[2]), b: clean_(jf.row[3]), m: clean_(jf.row[4]) };
    kat = jenis.c;
  } else {
    var j = r.jenis || {};
    jenis = { id: '', c: clean_(j.c), n: clean_(j.n), b: clean_(j.b), m: clean_(j.m) };
    if (!jenis.c) return err_('Kategori wajib diisi.');
    if (!jenis.n) return err_('Nama mesin wajib diisi.');
    var dup = dupJenis_(jrows, jenis.n, jenis.b, jenis.m, '');
    if (dup) return err_('Jenis ini sudah ada (' + dup + '). Pilih jenis itu, lalu tambah unit.');
    kat = jenis.c; awalan = j.awalan; newJenis = true;
  }
  var pf = prefixFor_(kat, awalan);
  if (pf.err) return err_(pf.err);
  var used = newJenis ? [] : unitNosOf_(jenis.id, '');
  var u = f.u ? parseUnitNo_(f.u) : (used.length ? Math.max.apply(null, used) + 1 : 1);
  if (used.indexOf(u) >= 0) return err_('Unit ' + u + ' sudah ada di jenis ini.');
  var units = filled_('Unit'), max = 0;
  units.forEach(function (x) { var m = /^([A-Z]{3})-(\d+)$/.exec(str_(x[0])); if (m && m[1] === pf.p) max = Math.max(max, Number(m[2])); });
  if (max >= 999) return err_('Nomor ' + pf.p + ' sudah penuh (999).');
  var kode = pf.p + '-' + pad3_(max + 1);
  if (newJenis) {
    var maxId = 0;
    jrows.forEach(function (x) { var m = /^J(\d+)$/.exec(str_(x[0])); if (m) maxId = Math.max(maxId, Number(m[1])); });
    jenis.id = 'J' + pad4_(maxId + 1);
    if (pf.isNew) sheet_('Kategori').appendRow([jenis.c, pf.p]);
    sheet_('Jenis').appendRow([jenis.id, jenis.c, jenis.n, jenis.b, jenis.m, '']);
    log_(jenis.id, 'Tambah jenis', jenis.n + (jenis.b ? ' / ' + jenis.b : '') + (jenis.m ? ' / ' + jenis.m : '') + ' (' + jenis.c + ')', r.oleh);
  }
  sheet_('Unit').appendRow([kode, jenis.id, u, f.sl || 'Normal', f.loc || '', f.sn || '', f.tb || '', f.gs || '', f.cat || '', '', '', f.pm || '']);
  log_(kode, 'Tambah unit', jenis.n + ' unit ' + u, r.oleh);
  return { ok: true, kode: kode, jenisId: jenis.id };
}

function editUnit_(r) {
  var f = findRow_('Unit', clean_(r.kode));
  if (!f) return err_('Unit tidak ditemukan.');
  var o = normUnit_(r.f), bad = checkUnit_(o);
  if (bad) return err_(bad);
  var row = f.row.slice(); while (row.length < HEADERS['Unit'].length) row.push('');
  var labels = { u: [2, 'No. unit'], sl: [3, 'Kondisi'], loc: [4, 'Tempat'], sn: [5, 'No. seri'], tb: [6, 'Tanggal beli'], gs: [7, 'Garansi'], cat: [8, 'Catatan'], pm: [11, 'Pemilik'] };
  var diffs = [], k;
  for (k in labels) {
    if (o[k] === undefined) continue;
    var idx = labels[k][0], before = (k === 'tb' || k === 'gs') ? ds_(f.row[idx]) : (k === 'cat' ? str_(f.row[idx]).trim() : clean_(f.row[idx]));
    if (k === 'pm' && o.pm && deptOf_(o.pm) !== null) o.pm = deptOf_(o.pm);
    if (k === 'sl' && o[k] === '') continue;
    if (before !== o[k]) {
      if (k === 'loc' && !tempatOk_(o.loc)) return err_('Pilih tempat dari daftar.');
      if (k === 'pm' && o.pm) { var dq = deptOf_(o.pm); if (dq === null) return err_('Pemilik harus departemen dari daftar pekerja.'); o.pm = dq; }
      if (k === 'u') {
        if (!o.u) return err_('No. unit wajib diisi.');
        var nu = parseUnitNo_(o.u);
        if (unitNosOf_(str_(f.row[1]), str_(f.row[0])).indexOf(nu) >= 0) return err_('Unit ' + nu + ' sudah ada di jenis ini.');
        row[idx] = nu;
      } else row[idx] = o[k];
      if (k === 'loc') diffs.push('Tempat: ' + tempatLabel_(before) + ' > ' + tempatLabel_(o[k]));
      else diffs.push(labels[k][1] + ': ' + (before || '(kosong)') + ' > ' + (o[k] || '(kosong)'));
    }
  }
  if (!diffs.length) return { ok: true, changed: 0, kode: str_(f.row[0]) };
  for (var c = 0; c < row.length; c++) if (row[c] instanceof Date) row[c] = ds_(row[c]);
  sheet_('Unit').getRange(f.i + 2, 1, 1, HEADERS['Unit'].length).setValues([row]);
  log_(str_(f.row[0]), 'Ubah unit', diffs.join('; '), r.oleh);
  return { ok: true, changed: diffs.length, kode: str_(f.row[0]) };
}

function editJenis_(r) {
  var f = findRow_('Jenis', clean_(r.id));
  if (!f || isMerged_(f.row)) return err_('Jenis tidak ditemukan.');
  var o = r.f || {}, nc = o.c !== undefined ? clean_(o.c) : clean_(f.row[1]), nn = o.n !== undefined ? clean_(o.n) : clean_(f.row[2]),
      nb = o.b !== undefined ? clean_(o.b) : clean_(f.row[3]), nm = o.m !== undefined ? clean_(o.m) : clean_(f.row[4]);
  if (!nn) return err_('Nama mesin wajib diisi.');
  if (!nc) return err_('Kategori wajib diisi.');
  var dup = dupJenis_(filled_('Jenis'), nn, nb, nm, str_(f.row[0]));
  if (dup) return err_('Sudah ada jenis yang sama (' + dup + '). Gunakan Gabungkan jenis.');
  var diffs = [];
  if (nc !== clean_(f.row[1])) diffs.push('Kategori: ' + clean_(f.row[1]) + ' > ' + nc);
  if (nn !== clean_(f.row[2])) diffs.push('Nama: ' + clean_(f.row[2]) + ' > ' + nn);
  if (nb !== clean_(f.row[3])) diffs.push('Merek: ' + (clean_(f.row[3]) || '(kosong)') + ' > ' + (nb || '(kosong)'));
  if (nm !== clean_(f.row[4])) diffs.push('Model: ' + (clean_(f.row[4]) || '(kosong)') + ' > ' + (nm || '(kosong)'));
  if (!diffs.length) return { ok: true, changed: 0, id: str_(f.row[0]) };
  var pf = prefixFor_(nc, o.awalan);
  if (pf.err) return err_(pf.err);
  if (pf.isNew) sheet_('Kategori').appendRow([nc, pf.p]);
  sheet_('Jenis').getRange(f.i + 2, 2, 1, 4).setValues([[nc, nn, nb, nm]]);
  var n = kodeJenis_(str_(f.row[0])).length;
  log_(str_(f.row[0]), 'Ubah jenis', diffs.join('; ') + ' (berlaku untuk ' + n + ' unit)', r.oleh);
  return { ok: true, changed: diffs.length, id: str_(f.row[0]), unit: n };
}

function statusUnit_(r, off) {
  var kode = clean_(r.kode), f = findRow_('Unit', kode);
  if (!f) return err_('Unit tidak ditemukan.');
  var alasan = clean_(r.alasan);
  if (off) {
    if (!alasan) return err_('Isi alasan menonaktifkan (contoh: hilang, dijual, rusak total).');
    var open = filled_('Pengambilan').filter(function (x) { return str_(x[3]) === kode && ts_(x[7]) === ''; });
    if (open.length) return err_('Unit masih dibawa ' + str_(open[0][2]) + '. Kembalikan dulu.');
  }
  sheet_('Unit').getRange(f.i + 2, 10, 1, 1).setValues([[off ? 'Nonaktif' : '']]);
  log_(kode, off ? 'Nonaktifkan' : 'Aktifkan kembali', alasan, r.oleh);
  return { ok: true, kode: kode };
}

// Ganti nama merek di semua jenis. Dipakai juga untuk menggabung dua merek (ganti ke nama merek yang sudah ada).
function renameMerek_(r) {
  var from = clean_(r.from), to = clean_(r.to);
  if (!from || !to) return err_('Isi merek lama dan nama baru.');
  var rows = rows_('Jenis'), sh = sheet_('Jenis'), n = 0;
  for (var i = 0; i < rows.length; i++) {
    if (str_(rows[i][0]) === '' || isMerged_(rows[i])) continue;
    if (same_(rows[i][3], from) && clean_(rows[i][3]) !== to) { sh.getRange(i + 2, 4, 1, 1).setValues([[to]]); n++; }
  }
  if (!n) return { ok: true, changed: 0 };
  log_('', 'Ubah merek', from + ' > ' + to + ' (' + n + ' jenis)', r.oleh);
  return { ok: true, changed: n };
}

// Gabungkan jenis "dari" ke jenis "ke". Semua unit pindah. Ditolak jika ada nomor unit yang bentrok.
function gabungJenis_(r) {
  var a = findRow_('Jenis', clean_(r.dari)), b = findRow_('Jenis', clean_(r.ke));
  if (!a || !b || isMerged_(a.row) || isMerged_(b.row)) return err_('Jenis tidak ditemukan.');
  if (str_(a.row[0]) === str_(b.row[0])) return err_('Pilih dua jenis yang berbeda.');
  var idA = str_(a.row[0]), idB = str_(b.row[0]);
  var nosB = unitNosOf_(idB, ''), clash = [];
  filled_('Unit').forEach(function (x) { if (str_(x[1]) === idA) { var n = parseUnitNo_(x[2]); if (nosB.indexOf(n) >= 0) clash.push(n); } });
  if (clash.length) return err_('No. unit ' + clash.join(', ') + ' ada di kedua jenis. Ubah nomornya dulu, lalu gabungkan lagi.');
  var units = rows_('Unit'), sh = sheet_('Unit'), moved = 0;
  for (var i = 0; i < units.length; i++) {
    if (str_(units[i][0]) !== '' && str_(units[i][1]) === idA) { sh.getRange(i + 2, 2, 1, 1).setValues([[idB]]); moved++; }
  }
  sheet_('Jenis').getRange(a.i + 2, 6, 1, 1).setValues([['Digabung ke ' + idB]]);
  log_(idA, 'Gabung jenis', clean_(a.row[2]) + ' (' + idA + ') > ' + clean_(b.row[2]) + ' (' + idB + '), ' + moved + ' unit pindah', r.oleh);
  return { ok: true, moved: moved, ke: idB };
}

/* ---------- tempat penyimpanan (LOK-xxx) ---------- */
var GENERIK_TEMPAT = ['', 'gudang'];
function isLok_(s) { return /^LOK-\d{3}$/.test(clean_(s)); }
function maxLok_() {
  var m = 0;
  filled_('Tempat').forEach(function (r) { var x = /^LOK-(\d+)$/.exec(str_(r[0])); if (x) m = Math.max(m, Number(x[1])); });
  return m;
}
function tempatOk_(v) {
  v = clean_(v);
  if (!v) return true;
  var f = isLok_(v) ? findRow_('Tempat', v) : null;
  return !!f && str_(f.row[3]).toLowerCase() !== 'nonaktif';
}
function tempatLabel_(v) {
  v = clean_(v);
  if (!v) return '(kosong)';
  if (isLok_(v)) { var f = findRow_('Tempat', v); return f ? clean_(f.row[1]) + ' (' + v + ')' : v; }
  return v;
}
function listTempat_() {
  return filled_('Tempat').map(function (r) { return { id: str_(r[0]), n: clean_(r[1]), l: clean_(r[2]), off: str_(r[3]).toLowerCase() === 'nonaktif' }; });
}
// Isi kolom Tempat lama (teks bebas, contoh "Gudang Karpenter") menjadi tempat LOK-xxx. "Gudang" saja dianggap belum punya tempat.
function migrasiTempat_() {
  var units = rows_('Unit'), ush = sheet_('Unit'), tsh = sheet_('Tempat'), byName = {}, made = 0, moved = 0, maxN = maxLok_();
  filled_('Tempat').forEach(function (r) { byName[clean_(r[1]).toLowerCase()] = str_(r[0]); });
  for (var i = 0; i < units.length; i++) {
    if (str_(units[i][0]) === '') continue;
    var loc = clean_(units[i][4]);
    if (isLok_(loc) || GENERIK_TEMPAT.indexOf(loc.toLowerCase()) >= 0) continue;
    var id = byName[loc.toLowerCase()];
    if (!id) {
      maxN++;
      id = 'LOK-' + pad3_(maxN);
      tsh.appendRow([id, loc, '', '']);
      byName[loc.toLowerCase()] = id; made++;
    }
    ush.getRange(i + 2, 5, 1, 1).setValues([[id]]); moved++;
  }
  if (made || moved) log_('', 'Tempat otomatis', made + ' tempat dibuat, ' + moved + ' unit dihubungkan dari kolom Tempat lama', 'Sistem');
  return { made: made, moved: moved };
}
function addTempat_(r) {
  var n = clean_(r.nama), l = clean_(r.lokasi);
  if (!n) return err_('Nama tempat wajib diisi.');
  if (n.length > 60 || l.length > 60) return err_('Nama terlalu panjang.');
  var dup = filled_('Tempat').some(function (x) { return same_(x[1], n) && str_(x[3]).toLowerCase() !== 'nonaktif'; });
  if (dup) return err_('Tempat bernama ' + n + ' sudah ada.');
  var num = maxLok_() + 1;
  if (num > 999) return err_('Nomor LOK sudah penuh (999).');
  var id = 'LOK-' + pad3_(num);
  sheet_('Tempat').appendRow([id, n, l, '']);
  log_(id, 'Tambah tempat', n + (l ? ' (' + l + ')' : ''), r.oleh);
  return { ok: true, id: id };
}
function editTempat_(r) {
  var f = findRow_('Tempat', clean_(r.id));
  if (!f) return err_('Tempat tidak ditemukan.');
  var n = r.nama !== undefined ? clean_(r.nama) : clean_(f.row[1]), l = r.lokasi !== undefined ? clean_(r.lokasi) : clean_(f.row[2]);
  if (!n) return err_('Nama tempat wajib diisi.');
  if (n.length > 60 || l.length > 60) return err_('Nama terlalu panjang.');
  var id = str_(f.row[0]);
  var dup = filled_('Tempat').some(function (x) { return str_(x[0]) !== id && same_(x[1], n) && str_(x[3]).toLowerCase() !== 'nonaktif'; });
  if (dup) return err_('Tempat bernama ' + n + ' sudah ada.');
  var diffs = [];
  if (n !== clean_(f.row[1])) diffs.push('Nama: ' + clean_(f.row[1]) + ' > ' + n);
  if (l !== clean_(f.row[2])) diffs.push('Lokasi: ' + (clean_(f.row[2]) || '(kosong)') + ' > ' + (l || '(kosong)'));
  if (!diffs.length) return { ok: true, changed: 0, id: id };
  sheet_('Tempat').getRange(f.i + 2, 2, 1, 2).setValues([[n, l]]);
  log_(id, 'Ubah tempat', diffs.join('; '), r.oleh);
  return { ok: true, changed: diffs.length, id: id };
}
function statusTempat_(r, off) {
  var id = clean_(r.id), f = findRow_('Tempat', id);
  if (!f) return err_('Tempat tidak ditemukan.');
  if (off) {
    var nu = filled_('Unit').filter(function (x) { return clean_(x[4]) === id && str_(x[9]).toLowerCase() !== 'nonaktif'; }).length;
    var nm = filled_('Material').filter(function (x) { return clean_(x[7]) === id && str_(x[8]).toLowerCase() !== 'nonaktif'; }).length;
    if (nu || nm) return err_('Masih ada ' + nu + ' mesin dan ' + nm + ' material di tempat ini. Pindahkan dulu.');
  }
  sheet_('Tempat').getRange(f.i + 2, 4, 1, 1).setValues([[off ? 'Nonaktif' : '']]);
  log_(id, off ? 'Nonaktifkan tempat' : 'Aktifkan tempat', clean_(f.row[1]), r.oleh);
  return { ok: true, id: id };
}
// Pindahkan mesin dan/atau material ke satu tempat (tempat kosong = lepas dari tempat). Satu mesin hanya punya satu tempat.
function setTempat_(r) {
  var to = clean_(r.tempat);
  if (!tempatOk_(to)) return err_('Tempat tidak ditemukan.');
  var kodes = (r.kodes || []).map(clean_).filter(Boolean), mats = (r.mats || []).map(clean_).filter(Boolean);
  if (!kodes.length && !mats.length) return err_('Pilih mesin atau material dulu.');
  if (kodes.length + mats.length > 300) return err_('Maksimal 300 sekali simpan.');
  var units = rows_('Unit'), mrows = rows_('Material'), uPick = {}, mPick = {}, i, k;
  for (i = 0; i < units.length; i++) uPick[str_(units[i][0])] = i;
  for (i = 0; i < mrows.length; i++) mPick[str_(mrows[i][0])] = i;
  for (k = 0; k < kodes.length; k++) if (uPick[kodes[k]] === undefined || kodes[k] === '') return err_('Unit ' + kodes[k] + ' tidak ditemukan.');
  for (k = 0; k < mats.length; k++) if (mPick[mats[k]] === undefined) return err_('Material ' + mats[k] + ' tidak ditemukan.');
  var nu = 0, nm = 0, ush = sheet_('Unit'), msh = sheet_('Material');
  kodes.forEach(function (c) { var i2 = uPick[c]; if (clean_(units[i2][4]) !== to) { ush.getRange(i2 + 2, 5, 1, 1).setValues([[to]]); nu++; } });
  mats.forEach(function (c) { var i2 = mPick[c]; if (clean_(mrows[i2][7]) !== to) { msh.getRange(i2 + 2, 8, 1, 1).setValues([[to]]); nm++; } });
  if (nu || nm) {
    var all = kodes.concat(mats), shown = all.slice(0, 12).join(', ') + (all.length > 12 ? ' dan ' + (all.length - 12) + ' lainnya' : '');
    log_(to, 'Pindah ke tempat', nu + ' mesin, ' + nm + ' material ke ' + tempatLabel_(to) + ': ' + shown, r.oleh);
  }
  return { ok: true, units: nu, mats: nm };
}

/* ---------- foto per jenis (kecil, disimpan di sheet Foto) ---------- */
var FOTO_PREFIX = 'data:image/jpeg;base64,';
function fotoMeta_() {
  var sh = sheet_('Foto'), n = sh ? sh.getLastRow() : 0, m = {};
  if (n < 2) return m;
  var a = sh.getRange(2, 1, n - 1, 1).getValues(), c = sh.getRange(2, 3, n - 1, 1).getValues();
  for (var i = 0; i < a.length; i++) if (str_(a[i][0]) !== '') m[str_(a[i][0])] = ts_(c[i][0]);
  return m;
}
function fotoRow_(jid) {
  var sh = sheet_('Foto'), n = sh.getLastRow();
  if (n < 2) return 0;
  var a = sh.getRange(2, 1, n - 1, 1).getValues();
  for (var i = 0; i < a.length; i++) if (str_(a[i][0]) === jid) return i + 2;
  return 0;
}
function fotoGet_(ids) {
  var want = {}; (ids || []).slice(0, 40).forEach(function (x) { want[clean_(x)] = 1; });
  var out = {};
  filled_('Foto').forEach(function (r) { if (want[str_(r[0])]) out[str_(r[0])] = { d: str_(r[1]), t: ts_(r[2]) }; });
  return { ok: true, foto: out };
}
function fotoSet_(r) {
  var jid = clean_(r.jid), d = str_(r.foto);
  var jf = findRow_('Jenis', jid);
  if (!jf || isMerged_(jf.row)) return err_('Jenis tidak ditemukan.');
  if (d.indexOf(FOTO_PREFIX) !== 0 || !/^[A-Za-z0-9+\/=]+$/.test(d.slice(FOTO_PREFIX.length))) return err_('Foto tidak valid.');
  if (d.length > 48000) return err_('Foto terlalu besar. Potong lebih kecil.');
  var row = fotoRow_(jid), t = stamp_();
  if (row) sheet_('Foto').getRange(row, 1, 1, 3).setValues([[jid, d, t]]); else sheet_('Foto').appendRow([jid, d, t]);
  log_(jid, row ? 'Ganti foto' : 'Tambah foto', clean_(jf.row[2]), r.oleh);
  return { ok: true, t: t };
}
function fotoHapus_(r) {
  var jid = clean_(r.jid), row = fotoRow_(jid);
  if (!row) return { ok: true, missing: true };
  sheet_('Foto').deleteRow(row);
  var jf = findRow_('Jenis', jid);
  log_(jid, 'Hapus foto', jf ? clean_(jf.row[2]) : '', r.oleh);
  return { ok: true };
}

/* ---------- panduan maintenance per jenis (berversi: yang lama tidak dihapus) ---------- */
function panduanMeta_() {
  var sh = sheet_('Panduan'), n = sh ? sh.getLastRow() : 0, m = {};
  if (n < 2) return m;
  var a = sh.getRange(2, 1, n - 1, 2).getValues(), f = sh.getRange(2, 6, n - 1, 1).getValues();
  for (var i = 0; i < a.length; i++) {
    var id = str_(a[i][0]), v = Number(a[i][1]) || 0;
    if (id === '') continue;
    if (!m[id] || v > m[id].v) m[id] = { v: v, i: Number(f[i][0]) || 0 };
  }
  return m;
}
function panduanList_(jid) {
  return filled_('Panduan').filter(function (r) { return str_(r[0]) === jid; }).map(function (r) {
    return { v: Number(r[1]) || 0, p: str_(r[2]), a: str_(r[3]), l: str_(r[4]), i: Number(r[5]) || 0, u: str_(r[6]), o: str_(r[7]), t: ts_(r[8]) };
  }).sort(function (a, b) { return b.v - a.v; });
}
function panduanSimpan_(r) {
  var jid = clean_(r.jid), jf = findRow_('Jenis', jid);
  if (!jf || isMerged_(jf.row)) return err_('Jenis tidak ditemukan.');
  var p = str_(r.p).replace(/\r/g, '').trim(), a = str_(r.a).replace(/\r/g, '').trim(), l = str_(r.l).replace(/\r/g, '').trim(), u = clean_(r.u), i = clean_(r.i);
  if (!p && !a && !l) return err_('Isi minimal satu bagian panduan.');
  if (p.length > 2000 || a.length > 2000 || l.length > 6000) return err_('Teks terlalu panjang.');
  if (i && !/^\d{1,3}$/.test(i)) return err_('Interval servis harus angka (bulan).');
  if (u && /^[a-z][a-z0-9+.\-]*:(?!\d)/i.test(u) && !/^https?:\/\//i.test(u)) return err_('Tautan tidak valid. Pakai alamat web (http atau https).');
  if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;
  if (u && (!/^https?:\/\/[^\s]+$/i.test(u) || u.length > 300)) return err_('Tautan tidak valid.');
  var cur = panduanList_(jid)[0], iv = Number(i) || 0;
  if (cur && cur.p === p && cur.a === a && cur.l === l && cur.u === u && cur.i === iv) return { ok: true, changed: 0, v: cur.v };
  var v = cur ? cur.v + 1 : 1;
  sheet_('Panduan').appendRow([jid, v, p, a, l, iv || '', u, clean_(r.oleh), stamp_()]);
  log_(jid, 'Ubah panduan', clean_(jf.row[2]) + ': versi ' + v + (iv ? ', servis tiap ' + iv + ' bulan' : ''), r.oleh);
  return { ok: true, changed: 1, v: v };
}

/* ---------- material dan stok (MAT-xxx) ---------- */
function num_(v) { var s = clean_(v).replace(',', '.'); return s === '' ? NaN : Number(s); }
function round3_(x) { return Math.round(x * 1000) / 1000; }
function listMaterial_() {
  return filled_('Material').map(function (r) {
    return { id: str_(r[0]), n: clean_(r[1]), c: clean_(r[2]), b: clean_(r[3]), s: clean_(r[4]), q: Number(r[5]) || 0, lo: Number(r[6]) || 0, loc: clean_(r[7]), off: str_(r[8]).toLowerCase() === 'nonaktif' };
  });
}
function maxMat_() {
  var m = 0;
  filled_('Material').forEach(function (r) { var x = /^MAT-(\d+)$/.exec(str_(r[0])); if (x) m = Math.max(m, Number(x[1])); });
  return m;
}
function dupMaterial_(n, b, s, exceptId) {
  return filled_('Material').some(function (r) {
    return str_(r[0]) !== exceptId && str_(r[8]).toLowerCase() !== 'nonaktif' && same_(r[1], n) && same_(r[3], b) && same_(r[4], s);
  });
}
function addMaterial_(r) {
  var n = clean_(r.nama), c = clean_(r.kategori), b = clean_(r.merek), s = clean_(r.satuan);
  var q = clean_(r.stok) === '' ? 0 : num_(r.stok), lo = clean_(r.batas) === '' ? 0 : num_(r.batas), loc = clean_(r.tempat);
  if (!n) return err_('Nama material wajib diisi.');
  if (!s) return err_('Satuan wajib diisi (contoh: sak, meter, kg).');
  if (n.length > 80 || s.length > 20) return err_('Nama atau satuan terlalu panjang.');
  if (!(q >= 0) || !(lo >= 0) || q > 10000000 || lo > 10000000) return err_('Stok dan batas menipis harus angka 0 atau lebih.');
  if (!tempatOk_(loc)) return err_('Pilih tempat dari daftar.');
  if (dupMaterial_(n, b, s, '')) return err_('Material ini sudah ada.');
  var num = maxMat_() + 1;
  if (num > 999) return err_('Nomor MAT sudah penuh (999).');
  var id = 'MAT-' + pad3_(num);
  sheet_('Material').appendRow([id, n, c, b, s, round3_(q), round3_(lo), loc, '']);
  if (q > 0) sheet_('Stok Log').appendRow(['awal-' + id, stamp_(), id, 'Masuk', round3_(q), round3_(q), clean_(r.oleh), 'Stok awal']);
  log_(id, 'Tambah material', n + (b ? ' / ' + b : '') + ', stok awal ' + round3_(q) + ' ' + s, r.oleh);
  return { ok: true, id: id };
}
function editMaterial_(r) {
  var f = findRow_('Material', clean_(r.id));
  if (!f) return err_('Material tidak ditemukan.');
  var o = r.f || {}, id = str_(f.row[0]);
  var n = o.n !== undefined ? clean_(o.n) : clean_(f.row[1]), c = o.c !== undefined ? clean_(o.c) : clean_(f.row[2]),
      b = o.b !== undefined ? clean_(o.b) : clean_(f.row[3]), s = o.s !== undefined ? clean_(o.s) : clean_(f.row[4]),
      lo = o.lo !== undefined ? (clean_(o.lo) === '' ? 0 : num_(o.lo)) : (Number(f.row[6]) || 0),
      loc = o.loc !== undefined ? clean_(o.loc) : clean_(f.row[7]);
  if (!n) return err_('Nama material wajib diisi.');
  if (!s) return err_('Satuan wajib diisi.');
  if (!(lo >= 0) || lo > 10000000) return err_('Batas menipis harus angka 0 atau lebih.');
  if (loc !== clean_(f.row[7]) && !tempatOk_(loc)) return err_('Pilih tempat dari daftar.');
  if (dupMaterial_(n, b, s, id)) return err_('Sudah ada material yang sama.');
  lo = round3_(lo);
  var diffs = [];
  if (n !== clean_(f.row[1])) diffs.push('Nama: ' + clean_(f.row[1]) + ' > ' + n);
  if (c !== clean_(f.row[2])) diffs.push('Kategori: ' + (clean_(f.row[2]) || '(kosong)') + ' > ' + (c || '(kosong)'));
  if (b !== clean_(f.row[3])) diffs.push('Merek: ' + (clean_(f.row[3]) || '(kosong)') + ' > ' + (b || '(kosong)'));
  if (s !== clean_(f.row[4])) diffs.push('Satuan: ' + clean_(f.row[4]) + ' > ' + s);
  if (lo !== (Number(f.row[6]) || 0)) diffs.push('Batas menipis: ' + (Number(f.row[6]) || 0) + ' > ' + lo);
  if (loc !== clean_(f.row[7])) diffs.push('Tempat: ' + tempatLabel_(f.row[7]) + ' > ' + tempatLabel_(loc));
  if (!diffs.length) return { ok: true, changed: 0, id: id };
  sheet_('Material').getRange(f.i + 2, 2, 1, 4).setValues([[n, c, b, s]]);
  sheet_('Material').getRange(f.i + 2, 7, 1, 2).setValues([[lo, loc]]);
  log_(id, 'Ubah material', diffs.join('; '), r.oleh);
  return { ok: true, changed: diffs.length, id: id };
}
function statusMaterial_(r) {
  var f = findRow_('Material', clean_(r.id));
  if (!f) return err_('Material tidak ditemukan.');
  var off = !!r.off;
  sheet_('Material').getRange(f.i + 2, 9, 1, 1).setValues([[off ? 'Nonaktif' : '']]);
  log_(str_(f.row[0]), off ? 'Nonaktifkan material' : 'Aktifkan material', clean_(f.row[1]), r.oleh);
  return { ok: true, id: str_(f.row[0]) };
}
// Stok keluar / masuk / koreksi. "id" dibuat di HP supaya kiriman ulang (sinyal putus) tidak tercatat dua kali.
function stok_(r) {
  var id = clean_(r.id), mat = clean_(r.mat), tipe = clean_(r.tipe), nama = clean_(r.nama);
  if (!id || !mat) return err_('Data stok tidak lengkap.');
  if (['Keluar', 'Masuk', 'Koreksi'].indexOf(tipe) < 0) return err_('Jenis stok tidak dikenal.');
  if (findRow_('Stok Log', id)) return { ok: true, duplicate: true };
  var f = findRow_('Material', mat);
  if (!f) return err_('Material ' + mat + ' tidak ditemukan.');
  if (str_(f.row[8]).toLowerCase() === 'nonaktif') return err_('Material ' + mat + ' sudah dinonaktifkan.');
  if (!nama) return err_('Pilih nama pekerja.');
  var j = num_(r.jumlah);
  if (!(j >= 0) || j > 10000000) return err_('Jumlah harus angka.');
  if (tipe !== 'Koreksi' && j <= 0) return err_('Jumlah harus lebih dari 0.');
  var cur = Number(f.row[5]) || 0, after;
  if (tipe === 'Keluar') {
    after = round3_(cur - j);
    if (after < 0) return err_('Stok ' + clean_(f.row[1]) + ' tidak cukup. Sisa ' + cur + ' ' + clean_(f.row[4]) + '.');
  } else if (tipe === 'Masuk') after = round3_(cur + j);
  else after = round3_(j);
  sheet_('Material').getRange(f.i + 2, 6, 1, 1).setValues([[after]]);
  sheet_('Stok Log').appendRow([id, okTime_(r.waktu), mat, tipe, round3_(j), after, nama, str_(r.cat).trim()]);
  return { ok: true, stok: after };
}
function stokLog_(mat) {
  return filled_('Stok Log').filter(function (r) { return str_(r[2]) === mat; }).map(function (r) {
    return { id: str_(r[0]), t: ts_(r[1]), tipe: str_(r[3]), j: Number(r[4]) || 0, q: Number(r[5]) || 0, o: str_(r[6]), cat: str_(r[7]) };
  }).sort(function (a, b) { return a.t < b.t ? 1 : -1; }).slice(0, 60);
}

/* ---------- impor banyak unit dari Excel (satu kali jalan, tercatat di Log Perubahan) ---------- */
function imporUnit_(r) {
  var rows = r.rows || [];
  if (!rows.length) return err_('Tidak ada baris untuk diimpor.');
  if (rows.length > 400) return err_('Maksimal 400 baris sekali impor.');
  var jrows = filled_('Jenis'), units = filled_('Unit'), jIndex = {}, maxId = 0, nosBy = {}, seq = {}, tByName = {};
  var keyOf = function (n, b, m) { return [clean_(n), clean_(b), clean_(m)].join('|').toLowerCase(); };
  jrows.forEach(function (x) {
    var m = /^J(\d+)$/.exec(str_(x[0])); if (m) maxId = Math.max(maxId, Number(m[1]));
    if (!isMerged_(x)) jIndex[keyOf(x[2], x[3], x[4])] = str_(x[0]);
  });
  units.forEach(function (x) {
    var id = str_(x[1]); nosBy[id] = nosBy[id] || {}; var n = parseUnitNo_(x[2]); if (n) nosBy[id][n] = 1;
    var m = /^([A-Z]{3})-(\d+)$/.exec(str_(x[0])); if (m) seq[m[1]] = Math.max(seq[m[1]] || 0, Number(m[2]));
  });
  filled_('Tempat').forEach(function (x) { if (str_(x[3]).toLowerCase() !== 'nonaktif') tByName[clean_(x[1]).toLowerCase()] = str_(x[0]); });
  var newJ = [], newU = [], skipped = [], errors = [];
  rows.forEach(function (d, idx) {
    var line = idx + 1, c = clean_(d.c), n = clean_(d.n), b = clean_(d.b), m = clean_(d.m);
    if (!c || !n) { errors.push('Baris ' + line + ': kategori dan nama wajib diisi.'); return; }
    var p = prefixOf_(c);
    if (!p) { errors.push('Baris ' + line + ': kategori "' + c + '" belum ada.'); return; }
    var sl = '';
    if (clean_(d.sl)) {
      KONDISI_OK.forEach(function (k) { if (same_(k, d.sl)) sl = k; });
      if (!sl) { errors.push('Baris ' + line + ': kondisi "' + clean_(d.sl) + '" tidak dikenal.'); return; }
    } else sl = 'Belum dicek';
    var u = 0;
    if (clean_(d.u) !== '') { u = parseUnitNo_(d.u); if (!u) { errors.push('Baris ' + line + ': No. unit harus angka 1 atau lebih.'); return; } }
    var key = keyOf(n, b, m), jid = jIndex[key];
    if (jid && u && nosBy[jid] && nosBy[jid][u]) { skipped.push('Baris ' + line + ': ' + n + ' unit ' + u + ' sudah ada.'); return; }
    if ((seq[p] || 0) >= 999) { errors.push('Baris ' + line + ': nomor ' + p + ' sudah penuh.'); return; }
    if (!jid) { maxId++; jid = 'J' + pad4_(maxId); jIndex[key] = jid; newJ.push([jid, c, n, b, m, '']); }
    var used = nosBy[jid] = nosBy[jid] || {};
    if (!u) { u = 1; Object.keys(used).forEach(function (k) { u = Math.max(u, Number(k) + 1); }); }
    used[u] = 1;
    seq[p] = (seq[p] || 0) + 1;
    var loc = tByName[clean_(d.loc).toLowerCase()] || '';
    var pmv = deptOf_(d.pm);
    if (pmv === null) { errors.push('Baris ' + line + ': pemilik "' + clean_(d.pm) + '" tidak ada di daftar departemen.'); return; }
    newU.push([p + '-' + pad3_(seq[p]), jid, u, sl, loc, clean_(d.sn), '', '', str_(d.cat).trim(), '', '', pmv]);
  });
  if (newJ.length) { var js = sheet_('Jenis'); js.getRange(js.getLastRow() + 1, 1, newJ.length, 6).setValues(newJ); }
  if (newU.length) { var us = sheet_('Unit'); us.getRange(us.getLastRow() + 1, 1, newU.length, 12).setValues(newU); }
  if (newU.length) log_('', 'Impor Excel', newU.length + ' unit, ' + newJ.length + ' jenis baru' + (skipped.length ? ', ' + skipped.length + ' baris dilewati' : ''), r.oleh);
  return { ok: true, unit: newU.length, jenis: newJ.length, skipped: skipped.slice(0, 30), errors: errors.slice(0, 30), nSkipped: skipped.length, nErrors: errors.length };
}

/* ---------- rak otomatis: Rak 001 ... Rak 050 (kode LOK-001 ... LOK-050) ---------- */
function buatRak_(r) {
  var dari = Math.max(1, Number(r.dari) || 1), sampai = Math.min(999, Number(r.sampai) || 50);
  var byName = {};
  filled_('Tempat').forEach(function (x) { byName[clean_(x[1]).toLowerCase()] = 1; });
  var next = maxLok_() + 1, add = [], skip = 0;
  for (var i = dari; i <= sampai; i++) {
    var nama = 'Rak ' + pad3_(i);
    if (byName[nama.toLowerCase()]) { skip++; continue; }
    if (next > 999) return err_('Nomor LOK sudah penuh (999).');
    add.push(['LOK-' + pad3_(next), nama, '', '']); next++;
  }
  if (add.length) {
    var sh = sheet_('Tempat');
    sh.getRange(sh.getLastRow() + 1, 1, add.length, 4).setValues(add);
    log_('', 'Rak otomatis', add.length + ' rak dibuat (' + add[0][1] + ' sampai ' + add[add.length - 1][1] + ', kode ' + add[0][0] + ' sampai ' + add[add.length - 1][0] + ')', r.oleh || 'Sistem');
  }
  return { ok: true, dibuat: add.length, dilewati: skip };
}
// Jalankan sekali dari editor Apps Script jika tidak lewat aplikasi.
function buatRak050() {
  var res = buatRak_({ dari: 1, sampai: 50, oleh: 'Sistem' });
  var msg = res.dibuat + ' rak dibuat, ' + res.dilewati + ' dilewati (sudah ada).';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
}
// Saran yang ditolak diingat di sheet Pengaturan supaya tidak muncul lagi.
function saranTolak_(r) {
  var id = clean_(r.id);
  if (!id || id.length > 120) return err_('Saran tidak valid.');
  var list = [];
  try { list = JSON.parse(getSetting_('SARAN DITOLAK') || '[]'); } catch (e) { list = []; }
  if (r.batal) list = list.filter(function (x) { return x !== id; });
  else if (list.indexOf(id) < 0) list.push(id);
  if (list.length > 300) list = list.slice(-300);
  setSetting_('SARAN DITOLAK', JSON.stringify(list));
  return { ok: true, saranTolak: JSON.stringify(list) };
}

// Membatalkan pengembalian "Rusak" dari layar scan: kondisi unit dikembalikan. Tidak butuh nama pengedit.
function pulihKondisi_(r) {
  var kondisi = clean_(r.kondisi);
  if (KONDISI_OK.indexOf(kondisi) < 0) return err_('Kondisi tidak dikenal.');
  if (!findRow_('Unit', clean_(r.kode))) return err_('Unit tidak ditemukan.');
  setKondisiUnit_(clean_(r.kode), kondisi, 'Pengembalian dibatalkan');
  return { ok: true };
}
