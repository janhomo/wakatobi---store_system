/* ---------- Bahasa: ID | EN ----------
   Hanya teks umum (menu, tombol, status, pesan) yang diterjemahkan. Nama mesin, kode, nama
   pekerja, catatan, dan nama rak tidak disentuh karena tidak pernah cocok persis dengan kamus ini.
   Templat selalu ditulis dalam Indonesia; saat bahasa = en, setiap perubahan tampilan disusul
   satu kali jalan "terjemah": DICT_EN menukar teks yang SAMA PERSIS (satu node teks penuh),
   DICT_FRAG menukar potongan kalimat yang digabung dengan data (nama, angka, tanggal) di
   dalamnya, misalnya "Kode " + kodeAsli atau "Ambil " + tanggal. */
const LANG = { cur: (() => { const v = lsGet('qrg.lang', 'id'); return v === 'en' ? 'en' : 'id'; })() };
const isEN = () => LANG.cur === 'en';
const DICT_EN = {
  'Mesin': 'Machines', 'Penyimpanan': 'Storage', 'Material': 'Material', 'Hari Ini': 'Today',
  'Riwayat per tanggal': 'History by date', 'Scan QR': 'Scan QR', 'Saran': 'Suggestions', 'Merek': 'Brand',
  'Pekerja': 'Workers', 'Impor Excel': 'Import Excel', 'Impor isi rak': 'Import rack contents',
  'Log perubahan': 'Change log', 'Cetak label QR': 'Print QR labels', 'Dasbor': 'Dashboard',
  'Utama': 'Main', 'Admin': 'Admin', 'Tampilan': 'Appearance', 'Bahasa': 'Language',
  'Otomatis': 'Automatic', 'Terang': 'Light', 'Gelap': 'Dark', 'Muat ulang data': 'Reload data',
  'Keluar': 'Log out', 'Simpan': 'Save', 'Batal': 'Cancel', 'Tutup': 'Close', 'Kembali': 'Back',
  'Cari': 'Search', 'Cari mesin atau kode': 'Search machine or code', 'Nama saya': 'My name',
  'belum dipilih': 'not chosen', 'Pilih nama': 'Choose name', 'Pilih mesin': 'Choose machine',
  'belum diisi': 'not filled in', 'tidak ada': 'none',
  'Siapa Anda?': 'Who are you?', 'Siapa yang mengambil?': 'Who is taking it?',
  'Siapa yang menerima?': 'Who is receiving it?', 'Siapa yang menghitung?': 'Who is counting it?',
  'Siapa yang meminjam (boleh nama resort/orangnya)?': 'Who is borrowing it (resort/person name is fine)?',
  'Siapa yang mengembalikan (boleh nama resort/orangnya)?': 'Who is returning it (resort/person name is fine)?',
  'Dipinjam': 'Borrowed', 'Dikembalikan': 'Returned', 'Pinjam': 'Borrow',
  'Normal': 'Normal', 'Servis': 'In service', 'Rusak': 'Broken', 'Rusak total': 'Totally broken',
  'Belum dicek': 'Not checked', 'Nonaktif': 'Inactive', 'Di tempat': 'In place', 'Baik': 'Good',
  'Terlambat': 'Late', 'Dipakai': 'In use', 'Menipis': 'Low', 'Hampir habis': 'Almost empty',
  'Mesin baru': 'New machine', 'Tempat baru': 'New place', 'Material baru': 'New material',
  'Ambil': 'Take', 'Kembalikan': 'Return', 'Scan lagi': 'Scan again', 'Buka semua': 'Open all',
  'Tambah mesin': 'Add machine', 'Ubah': 'Edit', 'Ubah mesin': 'Edit machine',
  'Ubah jenis': 'Edit type', 'Ubah unit': 'Edit unit', 'Ubah material': 'Edit material',
  'Ubah tempat': 'Edit place', 'Ubah panduan': 'Edit guide', 'Cetak ringkasan': 'Print summary',
  'Cetak QR tempat': 'Print place QR', 'Memuat…': 'Loading…', 'Tersimpan': 'Saved',
  'Belum kembali': 'Not returned yet', 'Rusak / servis': 'Broken / in service',
  'Servis jatuh tempo': 'Service due', 'Stok menipis': 'Low stock', 'Sedang dipakai': 'In use now',
  'Mesin tanpa rak': 'Machines without a rack', 'Baca saja': 'View only',
  'Pilih file Excel': 'Choose Excel file', 'Unduh contoh': 'Download example',
  'Pilih dari galeri': 'Choose from gallery', 'Ambil foto': 'Take photo', 'Hapus foto': 'Delete photo',
  'Tanpa departemen': 'No department', 'Unit': 'Unit',
  /* --- tambahan: menu, rak/sub rak, form, pesan --- */
  'Alasan': 'Reason', 'Alat dan bahan': 'Tools and materials', 'Aset': 'Asset',
  'Awalan kode (3 huruf)': 'Code prefix (3 letters)',
  'Batas menipis (boleh kosong)': 'Low-stock threshold (optional)', 'Batas menipis': 'Low-stock threshold',
  'Belum ada foto.': 'No photo yet.', 'Belum ada jadwal': 'No schedule yet',
  'Belum ada panduan': 'No guide yet', 'Belum ada unit untuk jenis ini.': 'No units for this type yet.',
  'Belum cocok': 'Not matched yet', 'Belum diisi': 'Not filled in', 'Belum punya tempat': 'No place yet',
  'belum kembali': 'not returned yet',
  'Belum ada mesin di sini.': 'No machines here yet.', 'Belum ada material di sini.': 'No material here yet.',
  'Belum ada sub rak.': 'No sub racks yet.',
  'Belum ada tempat. Tekan Tempat baru, misalnya Rak 1 atau Lemari Kunci.': 'No places yet. Tap New place, e.g. Rack 1 or Key cabinet.',
  'Cari material': 'Search material', 'Cari nama atau departemen': 'Search name or department',
  'Catatan': 'Notes', 'Daftar ambil': 'Take list', 'Daftar kembali': 'Return list',
  'Daftar tidak bisa disimpan.': "List can't be saved.", 'Departemen': 'Department',
  'Di luar': 'Out', 'Dibatalkan.': 'Cancelled.',
  'Dikembalikan dan ditandai rusak.': 'Returned and marked broken.', 'Dikembalikan.': 'Returned.',
  'Dipegang': 'Held', 'File kosong atau hanya berisi judul kolom.': 'File is empty or only has a header row.',
  'File tidak bisa dibaca.': "File can't be read.", 'Foto dihapus.': 'Photo deleted.',
  'Foto disimpan.': 'Photo saved.', 'Gagal mengarsipkan.': 'Failed to archive.',
  'Gagal menyimpan.': 'Failed to save.', 'Ganti sparepart': 'Replace part', 'Ganti': 'Replace',
  'Garansi sampai': 'Warranty until', 'Hari ini': 'Today',
  'Interval servis harus angka (bulan).': 'Service interval must be a number (months).',
  'Isi alasan menonaktifkan.': 'Enter a reason for deactivating.',
  'Isi angka 0 atau lebih.': 'Enter a number 0 or more.', 'Isi dulu kolomnya.': 'Fill in the field first.',
  'Isi jumlah dengan angka.': 'Enter the amount as a number.', 'Isi kategori': 'Enter category',
  'Isi merek': 'Enter brand', 'Isi minimal satu bagian panduan.': 'Fill in at least one part of the guide.',
  'Isi model': 'Enter model', 'Isi nama material.': 'Enter the material name.',
  'Isi nama merek.': 'Enter the brand name.', 'Isi nama mesin.': 'Enter the machine name.',
  'Isi nama pekerja.': "Enter the worker's name.", 'Isi nama tempat.': 'Enter the place name.',
  'Isi nomor unit.': 'Enter the unit number.', 'Isi satuan, misalnya meter atau sak.': 'Enter a unit, e.g. meter or sack.',
  'Isi tanggal maintenance.': 'Enter the maintenance date.', 'Jadwal servis belum diatur': 'Service schedule not set',
  'Jenis tidak ditemukan.': 'Type not found.', 'Kalibrasi': 'Calibration',
  'Kategori (boleh kosong)': 'Category (optional)', 'Kategori belum diisi': 'Category not filled in',
  'Kategori dan nama wajib diisi.': 'Category and name are required.', 'Kategori diisi.': 'Category filled in.',
  'Kategori': 'Category', 'Kode atau jenis tidak ditemukan.': 'Code or type not found.',
  'Kode mesin kosong.': 'Machine code is empty.', 'Kode rak kosong (dilewati).': 'Rack code empty (skipped).',
  'Kode': 'Code', 'Kondisi': 'Condition', 'Koreksi': 'Correction', 'Lainnya': 'Other',
  'Lampu tidak bisa dinyalakan.': "Flashlight couldn't be turned on.", 'Langkah': 'Step',
  'Lihat mesin': 'View machine', 'Lihat': 'View',
  'Lokasi (boleh kosong)': 'Location (optional)', 'Lokasi simpan': 'Storage location',
  'Maintenance dicatat.': 'Maintenance recorded.', 'Maintenance': 'Maintenance',
  'Maksimal 2000 baris sekali impor.': 'Maximum 2000 rows per import.',
  'Maksimal 400 baris sekali impor.': 'Maximum 400 rows per import.', 'Masuk': 'In',
  'Material diaktifkan kembali.': 'Material reactivated.', 'Material dinonaktifkan.': 'Material deactivated.',
  'Material diubah.': 'Material updated.', 'Material ini nonaktif.': 'This material is inactive.',
  'Material nonaktif': 'Inactive material', 'Material tidak ditemukan.': 'Material not found.',
  'menunggu terkirim': 'waiting to be sent',
  'Merek (boleh kosong)': 'Brand (optional)', 'Merek dan model sama, nama berbeda': 'Same brand and model, different name',
  'Merek diisi.': 'Brand filled in.', 'Merek masih kosong': 'Brand still empty', 'Merek · tipe': 'Brand · type',
  'Mesin dan material': 'Machines and materials', 'Mesin di rak ini': 'Machines in this rack',
  'Mesin tidak ditemukan.': 'Machine not found.', 'Material · stok': 'Material · stock',
  'Model diisi.': 'Model filled in.', 'Model masih kosong': 'Model still empty', 'Model': 'Model',
  'Nama belum diubah.': 'Name not changed.', 'Nama kategori baru': 'New category name',
  'Nama material': 'Material name', 'Nama merek baru': 'New brand name', 'Nama mesin': 'Machine name',
  'Nama pekerja yang mengambil atau menerima.': 'Name of the worker taking or receiving it.',
  'Nama sub rak': 'Sub rack name', 'Nama tempat': 'Place name',
  'No. seri pabrik (boleh kosong)': 'Factory serial no. (optional)', 'No. seri pabrik': 'Factory serial no.',
  'No. seri': 'Serial no.', 'No. unit (boleh kosong)': 'Unit no. (optional)',
  'No. unit harus angka.': 'Unit no. must be a number.', 'No. unit': 'Unit no.',
  'Nonaktifkan material': 'Deactivate material', 'Nonaktifkan tempat': 'Deactivate place',
  'Nonaktifkan unit': 'Deactivate unit', 'Pekerja ditambahkan.': 'Worker added.', 'Pemilik': 'Owner',
  'Pengecekan': 'Inspection', 'Per tanggal': 'By date', 'Perbaikan': 'Repair',
  'Perubahan disimpan.': 'Changes saved.', 'Pilih dulu': 'Choose first',
  'Pilih jenis tujuan.': 'Choose a destination type.', 'Pilih kategori.': 'Choose a category.',
  'Pilih nama pekerja dulu.': "Choose a worker's name first.", 'Pilih nama pekerja': "Choose worker's name",
  'Pilih nama untuk setiap mesin dulu.': 'Choose a name for each machine first.',
  'Pilih rak, lemari, atau kontainer.': 'Choose a rack, cabinet, or container.',
  'Pilih unit yang diservis.': 'Choose the unit being serviced.', 'Rincian': 'Details', 'Riwayat': 'History',
  'Samakan nama': 'Match name', 'Saran dimunculkan lagi.': 'Suggestion shown again.',
  'Saran ditolak.': 'Suggestion dismissed.', 'Satu foto per jenis mesin': 'One photo per machine type',
  'Satuan': 'Unit of measure', 'Sembunyikan': 'Hide', 'Semua material': 'All materials',
  'Semua mesin': 'All machines', 'Semua': 'All',
  'Server belum diatur (config.js).': 'Server not configured (config.js).',
  'Server belum diatur.': 'Server not configured.', 'Servis berikutnya': 'Next service',
  'Servis rutin': 'Routine service', 'Servis terlewat': 'Service overdue',
  'Servis tiap berapa bulan (boleh kosong)': 'Service interval in months (optional)',
  'Siapa mengubah apa': 'Who changed what', 'Siapa?': 'Who?', 'Simpan foto': 'Save photo',
  'Status': 'Status', 'Stok awal': 'Initial stock', 'Stok tidak cukup.': 'Not enough stock.',
  'Stok yang benar (hasil hitung)': 'Correct stock (counted)', 'Stok': 'Stock',
  'Sub rak': 'Sub rack', 'Sub rak baru': 'New sub rack', 'Ubah sub rak': 'Edit sub rack',
  'Sudah kembali': 'Already returned', 'Tambah banyak mesin': 'Add many machines', 'Tambah unit': 'Add unit',
  'Tanggal beli': 'Purchase date', 'Tanggal': 'Date', 'Tanpa kategori': 'No category',
  'Tanpa merek': 'No brand', 'Tanpa model': 'No model', 'Tempat diaktifkan kembali.': 'Place reactivated.',
  'Tempat dinonaktifkan.': 'Place deactivated.', 'Tempat diubah.': 'Place updated.',
  'Tempat nonaktif': 'Inactive place', 'Tempat simpan': 'Storage place',
  'Tempat tidak ditemukan.': 'Place not found.', 'Tempat': 'Place', 'Tersedia': 'Available',
  'Tidak ada baris data.': 'No data rows.', 'Tidak ada baris yang bisa dibaca.': 'No readable rows.',
  'Tidak ada material yang cocok.': 'No matching material.', 'Tidak ada sinyal.': 'No signal.',
  'Tidak ada tempat yang cocok.': 'No matching place.', 'Tidak ada yang berubah.': 'Nothing changed.',
  'Tidak ada yang cocok.': 'No matches.', 'Tidak diatur': 'Not set', 'Tulis merek': 'Type brand',
  'Tulis model / tipe': 'Type model / type', 'Unit mana?': 'Which unit?', 'Unit nonaktif': 'Inactive unit',
  'Unit tidak ditemukan.': 'Unit not found.', 'Yakin?': 'Sure?',
  'Kode LOK dibuat otomatis. Setelah disimpan, QR tempat bisa dicetak.': "LOK code is created automatically. Once saved, the place's QR can be printed.",
  'Sub rak tidak punya QR, karena bisa diubah-ubah bentuknya.': "The sub rack has no QR, since its shape can change.",
  'Sub rak tidak punya QR sendiri, karena bisa diubah-ubah.': "The sub rack has no QR of its own, since it can be resized.",
  'Lewat': 'Overdue', 'Unit diaktifkan kembali.': 'Unit reactivated.', 'Unit dinonaktifkan.': 'Unit deactivated.',
  'Merek/model': 'Brand/model', 'Dipegang oleh': 'Held by', 'Aksi': 'Action', 'Riwayat terakhir': 'Recent history',
  'Belum ada catatan maintenance untuk jenis ini.': 'No maintenance entries for this type yet.',
  'Belum ada catatan maintenance untuk unit ini.': 'No maintenance entries for this unit yet.',
  'Pilih tanggal untuk melihat, mencetak, atau mengarsipkan catatan.': 'Choose a date to view, print, or archive entries.',
  'Tidak ada catatan pada tanggal ini.': 'No entries on this date.', 'Arsipkan tanggal ini': 'Archive this date',
  'Arsipkan': 'Archive', 'Hapus catatan': 'Delete entry',
  /* --- kolom maintenance custom per jenis + link PDF laporan servis --- */
  'Atur kolom': 'Edit columns', 'Atur kolom maintenance': 'Edit maintenance columns', 'Kolom khusus': 'Custom columns',
  'Link PDF laporan servis (boleh kosong)': 'Service report PDF link (optional)',
  'Tempel link PDF di sini': 'Paste PDF link here', 'Lihat laporan PDF': 'View PDF report',
  'Belum ada kolom khusus.': 'No custom columns yet.', 'Tambah kolom': 'Add column',
  'Kolom baru': 'New column', 'Ubah kolom': 'Edit column', 'Nama kolom': 'Column name',
  'Tipe': 'Type', 'Teks': 'Text', 'Angka': 'Number', 'Centang': 'Checkbox',
  'Isi nama kolom.': 'Enter a column name.', 'Kolom ditambahkan.': 'Column added.',
  'Kolom diubah.': 'Column changed.', 'Kolom dihapus.': 'Column deleted.',
  'Link terlalu panjang.': 'Link is too long.'
};
/* potongan kalimat yang digabung dengan data (nama, kode, tanggal, angka) — dicari dan ditukar
   di mana pun munculnya di dalam satu node teks, bukan hanya di awal. */
const DICT_FRAG = {
  'Ambil ': 'Taken ', 'Kembali ': 'Returned ', 'Dialihkan ke ': 'Redirected to ',
  'Catat dipinjam ': 'Record borrowed ', 'Catat dikembalikan ': 'Record returned ',
  'Dicatat dipinjam ': 'Recorded borrowed ', 'Dicatat dikembalikan ': 'Recorded returned ',
  'Dipinjam, belum dikembalikan: ': 'Borrowed, not yet returned: ', 'Dipinjam ': 'Borrowed ',
  'Diarsipkan: ': 'Archived: ', 'Digabung. ': 'Merged. ', 'Dikurangi ': 'Reduced by ',
  'Disimpan ke ': 'Saved to ', 'Ditambah ': 'Added ', 'Hanya ': 'Only ', 'Impor ': 'Import ',
  'Mengimpor ': 'Importing ', 'Ini panduan pertama untuk ': 'This is the first guide for ',
  'Jumlah (': 'Amount (', 'Kode ': 'Code ', 'Koreksi jadi ': 'Corrected to ', 'Kurangi ': 'Reduce ',
  'Mengirim ': 'Sending ', 'Menunggu sinyal, data akan dikirim otomatis (': 'Waiting for signal, data will be sent automatically (',
  'Merek diubah di ': 'Brand changed in ', 'Mesin ': 'Machine ', 'Nama diganti: ': 'Name changed: ',
  'Nama disamakan: ': 'Name matched: ', 'Otomatis: ': 'Automatic: ',
  'Panduan disimpan sebagai versi ': 'Guide saved as version ', 'Panduan v': 'Guide v',
  'Perhatian: ': 'Attention: ', 'Pilih mesin untuk ': 'Choose machine for ', 'Seri ': 'Serial ',
  'Servis tiap ': 'Service every ', 'Setel stok jadi ': 'Set stock to ', 'Simpan ': 'Save ',
  'Sisa ': 'Remaining ', 'Stok disetel ': 'Stock set to ', 'Sub rak dibuat: ': 'Sub rack created: ',
  'Tambah ke ': 'Add to ', 'Tambah unit ': 'Add unit ', 'Tambah ': 'Add ', 'Tampilan: ': 'Appearance: ',
  'Tempat dibuat: ': 'Place created: ', 'Material dibuat: ': 'Material created: ',
  'Tercatat diambil: ': 'Recorded as taken: ', 'Tercatat kembali: ': 'Recorded as returned: ',
  'Terlewat ': 'Overdue ', 'Unit (': 'Unit (', 'Unit baru: ': 'New unit: ', 'Versi ': 'Version ',
  'Di ': 'In ', 'Baca saja · ': 'View only · ', 'Belum punya tempat · ': 'No place yet · ',
  'merek/model': 'brand/model',
  ' tempat · ': ' places · ', ' mesin tersimpan · ': ' machines stored · ',
  ' mesin belum punya tempat': ' machines have no place yet',
  ' catatan · belum ada jadwal': ' entries · no schedule yet', 'berikutnya ': 'next ',
  'Foto sekarang.': 'Photo now.', 'Belum ada foto.': 'No photo yet.',
  ' Foto ini dipakai untuk semua unit ': ' This photo is used for all units of ',
  '. Setelah dipilih, foto bisa digeser, diperbesar, dan diputar. Disimpan kecil supaya cepat dibuka.': ". Once chosen, the photo can be moved, zoomed, and rotated. It's saved small so it opens quickly.",
  'Satu catatan ditolak server: ': 'One entry was rejected by the server: ',
  'Belum ada yang mengambil mesin ini.': 'No one has taken this machine yet.',
  'Riwayat belum bisa dimuat. Cek sinyal.': "History couldn't be loaded. Check your signal.",
  'Baik)': 'Good)', 'Rusak)': 'Broken)', 'memindahkan catatan tanggal ini ke sheet Arsip di Google Sheet. Datanya tetap tersimpan, hanya hilang dari daftar Riwayat.': ' moves this date’s entries to the Arsip sheet in the Google Sheet. The data stays saved, it just disappears from the History list.',
  'Kolom ini muncul saat mengisi riwayat maintenance untuk ': 'These columns appear when filling in maintenance history for ',
  'Ubah kolom ': 'Edit column ', 'Hapus kolom ': 'Delete column '
};
const FRAG_KEYS = Object.keys(DICT_FRAG).sort((a, b) => b.length - a.length);
/* kata status yang hanya ditukar kalau langsung mengikuti angka (hindari mengubah kata yang sama
   di tengah kalimat lain yang belum lengkap kamusnya, misalnya "...mengambil mesin ini."). */
const NUM_SUFFIX = [[/(\d) mesin\b/g, '$1 machines'], [/(\d) tersedia\b/g, '$1 available'],
  [/(\d) di luar\b/g, '$1 out'], [/(\d) rusak\b/g, '$1 broken'], [/(\d) servis\b/g, '$1 in service']];
function trText(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return null;
  if (DICT_EN[s]) return DICT_EN[s];
  let out = s, changed = false;
  FRAG_KEYS.forEach(k => { if (out.indexOf(k) >= 0) { out = out.split(k).join(DICT_FRAG[k]); changed = true; } });
  NUM_SUFFIX.forEach(([re, rep]) => { if (re.test(out)) { re.lastIndex = 0; out = out.replace(re, rep); changed = true; } });
  return changed ? out : null;
}
let langTick = false;
function translateNode(root) {
  if (!isEN() || !root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const nodes = []; let n;
  while ((n = walker.nextNode())) nodes.push(n);
  nodes.forEach(nd => { const t = trText(nd.nodeValue); if (t) nd.nodeValue = nd.nodeValue.replace(nd.nodeValue.trim(), t); });
  if (root.querySelectorAll) root.querySelectorAll('[placeholder],[aria-label],[title]').forEach(el => {
    ['placeholder', 'aria-label', 'title'].forEach(attr => { const v = el.getAttribute(attr), t = v && trText(v); if (t) el.setAttribute(attr, t); });
  });
}
function setupLangObserver() {
  const obs = new MutationObserver(() => {
    if (!isEN() || langTick) return;
    langTick = true;
    requestAnimationFrame(() => { translateNode(document.body); langTick = false; });
  });
  obs.observe(document.body, { childList: true, subtree: true, characterData: true });
}
function setLang(l) {
  const v = l === 'en' ? 'en' : 'id'; if (v === LANG.cur) return;
  LANG.cur = v; lsSet('qrg.lang', v); document.documentElement.lang = v;
  render(); renderChrome(); if (!$('#drawer').hidden) renderDrawer();
  if (isEN()) translateNode(document.body);
}
