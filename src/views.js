/* ---------- kerangka: header, navigasi, sinkron ---------- */
function hdrInfo() {
  const j = J[curJid()];
  switch (S.view) {
    case 'mesin': return { root: 1, title: 'Mesin', sub: S.loaded ? S.jenis.length + ' jenis · ' + S.units.filter(u => !u.off).length + ' unit' : 'Memuat…' };
    case 'hari': return { root: 1, title: 'Hari Ini', sub: fmtDate(today()) };
    case 'jenis': return { title: j ? j.n : 'Mesin', sub: j ? subText(j) : '', right: j ? { a: 'jedit', i: 'edit', l: 'Ubah jenis' } : null };
    case 'unit': { const u = U[S.kode]; return { title: u ? u.k : 'Unit', sub: u ? unitTitle(u) : '' }; }
    case 'jedit': return { title: 'Ubah jenis', sub: j ? j.n : '' };
    case 'tambah': return { title: 'Mesin baru', sub: 'Tambah unit' };
    case 'riwayat': return { root: 1, title: 'Riwayat', sub: S.rwDate ? fmtShort(S.rwDate) : 'Per tanggal' };
    case 'pekerja': return { root: 1, title: 'Pekerja', sub: S.pekerja.length + ' nama' };
    case 'log': return { root: 1, title: 'Log perubahan', sub: 'Siapa mengubah apa' };
    case 'merek': return { root: 1, title: 'Merek', sub: merekList().length + ' merek' };
  }
  return { title: 'QR Aset Gudang', sub: '' };
}
function renderChrome() {
  const h = hdrInfo(), hdr = $('#hdr'); if (!hdr) return;
  hdr.innerHTML = (h.root ? '<button class="hbtn" data-action="menu" aria-label="Buka menu">' + ic('menu', 26) + '</button>' : '<button class="hbtn" data-action="back" aria-label="Kembali">' + ic('back', 26) + '</button>') +
    '<div class="htitle"><b>' + esc(h.title) + '</b><small>' + esc(h.sub || '') + '</small></div>' +
    (h.right ? '<button class="hbtn" data-action="' + h.right.a + '" aria-label="' + esc(h.right.l) + '">' + ic(h.right.i, 24) + '</button>' : '');
  const showNav = ['mesin', 'jenis', 'hari'].includes(S.view);
  $('#bnav').hidden = !showNav; $('#app').classList.toggle('nonav', !showNav);
  $('#fab').hidden = S.view !== 'mesin' || !S.loaded;
  const cur = S.view === 'hari' ? 'hari' : 'mesin';
  $('#nvMesin').setAttribute('aria-current', cur === 'mesin' ? 'page' : 'false');
  $('#nvHari').setAttribute('aria-current', cur === 'hari' ? 'page' : 'false');
  const open = openEntries(), late = open.filter(isLate).length, b = $('#hariBadge');
  b.hidden = !open.length; b.textContent = open.length; b.className = 'badge' + (late ? '' : ' soft');
  const el = $('#sync'), n = Q.items.length;
  let msg = '';
  if (!API_URL || API_URL.includes('PASTE')) msg = 'Server belum diatur (config.js).';
  else if (n) msg = n + ' catatan menunggu terkirim (cek sinyal)';
  else if (S.loadError === 'network') msg = 'Tidak ada sinyal. Data terakhir yang tersimpan ditampilkan.';
  el.textContent = msg; el.hidden = !msg;
  if (!$('#drawer').hidden) renderDrawer();
}

/* ---------- menu samping ---------- */
function renderDrawer() {
  const cur = S.view, open = openEntries().length;
  const it = (v, i, l, extra) => '<button class="it" data-action="dgo" data-view="' + v + '"' + (cur === v ? ' aria-current="page"' : '') + '>' + ic(i, 24) + '<span>' + l + '</span>' + (extra || '') + '</button>';
  $('#drawer').innerHTML = '<button class="dbg" data-action="dclose" aria-label="Tutup menu"></button><aside role="dialog" aria-label="Menu">' +
    '<div class="dh"><img src="logo-gelap.png" alt="Wakatobi Project Villa" width="168" height="117"><small>QR Aset Gudang · Construction site</small></div>' +
    '<nav>' +
    '<div class="sec">Utama</div>' + it('mesin', 'grid', 'Mesin') + it('hari', 'clock', 'Hari Ini', open ? '<span class="cnt">' + open + '</span>' : '') + it('riwayat', 'list', 'Riwayat') +
    '<div class="sec">Data</div>' + it('merek', 'tag', 'Merek') + it('pekerja', 'users', 'Pekerja') + it('log', 'doc', 'Log perubahan') +
    '<a class="it" href="label.html">' + ic('qr', 24) + '<span>Cetak label QR</span></a>' +
    '</nav><div class="foot">' +
    '<button class="it" data-action="dme">' + ic('user', 24) + '<span>Nama saya: ' + (S.me ? esc(S.me) : '<i>belum dipilih</i>') + '</span></button>' +
    '<button class="it" data-action="dreload">' + ic('refresh', 24) + '<span>Muat ulang data</span></button>' +
    '<button class="it bad" data-action="logout">' + ic('logout', 24) + '<span>Keluar</span></button>' +
    '</div></aside>';
}
function openDrawer() { if (S.ov.includes('drawer')) return; renderDrawer(); $('#drawer').hidden = false; pushOv('drawer'); }

/* ---------- render ---------- */
const VIEWS = () => ({ mesin: viewMesin, jenis: viewJenis, unit: viewUnit, jedit: viewJedit, tambah: viewTambah, hari: viewHari, riwayat: viewRiwayat, pekerja: viewWorkers, log: viewLog, merek: viewMerek });
function render() {
  const f = VIEWS()[S.view] || viewMesin;
  $('#app').innerHTML = f();
  renderChrome(); renderLive();
}
function renderLive() {
  const set = (id, html) => { const el = $('#' + id); if (el) el.innerHTML = html; };
  if (S.view === 'mesin') { if (!!$('#jlist') !== !!S.jenis.length) { $('#app').innerHTML = viewMesin(); } renderJlist(); }
  else if (S.view === 'hari') set('live-hari', liveHari());
  else if (S.view === 'riwayat') set('live-rw', liveRw());
  else if (S.view === 'pekerja') set('live-names', liveNames());
  else if (S.view === 'unit') set('live-maint', liveMaint());
  else if (S.view === 'log') set('live-log', liveLog());
}
/* dipanggil setelah data baru datang: form yang sedang diisi tidak boleh terhapus */
function refresh() {
  if (S.view === 'jenis') $('#app').innerHTML = viewJenis();
  else renderLive();
  renderChrome();
  if (S.scan) renderScan();
}

/* ---------- Mesin: daftar per jenis ---------- */
const FILTERS = [['', 'Semua'], ['tersedia', 'Tersedia'], ['luar', 'Di luar'], ['rusak', 'Rusak'], ['servis', 'Servis'], ['off', 'Nonaktif']];
function jstats(jid, held) {
  const st = { total: 0, ok: 0, out: 0, bad: 0, warn: 0, off: 0 };
  (JU[jid] || []).forEach(u => {
    if (u.off) { st.off++; return; }
    st.total++;
    const out = held.has(u.k);
    if (out) st.out++;
    if (u.s === 'bad') st.bad++; else if (u.s === 'warn') st.warn++;
    if (!out && u.s !== 'bad') st.ok++;
  });
  return st;
}
function pillsOf(st) {
  let h = '<span class="pill rak">' + st.total + ' unit</span>';
  if (st.ok) h += '<span class="pill ok">' + st.ok + ' tersedia</span>';
  if (st.out) h += '<span class="pill out">' + st.out + ' di luar</span>';
  if (st.bad) h += '<span class="pill bad">' + st.bad + ' rusak</span>';
  if (st.warn) h += '<span class="pill warn">' + st.warn + ' servis</span>';
  if (st.off) h += '<span class="pill unk">' + st.off + ' nonaktif</span>';
  return h;
}
function viewMesin() {
  if (!S.jenis.length) {
    return '<p class="empty" id="jempty">' + (!S.loaded ? (S.loadError === 'config' ? 'Server belum diatur. Isi alamat di config.js.' : S.loadError ? 'Data belum bisa dimuat. Cek sinyal lalu buka lagi.' : 'Memuat data mesin…')
      : 'Belum ada mesin. Tekan Mesin baru untuk menambah.') + '</p>';
  }
  return '<p class="stats" id="stats"></p>' +
    '<input id="q" class="field" type="search" placeholder="Cari kode, nama, merek, atau model" value="' + esc(S.q) + '" autocomplete="off" aria-label="Cari mesin" style="margin-bottom:10px">' +
    '<div class="fchips" id="fchips" role="group" aria-label="Filter">' + FILTERS.map(([v, l]) => '<button class="fchip" data-action="filter" data-f="' + v + '" aria-pressed="' + (S.filter === v) + '">' + l + '</button>').join('') + '</div>' +
    '<div class="jlist" id="jlist"></div>';
}
function renderJlist() {
  const el = $('#jlist'); if (!el) return;
  const held = heldMap(), q = norm(S.q), f = S.filter;
  const rows = S.jenis.map(j => ({ j, st: jstats(j.id, held) })).filter(({ j, st }) => {
    if (q && !norm([j.n, j.b, j.m, j.c].join(' ') + ' ' + (JU[j.id] || []).map(u => u.k).join(' ')).includes(q)) return false;
    return f === 'tersedia' ? st.ok > 0 : f === 'luar' ? st.out > 0 : f === 'rusak' ? st.bad > 0 : f === 'servis' ? st.warn > 0 : f === 'off' ? st.off > 0 : (st.total + st.off) > 0;
  }).sort((a, b) => byName(a.j.n, b.j.n) || byName(a.j.b, b.j.b) || byName(a.j.m, b.j.m));
  const c = { ok: 0, bad: 0, warn: 0, out: 0 };
  S.jenis.forEach(j => { const s = jstats(j.id, held); c.ok += s.ok; c.bad += s.bad; c.warn += s.warn; c.out += s.out; });
  const st = $('#stats'); if (st) st.textContent = c.ok + ' tersedia · ' + c.out + ' di luar · ' + c.bad + ' rusak · ' + c.warn + ' servis';
  document.querySelectorAll('#fchips .fchip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
  el.innerHTML = rows.length ? rows.map(({ j, st }) => '<button class="jcard" data-action="jenis" data-id="' + esc(j.id) + '"><span class="thumb">' + ic('tool', 30) + '</span>' +
    '<span class="nm"><b>' + esc(j.n) + '</b><small>' + (esc(subText(j)) || '&nbsp;') + '</small><span class="pills">' + pillsOf(st) + '</span></span></button>').join('')
    : '<p class="empty">Tidak ada mesin yang cocok.</p>';
}

/* ---------- Jenis: daftar unit ---------- */
function unitCard(u, held) {
  const h = held.get(u.k);
  const where = u.off ? '<span class="pill unk">Nonaktif</span>' :
    h ? '<span class="pill ' + (isLate(h) ? 'late' : 'out') + '">Di luar: ' + esc(h.nama) + (isLate(h) ? ' (terlambat)' : '') + '</span>' : '<span class="muted">Di ' + esc(u.loc || 'Gudang') + '</span>';
  let btn;
  if (u.off) btn = '<span class="ubtn off">Nonaktif</span>';
  else if (h) btn = '<button class="ubtn ret" data-action="uret" data-k="' + esc(u.k) + '">Kembalikan</button>';
  else if (u.s === 'bad') btn = '<span class="ubtn off">' + esc(u.sl) + '</span>';
  else btn = '<button class="ubtn" data-action="uambil" data-k="' + esc(u.k) + '">Ambil</button>';
  const extra = [u.sn ? 'Seri ' + esc(u.sn) : '', u.cat ? esc(u.cat) : ''].filter(Boolean).join(' · ');
  return '<div class="ucard' + ((S.focus || S.kode) === u.k ? ' focus' : '') + '" id="u-' + esc(u.k) + '"><div class="l1"><span><span class="code">' + esc(u.k) + '</span><span class="unum">Unit ' + esc(u.u) + '</span></span><span class="pill ' + u.s + '">' + esc(u.off ? u.cond : u.sl) + '</span></div>' +
    '<div class="l2">' + where + (extra ? '<br>' + extra : '') + '</div>' +
    '<div class="l3">' + btn + '<button class="ubtn edit" data-action="uedit" data-k="' + esc(u.k) + '" aria-label="Ubah ' + esc(u.k) + '">' + ic('edit', 22) + '</button></div></div>';
}
function viewJenis() {
  const jid = curJid(), j = J[jid];
  if (!j) return '<p class="empty">' + (S.loaded ? 'Kode atau jenis tidak ditemukan.' : 'Memuat data mesin…') + '</p>';
  const held = heldMap(), st = jstats(jid, held);
  const tabs = [['unit', 'Unit (' + (JU[jid] || []).length + ')'], ['riwayat', 'Riwayat']].map(([k, l]) => '<button role="tab" data-action="jtab" data-t="' + k + '" aria-selected="' + (S.tab === k) + '">' + l + '</button>').join('');
  let body;
  if (S.tab === 'riwayat') body = '<div id="live-riw">' + liveRiw() + '</div>';
  else body = (JU[jid] || []).map(u => unitCard(u, held)).join('') +
    '<a class="dashed" href="#" data-action="tambahunit" data-id="' + esc(jid) + '">' + ic('plus', 20) + 'Tambah unit ' + esc(j.n) + '</a>';
  return '<div class="hero">' + ic('tool', 56) + '</div>' +
    '<div class="pills" style="margin-bottom:10px"><span class="pill unk">' + esc(j.c || 'Tanpa kategori') + '</span>' + pillsOf(st) + '</div>' +
    '<div class="utabs" role="tablist">' + tabs + '</div>' + body;
}
function liveRiw() {
  const key = curJid();
  if (S.riw.key !== key || S.riw.list === null) return '<p class="muted">Memuat…</p>';
  if (S.riw.error) return '<p class="muted">Riwayat belum bisa dimuat. Cek sinyal.</p>';
  if (!S.riw.list.length) return '<p class="muted">Belum ada yang mengambil mesin ini.</p>';
  return '<ul class="chips">' + S.riw.list.map(r => '<li><span><b>' + esc(r.nama) + '</b>' + (r.dept ? ' (' + esc(r.dept) + ')' : '') + ' · <span class="code">' + esc(r.kode) + '</span><br><small class="muted">Ambil ' + esc(fmtDT(r.ts)) + ' · ' + (r.kembali ? 'Kembali ' + esc(fmtDT(r.kembali)) + (r.kondisi ? ' (' + esc(r.kondisi) + ')' : '') : '<b>belum kembali</b>') + '</small></span></li>').join('') + '</ul>';
}
async function loadRiwayatJenis() {
  const key = curJid(); if (!key) return;
  S.riw = { key, list: null, error: false }; const el = $('#live-riw'); if (el) el.innerHTML = liveRiw();
  try { const j = await api('riwayatJenis', { id: key }); if (S.riw.key === key) S.riw.list = j.riwayat; }
  catch (e) { if (S.riw.key === key) { S.riw.list = []; S.riw.error = true; } }
  const el2 = $('#live-riw'); if (el2) el2.innerHTML = liveRiw();
}

/* ---------- formulir: potongan yang dipakai ulang ---------- */
function fld(id, label, val, o = {}) {
  return '<div><label class="lbl" for="' + id + '">' + label + '</label><input id="' + id + '" class="field" type="' + (o.type || 'text') + '" value="' + esc(val || '') + '" autocomplete="off"' +
    (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + (o.mode ? ' inputmode="' + o.mode + '"' : '') + (o.list ? ' list="' + o.list + '"' : '') + '></div>';
}
function kseg(id, cur) {
  return '<div class="kseg" id="' + id + '" role="group" aria-label="Kondisi">' + KONDISI.map(k => '<button type="button" data-action="kpick" data-v="' + esc(k) + '" aria-pressed="' + (k === cur) + '"' + (k === 'Rusak' || k === 'Rusak total' ? ' class="bad"' : '') + '>' + esc(k) + '</button>').join('') + '</div>';
}
const ksegVal = id => { const b = document.querySelector('#' + id + ' [aria-pressed="true"]'); return b ? b.dataset.v : ''; };
function katSelect(id, cur, o = {}) {
  const cats = S.kategori.map(k => k.c).sort(byName);
  return '<select id="' + id + '" class="field" aria-label="Kategori">' + (o.empty ? '<option value="">Pilih kategori</option>' : '') +
    cats.map(c => '<option value="' + esc(c) + '"' + (norm(c) === norm(cur) ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '<option value="__new">Kategori baru…</option></select>';
}
function merekSelect(id, cur) {
  const list = merekList();
  return '<select id="' + id + '" class="field" aria-label="Merek"><option value="">(tanpa merek)</option>' +
    list.map(m => '<option value="' + esc(m.name) + '"' + (norm(m.name) === norm(cur) ? ' selected' : '') + '>' + esc(m.name) + '</option>').join('') + '<option value="__new">Merek baru…</option></select>';
}
const selVal = (id, newId) => { const v = ($('#' + id) || {}).value || ''; return v === '__new' ? clean(($('#' + newId) || {}).value) : v; };
function datalistTempat() {
  const set = new Set(['Gudang', 'Gudang Karpenter', 'Construction site']);
  S.units.forEach(u => { if (u.loc) set.add(u.loc); });
  return '<datalist id="tempatList">' + [...set].sort(byName).map(t => '<option value="' + esc(t) + '">').join('') + '</datalist>';
}

/* ---------- Tambah mesin ---------- */
function viewTambah() {
  const f = S.form || (S.form = { step: 'pilih', jid: null });
  if (f.step === 'pilih') {
    const q = norm(f.q || '');
    const rows = S.jenis.filter(j => !q || norm([j.n, j.b, j.m].join(' ')).includes(q)).sort((a, b) => byName(a.n, b.n) || byName(a.b, b.b));
    return '<div class="stack"><p class="note info">Pilih jenis mesin yang sudah ada, lalu tambah unitnya. Atau buat jenis baru.</p>' +
      '<input id="tq" class="field" type="search" placeholder="Cari jenis mesin" value="' + esc(f.q || '') + '" autocomplete="off" aria-label="Cari jenis">' +
      '<button class="dashed" data-action="tnew">' + ic('plus', 20) + 'Jenis baru</button><div id="tlist">' + tambahList(rows) + '</div></div>';
  }
  const isNew = f.step === 'baru', j = isNew ? null : J[f.jid];
  if (!isNew && !j) return '<p class="empty">Jenis tidak ditemukan.</p>';
  const kat = isNew ? '' : j.c;
  return '<div class="stack">' +
    (isNew ? '<section class="card"><h3>Jenis baru</h3><div class="stack">' +
      '<div><label class="lbl" for="tkat">Kategori</label>' + katSelect('tkat', '', { empty: true }) + '</div>' +
      '<div id="tkatBox" hidden class="stack">' + fld('tkatNew', 'Nama kategori baru', '') + fld('tawalan', 'Awalan kode (3 huruf)', '', { ph: 'contoh: LST' }) + '</div>' +
      fld('tnama', 'Nama mesin', '', { ph: 'contoh: Bor' }) +
      '<div><label class="lbl" for="tmerek">Merek</label>' + merekSelect('tmerek', '') + '</div>' +
      '<div id="tmerekBox" hidden>' + fld('tmerekNew', 'Nama merek baru', '') + '</div>' +
      fld('tmodel', 'Model', '', { ph: 'contoh: GBH 2-28' }) +
      '<button class="btn ghost small" data-action="tback">Pilih jenis yang sudah ada</button></div></section>'
      : '<section class="card"><h3>Jenis</h3><div class="pickrow" style="margin:0"><span class="thumb">' + ic('tool', 22) + '</span><span class="nm">' + esc(j.n) + '<small>' + esc(subText(j) || j.c) + '</small></span></div>' +
        '<button class="btn ghost small block" style="margin-top:10px" data-action="tback">Ganti jenis</button></section>') +
    '<section class="card"><h3>Unit baru</h3><div class="stack">' +
    '<div class="codeprev"><span>Kode otomatis</span><b id="codePrev">' + (isNew ? '—' : esc(nextCode(prefixOfKat(kat)) || '—')) + '</b></div>' +
    fld('tu', 'No. unit (boleh kosong)', '', { mode: 'numeric', ph: 'Otomatis: ' + (isNew ? 1 : nextUnitNo(f.jid)) }) +
    fld('tsn', 'No. seri pabrik (boleh kosong)', '') +
    '<div><label class="lbl">Kondisi</label>' + kseg('tk', 'Normal') + '</div>' +
    fld('tloc', 'Tempat', 'Gudang', { list: 'tempatList' }) + datalistTempat() +
    '<div><label class="lbl" for="tcat">Catatan</label><textarea id="tcat" class="field" placeholder="boleh kosong"></textarea></div>' +
    '<button class="btn" data-action="tsave">Simpan</button><button class="btn ghost" data-action="tsave" data-print="1">Simpan dan cetak label QR</button></div></section></div>';
}
function tambahList(rows) {
  if (!rows.length) return '<p class="empty">Tidak ada jenis yang cocok.</p>';
  return rows.map(j => '<button class="pickrow" data-action="tpick" data-id="' + esc(j.id) + '"><span class="thumb">' + ic('tool', 22) + '</span><span class="nm">' + esc(j.n) + '<small>' + esc(subText(j) || j.c) + ' · ' + (JU[j.id] || []).length + ' unit</small></span></button>').join('');
}
function updateCodePrev() {
  const f = S.form; if (!f || S.view !== 'tambah' || f.step === 'pilih') return;
  const el = $('#codePrev'); if (!el) return;
  let p = '';
  if (f.step === 'baru') {
    const v = ($('#tkat') || {}).value;
    if (v === '__new') p = clean(($('#tawalan') || {}).value).toUpperCase(); else if (v) p = prefixOfKat(v);
    el.textContent = p && /^[A-Z]{3}$/.test(p) ? nextCode(p) : '—';
  } else el.textContent = nextCode(prefixOfKat(J[f.jid].c)) || '—';
}

/* ---------- Ubah unit ---------- */
function viewUnit() {
  const u = U[S.kode];
  if (!u) return '<p class="empty">' + (S.loaded ? 'Unit tidak ditemukan.' : 'Memuat data mesin…') + '</p>';
  const j = jenisOf(u), held = heldMap().get(u.k);
  return '<div class="stack">' +
    '<section class="card"><h3>' + esc(j.n) + ' · Unit ' + esc(u.u) + '</h3><div class="codeprev"><b>' + esc(u.k) + '</b><a class="btn small ghost" href="label.html?kode=' + esc(u.k) + '">Cetak label</a></div>' +
    '<p class="muted" style="margin:10px 0 0;font-size:14px">Kode tidak bisa diubah karena sudah tercetak di label QR. ' + esc(subText(j)) + '</p></section>' +
    '<section class="card"><h3>Data unit</h3><div class="stack">' +
    fld('uu', 'No. unit', u.u, { mode: 'numeric' }) +
    '<div><label class="lbl">Kondisi</label>' + kseg('uk', u.off ? u.cond : u.cond) + '</div>' +
    fld('uloc', 'Tempat', u.loc, { list: 'tempatList' }) + datalistTempat() +
    fld('usn', 'No. seri pabrik', u.sn) +
    '<div class="two stk">' + fld('utb', 'Tanggal beli', u.tb, { type: 'date' }) + fld('ugs', 'Garansi sampai', u.gs, { type: 'date' }) + '</div>' +
    '<div><label class="lbl" for="ucat">Catatan</label><textarea id="ucat" class="field">' + esc(u.cat) + '</textarea></div>' +
    '<button class="btn" data-action="usave">Simpan perubahan</button></div></section>' +
    '<section class="card"><h3>Maintenance</h3><div id="live-maint"></div>' +
    '<button class="btn" style="width:100%;margin-top:14px" data-action="maintopen" id="maintOpenBtn">Catat maintenance</button>' +
    '<form class="stack" id="maintForm" hidden style="margin-top:14px"><div class="two stk"><div><label class="lbl" for="mDate">Tanggal</label><input id="mDate" class="field" type="date" value="' + today() + '" required></div>' +
    '<div><label class="lbl" for="mJenis">Jenis</label><select id="mJenis" class="field">' + MJENIS.map(x => '<option>' + x + '</option>').join('') + '</select></div></div>' +
    '<div><label class="lbl" for="mOleh">Dikerjakan oleh</label><input id="mOleh" class="field" type="text" value="' + esc(lsGet('qrg.mOleh', S.me)) + '" autocomplete="off"></div>' +
    '<div><label class="lbl" for="mCat">Catatan</label><textarea id="mCat" class="field" placeholder="Contoh: ganti karbon brush, oli gearbox"></textarea></div>' +
    '<div><label class="lbl" for="mNext">Jadwal berikutnya (boleh kosong)</label><input id="mNext" class="field" type="date"></div>' +
    '<div class="two"><button class="btn" type="submit">Simpan</button><button class="btn ghost" type="button" data-action="maintcancel">Batal</button></div></form></section>' +
    '<section class="card"><h3>' + (u.off ? 'Unit nonaktif' : 'Nonaktifkan unit') + '</h3><div class="stack">' +
    (u.off ? '<p class="muted" style="margin:0">Unit ini disembunyikan dari pengambilan. Riwayatnya tetap tersimpan.</p><button class="btn ghost" data-action="uon">Aktifkan kembali</button>'
      : '<p class="muted" style="margin:0;font-size:15px">Untuk mesin yang hilang, dijual, atau rusak total. Data dan riwayat <b>tidak dihapus</b>. Kodenya tidak dipakai ulang.</p>' +
        (held ? '<p class="note warn">Unit masih dibawa ' + esc(held.nama) + '. Kembalikan dulu.</p>' : fld('ualasan', 'Alasan', '', { ph: 'contoh: hilang, dijual, rusak total' }) + '<button class="btn ghost redo" data-action="uoff">Nonaktifkan</button>')) +
    '</div></section></div>';
}
function liveMaint() {
  const u = U[S.kode]; if (!u) return '';
  const l = maintFor(u.k), m = maintSummary(u.k);
  if (!l.length) return '<p class="muted" style="margin:0">Belum ada catatan maintenance untuk unit ini.</p>';
  let nextTxt = '—';
  if (m.next) { const d = daysFromToday(m.next); nextTxt = fmtShort(m.next) + (d < 0 ? ' (lewat ' + (-d) + ' hari)' : d === 0 ? ' (hari ini)' : ' (' + d + ' hari lagi)'); }
  const lastD = daysFromToday(m.last);
  return '<div class="sumbox"><div class="n">' + m.n + '</div><div><b>kali maintenance</b></div>' +
    '<div>Terakhir: ' + esc(fmtShort(m.last)) + ' (' + (lastD === 0 ? 'hari ini' : -lastD + ' hari lalu') + ')</div><div>Berikutnya: ' + esc(nextTxt) + '</div></div>' +
    '<ul class="mlist">' + l.map(r => '<li><div class="top2"><span class="jenis">' + esc(r.jenis || 'Maintenance') + (r.pending ? ' <span class="muted">(menunggu terkirim)</span>' : '') + '</span>' +
      '<button class="x' + (S.confirmDel === r.id ? ' confirm' : '') + '" data-action="delmaint" data-id="' + esc(r.id) + '" aria-label="Hapus catatan">' + (S.confirmDel === r.id ? 'Yakin?' : '✕') + '</button></div>' +
      '<div class="meta">' + esc(fmtShort(r.tgl)) + (r.oleh ? ' · ' + esc(r.oleh) : '') + (r.next ? ' · berikutnya ' + esc(fmtShort(r.next)) : '') + '</div>' +
      (r.cat ? '<p>' + esc(r.cat) + '</p>' : '') + '</li>').join('') + '</ul>';
}

/* ---------- Ubah jenis ---------- */
function viewJedit() {
  const j = J[curJid()];
  if (!j) return '<p class="empty">' + (S.loaded ? 'Jenis tidak ditemukan.' : 'Memuat data mesin…') + '</p>';
  const n = (JU[j.id] || []).length;
  const others = S.jenis.filter(x => x.id !== j.id).sort((a, b) => byName(a.n, b.n) || byName(a.b, b.b));
  return '<div class="stack"><section class="card"><h3>Data jenis</h3><div class="stack">' +
    '<p class="note info" id="jnote">Perubahan berlaku untuk semua <b>' + n + ' unit</b> jenis ini.</p>' +
    '<div><label class="lbl" for="jkat">Kategori</label>' + katSelect('jkat', j.c) + '</div>' +
    '<div id="jkatBox" hidden class="stack">' + fld('jkatNew', 'Nama kategori baru', '') + fld('jawalan', 'Awalan kode (3 huruf)', '', { ph: 'contoh: LST' }) + '</div>' +
    fld('jn', 'Nama mesin', j.n) +
    '<div><label class="lbl" for="jmerek">Merek</label>' + merekSelect('jmerek', j.b) + '</div>' +
    '<div id="jmerekBox" hidden>' + fld('jmerekNew', 'Nama merek baru', '') + '</div>' +
    fld('jm', 'Model', j.m) +
    '<button class="btn" data-action="jsave" data-confirm="Ya, simpan untuk ' + n + ' unit">Simpan perubahan</button></div></section>' +
    '<section class="card"><h3>Gabungkan jenis</h3><p class="muted" style="margin:0 0 10px;font-size:15px">Kalau dua jenis sebenarnya sama, pindahkan semua unit jenis ini ke jenis lain. Jenis ini lalu disembunyikan. Nomor unit tidak boleh bentrok.</p>' +
    '<div class="stack"><select id="jgab" class="field" aria-label="Gabung ke"><option value="">Pilih jenis tujuan</option>' + others.map(x => '<option value="' + esc(x.id) + '">' + esc(x.n + (x.b || x.m ? ' · ' + subText(x) : '') + ' (' + (JU[x.id] || []).length + ' unit)') + '</option>').join('') + '</select>' +
    '<button class="btn ghost redo" data-action="jgab" data-confirm="Ya, pindahkan ' + n + ' unit">Gabungkan ke jenis itu</button></div></section></div>';
}

/* ---------- Merek ---------- */
function viewMerek() {
  const list = merekList();
  if (!list.length) return '<p class="empty">Belum ada merek. Merek dibuat saat menambah atau mengubah jenis mesin.</p>';
  return '<p class="stats">Ubah nama merek berlaku di semua jenis. Untuk menggabung dua merek, ganti nama salah satunya dengan nama merek yang lain.</p>' +
    list.map(m => '<div class="mrow" data-merek="' + esc(m.name) + '"><div style="flex:1;min-width:0"><b>' + esc(m.name) + '</b><br><small class="muted">' + m.n + ' jenis</small></div>' +
      '<button class="btn small ghost" data-action="mrekedit" data-m="' + esc(m.name) + '">Ubah nama</button></div>').join('') + '<div id="mrekForm"></div>';
}

/* ---------- Hari Ini ---------- */
function viewHari() { return '<div id="live-hari"></div>'; }
function entryLines(e) {
  const u = U[e.kode];
  return '<div class="l1"><a href="#" data-action="openunit" data-k="' + esc(e.kode) + '"><span class="code">' + esc(e.kode) + '</span><span>' + esc(u ? unitTitle(u) : e.mesin) + '</span></a></div>' +
    '<div class="l2">Ambil ' + esc(fmtHM(e.ts)) + ' · ' + (e.kembali ? 'Kembali ' + esc(fmtHM(e.kembali)) + (e.kondisi ? ' (' + esc(e.kondisi) + ')' : '') : '<span class="nb">belum kembali</span>') + (e.cat ? ' · ' + esc(e.cat) : '') + (e.pending ? ' · menunggu terkirim' : '') + '</div>';
}
function liveHari() {
  const open = openEntries();
  let h = '<h2 class="h2" style="margin-top:0">Belum kembali (' + open.length + ')</h2>';
  if (!open.length) h += '<p class="empty" style="padding:12px 8px">Semua mesin sudah kembali.</p>';
  else h += open.map(e => { const u = U[e.kode]; return '<div class="openrow' + (isLate(e) ? ' late' : '') + '"><div class="top2"><span class="nm"><span class="code">' + esc(e.kode) + '</span> ' + esc(u ? unitTitle(u) : e.mesin) + '</span>' + (isLate(e) ? '<span class="pill late">Terlambat</span>' : '') + '</div>' +
    '<div class="meta">' + esc(e.nama) + (e.dept || deptOf(e.nama) ? ' (' + esc(e.dept || deptOf(e.nama)) + ')' : '') + ' · sejak ' + esc(fmtDT(e.ts)) + '</div>' +
    '<div class="btns"><button data-action="ret" data-id="' + esc(e.id) + '">Kembalikan</button><button class="r" data-action="retrusak" data-id="' + esc(e.id) + '" data-k="' + esc(e.kode) + '">Rusak</button></div></div>'; }).join('');
  const td = entriesFor(today());
  h += '<h2 class="h2">Hari ini · ' + esc(fmtShort(today())) + '</h2>';
  if (!td.length) return h + '<p class="empty" style="padding:12px 8px">Belum ada pengambilan hari ini.</p>';
  return h + groupBy(td).map(g => '<section class="grp"><header><h3>' + esc(g.name) + (g.dept ? ' <small>' + esc(g.dept) + '</small>' : '') + '</h3><span class="muted">' + g.items.length + ' mesin</span></header><ul>' +
    g.items.map(e => '<li>' + entryLines(e) + '</li>').join('') + '</ul></section>').join('');
}

/* ---------- Riwayat per tanggal ---------- */
function viewRiwayat() {
  if (!S.rwDate) return '<p class="stats">Pilih tanggal untuk melihat, mencetak, atau mengarsipkan catatan.</p><div id="live-rw"></div>';
  return '<button class="btn ghost small" style="margin-bottom:8px" data-action="rwback">← Semua tanggal</button><div class="big">' + esc(fmtDate(S.rwDate)) + '</div><div id="live-rw"></div>';
}
async function loadRingkasan() {
  S.rw = { list: null, error: false }; renderLive();
  try { S.rw.list = (await api('ringkasan')).ringkasan; } catch (e) { S.rw.list = []; S.rw.error = true; }
  renderLive();
}
function liveRw() {
  if (!S.rwDate) {
    if (S.rw.list === null) return '<p class="empty">Memuat…</p>';
    if (S.rw.error) return '<p class="empty">Riwayat belum bisa dimuat. Cek sinyal.</p>';
    if (!S.rw.list.length) return '<p class="empty">Belum ada riwayat.</p>';
    return '<div class="dategrid">' + S.rw.list.map(d => '<button class="daterow2" data-action="rwopen" data-tgl="' + esc(d.tgl) + '"><span><b>' + esc(fmtDate(d.tgl)) + '</b><br><small class="muted">' + d.jumlah + ' pengambilan</small></span>' +
      (d.belum ? '<span class="pill late">' + d.belum + ' belum kembali</span>' : '<span class="pill ok">Lengkap</span>') + '</button>').join('') + '</div>';
  }
  if (S.pengDate !== S.rwDate) return '<p class="empty">Memuat…</p>';
  const list = entriesFor(S.rwDate), groups = groupBy(list), openN = list.filter(e => !e.kembali).length;
  if (!groups.length) return '<p class="empty">Tidak ada catatan pada tanggal ini.</p>';
  let h = '<p class="stats">' + groups.length + ' pekerja · ' + list.length + ' pengambilan · ' + (openN ? '<b style="color:var(--bad)">' + openN + ' belum kembali</b>' : 'semua sudah kembali') + '</p>' +
    '<div class="two" style="margin-bottom:12px"><button class="btn" data-action="print">Cetak</button><button class="btn ghost" data-action="export">Unduh Excel</button></div>' +
    groups.map(g => '<section class="grp"><header><h3>' + esc(g.name) + (g.dept ? ' <small>' + esc(g.dept) + '</small>' : '') + '</h3><span class="muted">' + g.items.length + ' mesin</span></header><ul>' +
      g.items.map(e => '<li>' + entryLines(e) + '</li>').join('') + '</ul></section>').join('');
  h += '<section class="card"><h3>Arsip</h3>';
  if (openN) h += '<p class="note warn">Belum bisa diarsipkan karena masih ada ' + openN + ' mesin yang belum kembali.</p>';
  else h += '<p class="muted" style="margin:0 0 10px;font-size:15px"><b>Arsipkan</b> memindahkan catatan tanggal ini ke sheet Arsip di Google Sheet. Datanya tetap tersimpan, hanya hilang dari daftar Riwayat.</p><button class="btn ghost block" data-action="arsip">Arsipkan tanggal ini</button>';
  return h + '</section>';
}
function dayRows(d) { return entriesFor(d).sort((a, b) => byName(norm(a.nama), norm(b.nama)) || byTs(a, b)); }
function printDay() {
  const rows = dayRows(S.rwDate);
  const tr = rows.map((e, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(e.nama) + (e.dept || deptOf(e.nama) ? '<br><small>' + esc(e.dept || deptOf(e.nama)) + '</small>' : '') + '</td><td>' + esc(e.kode) + '</td><td>' + esc(e.mesin) + '</td><td>' + esc(fmtHM(e.ts)) + '</td><td class="ttd"></td><td>' + (e.kembali ? esc(fmtHM(e.kembali)) : '') + '</td><td>' + esc(e.kondisi || '') + '</td><td class="ttd"></td></tr>').join('');
  $('#printArea').innerHTML = '<h1>Catatan Pengambilan dan Pengembalian Mesin</h1><p>Construction site · ' + esc(fmtDate(S.rwDate)) + '</p>' +
    '<table><thead><tr><th>No</th><th>Nama / Departemen</th><th>Kode</th><th>Mesin</th><th>Jam Ambil</th><th class="ttd">Paraf Pengambil</th><th>Jam Kembali</th><th>Kondisi</th><th class="ttd">Paraf Penjaga</th></tr></thead><tbody>' + tr + '</tbody></table>' +
    '<div class="foot"><span>Dicetak: ' + esc(fmtDate(today())) + ' ' + esc(nowHM()) + '</span><span>Mengetahui: ______________________</span></div>';
  setTimeout(() => window.print(), 50);
}
function exportXlsx() {
  const rows = dayRows(S.rwDate), tgl = S.rwDate.split('-').reverse().join('-');
  const a1 = [['No', 'Tanggal', 'Nama Pekerja', 'Departemen', 'Kode Unit', 'Mesin', 'Model', 'Jam Ambil', 'Jam Kembali', 'Kondisi Kembali', 'Status', 'Catatan']];
  rows.forEach((e, i) => a1.push([i + 1, tgl, e.nama, e.dept || deptOf(e.nama), e.kode, e.mesin, e.model || '', fmtHM(e.ts), fmtHM(e.kembali), e.kondisi || '', e.kembali ? 'Sudah kembali' : 'Belum kembali', e.cat || '']));
  const a2 = [['Tanggal', 'Nama Pekerja', 'Departemen', 'Jumlah Mesin', 'Mesin yang Diambil']];
  groupBy(rows).forEach(g => a2.push([tgl, g.name, g.dept, g.items.length, g.items.map(e => e.kode + ' ' + e.mesin).join(', ')]));
  const wb = XLSX.utils.book_new(), s1 = XLSX.utils.aoa_to_sheet(a1), s2 = XLSX.utils.aoa_to_sheet(a2);
  s1['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 24 }, { wch: 18 }, { wch: 11 }, { wch: 32 }, { wch: 22 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 26 }];
  s2['!cols'] = [{ wch: 12 }, { wch: 24 }, { wch: 18 }, { wch: 13 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, s1, 'Rincian'); XLSX.utils.book_append_sheet(wb, s2, 'Per Pekerja');
  XLSX.writeFile(wb, 'Pengambilan_Mesin_' + S.rwDate + '.xlsx');
}

/* ---------- Pekerja ---------- */
function viewWorkers() {
  const depts = [...new Set(S.pekerja.map(p => p.d).filter(Boolean))].sort(byName);
  return '<section class="card"><h3>Tambah pekerja</h3><div class="stack">' +
    '<input id="newName" class="field" type="text" placeholder="Nama pekerja" autocomplete="off" aria-label="Nama baru">' +
    '<input id="newDept" class="field" type="text" list="deptList" placeholder="Departemen" autocomplete="off" aria-label="Departemen"><datalist id="deptList">' + depts.map(d => '<option value="' + esc(d) + '">').join('') + '</datalist>' +
    '<button class="btn" data-action="addname">Tambah</button></div></section>' +
    '<section class="card"><h3>Tempel dari absen</h3><p class="muted" style="margin:0 0 10px;font-size:15px">Salin dua kolom dari Excel (Nama lalu Departemen), tempel di sini. Satu pekerja per baris.</p>' +
    '<div class="stack"><textarea id="importText" class="field" placeholder="Budi Santoso&#9;Karpenter&#10;Andi Pratama&#9;Pembesian" aria-label="Tempel daftar pekerja"></textarea><div id="importInfo" class="muted" style="font-size:14px"></div><button class="btn ghost" data-action="doimport">Tambahkan ke daftar</button></div></section>' +
    '<section class="card"><h3>Daftar pekerja</h3><div id="live-names"></div></section>';
}
function liveNames() {
  if (!S.pekerja.length) return '<p class="empty">Belum ada nama. Tambahkan atau tempel dari absen.</p>';
  let h = '<p class="stats">' + S.pekerja.length + ' pekerja</p>';
  deptGroups().forEach(([d, ps]) => {
    h += '<div class="dept">' + esc(d) + ' (' + ps.length + ')</div><ul class="chips">' + ps.map(p => '<li><span>' + esc(p.n) + '</span><button class="x' + (S.confirmDel === 'n:' + p.n ? ' confirm' : '') + '" data-action="delname" data-n="' + esc(p.n) + '" aria-label="Hapus ' + esc(p.n) + '">' + (S.confirmDel === 'n:' + p.n ? 'Yakin?' : '✕') + '</button></li>').join('') + '</ul>';
  });
  return h;
}
function parseImport(text) {
  return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
    const parts = l.includes('\t') ? l.split('\t') : l.includes(';') ? l.split(';') : l.split(',');
    return { n: clean(parts[0]), d: clean(parts.slice(1).join(' ')) };
  }).filter(p => p.n && norm(p.n) !== 'nama');
}
async function saveWorkers(list) {
  const seen = new Set(), out = [];
  list.forEach(p => { const n = clean(p.n); if (n && !seen.has(norm(n))) { seen.add(norm(n)); out.push({ n, d: clean(p.d) }); } });
  out.sort((a, b) => (a.d + '|' + a.n).localeCompare(b.d + '|' + b.n, 'id'));
  const before = S.pekerja; S.pekerja = out; renderLive();
  try { await api('savePekerja', { pekerja: out }); lsSet('qrg.c3', { ...lsGet('qrg.c3', {}), pekerja: out }); }
  catch (e) { S.pekerja = before; renderLive(); toast(e.code === 'network' ? 'Tidak ada sinyal. Daftar belum tersimpan.' : 'Daftar tidak bisa disimpan.'); return false; }
  return true;
}

/* ---------- Log perubahan ---------- */
function viewLog() { return '<div id="live-log"></div>'; }
async function loadLogs() {
  S.logs = { list: null, error: false }; renderLive();
  try { S.logs.list = (await api('logList')).log; } catch (e) { S.logs.list = []; S.logs.error = true; }
  renderLive();
}
function liveLog() {
  if (S.logs.list === null) return '<p class="empty">Memuat…</p>';
  if (S.logs.error) return '<p class="empty">Log belum bisa dimuat. Cek sinyal.</p>';
  if (!S.logs.list.length) return '<p class="empty">Belum ada perubahan tercatat.</p>';
  return '<section class="card" style="padding:4px 16px">' + S.logs.list.map(r => '<div class="logrow"><b>' + esc(r.a) + '</b>' + (r.k ? ' · <span class="code">' + esc(r.k) + '</span>' : '') + '<br>' + esc(r.d) + '<div class="w">' + esc(r.o || '—') + ' · ' + esc(fmtDT(r.t)) + '</div></div>').join('') + '</section>';
}
