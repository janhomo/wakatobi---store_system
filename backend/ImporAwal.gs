/**
 * Impor awal daftar mesin (dari lembar catat penjaga gudang). Dipakai SATU KALI.
 *
 * Cara pakai:
 *  1. Di Apps Script klik + (Tambah file) > Script, beri nama ImporAwal, tempel seluruh kode ini, Save.
 *  2. Pastikan Code.gs v3 sudah terpasang dan fungsi setup sudah dijalankan.
 *     (Jika masih ada data v2: jalankan resetDataLama dulu.)
 *  3. Pilih fungsi imporAwal, klik Run.
 *
 * Aman: kalau sheet Jenis atau Unit sudah berisi data, impor DIBATALKAN supaya tidak dobel.
 * Kode unit dibuat otomatis (awalan kategori + nomor urut). Alasan "perlu dicek" ada di kolom Catatan.
 * Setelah selesai file ini boleh dihapus.
 */
var KATEGORI_TAMBAHAN = [['Mesin Las', 'LAS']];

// [kategori, nama mesin, merek, model, no. unit, kondisi, tempat, catatan]
var DATA_AWAL = [
  ["Alat Ukur & Pendeteksi", "Laser", "Bosch", "GLL 3-60 XG", 1, "Normal", "Gudang", ""],
  ["Alat Ukur & Pendeteksi", "Laser", "Bosch", "GLL 3-60 XG", 2, "Normal", "Gudang", ""],
  ["Alat Ukur & Pendeteksi", "Laser", "Leica", "0810", 3, "Servis", "Gudang", "Kotak Normal tercoret, Servis dicentang. Model ragu."],
  ["Alat Ukur & Pendeteksi", "Laser", "Tactix", "25411", 4, "Normal", "Gudang", ""],
  ["Bor/Breker", "Bor breaker kecil", "Bosch", "GBH 2-28 DFV", 1, "Normal", "Gudang", "Di kertas tertulis 'Bor Breker' tanpa 'kecil'. Disamakan dengan baris lain yang modelnya sama."],
  ["Bor/Breker", "Bor breaker kecil", "Bosch", "GBH 2-28 DFV", 2, "Normal", "Gudang", ""],
  ["Bor/Breker", "Bor breaker kecil", "Bosch", "GBH 2-28 DFV", 3, "Normal", "Gudang", "No. unit 3 kembar dengan Lembar Bosch baris 2, yang diberi nomor 4. Mesin yang sama?"],
  ["Bor/Breker", "Bor breaker kecil", "Bosch", "GBH 2-28 DFV", 4, "Normal", "Gudang", "No. unit di kertas 3 sama dengan unit lain di jenis ini (H5 baris 58, unit 3). Diberi nomor 4. Mesin yang sama?"],
  ["Bor/Breker", "Bor breaker sedang", "Bosch", "GBH 5-40 D", 4, "Rusak", "Gudang", ""],
  ["Bor/Breker", "Bor breaker sedang", "Bosch", "GBH 5-40 D", 5, "Rusak", "Gudang", ""],
  ["Bor/Breker", "Bor cas 1.5Ah", "Makita", "DF 333D", 1, "Rusak", "Gudang", ""],
  ["Bor/Breker", "Bor cas 1.5Ah", "Makita", "DF 333D", 2, "Normal", "Gudang", ""],
  ["Bor/Breker", "Bor cas 1.5Ah", "Makita", "DF 333D", 3, "Normal", "Gudang", ""],
  ["Bor/Breker", "Bor cas 1.5Ah", "Makita", "DF 333D", 4, "Servis", "Gudang", ""],
  ["Bor/Breker", "Bor cas 1.5Ah", "Makita", "DF 333D", 5, "Rusak", "Gudang", "Model tertulis 'DF 33 D', disamakan jadi DF 333D."],
  ["Bor/Breker", "Bor cas 18V 2.0Ah", "Bosch", "GSB 185 LI", 1, "Normal", "Gudang", ""],
  ["Bor/Breker", "Bor cas 18V 5.0Ah", "Makita", "DDF 484", 1, "Normal", "Gudang", "No. unit terbaca 0 atau 1. Dipilih 1."],
  ["Bor/Breker", "Bor cas 18V 5.0Ah", "Makita", "DDF 484", 2, "Normal", "Gudang", ""],
  ["Bor/Breker", "Bor cas 7.2V 1.5Ah", "Makita", "DF 012 D", 1, "Belum dicek", "Gudang", "Kondisi tidak dicentang."],
  ["Bor/Breker", "Bor duduk", "Proline", "DF 4113", 2, "Normal", "Gudang", "Model ragu. Hanya 1 baris dan bernomor 2: apakah unit 1 belum tercatat?"],
  ["Bor/Breker", "Bor impak 18V", "Makita", "DTW 300 RTJ", 1, "Normal", "Gudang", ""],
  ["Bor/Breker", "Bor impak 18V", "Makita", "DTW 300 RTJ", 2, "Normal", "Gudang", ""],
  ["Bor/Breker", "Bor impak 18V", "Makita", "DTW 700 RTJ", 3, "Normal", "Gudang", ""],
  ["Bor/Breker", "Bor impak 18V", "Makita", "DTW 700 RTJ", 4, "Normal", "Gudang", ""],
  ["Bor/Breker", "Bor listrik 350W", "Makita", "TW 0350", 9, "Normal", "Gudang", "No. unit terbaca 9 atau 3. Dipilih 9 karena 3 sudah dipakai Modern."],
  ["Bor/Breker", "Bor listrik 350W", "Modern", "M.2100 C", 2, "Normal", "Gudang", ""],
  ["Bor/Breker", "Bor listrik 350W", "Modern", "M.2100 C", 3, "Normal", "Gudang", ""],
  ["Bor/Breker", "Bor listrik 400W", "Bosch", "GBM 400", 5, "Normal", "Gudang", "Daya tertimpa tulisan (400 W)."],
  ["Bor/Breker", "Bor listrik 400W", "Bosch", "GBM 400", 6, "Normal", "Gudang", ""],
  ["Bor/Breker", "Bor listrik 750W", "Bosch", "GSB 16 RE", 1, "Normal", "Gudang", ""],
  ["Bor/Breker", "Bor listrik 750W", "Bosch", "GSB 16 RE", 4, "Normal", "Gudang", ""],
  ["Bor/Breker", "Bor listrik 750W", "Bosch", "GSB 16 RE", 7, "Rusak", "Gudang", ""],
  ["Bor/Breker", "Bor listrik 750W", "Bosch", "GSB 16 RE", 8, "Normal", "Gudang", ""],
  ["Bor/Breker", "Bor magnet 1050W", "Makita", "HB 350-2QAA", 1, "Normal", "Gudang", "Model ragu terbaca."],
  ["Bor/Breker", "Breker besar", "Bosch", "GSH 27 VC", 8, "Belum dicek", "Gudang", "Kondisi tidak dicentang. Model ragu."],
  ["Bor/Breker", "Breker besar", "Makita", "HM 1306", 6, "Belum dicek", "Gudang", "Kondisi tidak dicentang."],
  ["Bor/Breker", "Breker besar", "Makita", "HM 1810", 1, "Servis", "Gudang", ""],
  ["Bor/Breker", "Breker besar", "Makita", "HM 1810", 2, "Servis", "Gudang", ""],
  ["Bor/Breker", "Breker besar", "Makita", "HM 1810", 3, "Normal", "Gudang", ""],
  ["Bor/Breker", "Breker besar", "Makita", "HM 1810", 4, "Servis", "Gudang", ""],
  ["Bor/Breker", "Breker besar", "Makita", "HM 1810", 7, "Servis", "Gudang", "No. unit terbaca 7 atau 1. Dipilih 7 karena 1 sudah dipakai."],
  ["Bor/Breker", "Breker besar", "Makita", "HM 1810", 9, "Normal", "Gudang", "Model ditimpa tulisan. Servis dicoret, Normal dicentang."],
  ["Bor/Breker", "Breker besar", "Makita", "HM 1812", 5, "Servis", "Gudang", ""],
  ["Bor/Breker", "Breker besar", "Makita", "HM 1812", 10, "Normal", "Gudang", ""],
  ["Bor/Breker", "Core drill 2400W", "Wipro", "WP 02-205", 1, "Normal", "Gudang", ""],
  ["Gurinda/Mesin Potong", "Gurinda besar", "Bosch", "GWS 2200", 1, "Rusak", "Gudang", ""],
  ["Gurinda/Mesin Potong", "Gurinda besar", "Bosch", "GWS 2200", 2, "Normal", "Gudang", ""],
  ["Gurinda/Mesin Potong", "Gurinda besar", "Bosch", "GWS 2200", 3, "Normal", "Gudang", "Model tertimpa tulisan (2800 menjadi 2200)."],
  ["Gurinda/Mesin Potong", "Gurinda besar", "Bosch", "GWS 2200", 4, "Normal", "Gudang", ""],
  ["Gurinda/Mesin Potong", "Pemotong multifungsi", "Bosch", "GOP 30-28", 1, "Normal", "Gudang", ""],
  ["Gurinda/Mesin Potong", "Potong besi 2000W", "Makita", "2414 NB", 1, "Normal", "Gudang", ""],
  ["Gurinda/Mesin Potong", "Potong keramik 860W", "Makita", "4100 NB", 1, "Normal", "Gudang", ""],
  ["Gurinda/Mesin Potong", "Potong ubin", "Rubi", "TC 125", 1, "Normal", "Gudang", ""],
  ["Mesin Amplas", "Amplas dinding 18V", "Makita", "PSL 800", 1, "Normal", "Gudang", "Model ragu (PSL atau DSL 800)."],
  ["Mesin Amplas", "Amplas tembok", "Wipro", "W 4225", 2, "Normal", "Gudang", "Hanya 1 baris dan bernomor 2: apakah unit 1 belum tercatat?"],
  ["Mesin Amplas", "Belt sander 440W", "Makita", "M 9400", 2, "Normal", "Gudang", "Hanya 1 baris dan bernomor 2. Model ragu."],
  ["Mesin Karpenter", "Gergaji mesin", "Bosch", "GSA 120", 1, "Normal", "Gudang", ""],
  ["Mesin Karpenter", "Jiksaw", "Bosch", "GST 680", 1, "Rusak", "Gudang", ""],
  ["Mesin Karpenter", "Jiksaw", "Bosch", "GST 680", 2, "Normal", "Gudang", ""],
  ["Mesin Karpenter", "Jiksaw", "Makita", "4351 FCT", 3, "Normal", "Gudang Karpenter", "No. unit kosong. Diisi 3 oleh saya."],
  ["Mesin Karpenter", "Skap", "Makita", "KP 0800", 1, "Normal", "Gudang", ""],
  ["Mesin Karpenter", "Skap", "Makita", "KP 0800", 2, "Normal", "Gudang Karpenter", ""],
  ["Mesin Karpenter", "Skap", "Makita", "KP 0800", 3, "Normal", "Gudang Karpenter", "No. unit terbaca 3 atau 5. Dipilih 3."],
  ["Mesin Karpenter", "Somel", "Makita", "N 5900 B", 1, "Servis", "Gudang", "Servis dicentang, kotak Rusak juga tampak bertanda. Cek mesinnya."],
  ["Mesin Karpenter", "Somel", "Makita", "N 5900 B", 2, "Normal", "Gudang", ""],
  ["Mesin Karpenter", "Somel cas 18V", "Makita", "DCS 5532", 3, "Normal", "Gudang", "Model ragu (DCS 553 Z?)."],
  ["Mesin Karpenter", "Somel cas 18V", "Makita", "DHS 660", 1, "Normal", "Gudang", ""],
  ["Mesin Karpenter", "Somel cas 18V", "Makita", "DHS 660", 2, "Normal", "Gudang", ""],
  ["Mesin Las", "Las 160A", "Lakoni", "Falcon 160 e", 1, "Normal", "Gudang", ""],
  ["Mesin Las", "Las 200A", "Lakoni", "HAW TIG 200 e", 2, "Normal", "Gudang", "Model ragu. Hanya 1 baris dan bernomor 2."],
  ["Mesin Las", "Las PVC", "Weldy", "HT 1600", 1, "Normal", "Gudang", ""],
  ["Mesin Pembersihan", "Blower", "Krisbow", "SRVP 300", 3, "Normal", "Gudang", ""],
  ["Mesin Pembersihan", "Blower", "Krisbow", "SRVP 300", 4, "Normal", "Gudang", ""],
  ["Mesin Pembersihan", "Blower", "Makita", "UB 1103", 1, "Normal", "Gudang", ""],
  ["Mesin Pembersihan", "Blower", "Nankai", "", 2, "Normal", "Gudang", "Model kosong."],
  ["Mesin Pembersihan", "Blower", "Nankai", "", 5, "Normal", "Gudang", "Model kosong."],
  ["Mesin Pembersihan", "Vakum", "Bosch", "GAS 12-25", 1, "Normal", "Gudang", ""],
  ["Mesin Pembersihan", "Vakum", "Bosch", "GAS 12-25", 3, "Normal", "Gudang Karpenter", ""],
  ["Mesin Pembersihan", "Vakum", "Krisbow", "KW 1800306", 2, "Normal", "Gudang", ""],
  ["Mesin Pembersihan", "Vakum/Blower", "Makita", "UB 1103", 1, "Normal", "Gudang", "Mungkin sama dengan H2 baris 24 (Blower Makita UB 1103 no. 1)."],
  ["Pengaduk", "Mixer", "Komax", "", 3, "Normal", "Gudang", "Model tertulis 'Machine code' di kertas, dikosongkan. Model tertulis 'Machine code' (dari plat, atau pengganti TIDAK ADA?)."],
  ["Pengaduk", "Mixer", "Makita", "UT 2204", 4, "Normal", "Gudang", ""],
  ["Pengaduk", "Mixer", "Wipro", "W 5980", 1, "Normal", "Gudang", ""],
  ["Pengaduk", "Mixer", "Wipro", "W 5980", 2, "Normal", "Gudang", ""],
  ["Peralatan Baja/Besi", "Pembengkok besi", "Kowloon", "GF 25", 1, "Normal", "Gudang", ""],
  ["Peralatan Baja/Besi", "Rebar tier", "Makita", "DTR 180 Z", 1, "Belum dicek", "Gudang", "No. unit dan kondisi kosong. Unit diisi 1 oleh saya. Nama ada kata buram (kuning?)."],
  ["Peralatan Baja/Besi", "Rebar tier", "Makita", "DTR 180 Z", 2, "Belum dicek", "Gudang", "No. unit dan kondisi kosong. Unit diisi 2 oleh saya."],
  ["Peralatan Baja/Besi", "Rebar tier kuning", "", "", 1, "Rusak", "Gudang", "Merek tertulis 'Machine code' di kertas, dikosongkan. Merek tertulis 'Machine code' (dari plat, atau pengganti TIDAK ADA?). Model terhapus."],
  ["Peralatan Baja/Besi", "Rebar tier kuning", "", "", 2, "Normal", "Gudang", "Merek tertulis 'Machine code' di kertas, dikosongkan. Sama dengan baris 17."],
  ["Peralatan Baja/Besi", "Rebar tier kuning", "", "", 3, "Normal", "Gudang", "Merek tertulis 'Machine code' di kertas, dikosongkan. Sama dengan baris 17."],
  ["Peralatan Baja/Besi", "Rebar tier kuning", "", "", 4, "Normal", "Gudang", "Merek tertulis 'Machine code' di kertas, dikosongkan. Sama dengan baris 17."],
  ["Peralatan Baja/Besi", "Rebar tier kuning", "", "", 5, "Normal", "Gudang", "Merek tertulis 'Machine code' di kertas, dikosongkan. Sama dengan baris 17."],
  ["Peralatan Udara", "Air compressor", "Imola", "IMOLA-225", 3, "Normal", "Gudang", ""],
  ["Peralatan Udara", "Air compressor", "Izumi", "DD 1024", 2, "Normal", "Gudang", "Lihat baris 13: OD atau DD?"],
  ["Peralatan Udara", "Air compressor", "Izumi", "OD 1024 1 HP", 1, "Normal", "Gudang Karpenter", "Model OD 1024, sedangkan baris 14 tertulis DD 1024: yang mana benar?"],
  ["Peralatan Udara", "Hot gun", "Bosch", "GHG 2063", 1, "Normal", "Gudang", ""],
  ["Peralatan Udara", "Hot gun", "Bosch", "GHG 2063", 2, "Normal", "Gudang", ""],
  ["Peralatan Udara", "Hot gun", "Bosch", "GHG 2063", 3, "Normal", "Gudang", ""]
];

function imporAwal() {
  var kat = sheet_('Kategori'), ju = sheet_('Jenis'), uu = sheet_('Unit');
  if (!kat || !ju || !uu) { pesanImpor_('Sheet belum lengkap. Jalankan setup dulu.'); return; }
  if (filled_('Jenis').length || filled_('Unit').length) {
    pesanImpor_('Impor dibatalkan: sheet Jenis atau Unit sudah berisi data. Tidak ada yang diubah.');
    return;
  }
  KATEGORI_TAMBAHAN.forEach(function (k) { if (!prefixOf_(k[0])) kat.appendRow([k[0], k[1]]); });
  var jid = {}, jrows = [], urows = [], seq = {}, nJ = 0;
  DATA_AWAL.forEach(function (d) {
    var key = [d[1], d[2], d[3]].join('|').toLowerCase();
    if (!jid[key]) { nJ++; jid[key] = 'J' + pad4_(nJ); jrows.push([jid[key], d[0], d[1], d[2], d[3], '']); }
    var p = prefixOf_(d[0]);
    if (!p) throw new Error('Kategori tidak ada: ' + d[0]);
    seq[p] = (seq[p] || 0) + 1;
    urows.push([p + '-' + pad3_(seq[p]), jid[key], d[4], d[5], d[6], '', '', '', d[7], '', '']);
  });
  ju.getRange(2, 1, jrows.length, 6).setValues(jrows);
  uu.getRange(2, 1, urows.length, 11).setValues(urows);
  if (sheet_('Tempat')) migrasiTempat_();
  log_('', 'Impor awal', urows.length + ' unit dalam ' + jrows.length + ' jenis dari lembar catat penjaga', 'Impor awal');
  pesanImpor_('Selesai. ' + urows.length + ' unit dalam ' + jrows.length + ' jenis dimasukkan. Buka website dan muat ulang.');
}
function pesanImpor_(m) { Logger.log(m); try { SpreadsheetApp.getUi().alert(m); } catch (e) {} }
