/* ---------- Dasbor: baca saja, dari data yang sudah dimuat (bootstrap). Tidak ada tombol ubah data. ---------- */
function dasborStats() {
  const open = openEntries(), late = open.filter(isLate);
  const act = S.units.filter(u => !u.off);
  const broken = act.filter(u => u.s === 'bad' || u.cond === 'Servis').filter(u => !heldMap().has(u.k));
  const due = [];
  act.forEach(u => { const n = nextService(u.k); if (n) { const d = daysFromToday(n); if (d <= 7) due.push({ u, d }); } });
  due.sort((a, b) => a.d - b.d);
  const places = activePlaces();
  const empty = places.filter(p => { const sm = placeSummary(p.id); return !sm.units.length && !sm.mats.length; });
  const noPlace = act.filter(u => !hasPlace(u));
  const low = allMaterial().filter(m => !m.off && isLow(m));
  return { open, late, broken, due, places, empty, noPlace, low };
}
function dkpi(n, label, sub, kind) {
  return '<div class="kpi ' + kind + '"><b>' + n + '</b><small>' + esc(label) + '</small>' + (sub ? '<span class="s">' + esc(sub) + '</span>' : '') + '</div>';
}
function dkpiOpen(id, n, label, sub, kind, rowsHtml, emptyMsg) {
  const open = S.dkOpen && S.dkOpen[id];
  return '<button class="kpi kpiopen ' + kind + '" data-action="dkpi" data-id="' + id + '" aria-expanded="' + !!open + '">' +
    '<span class="top"><b>' + n + '</b>' + ic('chev', 18) + '</span><small>' + esc(label) + '</small>' + (sub ? '<span class="s">' + esc(sub) + '</span>' : '') + '</button>' +
    '<div class="kpanel' + (open ? ' open' : '') + '">' + (n > 0 ? '<div class="tbox">' + (rowsHtml || '') + '</div>' : '<p class="muted" style="margin:6px 0 0">' + esc(emptyMsg || 'Tidak ada.') + '</p>') + '</div>';
}
function drow(a, b, tag, kind) {
  return '<div class="trow"><span class="nm"><b>' + esc(a) + '</b><small class="muted">' + esc(b) + '</small></span>' + (tag ? '<span class="pill ' + kind + '">' + esc(tag) + '</span>' : '') + '</div>';
}
function viewDasbor() {
  if (!S.loaded) return '<p class="empty">' + (S.loadError ? 'Data belum bisa dimuat. Cek sinyal lalu buka lagi.' : 'Memuat…') + '</p>';
  const d = dasborStats(), act = S.units.filter(u => !u.off);
  const lateRows = d.late.slice(0, 10).map(e => drow(e.mesin + (e.kode ? ' · ' + e.kode : ''), e.nama + ' · sejak ' + fmtDT(e.ts), 'Terlambat', 'bad'));
  const brokenRows = d.broken.slice(0, 10).map(u => drow(jenisOf(u).n + ' · ' + u.k, u.sl, u.sl, u.s));
  const dueRows = d.due.slice(0, 10).map(x => drow(jenisOf(x.u).n + ' · ' + x.u.k, x.d < 0 ? 'Terlewat ' + (-x.d) + ' hari' : x.d + ' hari lagi', x.d < 0 ? 'Lewat' : x.d + ' hari', x.d < 0 ? 'bad' : 'warn'));
  const lowRows = d.low.slice(0, 10).map(m => drow(m.n, 'Sisa ' + fmtQty(m.q) + ' ' + m.s + (m.lo ? ' · batas ' + fmtQty(m.lo) : ''), 'Menipis', 'warn'));
  return '<p class="note info" style="margin-bottom:10px">Dasbor baca saja. Data sama dengan Sheet, diperbarui otomatis tiap kali dibuka. Tekan kotak merah/kuning untuk lihat daftarnya.</p>' +
    '<div class="dkpi">' +
    dkpi(d.open.length, 'Sedang dipakai', 'dari ' + act.length + ' unit', 'info') +
    dkpi(d.noPlace.length, 'Mesin tanpa rak', d.empty.length + ' rak kosong', 'info') +
    '</div>' +
    '<div class="dkpi" style="margin-top:10px">' +
    dkpiOpen('late', d.late.length, 'Terlambat', 'lewat jam ' + (S.cfg.jamPulang || '17:00'), d.late.length ? 'bad' : 'info', lateRows.join(''), 'Tidak ada yang terlambat.') +
    dkpiOpen('broken', d.broken.length, 'Rusak / servis', '', d.broken.length ? 'warn' : 'info', brokenRows.join(''), 'Tidak ada mesin rusak.') +
    '</div>' +
    '<div class="dkpi" style="margin-top:10px">' +
    dkpiOpen('due', d.due.length, 'Servis jatuh tempo', 'dalam 7 hari', d.due.length ? 'warn' : 'info', dueRows.join(''), 'Tidak ada dalam 7 hari ke depan.') +
    dkpiOpen('low', d.low.length, 'Stok menipis', 'material', d.low.length ? 'warn' : 'info', lowRows.join(''), 'Tidak ada yang menipis.') +
    '</div>' +
    '<div style="margin:16px 0"><button class="btn ghost small" data-action="dasborprint">' + ic('print', 20) + 'Cetak ringkasan</button></div>';
}
