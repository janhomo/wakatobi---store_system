# QR Aset Gudang (Wakatobi Project Villa)

Sistem QR untuk gudang di lokasi proyek: mesin (ambil, kembali, maintenance), tempat penyimpanan (rak, lemari), material dan stok.

- `site/` : website (PWA). Di-deploy ke Netlify (`netlify.toml` sudah menunjuk ke folder ini).
- `backend/Code.gs` : server di Google Apps Script. Data ada di Google Sheet.
- `backend/ImporAwal.gs` : impor satu kali daftar mesin awal.
- `src/` : sumber `site/index.html`. Edit di sini, lalu jalankan `./build.sh`.
- `tests/` : uji backend (`node gas_test.js`, `node gas_test2.js`, `node impor_test.js`) dan uji browser (`node e2e.js`, `node e2e2.js`).
- `PANDUAN_PASANG.txt` : langkah pasang dan update.

Sheet: Jenis, Unit, Kategori, Pengambilan, Arsip, Maintenance, Pekerja, Log Perubahan, Pengaturan, Foto, Tempat, Panduan, Material, Stok Log.

Aturan penting: kode (unit, LOK, MAT) tidak pernah diubah atau dipakai ulang. PIN tidak ada di repo (ada di sheet Pengaturan).
