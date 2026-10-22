# QR Aset Gudang (Wakatobi Project Villa)

Sistem QR untuk gudang alat di lokasi proyek. Scan QR di mesin untuk mengambil, mengembalikan, atau melihat data.

- `site/` : website (PWA). Di-deploy ke Netlify (`netlify.toml` sudah menunjuk ke folder ini).
- `backend/Code.gs` : server di Google Apps Script. Data ada di Google Sheet.
- `backend/ImporAwal.gs` : impor satu kali daftar mesin awal.
- `src/` : sumber `site/index.html`. Edit di sini, lalu jalankan `./build.sh`.
- `tests/` : uji backend (`node gas_test.js`, `node impor_test.js`) dan uji browser (`node e2e.js`).
- `PANDUAN_PASANG.txt` : langkah pasang.

Aturan penting: kode unit tidak pernah diubah atau dipakai ulang. PIN tidak ada di repo (ada di sheet Pengaturan).
