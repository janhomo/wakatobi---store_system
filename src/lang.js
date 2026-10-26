/* ---------- Bahasa: ID | EN ----------
   Hanya teks umum (menu, tombol, status) yang diterjemahkan. Nama mesin, kode, nama pekerja,
   catatan, dan nama rak tidak disentuh karena tidak pernah cocok persis dengan kamus ini.
   Templat selalu ditulis dalam Indonesia; saat bahasa = en, setiap perubahan tampilan disusul
   satu kali jalan "terjemah" yang menukar teks yang cocok persis di kamus. */
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
  'Siapa Anda?': 'Who are you?', 'Siapa yang mengambil?': 'Who is taking it?',
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
  'Tanpa departemen': 'No department', 'Unit': 'Unit'
};
function trText(raw) {
  const s = String(raw == null ? '' : raw).trim();
  return s && DICT_EN[s] ? DICT_EN[s] : null;
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
