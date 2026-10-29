/* ---------- kerangka: header, navigasi, sinkron ---------- */
function hdrInfo() {
  const j = J[curJid()];
  switch (S.view) {
    case 'mesin': return { root: 1, title: 'Mesin', sub: S.loaded ? nameGroups().size + ' mesin · ' + S.units.filter(u => !u.off).length + ' unit' : 'Memuat…', right: S.loaded && !isWide() ? { a: 'tambah', i: 'plus', l: 'Mesin baru', t: 'Mesin baru' } : null };
    case 'dasbor': return { root: 1, title: 'Dasbor', sub: 'Baca saja · ' + fmtDate(today()) };
    case 'fotoimpor': return { root: 1, title: 'Impor foto massal', sub: 'Satu foto per jenis mesin' };
    case 'imporrak': return { root: 1, title: 'Impor isi rak', sub: 'Isi tempat sekaligus dari Excel' };
    case 'nama': { const g = nameGroup(S.nm); return { title: g ? g.name : 'Mesin', sub: g ? g.jenis.length + ' merek/model · ' + nameUnits(g).filter(u => !u.off).length + ' unit' : '' }; }
    case 'saran': return { root: 1, title: 'Saran', sub: S.loaded ? saranList().length + ' saran' : 'Memuat…' };
    case 'hari': return { root: 1, title: 'Hari Ini', sub: fmtDate(today()) };
    case 'jenis': return { title: j ? j.n : 'Mesin', sub: j ? subText(j) : '', right: j ? { a: 'jedit', i: 'edit', l: 'Ubah jenis' } : null };
    case 'profil': { const u = U[S.kode]; return { title: u ? u.k : 'Unit', sub: u ? unitTitle(u) : '', right: u ? { a: 'uedit', i: 'edit', l: 'Ubah unit', k: u.k } : null }; }
    case 'tempatlist': return { root: 1, title: 'Penyimpanan', sub: S.loaded ? topPlaces().length + ' tempat' : 'Memuat…' };
    case 'tempat': { const t = T[S.tid]; const p = t && t.ind ? T[t.ind] : null; return { title: t ? t.n : 'Tempat', sub: t ? (p ? p.n + ' · ' : '') + [t.l, t.id].filter(Boolean).join(' · ') : '' }; }
    case 'tambahtempat': { const t = T[S.tid]; return { title: 'Tambah ke ' + (t ? t.n : 'tempat'), sub: 'Mesin dan material' }; }
    case 'tempatform': { const indT = !S.tid && S.form && S.form.induk ? T[S.form.induk] : null; return { title: S.tid ? (T[S.tid] && T[S.tid].ind ? 'Ubah sub rak' : 'Ubah tempat') : (indT ? 'Sub rak baru' : 'Tempat baru'), sub: S.tid && T[S.tid] ? T[S.tid].id : (indT ? 'Di ' + indT.n : 'Penyimpanan') }; }
    case 'material': return { root: 1, title: 'Material', sub: S.loaded ? S.material.filter(m => !m.off).length + ' jenis' : 'Memuat…' };
    case 'mat': { const m = M[S.mid]; return { title: m ? m.n : 'Material', sub: m ? m.id : '', right: m ? { a: 'matedit', i: 'edit', l: 'Ubah material' } : null }; }
    case 'matform': return { title: S.mid ? 'Ubah material' : 'Material baru', sub: S.mid || 'Stok' };
    case 'panduan': return { title: 'Ubah panduan', sub: j ? j.n : '' };
    case 'impor': return { root: 1, title: 'Impor Excel', sub: 'Tambah banyak mesin' };
    case 'unit': { const u = U[S.kode]; return { title: u ? u.k : 'Unit', sub: u ? unitTitle(u) : '' }; }
    case 'jedit': return { title: 'Ubah jenis', sub: j ? j.n : '' };
    case 'skema': return { title: 'Atur kolom maintenance', sub: j ? j.n : '' };
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
    (h.right ? '<button class="hbtn' + (h.right.t ? ' txt' : '') + '" data-action="' + h.right.a + '"' + (h.right.k ? ' data-k="' + esc(h.right.k) + '"' : '') + ' aria-label="' + esc(h.right.l) + '">' + ic(h.right.i, 24) + (h.right.t ? '<span>' + esc(h.right.t) + '</span>' : '') + '</button>' : '');
  const showNav = ['mesin', 'nama', 'jenis', 'hari', 'tempatlist', 'material'].includes(S.view);
  $('#bnav').hidden = !showNav || S.pinned; $('#app').classList.toggle('nonav', !showNav);
  const fab = { tempatlist: ['tempatbaru', 'Tempat baru'], material: ['matbaru', 'Material baru'] }[S.view];
  const fb = $('#fab'); fb.hidden = !fab || !S.loaded;
  if (fab) { fb.dataset.action = fab[0]; fb.lastChild.textContent = fab[1]; }
  $('#app').classList.toggle('wide', isWide() && ['mesin'].includes(S.view));
  const cur = S.view === 'hari' ? 'hari' : 'mesin';
  $('#nvMesin').setAttribute('aria-current', cur === 'mesin' ? 'page' : 'false');
  $('#nvHari').setAttribute('aria-current', cur === 'hari' ? 'page' : 'false');
  const open = openEntries(), late = open.filter(isLate).length, b = $('#hariBadge');
  b.hidden = !open.length; b.textContent = open.length; b.className = 'badge' + (late ? '' : ' soft');
  const el = $('#sync'), n = Q.items.length;
  let msg = '';
  if (!API_URL || API_URL.includes('PASTE')) msg = 'Server belum diatur (config.js).';
  else if (n) msg = Q.busy ? 'Mengirim ' + n + ' catatan…' : 'Menunggu sinyal, data akan dikirim otomatis (' + n + ' catatan).';
  else if (S.loadError === 'network') msg = 'Tidak ada sinyal. Data terakhir yang tersimpan ditampilkan.';
  el.textContent = msg; el.hidden = !msg;
  if (!$('#drawer').hidden) renderDrawer();
}

/* ---------- menu samping ---------- */
function renderDrawer() {
  const cur = S.view, open = openEntries().length;
  const it = (v, i, l, extra) => '<button class="it" data-action="dgo" data-view="' + v + '"' + (cur === v || (v === 'tempatlist' && ['tempat', 'tambahtempat', 'tempatform'].includes(cur)) || (v === 'material' && ['mat', 'matform'].includes(cur)) ? ' aria-current="page"' : '') + '>' + ic(i, 24) + '<span>' + l + '</span>' + (extra || '') + '</button>';
  $('#drawer').innerHTML = '<button class="dbg" data-action="dclose" aria-label="Tutup menu"></button><aside role="dialog" aria-label="Menu">' +
    '<div class="dh"><img src="logo-gelap.png" alt="Wakatobi Project Villa" width="168" height="117"><small>QR Aset Gudang · Construction site</small></div>' +
    '<nav>' +
    '<div class="sec">Utama</div>' + it('dasbor', 'chart', 'Dasbor') + it('mesin', 'grid', 'Mesin') + it('tempatlist', 'box', 'Penyimpanan') + it('material', 'layers', 'Material') +
    it('hari', 'clock', 'Hari Ini', open ? '<span class="cnt">' + open + '</span>' : '') + it('riwayat', 'list', 'Riwayat per tanggal') +
    '<button class="it" data-action="dscan">' + ic('qr', 24) + '<span>Scan QR</span></button>' +
    '<div class="sec">Admin</div>' + it('saran', 'alert', 'Saran', saranList().length ? '<span class="cnt soft">' + saranList().length + '</span>' : '') + it('merek', 'tag', 'Merek') + it('pekerja', 'users', 'Pekerja') +
    it('impor', 'upload', 'Impor Excel') + it('imporrak', 'box', 'Impor isi rak') + it('fotoimpor', 'cam', 'Impor foto massal') + it('log', 'doc', 'Log perubahan') +
    '<a class="it" href="label.html">' + ic('qr', 24) + '<span>Cetak label QR</span></a>' +
    '</nav><div class="foot">' +
    '<button class="it" data-action="dme">' + ic('user', 24) + '<span>Nama saya: ' + (S.me ? esc(S.me) : '<i>belum dipilih</i>') + '</span></button>' +
    '<div class="themeseg"><span class="tl">' + ic('sun', 20) + 'Tampilan</span><div class="seg" role="group" aria-label="Tampilan">' + THEMES.map(t => '<button data-action="dtheme" data-t="' + t + '" aria-pressed="' + (getTheme() === t) + '">' + THEME_L[t] + '</button>').join('') + '</div></div>' +
    '<div class="langseg"><span class="tl">' + ic('globe', 20) + 'Bahasa</span><div class="seg seg2" role="group" aria-label="Bahasa"><button data-action="dlang" data-l="id" aria-pressed="' + (LANG.cur === 'id') + '">ID</button><button data-action="dlang" data-l="en" aria-pressed="' + (LANG.cur === 'en') + '">EN</button></div></div>' +
    '<button class="it" data-action="dreload">' + ic('refresh', 24) + '<span>Muat ulang data</span></button>' +
    '<button class="it bad" data-action="logout">' + ic('logout', 24) + '<span>Keluar</span></button>' +
    '</div></aside>';
}
function openDrawer() { if (S.pinned || S.ov.includes('drawer')) return; renderDrawer(); $('#drawer').hidden = false; pushOv('drawer'); }

/* ---------- render ---------- */
const VIEWS = () => ({ mesin: viewMesin, nama: viewNama, saran: viewSaran, jenis: viewJenis, profil: viewProfil, unit: viewUnit, jedit: viewJedit, skema: viewSkema, tambah: viewTambah, hari: viewHari, riwayat: viewRiwayat, pekerja: viewWorkers, log: viewLog, merek: viewMerek,
  tempatlist: viewTempatList, tempat: viewTempat, tambahtempat: viewTambahTempat, tempatform: viewTempatForm, material: viewMaterial, mat: viewMat, matform: viewMatForm, panduan: viewPanduanEdit, impor: viewImpor,
  dasbor: viewDasbor, fotoimpor: viewFotoImpor, imporrak: viewImporRak });
function render() {
  const f = VIEWS()[S.view] || viewMesin;
  $('#app').innerHTML = f();
  renderChrome(); renderLive();
}
function renderLive() {
  const set = (id, html) => { const el = $('#' + id); if (el) el.innerHTML = html; };
  if (S.view === 'mesin') { if (!!$('#jlist') !== !!S.jenis.length) { $('#app').innerHTML = viewMesin(); } renderJlist(); }
  else if (S.view === 'hari') set('live-hari', liveHari());
  else if (S.view === 'saran') set('live-saran', liveSaran());
  else if (S.view === 'riwayat') set('live-rw', liveRw());
  else if (S.view === 'pekerja') set('live-names', liveNames());
  else if (S.view === 'profil') { if (S.tab === 'maint') set('live-maint', liveMaint()); else if (S.tab === 'riw') set('live-riwu', liveRiwUnit()); }
  else if (S.view === 'material') renderMatList();
  else if (S.view === 'tempatlist') renderTempatList();
  else if (S.view === 'tambahtempat') renderTambahTempat();
  else if (S.view === 'mat') set('live-stoklog', liveStokLog());
  else if (S.view === 'log') set('live-log', liveLog());
}
/* dipanggil setelah data baru datang: form yang sedang diisi tidak boleh terhapus */
function refresh() {
  if (S.view === 'dasbor') $('#app').innerHTML = viewDasbor();
  else if (S.view === 'jenis') { $('#app').innerHTML = viewJenis(); if (S.tab === 'riwayat') loadRiwayatJenis(); }
  else if (S.view === 'nama') $('#app').innerHTML = viewNama();
  else if (S.view === 'profil' && !['maint', 'riw'].includes(S.tab)) $('#app').innerHTML = viewProfil();
  else if (['tempat', 'mat'].includes(S.view)) { $('#app').innerHTML = VIEWS()[S.view](); if (S.view === 'mat') renderLive(); }
  else renderLive();
  if (S.stokEd) stokPreview();
  renderChrome();
  if (S.scan) renderScan();
}

/* ---------- Mesin: daftar per jenis ---------- */
const FILTERS = [['', 'Semua'], ['tersedia', 'Tersedia'], ['luar', 'Di luar'], ['rusak', 'Rusak'], ['servis', 'Servis'], ['telat', 'Servis terlewat'], ['off', 'Nonaktif']];
const isWide = () => window.matchMedia('(min-width: 1000px)').matches;
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
function aggStats(g, held) {
  const st = { total: 0, ok: 0, out: 0, bad: 0, warn: 0, off: 0 };
  g.jenis.forEach(j => { const x = jstats(j.id, held); Object.keys(st).forEach(k => { st[k] += x[k]; }); });
  return st;
}
function viewMesin() {
  if (!S.jenis.length) {
    return '<p class="empty" id="jempty">' + (!S.loaded ? (S.loadError === 'config' ? 'Server belum diatur. Isi alamat di config.js.' : S.loadError ? 'Data belum bisa dimuat. Cek sinyal lalu buka lagi.' : 'Memuat data mesin…')
      : 'Belum ada mesin. Tekan + Mesin baru untuk menambah.') + '</p>';
  }
  const list = '<div class="lhead"><b>Mesin</b>' + (isWide() ? '<button class="btn small" data-action="tambah">' + ic('plus', 20) + 'Mesin baru</button>' : '') + '</div>' +
    '<p class="stats" id="stats"></p>' +
    '<input id="q" class="field" type="search" placeholder="Cari kode, nama, merek, atau model" value="' + esc(S.q) + '" autocomplete="off" aria-label="Cari mesin" style="margin-bottom:10px">' +
    '<div class="fchips" id="fchips" role="group" aria-label="Filter">' + FILTERS.map(([v, l]) => '<button class="fchip" data-action="filter" data-f="' + v + '" aria-pressed="' + (S.filter === v) + '">' + l + '</button>').join('') + '</div>' +
    '<div class="jlist" id="jlist"></div>';
  return isWide() ? '<div class="split"><section class="lcol">' + list + '</section><section class="dpane" id="dpane"></section></div>' : list;
}
function groupMatch(g, held, q, f) {
  const us = nameUnits(g);
  if (q && !norm([g.name, g.cat].concat(g.jenis.map(j => j.b + ' ' + j.m)).join(' ') + ' ' + us.map(u => u.k + ' ' + (u.pm || '')).join(' ')).includes(q)) return false;
  const st = aggStats(g, held);
  if (f === 'tersedia') return st.ok > 0;
  if (f === 'luar') return st.out > 0;
  if (f === 'rusak') return st.bad > 0;
  if (f === 'servis') return st.warn > 0;
  if (f === 'telat') return us.some(u => !u.off && nextService(u.k) && daysFromToday(nextService(u.k)) < 0);
  if (f === 'off') return st.off > 0;
  return (st.total + st.off) > 0;
}
function renderJlist(keep) {
  const el = $('#jlist'); if (!el) return;
  const held = heldMap(), q = norm(S.q), f = S.filter;
  const rows = [...nameGroups().values()].filter(g => groupMatch(g, held, q, f)).sort((a, b) => byName(a.name, b.name));
  const c = { ok: 0, bad: 0, warn: 0, out: 0 };
  S.jenis.forEach(j => { const s = jstats(j.id, held); c.ok += s.ok; c.bad += s.bad; c.warn += s.warn; c.out += s.out; });
  const st = $('#stats'); if (st) st.textContent = c.ok + ' tersedia · ' + c.out + ' di luar · ' + c.bad + ' rusak · ' + c.warn + ' servis';
  document.querySelectorAll('#fchips .fchip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
  const wide = isWide() && !!$('#dpane');
  if (wide && !rows.some(g => g.key === S.nm)) { S.nm = rows.length ? rows[0].key : null; S.wj = null; }
  el.innerHTML = rows.length ? rows.map(g => {
    const s2 = aggStats(g, held), first = g.jenis.find(j => j.f) || g.jenis[0];
    return '<button class="jcard' + (wide && g.key === S.nm ? ' sel' : '') + '" data-action="' + (wide ? 'wnama' : 'nama') + '" data-nm="' + esc(g.key) + '"' + (wide ? ' aria-pressed="' + (g.key === S.nm) + '"' : '') + '>' + thumbHtml(first.id, 30) +
      '<span class="nm"><b>' + esc(g.name) + '</b><small>' + g.jenis.length + ' merek/model · ' + (s2.total + s2.off) + ' unit</small><span class="pills">' + pillsOf(s2) + '</span></span>' + (wide ? '' : ic('chev', 20)) + '</button>';
  }).join('') : '<p class="empty">Tidak ada mesin yang cocok.</p>';
  if (wide && (!keep || S.detNm !== S.nm)) renderDetail();
}

/* ---------- tingkat 2: satu nama mesin, daftar merek/model ---------- */
function jenisBar(j, held) {
  const st = jstats(j.id, held);
  const pd = j.pv ? '<span class="pill ok">Panduan v' + j.pv + '</span>' : '<span class="pill unk">Belum ada panduan</span>';
  return '<button class="jcard" data-action="jenis" data-id="' + esc(j.id) + '">' + thumbHtml(j.id, 30) +
    '<span class="nm"><b>' + esc(j.b || 'Tanpa merek') + '</b><small>' + esc(j.m || 'Tanpa model') + '</small><span class="pills">' + pillsOf(st) + pd + '</span></span>' + ic('chev', 20) + '</button>';
}
function viewNama() {
  const g = nameGroup(S.nm);
  if (!g) return '<p class="empty">' + (S.loaded ? 'Mesin tidak ditemukan.' : 'Memuat data mesin…') + '</p>';
  const held = heldMap();
  return '<div class="pills" style="margin-bottom:10px"><span class="pill unk">' + esc(g.cat || 'Tanpa kategori') + '</span>' + pillsOf(aggStats(g, held)) + '</div>' +
    '<div class="jlist">' + g.jenis.map(j => jenisBar(j, held)).join('') +
    '<a class="dashed" href="#" data-action="tambahjenis" data-nm="' + esc(g.key) + '">' + ic('plus', 20) + 'Tambah merek/model</a></div>';
}

/* ---------- layar lebar: panel detail di kanan ---------- */
function selJenis(g) {
  if (!g.jenis.some(j => j.id === S.wj)) S.wj = g.jenis[0].id;
  return J[S.wj];
}
function unitRows(jid, held) {
  return (JU[jid] || []).map(u => {
    const h = held.get(u.k);
    const stat = u.off ? '<span class="pill unk">Nonaktif</span>' : h ? '<span class="pill ' + (isLate(h) ? 'late' : 'out') + '">Di luar</span>' : u.s === 'ok' ? '<span class="pill ok">Di tempat</span>' : '<span class="pill ' + u.s + '">' + esc(u.sl) + '</span>';
    let btn;
    if (u.off) btn = '';
    else if (h) btn = '<button class="btn small ret" data-action="uret" data-k="' + esc(u.k) + '">Kembalikan</button>';
    else if (u.s === 'bad') btn = '';
    else btn = '<button class="btn small" data-action="uambil" data-k="' + esc(u.k) + '">Ambil</button>';
    return '<tr><td><b>Unit ' + esc(u.u) + '</b></td><td><button class="ulink" data-action="openunit" data-k="' + esc(u.k) + '"><span class="code">' + esc(u.k) + '</span></button></td>' +
      '<td>' + (hasPlace(u) ? esc(placeName(u)) : '<span class="muted">—</span>') + '</td><td>' + (u.pm ? esc(u.pm) : '<span class="muted">—</span>') + '</td>' +
      '<td>' + (h ? esc(h.nama) : '<span class="muted">—</span>') + '</td><td>' + stat + '</td>' +
      '<td class="act">' + btn + '<button class="btn small ghost ico" data-action="uedit" data-k="' + esc(u.k) + '" aria-label="Ubah ' + esc(u.k) + '">' + ic('edit', 20) + '</button></td></tr>';
  }).join('');
}
function renderDetail() {
  const el = $('#dpane'); if (!el) return;
  const g = nameGroup(S.nm);
  if (!g) { el.innerHTML = '<p class="empty">Pilih mesin di daftar.</p>'; return; }
  const j = selJenis(g); S.jid = j.id;
  const held = heldMap(), us = nameUnits(g);
  const tab = ['unit', 'panduan', 'riwayat'].includes(S.tab) ? S.tab : 'unit';
  const tabs = [['unit', 'Unit'], ['panduan', 'Maintenance'], ['riwayat', 'Riwayat']].map(([k, l]) => '<button role="tab" data-action="wtab" data-t="' + k + '" aria-selected="' + (tab === k) + '">' + l + '</button>').join('');
  let body;
  if (tab === 'riwayat') body = '<div id="live-riw">' + liveRiw() + '</div>';
  else if (tab === 'panduan') body = '<div id="live-pd">' + livePanduan() + '</div>' + maintHeadingHtml(j.id) + jenisMaintHtml(j.id);
  else {
    const ms = maintSummaryJenis(j.id);
    body = '<div class="tblwrap"><table class="tbl"><thead><tr><th>Unit</th><th>Kode</th><th>Tempat</th><th>Pemilik</th><th>Dipegang oleh</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' + unitRows(j.id, held) + '</tbody></table></div>' +
      '<a class="dashed" style="margin-top:10px" href="#" data-action="tambahunit" data-id="' + esc(j.id) + '">' + ic('plus', 20) + 'Tambah unit ' + esc(j.n) + '</a>' +
      '<div class="two" style="margin-top:14px"><section class="card"><h3>Maintenance</h3><p class="muted" style="margin:0">' + (j.pv ? 'Panduan v' + j.pv + (j.pi ? ' · setiap ' + j.pi + ' bulan' : '') : 'Belum ada panduan') + '</p>' +
      '<p style="margin:6px 0 0">' + ms.n + ' catatan · ' + (ms.next ? 'berikutnya ' + esc(fmtShort(ms.next)) : 'belum ada jadwal') + '</p></section>' +
      '<section class="card"><h3>Riwayat terakhir</h3><div id="live-riw">' + liveRiw(4) + '</div></section></div>';
  }
  el.innerHTML = '<div class="dhead">' + heroHtml(j.id, 'small') + '<div class="dt"><h1>' + esc(g.name) + '</h1><p class="muted" style="margin:2px 0 6px">' + g.jenis.length + ' merek/model · ' + us.filter(u => !u.off).length + ' unit</p><div class="pills">' + pillsOf(aggStats(g, held)) + '</div></div>' +
    '<button class="btn ghost small" data-action="jedit">' + ic('edit', 20) + 'Ubah merek, tipe, dan nama</button></div>' +
    '<div class="mcards">' + g.jenis.map(x => { const s2 = jstats(x.id, held); return '<button class="mcard" data-action="wjenis" data-id="' + esc(x.id) + '" aria-pressed="' + (x.id === j.id) + '"><b>' + esc(x.b || 'Tanpa merek') + '</b><small>' + esc(x.m || 'Tanpa model') + '</small><span>' + (s2.total + s2.off) + ' unit</span></button>'; }).join('') +
    '<a class="mcard add" href="#" data-action="tambahjenis" data-nm="' + esc(g.key) + '">' + ic('plus', 20) + 'Merek/model</a></div>' +
    '<div class="utabs" role="tablist">' + tabs + '</div>' + body;
  S.detNm = S.nm;
  if ((tab === 'riwayat' || tab === 'unit') && !(S.riw.key === j.id && S.riw.list)) loadRiwayatJenis(tab === 'unit' ? 4 : 0);
  if (tab === 'panduan' && !(S.pd && S.pd.jid === j.id && S.pd.list)) loadPanduan();
}
function maintSummaryJenis(jid) {
  let n = 0, next = '';
  (JU[jid] || []).forEach(u => { const m = maintSummary(u.k); n += m.n; const nx = nextService(u.k); if (nx && (!next || nx < next)) next = nx; });
  return { n, next };
}
function maintExtraHtml(m, jid) {
  const parts = [];
  skemaFor(jid).forEach(f => {
    const v = m.data && m.data[f.id];
    if (v === undefined || v === null || v === '') return;
    const disp = f.tipe === 'centang' ? (v ? 'Ya' : null) : f.tipe === 'tanggal' ? fmtShort(v) : String(v);
    if (disp === null) return;
    parts.push('<span class="xf">' + esc(f.label) + ': ' + esc(disp) + '</span>');
  });
  let html = parts.length ? '<p class="xfields">' + parts.join(' · ') + '</p>' : '';
  if (m.lampiran) html += '<p><a href="' + esc(m.lampiran) + '" target="_blank" rel="noopener noreferrer">' + ic('book', 18) + 'Lihat laporan PDF</a></p>';
  return html;
}
const SKEMA_TIPE_L = { teks: 'Teks', angka: 'Angka', tanggal: 'Tanggal', centang: 'Centang' };
function viewSkema() {
  const jid = curJid(), j = J[jid];
  if (!j) return '<p class="empty">' + (S.loaded ? 'Jenis tidak ditemukan.' : 'Memuat…') + '</p>';
  const cols = skemaFor(jid);
  const rows = cols.map(f => '<div class="skrow"><div style="flex:1;min-width:0"><b>' + esc(f.label) + '</b><br><span class="pill ok" style="margin-top:3px;display:inline-block">' + SKEMA_TIPE_L[f.tipe] + '</span></div>' +
    '<button class="btn small ghost" data-action="skedit" data-id="' + esc(f.id) + '" aria-label="Ubah kolom ' + esc(f.label) + '">' + ic('edit', 18) + '</button>' +
    '<button class="x' + (S.confirmDel === 'sk:' + f.id ? ' confirm' : '') + '" data-action="skdel" data-id="' + esc(f.id) + '" aria-label="Hapus kolom ' + esc(f.label) + '">' + (S.confirmDel === 'sk:' + f.id ? 'Yakin?' : '✕') + '</button></div>').join('');
  const form = S.skForm ? skFormHtml(S.skForm) : '<a class="dashed" href="#" data-action="skadd">' + ic('plus', 20) + 'Tambah kolom</a>';
  return '<p class="muted" style="margin:0 0 12px">Kolom ini muncul saat mengisi riwayat maintenance untuk ' + esc(j.n) + ' saja.</p>' +
    (cols.length ? '<div class="stack">' + rows + '</div>' : '<p class="muted">Belum ada kolom khusus.</p>') +
    '<div style="margin-top:14px">' + form + '</div>';
}
function skFormHtml(f) {
  return '<section class="card"><h3>' + (f.id ? 'Ubah kolom' : 'Kolom baru') + '</h3><div class="stack">' +
    fld('skLabel', 'Nama kolom', f.label || '', { ph: 'contoh: Jam operasi' }) +
    '<div><label class="lbl" for="skTipe">Tipe</label><select id="skTipe" class="field">' + Object.keys(SKEMA_TIPE_L).map(k => '<option value="' + k + '"' + (f.tipe === k ? ' selected' : '') + '>' + SKEMA_TIPE_L[k] + '</option>').join('') + '</select></div>' +
    '<div class="two"><button class="btn" data-action="sksave">Simpan</button><button class="btn ghost" data-action="skcancel">Batal</button></div></div></section>';
}
function maintHeadingHtml(jid) {
  return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap"><h2 class="h2" style="margin:0">Catatan maintenance unit</h2>' +
    '<button class="btn ghost small" data-action="skemaopen" data-id="' + esc(jid) + '">' + ic('edit', 18) + 'Atur kolom</button></div>';
}
function jenisMaintHtml(jid) {
  const rows = [];
  (JU[jid] || []).forEach(u => maintFor(u.k).forEach(m => rows.push({ u, m })));
  rows.sort((a, b) => b.m.tgl.localeCompare(a.m.tgl));
  if (!rows.length) return '<p class="muted">Belum ada catatan maintenance untuk jenis ini.</p>';
  return '<ul class="mlist">' + rows.slice(0, 20).map(({ u, m }) => '<li><div class="top2"><span class="jenis">' + esc(m.jenis || 'Maintenance') + ' · <span class="code">' + esc(u.k) + '</span></span></div><div class="meta">Unit ' + esc(u.u) + ' · ' + esc(fmtShort(m.tgl)) + (m.oleh ? ' · ' + esc(m.oleh) : '') + (m.next ? ' · berikutnya ' + esc(fmtShort(m.next)) : '') + '</div>' + (m.cat ? '<p>' + esc(m.cat) + '</p>' : '') + maintExtraHtml(m, jid) + '</li>').join('') + '</ul>';
}

/* ---------- Jenis: daftar unit ---------- */
function unitCard(u, held) {
  const h = held.get(u.k);
  let btn;
  if (u.off) btn = '<span class="ubtn off">Nonaktif</span>';
  else if (h) btn = '<button class="ubtn ret" data-action="uret" data-k="' + esc(u.k) + '">Kembalikan</button>';
  else if (u.s === 'bad') btn = '<span class="ubtn off">' + esc(u.sl) + '</span>';
  else btn = '<button class="ubtn" data-action="uambil" data-k="' + esc(u.k) + '">Ambil</button>';
  const kv = (l, v) => '<div class="kv"><span>' + l + '</span><b>' + v + '</b></div>';
  const extra = [u.sn ? 'Seri ' + esc(u.sn) : '', u.cat ? esc(u.cat) : ''].filter(Boolean).join(' · ');
  return '<div class="ucard' + ((S.focus || S.kode) === u.k ? ' focus' : '') + '" id="u-' + esc(u.k) + '"><div class="l1"><button class="ulink" data-action="openunit" data-k="' + esc(u.k) + '"><b class="unum">Unit ' + esc(u.u) + '</b><span class="dot">·</span><span class="code">' + esc(u.k) + '</span></button><span class="pill ' + u.s + '">' + esc(u.off ? u.cond : u.sl) + '</span></div>' +
    '<div class="l2">' + kv('Pemilik', u.pm ? esc(u.pm) : '<i class="muted">belum diisi</i>') +
    kv('Dipegang', u.off ? '<span class="pill unk">Nonaktif</span>' : h ? '<span class="pill ' + (isLate(h) ? 'late' : 'out') + '">' + esc(h.nama) + (isLate(h) ? ' (terlambat)' : '') + '</span>' : '<span class="muted">tidak ada</span>') +
    kv('Tempat', hasPlace(u) ? esc(placeName(u)) : '<span class="muted">belum punya tempat</span>') + (extra ? '<div class="ex">' + extra + '</div>' : '') + '</div>' +
    '<div class="l3">' + btn + '<button class="ubtn edit" data-action="uedit" data-k="' + esc(u.k) + '" aria-label="Ubah ' + esc(u.k) + '">' + ic('edit', 22) + '</button></div></div>';
}
function heroHtml(jid, small) {
  return '<div class="hero' + (small ? ' small' : '') + '">' + thumbHtml(jid, 56, 'hph') + '<button class="herobtn" data-action="fotoedit" data-id="' + esc(jid) + '">' + ic('cam', 20) + 'Ganti foto</button></div>';
}
function viewJenis() {
  const jid = curJid(), j = J[jid];
  if (!j) return '<p class="empty">' + (S.loaded ? 'Kode atau jenis tidak ditemukan.' : 'Memuat data mesin…') + '</p>';
  const held = heldMap(), st = jstats(jid, held);
  const tabs = [['unit', 'Unit (' + (JU[jid] || []).length + ')'], ['panduan', 'Maintenance'], ['riwayat', 'Riwayat']].map(([k, l]) => '<button role="tab" data-action="jtab" data-t="' + k + '" aria-selected="' + (S.tab === k) + '">' + l + '</button>').join('');
  let body;
  if (S.tab === 'riwayat') body = '<div id="live-riw">' + liveRiw() + '</div>';
  else if (S.tab === 'panduan') body = '<div id="live-pd">' + livePanduan() + '</div>' + maintHeadingHtml(jid) + jenisMaintHtml(jid);
  else body = (JU[jid] || []).map(u => unitCard(u, held)).join('') +
    '<a class="dashed" href="#" data-action="tambahunit" data-id="' + esc(jid) + '">' + ic('plus', 20) + 'Tambah unit ' + esc(j.n) + '</a>';
  return heroHtml(jid) +
    '<div class="pills" style="margin-bottom:10px"><span class="pill unk">' + esc(j.c || 'Tanpa kategori') + '</span>' + pillsOf(st) + '</div>' +
    '<button class="btn ghost small block" style="margin-bottom:10px" data-action="jedit">' + ic('edit', 20) + 'Ubah merek, tipe, dan nama</button>' +
    '<div class="utabs" role="tablist">' + tabs + '</div>' + body;
}
function liveRiw(max) {
  const key = curJid();
  if (S.riw.key !== key || S.riw.list === null) return '<p class="muted">Memuat…</p>';
  if (S.riw.error) return '<p class="muted">Riwayat belum bisa dimuat. Cek sinyal.</p>';
  if (!S.riw.list.length) return '<p class="muted">Belum ada yang mengambil mesin ini.</p>';
  return '<ul class="chips">' + S.riw.list.slice(0, max || 999).map(r => '<li><span><b>' + esc(r.nama) + '</b>' + (r.dept ? ' (' + esc(r.dept) + ')' : '') + ' · <span class="code">' + esc(r.kode) + '</span><br><small class="muted">Ambil ' + esc(fmtDT(r.ts)) + ' · ' + (r.kembali ? 'Kembali ' + esc(fmtDT(r.kembali)) + (r.kondisi ? ' (' + esc(r.kondisi) + ')' : '') : '<b>belum kembali</b>') + '</small></span></li>').join('') + '</ul>';
}
async function loadRiwayatJenis(max) {
  const key = curJid(); if (!key) return;
  S.riw = { key, list: null, error: false }; const el = $('#live-riw'); if (el) el.innerHTML = liveRiw(max);
  try { const j = await api('riwayatJenis', { id: key }); if (S.riw.key === key) S.riw.list = j.riwayat; }
  catch (e) { if (S.riw.key === key) { S.riw.list = []; S.riw.error = true; } }
  const el2 = $('#live-riw'); if (el2 && S.riw.key === curJid()) el2.innerHTML = liveRiw(max);
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
function placeField(id, cur) {
  const t = isLok(cur) ? T[cur] : null;
  const label = t ? t.n + (t.l ? ' · ' + t.l : '') : (isLok(cur) ? cur : 'Belum punya tempat');
  return '<div><label class="lbl">Tempat simpan</label><button type="button" class="namebar plain" data-action="pickplace" data-for="' + id + '"><span class="g" id="' + id + '-l">' + esc(label) + '</span>' + ic('chev', 18) + '</button>' +
    '<input type="hidden" id="' + id + '" value="' + esc(cur || '') + '"></div>';
}

function pmField(id, cur) {
  return '<div><label class="lbl">Pemilik (departemen, boleh kosong)</label><button type="button" class="namebar plain" data-action="pickpm" data-for="' + id + '"><span class="g" id="' + id + '-l">' + esc(cur || 'Belum diisi') + '</span>' + ic('chev', 18) + '</button>' +
    '<input type="hidden" id="' + id + '" value="' + esc(cur || '') + '"></div>';
}
/* satu baris unit: "Unit 1 · BLW-003" dan di bawahnya nama lengkap + pemilik */
function unitLine(u) {
  const j = jenisOf(u);
  return { a: 'Unit ' + u.u + ' · ' + u.k, b: [j.n, j.b, j.m].filter(Boolean).join(' ') + (u.pm ? ' · Milik ' + u.pm : '') };
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
      '<div><label class="lbl" for="tkat">Kategori</label>' + katSelect('tkat', f.c || '', { empty: true }) + '</div>' +
      '<div id="tkatBox" hidden class="stack">' + fld('tkatNew', 'Nama kategori baru', '') + fld('tawalan', 'Awalan kode (3 huruf)', '', { ph: 'contoh: LST' }) + '</div>' +
      fld('tnama', 'Nama mesin', f.n || '', { ph: 'contoh: Bor' }) +
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
    placeField('tloc', S.form.loc || '') + pmField('tpm', '') +
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
    '<p class="muted" style="margin:10px 0 0;font-size:14px">Kode tidak bisa diubah karena sudah tercetak di label QR. ' + esc(subText(j)) + '</p>' +
    '<button class="btn ghost small block" style="margin-top:10px" data-action="jedit">' + ic('edit', 20) + 'Ubah merek, tipe, dan nama</button></section>' +
    '<section class="card"><h3>Data unit</h3><div class="stack">' +
    fld('uu', 'No. unit', u.u, { mode: 'numeric' }) +
    '<div><label class="lbl">Kondisi</label>' + kseg('uk', u.off ? u.cond : u.cond) + '</div>' +
    placeField('uloc', u.loc) + pmField('upm', u.pm) +
    fld('usn', 'No. seri pabrik', u.sn) +
    '<div class="two stk">' + fld('utb', 'Tanggal beli', u.tb, { type: 'date' }) + fld('ugs', 'Garansi sampai', u.gs, { type: 'date' }) + '</div>' +
    '<div><label class="lbl" for="ucat">Catatan</label><textarea id="ucat" class="field">' + esc(u.cat) + '</textarea></div>' +
    '<button class="btn" data-action="usave">Simpan perubahan</button></div></section>' +
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
      (r.cat ? '<p>' + esc(r.cat) + '</p>' : '') + maintExtraHtml(r, u.j) + '</li>').join('') + '</ul>';
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


/* ---------- profil unit (hasil scan Lihat, atau ketuk kode unit) ---------- */
function maintFieldHtml(f) {
  const id = 'mx_' + f.id;
  if (f.tipe === 'centang') return '<label style="display:flex;align-items:center;gap:10px;min-height:40px"><input type="checkbox" id="' + id + '"> <span>' + esc(f.label) + '</span></label>';
  const type = f.tipe === 'tanggal' ? 'date' : f.tipe === 'angka' ? 'number' : 'text';
  return '<div><label class="lbl" for="' + id + '">' + esc(f.label) + '</label><input id="' + id + '" class="field" type="' + type + '"' + (type === 'number' ? ' step="any"' : '') + '></div>';
}
function maintBlock(jid) {
  const custom = skemaFor(jid);
  return '<section class="card"><h3>Maintenance</h3><div id="live-maint"></div>' +
    '<button class="btn" style="width:100%;margin-top:14px" data-action="maintopen" id="maintOpenBtn">Catat maintenance</button>' +
    '<form class="stack" id="maintForm" hidden style="margin-top:14px"><div class="two stk"><div><label class="lbl" for="mDate">Tanggal</label><input id="mDate" class="field" type="date" value="' + today() + '" required></div>' +
    '<div><label class="lbl" for="mJenis">Jenis</label><select id="mJenis" class="field">' + MJENIS.map(x => '<option>' + x + '</option>').join('') + '</select></div></div>' +
    '<div><label class="lbl" for="mOleh">Dikerjakan oleh</label><input id="mOleh" class="field" type="text" value="' + esc(lsGet('qrg.mOleh', S.me)) + '" autocomplete="off"></div>' +
    '<div><label class="lbl" for="mCat">Catatan</label><textarea id="mCat" class="field" placeholder="Contoh: ganti karbon brush, oli gearbox"></textarea></div>' +
    (custom.length ? '<div class="h2" style="margin-top:4px">Kolom khusus</div>' + custom.map(maintFieldHtml).join('') : '') +
    '<div><label class="lbl" for="mPdf">Link PDF laporan servis (boleh kosong)</label><input id="mPdf" class="field" type="text" placeholder="Tempel link PDF di sini"></div>' +
    '<div><label class="lbl" for="mNext">Jadwal berikutnya (boleh kosong)</label><input id="mNext" class="field" type="date"></div>' +
    '<div class="two"><button class="btn" type="submit">Simpan</button><button class="btn ghost" type="button" data-action="maintcancel">Batal</button></div></form></section>';
}
function viewProfil() {
  const u = U[S.kode];
  if (!u) return '<p class="empty">' + (S.loaded ? 'Unit tidak ditemukan.' : 'Memuat data mesin…') + '</p>';
  const j = jenisOf(u), h = heldMap().get(u.k), tab = ['maint', 'riw'].includes(S.tab) ? S.tab : 'aset';
  const tabs = [['aset', 'Aset'], ['maint', 'Maintenance'], ['riw', 'Riwayat']].map(([k, l]) => '<button role="tab" data-action="ptab" data-t="' + k + '" aria-selected="' + (tab === k) + '">' + l + '</button>').join('');
  const sv = serviceText(u.k);
  const row = (l, v) => '<div class="drow"><dt>' + l + '</dt><dd>' + v + '</dd></div>';
  let body;
  if (tab === 'maint') body = maintBlock(u.j);
  else if (tab === 'riw') body = '<div id="live-riwu">' + liveRiwUnit() + '</div>';
  else {
    const gs = u.gs ? esc(fmtShort(u.gs)) + (daysFromToday(u.gs) < 0 ? ' <span class="pill late">Habis</span>' : ' <span class="pill ok">Berlaku</span>') : '—';
    body = '<dl class="dl">' + row('Kategori', esc(j.c || '—')) + row('Merek · tipe', (esc(subText(j)) || '—') + ' <button class="ulink" data-action="jedit">Ubah</button>') +
      row('Pemilik', u.pm ? esc(u.pm) : '<span class="muted">Belum diisi</span>') + row('Lokasi simpan', hasPlace(u) ? '<button class="ulink" data-action="opentempat" data-id="' + esc(u.loc) + '">' + esc(placeText(u)) + '</button>' : 'Belum punya tempat') +
      row('Servis berikutnya', '<span class="sv ' + sv.c + '">' + esc(sv.t) + '</span>') + row('No. seri', esc(u.sn) || '—') +
      row('Tanggal beli', u.tb ? esc(fmtShort(u.tb)) : '—') + row('Garansi sampai', gs) + (u.cat ? row('Catatan', esc(u.cat)) : '') + '</dl>' +
      '<div class="two" style="margin-top:12px"><button class="btn ghost small" data-action="uedit" data-k="' + esc(u.k) + '">Ubah unit</button><a class="btn ghost small" href="label.html?kode=' + esc(u.k) + '">Cetak label QR</a></div>' +
      '<p class="muted" style="font-size:13px;margin:10px 0 0">Panduan maintenance ada di <a href="#" data-action="opentab" data-id="' + esc(u.j) + '" data-t="panduan">halaman jenis ' + esc(j.n) + '</a>.</p>';
  }
  const heldBox = h ? '<div class="heldbox"><div class="lbl2">Sedang dibawa</div><div class="who"><b>' + esc(h.nama) + '</b> <span class="muted">· sejak ' + esc(fmtDT(h.ts)) + '</span></div>' +
    '<div class="two3"><button class="ubtn ret" data-action="ret" data-id="' + esc(h.id) + '">Kembalikan</button><button class="ubtn rus" data-action="retrusak" data-id="' + esc(h.id) + '" data-k="' + esc(u.k) + '">Rusak</button></div></div>' : '';
  let bar;
  if (u.off) bar = '<span class="pdis">Unit nonaktif</span>';
  else if (h) bar = '<button class="pbtn ret" data-action="uret" data-k="' + esc(u.k) + '">' + ic('check', 24) + 'Kembalikan mesin ini</button>';
  else if (u.s === 'bad') bar = '<span class="pdis">' + esc(u.sl) + '. Tidak bisa diambil.</span>';
  else bar = '<button class="pbtn" data-action="uambil" data-k="' + esc(u.k) + '">' + ic('check', 24) + 'Ambil mesin ini</button>';
  return heroHtml(u.j) +
    '<div class="pid"><span class="code">' + esc(u.k) + '</span><h1>' + esc(j.n) + ' · Unit ' + esc(u.u) + '</h1><div class="pills"><span class="pill ' + u.s + '">' + esc(u.sl) + '</span>' +
    (h ? '<span class="pill ' + (isLate(h) ? 'late' : 'out') + '">Di luar · ' + esc(h.nama) + '</span>' : '') + '</div></div>' + heldBox +
    '<div class="utabs" role="tablist">' + tabs + '</div>' + body + '<div class="pbar">' + bar + '</div>';
}
function liveRiwUnit() {
  const key = S.kode;
  if (!S.riwu || S.riwu.key !== key || S.riwu.list === null) return '<p class="muted">Memuat…</p>';
  if (S.riwu.error) return '<p class="muted">Riwayat belum bisa dimuat. Cek sinyal.</p>';
  if (!S.riwu.list.length) return '<p class="muted">Belum ada yang mengambil unit ini.</p>';
  return '<ul class="chips">' + S.riwu.list.map(r => '<li><span><b>' + esc(r.nama) + '</b>' + (r.dept ? ' (' + esc(r.dept) + ')' : '') + '<br><small class="muted">Ambil ' + esc(fmtDT(r.ts)) + ' · ' + (r.kembali ? 'Kembali ' + esc(fmtDT(r.kembali)) + (r.kondisi ? ' (' + esc(r.kondisi) + ')' : '') : '<b>belum kembali</b>') + '</small></span></li>').join('') + '</ul>';
}
async function loadRiwayatUnit() {
  const key = S.kode; if (!key) return;
  S.riwu = { key, list: null, error: false }; const el = $('#live-riwu'); if (el) el.innerHTML = liveRiwUnit();
  try { const j = await api('riwayat', { kode: key }); if (S.riwu.key === key) S.riwu.list = j.riwayat; }
  catch (e) { if (S.riwu.key === key) { S.riwu.list = []; S.riwu.error = true; } }
  const el2 = $('#live-riwu'); if (el2) el2.innerHTML = liveRiwUnit();
}
