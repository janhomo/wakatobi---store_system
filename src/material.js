/* ---------- Material: bahan habis pakai dengan stok (MAT-xxx) ---------- */
const matIcon = () => '<span class="thumb ico">' + ic('layers', 26) + '</span>';
function matCats() { return [...new Set(S.material.filter(m => !m.off).map(m => m.c).filter(Boolean))].sort(byName); }
function viewMaterial() {
  if (!S.loaded && !S.material.length) return '<p class="empty">' + (S.loadError ? 'Data belum bisa dimuat. Cek sinyal lalu buka lagi.' : 'Memuat…') + '</p>';
  return '<input id="mq" class="field" type="search" placeholder="Cari material" value="' + esc(S.mqq || '') + '" autocomplete="off" aria-label="Cari material" style="margin-bottom:10px">' +
    '<div class="fchips" id="mchips" role="group" aria-label="Kategori"></div><p class="stats" id="mstats"></p><div class="mlistw" id="mlist"></div><div id="moff"></div>';
}
function matRow(m) {
  const t = isLok(m.loc) ? T[m.loc] : null;
  return '<button class="mrow2" data-action="stokopen" data-id="' + esc(m.id) + '" aria-label="Ubah stok ' + esc(m.n) + '">' + matIcon() +
    '<span class="nm"><b>' + esc(m.n) + '</b><small>' + esc([m.b, m.c, t ? t.n : ''].filter(Boolean).join(' · ') || m.id) + '</small>' +
    (isLow(m) ? '<span class="pills"><span class="pill warn">Menipis</span></span>' : '') + (m.pj > 0 ? '<span class="pills"><span class="pill warn">Dipinjam ' + esc(fmtQty(m.pj)) + '</span></span>' : '') + (m.off ? '<span class="pills"><span class="pill unk">Nonaktif</span></span>' : '') + '</span>' +
    '<span class="qty' + (isLow(m) ? ' low' : '') + '"><b>' + esc(fmtQty(m.q)) + '</b><small>' + esc(m.s) + (m.pending ? ' · menunggu' : '') + '</small></span></button>';
}
function renderMatList() {
  const el = $('#mlist'); if (!el) return;
  const all = allMaterial(), cats = matCats(), q = norm(S.mqq || ''), cat = S.mcat || '';
  const act = all.filter(m => !m.off), low = act.filter(isLow).length;
  $('#mchips').innerHTML = [['', 'Semua']].concat(cats.map(c => [c, c])).map(([v, l]) => '<button class="fchip" data-action="mcat" data-c="' + esc(v) + '" aria-pressed="' + (cat === v) + '">' + esc(l) + '</button>').join('');
  $('#mstats').textContent = act.length + ' jenis · ' + low + ' menipis · ketuk untuk mengubah stok';
  const rows = act.filter(m => (!cat || m.c === cat) && (!q || norm([m.n, m.b, m.c, m.id].join(' ')).includes(q))).sort((a, b) => (isLow(b) - isLow(a)) || byName(a.n, b.n));
  el.innerHTML = rows.length ? rows.map(matRow).join('') : '<p class="empty">' + (act.length ? 'Tidak ada material yang cocok.' : 'Belum ada material. Tekan Material baru.') + '</p>';
  const off = all.filter(m => m.off);
  $('#moff').innerHTML = off.length ? '<button class="btn ghost small block" style="margin-top:10px" data-action="toggleoffm">' + (S.showOffM ? 'Sembunyikan' : 'Lihat') + ' material nonaktif (' + off.length + ')</button>' +
    (S.showOffM ? '<div class="mlistw" style="margin-top:8px">' + off.map(matRow).join('') + '</div>' : '') : '';
}

/* ---------- detail material ---------- */
function viewMat() {
  const m = allMaterial().find(x => x.id === S.mid);
  if (!m) return '<p class="empty">' + (S.loaded ? 'Material tidak ditemukan.' : 'Memuat…') + '</p>';
  const t = isLok(m.loc) ? T[m.loc] : null, row = (l, v) => '<div class="drow"><dt>' + l + '</dt><dd>' + v + '</dd></div>';
  return '<div class="matbig"><span class="qn' + (isLow(m) ? ' low' : '') + '">' + esc(fmtQty(m.q)) + '</span><span class="qs">' + esc(m.s) + (m.pending ? ' · menunggu terkirim' : '') + '</span>' +
    '<div class="pills" style="justify-content:center">' + (isLow(m) ? '<span class="pill warn">Menipis</span>' : '<span class="pill ok">Stok cukup</span>') + (m.off ? '<span class="pill unk">Nonaktif</span>' : '') + '</div></div>' +
    (m.pj > 0 ? '<p class="note warn" style="margin:0 0 12px">Dipinjam, belum dikembalikan: <b>' + esc(fmtQty(m.pj)) + ' ' + esc(m.s) + '</b></p>' : '') +
    (m.off ? '' : '<div class="two" style="margin:12px 0"><button class="btn" data-action="stokopen" data-id="' + esc(m.id) + '" data-t="Keluar">' + ic('minus', 20) + 'Kurangi</button><button class="btn ghost" data-action="stokopen" data-id="' + esc(m.id) + '" data-t="Masuk">' + ic('plus', 20) + 'Tambah</button></div>') +
    (m.off ? '' : '<div class="two"><button class="btn ghost small" data-action="stokopen" data-id="' + esc(m.id) + '" data-t="Pinjam">' + ic('minus', 20) + 'Dipinjam</button><button class="btn ghost small" data-action="stokopen" data-id="' + esc(m.id) + '" data-t="Kembali">' + ic('plus', 20) + 'Dikembalikan</button></div>') +
    '<dl class="dl">' + row('Kode', '<span class="code">' + esc(m.id) + '</span>') + row('Kategori', esc(m.c) || '—') + row('Merek', esc(m.b) || '—') + row('Satuan', esc(m.s)) +
    row('Batas menipis', m.lo ? esc(fmtQty(m.lo)) + ' ' + esc(m.s) : 'Tidak diatur') + row('Tempat', t ? '<button class="ulink" data-action="opentempat" data-id="' + esc(t.id) + '">' + esc(t.n) + '</button>' : 'Belum punya tempat') + '</dl>' +
    '<div class="two" style="margin-top:12px"><button class="btn ghost small" data-action="matedit">' + ic('edit', 20) + 'Ubah data</button><a class="btn ghost small" href="label.html?kode=' + esc(m.id) + '">' + ic('print', 20) + 'Cetak label QR</a></div>' +
    '<h2 class="h2">Riwayat stok</h2><div id="live-stoklog">' + liveStokLog() + '</div>';
}
async function loadStokLog() {
  const key = S.mid; if (!key) return;
  S.sl = { key, list: null, error: false }; const el = $('#live-stoklog'); if (el) el.innerHTML = liveStokLog();
  try { const j = await api('stokLog', { id: key }); if (S.sl.key === key) S.sl.list = j.log; }
  catch (e) { if (S.sl.key === key) { S.sl.list = []; S.sl.error = true; } }
  const el2 = $('#live-stoklog'); if (el2) el2.innerHTML = liveStokLog();
}
function liveStokLog() {
  const key = S.mid, pend = Q.items.filter(i => i.action === 'stok' && i.payload.mat === key);
  if (!S.sl || S.sl.key !== key || S.sl.list === null) return '<p class="muted">Memuat…</p>';
  const m = M[key], u = m ? m.s : '';
  const line = (tipe, j, q, o, t, cat, wait) => {
    const neg = tipe === 'Keluar' || tipe === 'Pinjam', pos = tipe === 'Masuk' || tipe === 'Kembali', cls = neg ? 'Keluar' : pos ? 'Masuk' : 'Koreksi';
    return '<li><span class="sg ' + cls + '">' + (neg ? '−' : pos ? '+' : '=') + esc(fmtQty(j)) + '</span><span class="tx"><b>' + esc(tipe === 'Koreksi' ? 'Koreksi jadi ' + fmtQty(j) : tipe) + ' ' + esc(u) + '</b><br><small class="muted">' + esc(o || '—') + ' · ' + esc(fmtDT(t)) + (q !== null ? ' · sisa ' + esc(fmtQty(q)) : '') + (wait ? ' · menunggu terkirim' : '') + (cat ? ' · ' + esc(cat) : '') + '</small></span></li>';
  };
  let h = pend.map(i => line(i.payload.tipe, i.payload.jumlah, null, i.payload.nama, i.payload.waktu, i.payload.cat, true)).join('');
  if (S.sl.error) h += '<li class="muted">Riwayat belum bisa dimuat. Cek sinyal.</li>';
  else h += S.sl.list.map(r => line(r.tipe, r.j, r.q, r.o, r.t, r.cat, false)).join('');
  return h ? '<ul class="slog">' + h + '</ul>' : '<p class="muted">Belum ada pergerakan stok.</p>';
}

/* ---------- lembar ubah stok ---------- */
function stokMat() { return S.stokEd ? allMaterial().find(m => m.id === S.stokEd.mat) : null; }
function openStok(id, tipe) {
  if (S.ov.includes('stok')) return;
  const m = allMaterial().find(x => x.id === id); if (!m) return;
  if (m.off) { toast('Material ini nonaktif.'); return; }
  S.stokEd = { mat: id, tipe: tipe || 'Keluar', jumlah: '1', cat: '', nama: lsGet('qrg.stokNama', '') || S.me || '' };
  $('#stokSheet').hidden = false; pushOv('stok'); renderStok();
}
const stokNum = () => { const v = Number(String(S.stokEd.jumlah).replace(',', '.')); return isFinite(v) ? v : NaN; };
const STOK_KURANG = ['Keluar', 'Pinjam'], STOK_TAMBAH = ['Masuk', 'Kembali'];
function stokAfter(m) {
  const f = S.stokEd, j = stokNum();
  if (!(j >= 0)) return NaN;
  if (STOK_KURANG.includes(f.tipe)) return Math.round((m.q - j) * 1000) / 1000;
  if (STOK_TAMBAH.includes(f.tipe)) return Math.round((m.q + j) * 1000) / 1000;
  return j;
}
function stokBtnText(m) {
  const f = S.stokEd, j = stokNum(), n = isFinite(j) ? fmtQty(j) : '…';
  if (f.tipe === 'Keluar') return 'Kurangi ' + n + ' ' + m.s;
  if (f.tipe === 'Masuk') return 'Tambah ' + n + ' ' + m.s;
  if (f.tipe === 'Pinjam') return 'Catat dipinjam ' + n + ' ' + m.s;
  if (f.tipe === 'Kembali') return 'Catat dikembalikan ' + n + ' ' + m.s;
  return 'Setel stok jadi ' + n + ' ' + m.s;
}
function stokPreview() {
  const f = S.stokEd, m = stokMat(); if (!f || !m || !$('#stokAfter')) return;
  const a = stokAfter(m), j = stokNum();
  const bad = !(j >= 0) || (f.tipe !== 'Koreksi' && !(j > 0)) || (STOK_KURANG.includes(f.tipe) && a < 0) || !f.nama;
  $('#stokAfter').innerHTML = 'Sisa stok setelah ini: <b class="' + (a < 0 ? 'neg' : isLow({ ...m, q: a }) ? 'lowt' : '') + '">' + (isFinite(a) ? esc(fmtQty(a)) : '—') + ' ' + esc(m.s) + '</b>' +
    (STOK_KURANG.includes(f.tipe) && a < 0 ? '<br><small class="neg">Stok tidak cukup. Sekarang ' + esc(fmtQty(m.q)) + ' ' + esc(m.s) + '.</small>' : '');
  const b = $('#stokGo'); b.textContent = stokBtnText(m); b.disabled = bad;
}
function renderStok() {
  const f = S.stokEd; if (!f) return;
  const m = stokMat(); if (!m) { closeTop(); return; }
  const segLabel = { Keluar: 'Keluar', Masuk: 'Masuk', Pinjam: 'Dipinjam', Kembali: 'Dikembalikan', Koreksi: 'Koreksi' };
  const seg = ['Keluar', 'Masuk', 'Pinjam', 'Kembali', 'Koreksi'].map(t => '<button role="tab" data-action="stoktipe" data-t="' + t + '" aria-selected="' + (f.tipe === t) + '">' + esc(segLabel[t]) + '</button>').join('');
  const siapaQ = { Keluar: 'Siapa yang mengambil?', Masuk: 'Siapa yang menerima?', Pinjam: 'Siapa yang meminjam (boleh nama resort/orangnya)?', Kembali: 'Siapa yang mengembalikan (boleh nama resort/orangnya)?', Koreksi: 'Siapa yang menghitung?' }[f.tipe];
  $('#stokSheet').innerHTML = '<button class="dbg" data-action="stokclose" aria-label="Tutup"></button><section class="fsheet" role="dialog" aria-label="Ubah stok"><div class="grab"></div>' +
    '<div class="sh-row"><div class="sh-t">' + esc(m.n) + '</div><button class="x" data-action="stokclose" aria-label="Tutup">' + ic('x', 22) + '</button></div><p class="muted" style="margin:-6px 0 0;font-size:14px"><span class="code">' + esc(m.id) + '</span> · stok sekarang <b>' + esc(fmtQty(m.q)) + ' ' + esc(m.s) + '</b>' + (m.b ? ' · ' + esc(m.b) : '') + '</p>' +
    (m.pj > 0 ? '<p class="note warn" style="margin:4px 0 0">Dipinjam, belum dikembalikan: <b>' + esc(fmtQty(m.pj)) + ' ' + esc(m.s) + '</b></p>' : '') +
    '<div class="utabs" role="tablist">' + seg + '</div>' +
    '<div><label class="lbl" for="stokJ">' + (f.tipe === 'Koreksi' ? 'Stok yang benar (hasil hitung)' : 'Jumlah (' + esc(m.s) + ')') + '</label><div class="stepper"><button class="rnd big" data-action="stokstep" data-d="-1" aria-label="Kurangi satu">−</button>' +
    '<input id="stokJ" class="field" type="text" inputmode="decimal" value="' + esc(f.jumlah) + '" autocomplete="off" aria-label="Jumlah"><button class="rnd big" data-action="stokstep" data-d="1" aria-label="Tambah satu">+</button></div></div>' +
    (f.tipe === 'Koreksi' ? '' : '<div class="fchips qchips">' + [1, 5, 10, 25, 50].map(n => '<button class="fchip" data-action="stokq" data-n="' + n + '">' + n + '</button>').join('') + '</div>') +
    '<div><label class="lbl">' + esc(siapaQ) + '</label><button type="button" class="namebar' + (f.nama ? '' : ' need') + '" data-action="stoknama"><span class="g">' + (f.nama ? esc(f.nama) : 'Pilih nama pekerja') + '</span>' + ic('chev', 18) + '</button></div>' +
    '<div><label class="lbl" for="stokC">Catatan (boleh kosong)</label><input id="stokC" class="field" type="text" value="' + esc(f.cat) + '" autocomplete="off" placeholder="contoh: untuk lantai 2"></div>' +
    '<p class="after" id="stokAfter"></p>' +
    '<button class="btn" id="stokGo" data-action="stokgo">…</button>' +
    '<button class="btn ghost small" data-action="openmat" data-id="' + esc(m.id) + '">Detail dan riwayat stok</button></section>';
  stokPreview();
}
function stokSubmit() {
  const f = S.stokEd, m = stokMat(); if (!f || !m) return;
  const j = stokNum(), a = stokAfter(m);
  if (!f.nama) { toast('Pilih nama pekerja dulu.'); return; }
  if (!(j >= 0) || (f.tipe !== 'Koreksi' && !(j > 0))) { toast('Isi jumlah dengan angka.'); return; }
  if (STOK_KURANG.includes(f.tipe) && a < 0) { toast('Stok tidak cukup.'); return; }
  lsSet('qrg.stokNama', f.nama);
  enqueue('stok', { id: uid(), mat: m.id, tipe: f.tipe, jumlah: j, nama: f.nama, cat: clean(f.cat), waktu: nowIso() });
  const txt = f.tipe === 'Keluar' ? 'Dikurangi ' + fmtQty(j) + ' ' + m.s : f.tipe === 'Masuk' ? 'Ditambah ' + fmtQty(j) + ' ' + m.s :
    f.tipe === 'Pinjam' ? 'Dicatat dipinjam ' + fmtQty(j) + ' ' + m.s : f.tipe === 'Kembali' ? 'Dicatat dikembalikan ' + fmtQty(j) + ' ' + m.s : 'Stok disetel ' + fmtQty(j) + ' ' + m.s;
  closeTop(); toast(txt + '. Sisa ' + fmtQty(a) + '.'); refresh();
}

/* ---------- material baru / ubah ---------- */
function viewMatForm() {
  const m = S.mid ? M[S.mid] : null;
  if (S.mid && !m) return '<p class="empty">' + (S.loaded ? 'Material tidak ditemukan.' : 'Memuat…') + '</p>';
  const cats = matCats(), mereks = [...new Set(S.material.map(x => x.b).filter(Boolean))].sort(byName), sat = [...new Set(S.material.map(x => x.s).filter(Boolean))].sort(byName);
  const dl = (id, l) => '<datalist id="' + id + '">' + l.map(x => '<option value="' + esc(x) + '">').join('') + '</datalist>';
  const f = S.form || {};
  return '<div class="stack"><section class="card"><h3>' + (m ? m.id : 'Material baru') + '</h3><div class="stack">' +
    fld('mnama', 'Nama material', m ? m.n : '', { ph: 'contoh: Kabel NYM 3x2.5' }) +
    fld('mkat', 'Kategori (boleh kosong)', m ? m.c : '', { ph: 'contoh: Listrik', list: 'mkatList' }) + dl('mkatList', cats) +
    fld('mmerek', 'Merek (boleh kosong)', m ? m.b : '', { list: 'mmerekList' }) + dl('mmerekList', mereks) +
    fld('msat', 'Satuan', m ? m.s : '', { ph: 'contoh: meter, sak, kg, buah', list: 'msatList' }) + dl('msatList', sat) +
    (m ? '<p class="note info">Stok sekarang ' + esc(fmtQty(m.q)) + ' ' + esc(m.s) + '. Stok diubah lewat tombol Kurangi, Tambah, atau Koreksi, supaya tercatat.</p>' : fld('mstok', 'Stok awal', '', { mode: 'decimal', ph: '0' })) +
    fld('mbatas', 'Batas menipis (boleh kosong)', m && m.lo ? m.lo : '', { mode: 'decimal', ph: 'Tandai menipis kalau stok sama dengan atau di bawah angka ini' }) +
    placeField('mloc', m ? m.loc : (f.loc || '')) +
    '<button class="btn" data-action="matsave">Simpan</button></div></section>' +
    (m ? '<section class="card"><h3>' + (m.off ? 'Material nonaktif' : 'Nonaktifkan material') + '</h3>' + (m.off ? '<button class="btn ghost" data-action="matonoff" data-off="0">Aktifkan kembali</button>' :
      '<p class="muted" style="margin:0 0 10px;font-size:15px">Untuk material yang tidak dipakai lagi. Riwayat stok tetap tersimpan. Kodenya tidak dipakai ulang.</p><button class="btn ghost redo" data-action="matonoff" data-off="1" data-confirm="Ya, nonaktifkan">Nonaktifkan</button>') + '</section>' : '') + '</div>';
}
function saveMat() {
  const n = clean(val('mnama')), s = clean(val('msat'));
  if (!n) { toast('Isi nama material.'); return; }
  if (!s) { toast('Isi satuan, misalnya meter atau sak.'); return; }
  const bad = ['mstok', 'mbatas'].find(id => { const v = clean(val(id)); return v !== '' && !(Number(v.replace(',', '.')) >= 0); });
  if (bad) { toast('Isi angka 0 atau lebih.'); return; }
  const c = clean(val('mkat')), b = clean(val('mmerek')), loc = clean(val('mloc'));
  if (S.mid) callEdit('editMaterial', { id: S.mid, f: { n, c, b, s, lo: clean(val('mbatas')), loc } }, r => r.changed ? 'Material diubah.' : 'Tidak ada yang berubah.');
  else callEdit('addMaterial', { nama: n, kategori: c, merek: b, satuan: s, stok: clean(val('mstok')), batas: clean(val('mbatas')), tempat: loc }, r => 'Material dibuat: ' + r.id, r => go('mat', { mid: r.id, replace: true }));
}
