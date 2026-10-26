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
  return '<p class="note info" style="margin-bottom:10px">Dasbor baca saja. Data sama dengan Sheet, diperbarui otomatis tiap kali dibuka.</p>' +
    '<div class="dkpi">' +
    dkpi(d.open.length, 'Sedang dipakai', 'dari ' + act.length + ' unit', 'info') +
    dkpi(d.late.length, 'Terlambat', 'lewat jam ' + (S.cfg.jamPulang || '17:00'), d.late.length ? 'bad' : 'info') +
    dkpi(d.broken.length, 'Rusak / servis', '', d.broken.length ? 'warn' : 'info') +
    dkpi(d.due.length, 'Servis jatuh tempo', 'dalam 7 hari', d.due.length ? 'warn' : 'info') +
    dkpi(d.noPlace.length, 'Mesin tanpa rak', d.empty.length + ' rak kosong', 'info') +
    dkpi(d.low.length, 'Stok menipis', 'material', d.low.length ? 'warn' : 'info') +
    '</div>' +
    '<div style="margin:12px 0"><button class="btn ghost small" data-action="dasborprint">' + ic('print', 20) + 'Cetak ringkasan</button></div>' +
    '<h2 class="h2">Belum kembali · ' + d.open.length + '</h2>' + (lateRows.length || d.open.length ? '<div class="tbox">' + (lateRows.join('') || '<div class="trow"><span class="nm"><b>Tidak ada yang terlambat.</b></span></div>') + '</div>' : '<p class="muted">Tidak ada mesin di luar.</p>') +
    '<h2 class="h2">Rusak / servis · ' + d.broken.length + '</h2>' + (brokenRows.length ? '<div class="tbox">' + brokenRows.join('') + '</div>' : '<p class="muted">Tidak ada.</p>') +
    '<h2 class="h2">Servis jatuh tempo · ' + d.due.length + '</h2>' + (dueRows.length ? '<div class="tbox">' + dueRows.join('') + '</div>' : '<p class="muted">Tidak ada dalam 7 hari ke depan.</p>') +
    '<h2 class="h2">Stok menipis · ' + d.low.length + '</h2>' + (lowRows.length ? '<div class="tbox">' + lowRows.join('') + '</div>' : '<p class="muted">Tidak ada yang menipis.</p>');
}
