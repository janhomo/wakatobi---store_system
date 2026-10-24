# QR Aset Gudang (Wakatobi Project Villa)

Sistem QR untuk gudang di lokasi proyek: mesin (ambil, kembali, maintenance), tempat penyimpanan (rak, lemari), material dan stok.

- `site/` : website (PWA). Di-deploy ke Netlify (`netlify.toml` sudah menunjuk ke folder ini).
- `backend/Code.gs` : server di Google Apps Script. Data ada di Google Sheet.
- `backend/ImporAwal.gs` : impor satu kali daftar mesin awal.
- `backend/MesinLembar.gs` : 21 mesin dari lembar catat tulisan tangan (fungsi `isiMesinLembar`, aman dijalankan ulang).
- `src/` : sumber `site/index.html`. Edit di sini, lalu jalankan `./build.sh`.
- `tests/` : uji backend (`node gas_test.js`, `node gas_test2.js`, `node gas_test3.js`, `node impor_test.js`) dan uji browser (`node e2e.js`, `node e2e2.js`, `node e2e3.js`; kamera palsu dibuat dengan `QRSIZE=99 node mkcam.js cam4.y4m GRD-001 BOR-001 KRP-001`).
- `PANDUAN_PASANG.txt` : langkah pasang dan update.

Sheet: Jenis, Unit, Kategori, Pengambilan, Arsip, Maintenance, Pekerja, Log Perubahan, Pengaturan, Foto, Tempat, Panduan, Material, Stok Log.

Aturan penting: kode (unit, LOK, MAT) tidak pernah diubah atau dipakai ulang. PIN tidak ada di repo (ada di sheet Pengaturan).

Hanya tiga nama yang boleh mengubah data (konstanta `PENGEDIT` di `Code.gs`): Abidin, Vikar, La Ode Riyan Syaputra. Login tetap satu PIN.
