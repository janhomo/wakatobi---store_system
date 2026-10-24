/* Data 21 mesin dari "Lembar Catat Mesin Gudang" (halaman 2 dan 3). Radio tidak ikut (sudah dimasukkan).
   Nama ditulis seperti di lembar. Perbaikan nama muncul sebagai Saran di aplikasi, tidak diubah otomatis.
   Aman dijalankan ulang: unit yang sudah ada dilewati. Jalankan dari editor Apps Script: isiMesinLembar */
function isiMesinLembar() {
  var G = 'Gurinda/Mesin Potong';
  function r(c, n, b, m, u, sl, no) { return { c: c, n: n, b: b, m: m, u: u, sl: sl, cat: 'No. lembar: ' + no }; }
  var rows = [
    r(G, 'Gurinda K 670 W', 'Bosch', 'GWS 060', 1, 'Rusak', 2),
    r(G, 'Gurinda K 670 W', 'Bosch', 'GWS 060', 2, 'Rusak', 6),
    r(G, 'Gurinda K 670 W', 'Bosch', 'GWS 060', 3, 'Normal', 3),
    r(G, 'Gurinda K 710 W', 'Bosch', 'GWS 700', 1, 'Servis', 5),
    r(G, 'Gurinda K 710 W', 'Bosch', 'GWS 700', 2, 'Normal', 4),
    r(G, 'Gurinda K 750 W', 'Bosch', 'GWS 750', 1, 'Normal', 8),
    r(G, 'Gurinda K 900 W', 'Bosch', 'GWS 750', 2, 'Normal', 9),
    r(G, 'Gurinda K 900 W', 'Bosch', 'GWS 900', 1, 'Normal', 10),
    r(G, 'Gurinda K 900 W', 'Bosch', 'GWS 900', 2, 'Normal', 11),
    r(G, 'Gurinda K 700 W', 'Bosch', 'GWS 700', 3, 'Rusak', 1),
    r(G, 'Gurinda besar lantai', 'Makita', 'PC 5001 C', 1, 'Normal', 1),
    r('Bor/Breker', 'Impact wrench', 'Makita', 'TW 0350', 1, 'Normal', 1),
    r('Mesin Pembersihan', 'Water Jet Kecil', 'Krisbow', '', 1, '', 1),
    r('Mesin Pembersihan', 'Water Jet Besar', 'Karcher', '', 1, '', 2),
    r(G, 'Gurinda Besar 2400 W', 'Makita', '4112 HS', 1, '', 1),
    r('Peralatan Udara', 'Kipas Angin 16 inci', 'Krisbow', '', 1, 'Normal', 1),
    r('Peralatan Udara', 'Kipas Angin 16 inci', 'Krisbow', '', 2, 'Normal', 2),
    r('Peralatan Udara', 'Kipas Angin 16 inci', 'Krisbow', '', 3, 'Normal', 3),
    r('Peralatan Udara', 'Kipas Angin 16 inci', 'Krisbow', '', 4, 'Normal', 4),
    r('Peralatan Udara', 'Kipas Angin 16 inci', 'Krisbow', '', 5, 'Normal', 5),
    r(G, 'Gurinda Beton/Marble Cutter 3000 W', '', 'K 1601', 1, 'Normal', 1)
  ];
  var res = imporUnit_({ rows: rows, oleh: 'Sistem' });
  var msg = res.unit + ' unit masuk, ' + res.jenis + ' jenis baru, ' + res.nSkipped + ' dilewati, ' + res.nErrors + ' error.' +
    (res.errors && res.errors.length ? ' ' + res.errors.join(' ') : '');
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return res;
}
