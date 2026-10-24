/* ---------- Penyimpanan: tempat (rak, lemari, kontainer) dengan QR sendiri (LOK-xxx) ---------- */
const placeIcon = () => '<span class="thumb ico">' + ic('box', 28) + '</span>';
function viewTempatList() {
  if (!S.loaded && !S.tempat.length) return '<p class="empty">' + (S.loadError ? 'Data belum bisa dimuat. Cek sinyal lalu buka lagi.' : 'Memuat…') + '</p>';
  return '<input id="pq" class="field" type="search" placeholder="Cari tempat penyimpanan" value="' + esc(S.tq || '') + '" autocomplete="off" aria-label="Cari tempat" style="margin-bottom:10px">' +
    '<p class="stats" id="tstats"></p>' + '<div id="rakbtn"></div>' + '<div class="jlist" id="tlist2"></div><div id="toff"></div>';
}
function placeCard(t) {
  const sm = placeSummary(t.id), pills = [];
  pills.push('<span class="pill rak">' + sm.units.length + ' mesin</span>');
  if (sm.out) pills.push('<span class="pill out">' + sm.out + ' di luar</span>');
  if (sm.mats.length) pills.push('<span class="pill unk">' + sm.mats.length + ' material</span>');
  if (sm.low) pills.push('<span class="pill warn">' + sm.low + ' menipis</span>');
  if (t.off) pills.push('<span class="pill unk">Nonaktif</span>');
  return '<button class="jcard" data-action="opentempat" data-id="' + esc(t.id) + '">' + placeIcon() + '<span class="nm"><span class="code">' + esc(t.id) + '</span><b>' + esc(t.n) + '</b>' +
    '<small>' + (esc(t.l) || '&nbsp;') + '</small><span class="pills">' + pills.join('') + '</span></span>' + ic('chev', 20) + '</button>';
}
function renderTempatList() {
  const el = $('#tlist2'); if (!el) return;
  const q = norm(S.tq || ''), list = activePlaces().filter(t => !q || norm(t.n + ' ' + t.l + ' ' + t.id).includes(q));
  const act = S.units.filter(u => !u.off), placed = act.filter(hasPlace).length;
  $('#tstats').textContent = activePlaces().length + ' tempat · ' + placed + ' mesin tersimpan · ' + (act.length - placed) + ' mesin belum punya tempat';
  el.innerHTML = list.length ? list.map(placeCard).join('') :
    '<p class="empty">' + (activePlaces().length ? 'Tidak ada tempat yang cocok.' : 'Belum ada tempat. Tekan Tempat baru, misalnya Rak 1 atau Lemari Kunci.') + '</p>';
  $('#rakbtn').innerHTML = S.tempat.some(t => norm(t.n) === 'rak 001') ? '' : '<a class="dashed" style="margin-bottom:10px" href="#" data-action="rakbuat">' + ic('plus', 20) + 'Buat Rak 001 sampai Rak 050</a>';
  const off = S.tempat.filter(t => t.off);
  $('#toff').innerHTML = off.length ? '<button class="btn ghost small block" style="margin-top:10px" data-action="toggleoff">' + (S.showOffT ? 'Sembunyikan' : 'Lihat') + ' tempat nonaktif (' + off.length + ')</button>' +
    (S.showOffT ? '<div class="jlist" style="margin-top:8px">' + off.map(placeCard).join('') + '</div>' : '') : '';
}

function viewTempat() {
  const t = T[S.tid];
  if (!t) return '<p class="empty">' + (S.loaded ? 'Tempat tidak ditemukan.' : 'Memuat…') + '</p>';
  const sm = placeSummary(t.id), held = heldMap();
  const mrow = u => { const j = jenisOf(u), h = held.get(u.k);
    const ln = unitLine(u);
    return '<button class="trow" data-action="openunit" data-k="' + esc(u.k) + '">' + thumbHtml(u.j, 22, 'sm') + '<span class="nm"><b>' + esc(ln.a) + '</b><small class="muted">' + esc(ln.b) + '</small></span>' +
      (h ? '<span class="pill ' + (isLate(h) ? 'late' : 'out') + '">Di luar · ' + esc(h.nama) + '</span>' : u.s === 'ok' ? '<span class="pill ok">Di tempat</span>' : '<span class="pill ' + u.s + '">' + esc(u.sl) + '</span>') + '</button>'; };
  const matrow = m => '<div class="trow mat"><span class="thumb sm">' + ic('layers', 22) + '</span><button class="nm lnkbtn" data-action="openmat" data-id="' + esc(m.id) + '"><b>' + esc(m.n) + '</b>' + (isLow(m) ? '<span class="pill warn">Menipis</span>' : '') + '</button>' +
    '<button class="rnd" data-action="stokopen" data-id="' + esc(m.id) + '" data-t="Keluar" aria-label="Kurangi ' + esc(m.n) + '">−</button><span class="qty"><b>' + esc(fmtQty(m.q)) + '</b><small>' + esc(m.s) + '</small></span>' +
    '<button class="rnd" data-action="stokopen" data-id="' + esc(m.id) + '" data-t="Masuk" aria-label="Tambah ' + esc(m.n) + '">+</button></div>';
  return (t.off ? '<p class="note warn" style="margin-bottom:10px">Tempat ini nonaktif. <button class="btn small ghost" style="display:inline-flex;min-height:36px;margin-left:6px" data-action="tempataktif" data-id="' + esc(t.id) + '">Aktifkan kembali</button></p>' : '') +
    '<div class="stat3"><div><b>' + sm.units.length + '</b><small>Mesin</small></div><div><b>' + sm.mats.length + '</b><small>Jenis material</small></div><div class="' + (sm.low ? 'lowc' : '') + '"><b>' + sm.low + '</b><small>Menipis</small></div></div>' +
    '<div class="two" style="margin:10px 0"><a class="btn ghost small" href="label.html?kode=' + esc(t.id) + '">' + ic('print', 20) + 'Cetak QR tempat</a><button class="btn ghost small" data-action="tempatedit" data-id="' + esc(t.id) + '">' + ic('edit', 20) + 'Ubah nama</button></div>' +
    '<h2 class="h2" style="margin-top:6px">Mesin</h2>' + (sm.units.length ? '<div class="tbox">' + sm.units.sort((a, b) => byName(jenisOf(a).n, jenisOf(b).n) || (Number(a.u) || 0) - (Number(b.u) || 0) || a.k.localeCompare(b.k)).map(mrow).join('') + '</div>' : '<p class="muted">Belum ada mesin di sini.</p>') +
    '<h2 class="h2">Material · stok</h2>' + (sm.mats.length ? '<div class="tbox">' + sm.mats.sort((a, b) => byName(a.n, b.n)).map(matrow).join('') + '</div>' : '<p class="muted">Belum ada material di sini.</p>') +
    '<div class="pbar"><button class="pbtn" data-action="tambahke" data-id="' + esc(t.id) + '">' + ic('plus', 22) + 'Tambah mesin atau material</button></div>';
}

/* ---------- Tambah mesin / material ke tempat ---------- */
function viewTambahTempat() {
  const t = T[S.tid];
  if (!t) return '<p class="empty">' + (S.loaded ? 'Tempat tidak ditemukan.' : 'Memuat…') + '</p>';
  const f = S.form || (S.form = { tab: 'mesin', q: '', filt: 'belum', sel: [], selM: [] });
  const tabs = [['mesin', 'Mesin'], ['material', 'Material']].map(([k, l]) => '<button role="tab" data-action="atab" data-t="' + k + '" aria-selected="' + (f.tab === k) + '">' + l + '</button>').join('');
  return '<div class="utabs" role="tablist">' + tabs + '</div>' +
    '<div class="two1"><input id="aq" class="field" type="search" placeholder="' + (f.tab === 'mesin' ? 'Cari mesin atau kode' : 'Cari material') + '" value="' + esc(f.q) + '" autocomplete="off" aria-label="Cari">' +
    (f.tab === 'mesin' ? '<button class="btn ghost small" data-action="ascan">' + ic('qr', 20) + 'Scan</button>' : '') + '</div>' +
    '<div class="fchips" id="achips"></div><div id="alist"></div><p class="muted" style="font-size:13px;margin:8px 0 0">Satu mesin hanya punya satu tempat. Pemindahan tercatat di Log Perubahan.</p>' +
    '<div class="pbar two" id="abar"></div>';
}
function renderTambahTempat() {
  const f = S.form, t = T[S.tid]; if (!f || !t || !$('#alist')) return;
  const q = norm(f.q), isM = f.tab === 'material';
  const items = isM ? allMaterial().filter(m => !m.off) : S.units.filter(u => !u.off);
  const unplaced = x => isM ? !x.loc || !T[x.loc] : !hasPlace(x);
  const nBelum = items.filter(unplaced).length;
  $('#achips').innerHTML = [['belum', 'Belum punya tempat · ' + nBelum], ['semua', isM ? 'Semua material' : 'Semua mesin']].map(([v, l]) => '<button class="fchip" data-action="afilt" data-f="' + v + '" aria-pressed="' + (f.filt === v) + '">' + l + '</button>').join('');
  const sel = isM ? f.selM : f.sel;
  let rows = items.filter(x => (f.filt === 'semua' || unplaced(x) || sel.includes(isM ? x.id : x.k)) && (!q || norm(isM ? [x.n, x.b, x.c, x.id].join(' ') : [jenisOf(x).n, jenisOf(x).b, jenisOf(x).m, x.k].join(' ')).includes(q)));
  rows = rows.sort((a, b) => isM ? byName(a.n, b.n) : byName(jenisOf(a).n, jenisOf(b).n) || a.k.localeCompare(b.k)).slice(0, 300);
  $('#alist').innerHTML = rows.length ? '<div class="tbox">' + rows.map(x => {
    const id = isM ? x.id : x.k, on = sel.includes(id), cur = isM ? x.loc : x.loc, other = cur && cur !== t.id && T[cur] ? T[cur].n : '';
    return '<button class="selrow' + (on ? ' on' : '') + '" data-action="' + (isM ? 'selmat' : 'selunit') + '" data-k="' + esc(id) + '" aria-pressed="' + on + '"><span class="cb">' + (on ? ic('check', 18) : '') + '</span>' +
      (isM ? '<span class="thumb sm">' + ic('layers', 22) + '</span>' : thumbHtml(x.j, 22, 'sm')) +
      '<span class="nm"><span class="code">' + esc(id) + '</span><b>' + esc(isM ? x.n : jenisOf(x).n + ' · Unit ' + x.u) + '</b>' +
      (cur === t.id ? '<small>Sudah di ' + esc(t.n) + '.</small>' : other ? '<small class="warnt">Sekarang di ' + esc(other) + '. Akan dipindah.</small>' : '') + '</span></button>';
  }).join('') + '</div>' : '<p class="empty">' + (f.filt === 'belum' ? 'Semua sudah punya tempat. Pilih "Semua" untuk memindahkan.' : 'Tidak ada yang cocok.') + '</p>';
  const nU = f.sel.length, nM = f.selM.length, n = nU + nM;
  $('#abar').innerHTML = '<button class="no" data-action="back">Batal</button><button class="yes" data-action="asave"' + (n ? '' : ' disabled') + '>' +
    (n ? 'Simpan ' + [nU ? nU + ' mesin' : '', nM ? nM + ' material' : ''].filter(Boolean).join(' dan ') + ' ke ' + esc(t.n) : 'Pilih dulu') + '</button>';
}
function saveTambahTempat() {
  const f = S.form, t = T[S.tid]; if (!f || !t || !(f.sel.length + f.selM.length)) return;
  callEdit('setTempat', { tempat: t.id, kodes: f.sel, mats: f.selM }, r => 'Disimpan ke ' + t.n + ': ' + r.units + ' mesin dipindah' + (r.mats ? ', ' + r.mats + ' material' : '') + '.');
}

/* ---------- tempat baru / ubah tempat ---------- */
function viewTempatForm() {
  const t = S.tid ? T[S.tid] : null;
  if (S.tid && !t) return '<p class="empty">' + (S.loaded ? 'Tempat tidak ditemukan.' : 'Memuat…') + '</p>';
  const lokasi = [...new Set(S.tempat.map(x => x.l).filter(Boolean))].sort(byName);
  return '<div class="stack"><section class="card"><h3>' + (t ? t.id : 'Tempat baru') + '</h3><div class="stack">' +
    '<p class="note info">' + (t ? 'Kode ' + esc(t.id) + ' tidak berubah, jadi QR yang sudah dicetak tetap berlaku.' : 'Kode LOK dibuat otomatis. Setelah disimpan, QR tempat bisa dicetak.') + '</p>' +
    fld('pnama', 'Nama tempat', t ? t.n : '', { ph: 'contoh: Rak 1' }) +
    fld('plokasi', 'Lokasi (boleh kosong)', t ? t.l : '', { ph: 'contoh: Gudang A', list: 'lokasiList' }) + '<datalist id="lokasiList">' + lokasi.map(l => '<option value="' + esc(l) + '">').join('') + '</datalist>' +
    '<button class="btn" data-action="tempatsave">Simpan</button></div></section>' +
    (t ? '<section class="card"><h3>' + (t.off ? 'Tempat nonaktif' : 'Nonaktifkan tempat') + '</h3>' + (t.off ? '<button class="btn ghost" data-action="tempataktif" data-id="' + esc(t.id) + '">Aktifkan kembali</button>' :
      '<p class="muted" style="margin:0 0 10px;font-size:15px">Untuk tempat yang sudah tidak dipakai. Hanya bisa kalau tempat ini sudah kosong. Kodenya tidak dipakai ulang.</p><button class="btn ghost redo" data-action="tempatoff" data-id="' + esc(t.id) + '" data-confirm="Ya, nonaktifkan">Nonaktifkan</button>') + '</section>' : '') + '</div>';
}
function saveTempat() {
  const n = clean(val('pnama')), l = clean(val('plokasi'));
  if (!n) { toast('Isi nama tempat.'); return; }
  if (S.tid) callEdit('editTempat', { id: S.tid, nama: n, lokasi: l }, r => r.changed ? 'Tempat diubah.' : 'Tidak ada yang berubah.');
  else callEdit('addTempat', { nama: n, lokasi: l }, r => 'Tempat dibuat: ' + r.id, r => go('tempat', { tid: r.id, replace: true }));
}
