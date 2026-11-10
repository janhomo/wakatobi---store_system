/* ---------- Dasbor: baca saja, dari data yang sudah dimuat (bootstrap). Tidak ada tombol ubah data. ---------- */
function dasborStats() {
  const open = openEntries(), late = open.filter(isLate);
  const act = S.units.filter(u => !u.off), held = heldMap();
  const rusakTotal = act.filter(u => u.cond === 'Rusak total');
  const broken = act.filter(u => !held.has(u.k) && (u.cond === 'Servis Resort' || u.cond === 'Servis Bali' || u.cond === 'Rusak'));
  const due = [];
  act.forEach(u => { const n = nextService(u.k); if (n) { const d = daysFromToday(n); if (d <= 7) due.push({ u, d }); } });
  due.sort((a, b) => a.d - b.d);
  const places = activePlaces();
  const empty = places.filter(p => { const sm = placeSummary(p.id); return !sm.units.length && !sm.mats.length; });
  const noPlace = act.filter(u => !hasPlace(u));
  const low = allMaterial().filter(m => !m.off && isLow(m));
  const material = allMaterial().filter(m => !m.off);
  return { open, late, broken, rusakTotal, due, places, empty, noPlace, low, material, act };
}
function drow(a, b, tag, kind, jid) {
  return '<div class="trow">' + (jid !== undefined ? thumbHtml(jid, 22, 'sm') : '') + '<span class="nm"><b>' + esc(a) + '</b><small class="muted">' + esc(b) + '</small></span>' + (tag ? '<span class="pill ' + kind + '">' + esc(tag) + '</span>' : '') + '</div>';
}
function schip(id, n, label, kind, clickable) {
  const inner = '<b>' + n + '</b><small>' + esc(label) + '</small>';
  if (!clickable) return '<div class="schip ' + kind + '">' + inner + '</div>';
  const sel = S.dkChip === id;
  return '<button class="schip ' + kind + '" data-action="dkchip" data-id="' + id + '" aria-pressed="' + sel + '">' + inner + '</button>';
}
/* ---------- Aktivitas terbaru: gabungan ambil + kembali, diurutkan dari yang paling baru. ---------- */
function aktivitasTerbaru(n) {
  const ev = [];
  allEntries().forEach(e => {
    ev.push({ t: e.ts, tipe: 'ambil', e });
    if (e.kembali) ev.push({ t: e.kembali, tipe: 'kembali', e });
  });
  ev.sort((a, b) => (a.t < b.t ? 1 : -1));
  return ev.slice(0, n);
}

function viewDasbor() {
  if (!S.loaded) return '<p class="empty">' + (S.loadError ? 'Data belum bisa dimuat. Cek sinyal lalu buka lagi.' : 'Memuat…') + '</p>';
  const d = dasborStats();
  const chipRows = {
    dipakai: d.open.slice(0, 10).map(e => drow(e.mesin + (e.kode ? ' · ' + e.kode : ''), e.nama + ' · sejak ' + fmtDT(e.ts), '', 'info', U[e.kode] ? U[e.kode].j : '')),
    late: d.late.slice(0, 10).map(e => drow(e.mesin + (e.kode ? ' · ' + e.kode : ''), e.nama + ' · sejak ' + fmtDT(e.ts), 'Terlambat', 'bad', U[e.kode] ? U[e.kode].j : '')),
    broken: d.broken.slice(0, 10).map(u => drow(jenisOf(u).n + ' · ' + u.k, u.sl, u.sl, u.s, u.j)),
    rusaktotal: d.rusakTotal.slice(0, 10).map(u => drow(jenisOf(u).n + ' · ' + u.k, u.sl, u.sl, 'bad', u.j)),
    due: d.due.slice(0, 10).map(x => drow(jenisOf(x.u).n + ' · ' + x.u.k, x.d < 0 ? 'Terlewat ' + (-x.d) + ' hari' : x.d + ' hari lagi', x.d < 0 ? 'Lewat' : x.d + ' hari', x.d < 0 ? 'bad' : 'warn', x.u.j)),
    low: d.low.slice(0, 10).map(m => drow(m.n, 'Sisa ' + fmtQty(m.q) + ' ' + m.s + (m.lo ? ' · batas ' + fmtQty(m.lo) : ''), 'Menipis', 'warn'))
  };
  const chipTitle = { dipakai: 'Sedang dipakai', late: 'Terlambat', broken: 'Rusak / servis', rusaktotal: 'Rusak total', due: 'Servis jatuh tempo', low: 'Stok menipis' };
  const chipEmpty = { dipakai: 'Tidak ada yang dipakai.', late: 'Tidak ada yang terlambat.', broken: 'Tidak ada mesin servis/rusak.', rusaktotal: 'Tidak ada mesin rusak total.', due: 'Tidak ada dalam 7 hari ke depan.', low: 'Tidak ada yang menipis.' };
  const sel = S.dkChip;
  const selPanel = sel && chipRows[sel] !== undefined
    ? '<div class="h2" style="margin-top:10px">' + esc(chipTitle[sel]) + '</div>' +
      (chipRows[sel].length ? '<div class="tbox">' + chipRows[sel].join('') + '</div>' : '<p class="muted">' + esc(chipEmpty[sel]) + '</p>')
    : '';
  const akt = aktivitasTerbaru(8);
  const aktRows = akt.map(x => x.tipe === 'ambil'
    ? drow(x.e.nama + ' mengambil', (U[x.e.kode] ? jenisOf(U[x.e.kode]).n : x.e.mesin) + (x.e.kode ? ' · ' + x.e.kode : '') + ' · ' + fmtDT(x.e.ts), '', 'info', U[x.e.kode] ? U[x.e.kode].j : '')
    : drow(x.e.nama + ' mengembalikan', (U[x.e.kode] ? jenisOf(U[x.e.kode]).n : x.e.mesin) + (x.e.kode ? ' · ' + x.e.kode : '') + ' · ' + fmtDT(x.e.kembali), x.e.kondisi && x.e.kondisi !== 'Normal' ? x.e.kondisi : '', 'bad', U[x.e.kode] ? U[x.e.kode].j : ''));
  return '<p class="note info" style="margin-bottom:10px">Dasbor baca saja. Data sama dengan Sheet, diperbarui otomatis tiap kali dibuka. Tekan kotak untuk lihat daftarnya.</p>' +
    '<div class="statstrip">' +
    schip('unit', d.act.length, 'Total unit', 'info', false) +
    schip('dipakai', d.open.length, 'Sedang dipakai', 'info', true) +
    schip('late', d.late.length, 'Terlambat', d.late.length ? 'bad' : 'info', true) +
    schip('broken', d.broken.length, 'Rusak / servis', d.broken.length ? 'warn' : 'info', true) +
    schip('rusaktotal', d.rusakTotal.length, 'Rusak total', d.rusakTotal.length ? 'bad' : 'info', true) +
    schip('material', d.material.length, 'Total material', 'info', false) +
    schip('noplace', d.noPlace.length, 'Mesin tanpa rak', 'info', false) +
    schip('due', d.due.length, 'Servis jatuh tempo', d.due.length ? 'warn' : 'info', true) +
    schip('low', d.low.length, 'Stok menipis', d.low.length ? 'warn' : 'info', true) +
    '</div>' +
    selPanel +
    '<div class="h2" style="margin-top:16px">Aktivitas Terbaru</div>' +
    (aktRows.length ? '<div class="tbox">' + aktRows.join('') + '</div>' : '<p class="muted">Belum ada aktivitas.</p>') +
    '<div style="margin:16px 0"><button class="btn ghost small" data-action="dasborprint">' + ic('print', 20) + 'Cetak ringkasan</button></div>';
}
