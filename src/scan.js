/* ---------- kamera dan pembaca QR ---------- */
let stream = null, starting = false, scanning = false, detector = null, lastCode = '', lastAt = 0, lastTry = 0, fbTimer = null, torchOn = false;
const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });

async function startCamera() {
  if (stream) return true;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
  if (starting) return true;
  starting = true;
  let st;
  try {
    st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  } catch (e) { starting = false; return false; }
  starting = false;
  if (!S.scan) { st.getTracks().forEach(t => t.stop()); return false; } /* layar scan sudah ditutup selagi kamera dibuka */
  stream = st;
  const v = $('#vid'); v.srcObject = stream; try { await v.play(); } catch (e) {}
  if (stream !== st) return false;
  const track = st.getVideoTracks()[0], caps = track.getCapabilities ? track.getCapabilities() : {};
  $('#torchBtn').hidden = !caps.torch; torchOn = false;
  detector = null;
  if ('BarcodeDetector' in window) { try { detector = new BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { detector = null; } }
  scanning = true; lastCode = ''; lastAt = 0;
  requestAnimationFrame(scanLoop);
  return true;
}
function stopCamera() {
  scanning = false;
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  const v = $('#vid'); if (v) v.srcObject = null;
}
/* hanya area di dalam kotak kecil (#frame) yang dibaca. QR di luar kotak diabaikan. */
function frameCrop(v) {
  const fe = $('#frame'); if (!fe || !v.videoWidth) return null;
  const vr = v.getBoundingClientRect(), fr = fe.getBoundingClientRect();
  if (!vr.width || !vr.height || !fr.width) return null;
  const vw = v.videoWidth, vh = v.videoHeight, k = Math.max(vr.width / vw, vr.height / vh);
  const ox = (vr.width - vw * k) / 2, oy = (vr.height - vh * k) / 2;
  let x = (fr.left - vr.left - ox) / k, y = (fr.top - vr.top - oy) / k, w = fr.width / k, h = fr.height / k;
  const x2 = Math.min(vw, x + w), y2 = Math.min(vh, y + h);
  x = Math.max(0, x); y = Math.max(0, y); w = x2 - x; h = y2 - y;
  return w > 8 && h > 8 ? { x, y, w, h } : null;
}
async function detect(v) {
  const c = frameCrop(v); if (!c) return null;
  const sc = Math.min(1, 480 / Math.max(c.w, c.h));
  cv.width = Math.max(1, Math.round(c.w * sc)); cv.height = Math.max(1, Math.round(c.h * sc));
  cx.drawImage(v, c.x, c.y, c.w, c.h, 0, 0, cv.width, cv.height);
  if (detector) { try { const r = await detector.detect(cv); return r && r[0] ? r[0].rawValue : null; } catch (e) { detector = null; } }
  const r = window.jsQR(cx.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height, { inversionAttempts: 'dontInvert' });
  return r && r.data ? r.data : null;
}
async function scanLoop() {
  if (!scanning) return;
  const v = $('#vid'), now = performance.now();
  if (S.scan && !S.scan.paused && !S.scan.done && v.readyState >= 2 && now - lastTry > 110 && $('#picker').hidden && $('#stokSheet').hidden) {
    lastTry = now;
    let text = null; try { text = await detect(v); } catch (e) {}
    if (text && S.scan) onCode(text);
  }
  requestAnimationFrame(scanLoop);
}

/* ---------- layar scan: daftar (keranjang) ---------- */
async function openScan(o = {}) {
  if (S.scan) return;
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume && audioCtx.resume(); } catch (e) {}
  S.scan = { mode: o.mode || 'ambil', basket: [], done: null, paused: false, fb: null };
  $('#scan').hidden = false; pushOv('scan');
  (o.preset || []).forEach(k => addToBasket(k));
  if (S.scan.basket.length) S.scan.paused = true;
  renderScan();
  const ok = await startCamera();
  if (!S.scan) return;
  if (!ok) {
    if (S.scan.basket.length) toast('Kamera tidak bisa dibuka. Daftar tetap bisa dicatat.');
    else { toast('Kamera tidak bisa dibuka. Izinkan kamera untuk situs ini di pengaturan browser.'); closeTop(); }
  }
}
function setFb(fb) {
  if (!S.scan) return;
  S.scan.fb = fb; clearTimeout(fbTimer); renderScan();
  fbTimer = setTimeout(() => { if (S.scan) { S.scan.fb = null; renderScan(); } }, 4500);
}
function onCode(text) {
  const code = String(text).split('#').pop().trim().toUpperCase(), now = Date.now();
  if (code === lastCode && now - lastAt < 2500) return;
  lastCode = code; lastAt = now;
  const sc = S.scan;
  if (sc.mode === 'tambah') {
    const f = S.form;
    if (!U[code] || U[code].off) { setFb({ type: 'bad', text: 'QR ini bukan mesin yang aktif.' }); beep(false); return; }
    if (f && !f.sel.includes(code)) f.sel.push(code);
    beep(true); setFb({ type: 'ok', text: code + ' dipilih. ' + (f ? f.sel.length : 0) + ' mesin terpilih.' }); return;
  }
  if (isLok(code)) {
    if (!T[code]) { setFb({ type: 'bad', text: code + ' tidak ada di daftar tempat.' }); beep(false); return; }
    beep(true); sc.place = code; sc.paused = true; sc.fb = null; renderScan(); return;
  }
  if (/^MAT-\d{3}$/.test(code)) {
    if (!M[code]) { setFb({ type: 'bad', text: code + ' tidak ada di daftar material.' }); beep(false); return; }
    beep(true); openStok(code, 'Keluar'); return;
  }
  if (sc.mode === 'lihat') {
    if (U[code]) { beep(true); const k = code; go('profil', { kode: k, jid: U[k].j }); }
    else { setFb({ type: 'bad', text: 'QR ini bukan mesin gudang.' }); beep(false); }
    return;
  }
  const fb = sc.mode === 'kembali' ? scanKembali(code) : scanAmbil(code);
  beep(fb.type === 'ok' || fb.type === 'warn'); setFb(fb);
}
function scanAmbil(code) {
  const u = U[code];
  if (!u) return { type: 'bad', text: 'QR ini bukan mesin gudang.' };
  if (u.off) return { type: 'bad', text: code + ' sudah dinonaktifkan, tidak bisa diambil.' };
  if (u.s === 'bad') return { type: 'bad', text: code + ' ' + u.sl.toLowerCase() + ', tidak bisa diambil.' };
  if (S.scan.basket.some(b => b.kode === code)) return { type: 'info', text: code + ' sudah ada di daftar.' };
  const item = addToBasket(code), h = item.held[0];
  S.scan.paused = true;
  if (h) return { type: 'warn', text: code + ' masih dibawa ' + h.nama + ' sejak ' + fmtDT(h.ts), sub: 'Akan dipindahkan ke nama yang Anda pilih.' };
  if (u.s === 'warn') return { type: 'warn', text: code + ' masuk daftar', sub: 'Perhatian: ' + u.sl };
  return { type: 'ok', text: code + ' masuk daftar' };
}
function addToBasket(code) {
  const u = U[code]; if (!u || S.scan.basket.some(b => b.kode === code)) return null;
  const heldNow = openEntries().filter(e => e.kode === code);
  const item = { kode: code, name: '', kondisi: 'Baik', held: heldNow.map(e => ({ id: e.id, nama: e.nama, ts: e.ts })) };
  if (S.scan.mode === 'kembali') { item.ids = heldNow.map(e => e.id); item.nama = heldNow[0] ? heldNow[0].nama : ''; item.ts = heldNow[0] ? heldNow[0].ts : ''; }
  S.scan.basket.push(item);
  return item;
}
function scanKembali(code) {
  const u = U[code];
  if (!u) return { type: 'bad', text: 'QR ini bukan mesin gudang.' };
  if (S.scan.basket.some(b => b.kode === code)) return { type: 'info', text: code + ' sudah ada di daftar.' };
  if (!openEntries().some(e => e.kode === code)) return { type: 'info', text: code + ' tidak sedang diambil (sudah di tempat).' };
  const item = addToBasket(code); S.scan.paused = true;
  return { type: 'ok', text: code + ' kembali dari ' + item.nama };
}

const MODE_TITLE = { ambil: 'Daftar ambil', kembali: 'Daftar kembali', lihat: 'Lihat mesin', tambah: 'Pilih mesin' };
function bitemHtml(b, i) {
  const u = U[b.kode], j = jenisOf(u), sc = S.scan;
  let h = '<div class="bitem' + (i === sc.basket.length - 1 && sc.paused ? ' new' : '') + '"><div class="r1"><span class="thumb">' + ic('tool', 26) + '</span><div class="inf"><b>' + esc(j.n) + ' · Unit ' + esc(u.u) + '</b>' +
    '<span class="code">' + esc(b.kode) + '</span> <span class="muted" style="font-size:13px">' + esc(subText(j)) + '</span><div class="pills"><span class="pill ' + u.s + '">' + esc(u.sl) + '</span></div></div>' +
    '<button class="x" data-action="bremove" data-k="' + esc(b.kode) + '" aria-label="Keluarkan ' + esc(b.kode) + ' dari daftar">' + ic('x', 20) + '</button></div>';
  if (sc.mode === 'ambil') {
    if (b.held.length) h += '<p class="note warn">Sekarang dibawa ' + esc(b.held[0].nama) + '. Akan dipindahkan.</p>';
    h += '<button class="namebar' + (b.name ? '' : ' need') + '" data-action="bname" data-k="' + esc(b.kode) + '" aria-label="Pilih nama pekerja untuk ' + esc(b.kode) + '"><span class="g">' + (b.name ? esc(b.name) + (deptOf(b.name) ? ' <small>' + esc(deptOf(b.name)) + '</small>' : '') : 'Pilih nama pekerja') + '</span>' + ic('chev', 18) + '</button>';
  } else {
    h += '<p class="muted" style="margin:0;font-size:14px">Dibawa ' + esc(b.nama) + ' sejak ' + esc(fmtDT(b.ts)) + '</p>' +
      '<div class="kb"><button class="ok" data-action="bkond" data-k="' + esc(b.kode) + '" data-v="Baik" aria-pressed="' + (b.kondisi === 'Baik') + '">Baik</button><button class="bad" data-action="bkond" data-k="' + esc(b.kode) + '" data-v="Rusak" aria-pressed="' + (b.kondisi === 'Rusak') + '">Rusak</button></div>';
  }
  return h + '</div>';
}
function renderScan() {
  const sc = S.scan; if (!sc) return;
  document.querySelectorAll('#scan .mode button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.mode === sc.mode)));
  $('#frame').className = 'frame' + (sc.fb && sc.fb.type !== 'info' ? ' ' + sc.fb.type : '');
  $('#hint').textContent = sc.place ? '' : sc.mode === 'tambah' ? 'Arahkan kamera ke QR mesin.' : sc.done ? '' : sc.paused ? 'Daftar siap. Tekan Tambah mesin untuk scan lagi.' : sc.mode === 'lihat' ? 'Arahkan kamera ke QR. Detail mesin akan terbuka.' : 'Arahkan kamera ke QR mesin.';
  const sh = $('#sheet');
  $('#scan .mode').hidden = sc.mode === 'tambah';
  if (sc.place) { sh.innerHTML = placePopup(sc.place); return; }
  if (sc.mode === 'tambah') {
    const n = S.form ? S.form.sel.length : 0;
    sh.innerHTML = '<div class="grab"></div><div class="sh-h"><span class="t">Pilih mesin</span><span class="n">' + n + '</span></div>' + (sc.fb ? '<div class="fb ' + sc.fb.type + '">' + esc(sc.fb.text) + '</div>' : '<p class="muted" style="margin:0;font-size:15px">Scan QR mesin satu per satu. Yang di-scan ikut terpilih.</p>') +
      '<div class="yn"><button class="yes" data-action="scanclose">Selesai</button></div>';
    return;
  }
  if (sc.done) {
    const d = sc.done;
    sh.innerHTML = '<div class="grab"></div><div class="donebox"><b>' + (d.mode === 'ambil' ? 'Tercatat diambil: ' : 'Tercatat kembali: ') + d.rec.length + ' mesin</b><ul>' +
      d.rec.map(r => '<li><span class="code">' + esc(r.kode) + '</span> ' + esc(r.label) + '</li>').join('') + '</ul></div>' +
      '<div class="yn"><button class="no" data-action="scanundo">Batalkan</button><button class="yes" data-action="scanagain">Scan lagi</button></div>';
    return;
  }
  const n = sc.basket.length;
  let h = '<div class="grab"></div><div class="sh-h"><span class="t">' + MODE_TITLE[sc.mode] + '</span>' + (sc.mode !== 'lihat' ? '<span class="n">' + n + '</span>' : '') + '</div>';
  if (sc.fb) h += '<div class="fb ' + sc.fb.type + '">' + esc(sc.fb.text) + (sc.fb.sub ? '<br><small>' + esc(sc.fb.sub) + '</small>' : '') + '</div>';
  if (sc.mode !== 'lihat') {
    h += sc.basket.map(bitemHtml).join('');
    if (!n && !sc.fb) h += '<p class="muted" style="margin:0;font-size:15px">' + (sc.mode === 'ambil' ? 'Scan QR mesin yang diambil. Satu per satu, lalu pilih nama untuk tiap mesin.' : 'Scan QR mesin yang dikembalikan.') + '</p>';
    if (n && sc.paused) h += '<button class="dashed" data-action="scanmore">' + ic('plus', 20) + 'Tambah mesin</button>';
    if (n) {
      const need = sc.mode === 'ambil' && sc.basket.some(b => !b.name);
      h += '<div class="yn"><button class="no" data-action="scanclear">Batal</button><button class="yes" data-action="scanyes"' + (need ? ' disabled' : '') + '>YA, catat ' + n + ' mesin</button></div>' +
        (need ? '<p class="muted" style="margin:0;font-size:14px;text-align:center">Pilih nama untuk setiap mesin dulu.</p>' : '');
    }
  }
  sh.innerHTML = h;
}
function scanSetMode(m) {
  const sc = S.scan; if (!sc || sc.mode === m) return;
  sc.mode = m; sc.basket = []; sc.done = null; sc.paused = false; sc.fb = null; renderScan();
}
function scanYes() {
  const sc = S.scan; if (!sc || !sc.basket.length) return;
  const rec = [];
  if (sc.mode === 'ambil') {
    if (sc.basket.some(b => !b.name)) { toast('Pilih nama untuk setiap mesin dulu.'); return; }
    sc.basket.forEach(b => {
      const u = U[b.kode], j = jenisOf(u), moved = [];
      openEntries().filter(e => e.kode === b.kode).forEach(e => { moved.push(e.id); enqueue('returnPengambilan', { id: e.id, waktu: nowIso(), kondisi: 'Baik', cat: 'Dialihkan ke ' + b.name }); });
      const id = uid();
      enqueue('addPengambilan', { id, tgl: today(), nama: b.name, dept: deptOf(b.name), kode: b.kode, mesin: mesinText(u), model: modelText(j), waktu: nowIso() });
      rec.push({ kode: b.kode, id, moved, label: unitTitle(u) + ' · ' + b.name });
    });
  } else {
    sc.basket.forEach(b => {
      const u = U[b.kode], rusak = b.kondisi === 'Rusak', prev = u.cond;
      b.ids.forEach(id => enqueue('returnPengambilan', { id, waktu: nowIso(), kondisi: b.kondisi }));
      if (rusak) patchUnit(b.kode, 'Rusak');
      rec.push({ kode: b.kode, ids: b.ids, rusak, prev, label: unitTitle(u) + (rusak ? ' · RUSAK' : ' · baik') });
    });
  }
  sc.done = { mode: sc.mode, rec }; sc.basket = []; sc.paused = false; sc.fb = null;
  beep(true); renderScan(); renderChrome();
}
function undoReturn(ids) {
  let all = true;
  ids.forEach(id => { if (!dropQueued(it => it.action === 'returnPengambilan' && it.payload.id === id)) { all = false; enqueue('batalKembali', { id }); } });
  return all;
}
function cancelEntry(id) {
  if (!dropQueued(it => it.action === 'addPengambilan' && it.payload.id === id)) enqueue('cancelPengambilan', { id });
}
function scanUndo() {
  const sc = S.scan; if (!sc || !sc.done) return;
  const d = sc.done;
  d.rec.forEach(r => {
    if (d.mode === 'ambil') { cancelEntry(r.id); if (r.moved.length) undoReturn(r.moved); }
    else {
      const dropped = undoReturn(r.ids);
      if (r.rusak) { patchUnit(r.kode, r.prev); if (!dropped) enqueue('pulihKondisi', { kode: r.kode, kondisi: r.prev }); }
    }
  });
  sc.done = null; sc.fb = { type: 'info', text: 'Dibatalkan.' }; renderScan(); renderChrome();
}
/* tombol Ambil / Kembalikan pada kartu unit */
function openScanPreset(mode, kode) { openScan({ mode, preset: [kode] }); }


/* popup isi tempat (hasil scan QR tempat LOK-xxx) */
function placePopup(tid) {
  const t = T[tid]; if (!t) return '';
  const sm = placeSummary(tid), held = heldMap();
  const urow = u => { const h = held.get(u.k), ln = unitLine(u); return '<button class="trow" data-action="scanopenunit" data-k="' + esc(u.k) + '"><span class="nm"><b>' + esc(ln.a) + '</b><small class="muted">' + esc(ln.b) + '</small></span>' +
    (h ? '<span class="pill out">Di luar · ' + esc(h.nama) + '</span>' : u.s === 'ok' ? '<span class="pill ok">Di tempat</span>' : '<span class="pill ' + u.s + '">' + esc(u.sl) + '</span>') + '</button>'; };
  const mrow = m => '<div class="trow mat"><button class="nm lnkbtn" data-action="openmat" data-id="' + esc(m.id) + '"><b>' + esc(m.n) + '</b></button>' +
    '<button class="rnd" data-action="stokopen" data-id="' + esc(m.id) + '" data-t="Keluar" aria-label="Kurangi">−</button><span class="qty"><b>' + esc(fmtQty(m.q)) + '</b><small>' + esc(m.s) + '</small></span><button class="rnd" data-action="stokopen" data-id="' + esc(m.id) + '" data-t="Masuk" aria-label="Tambah">+</button></div>';
  return '<div class="grab"></div><div class="sh-h"><span class="t">' + esc(t.n) + '</span><span class="n">' + sm.units.length + '</span></div><p class="muted" style="margin:-4px 0 0;font-size:14px"><span class="code">' + esc(t.id) + '</span>' + (t.l ? ' · ' + esc(t.l) : '') + ' · ' + sm.units.length + ' mesin · ' + sm.mats.length + ' material</p>' +
    (sm.units.length ? '<div class="tbox scroll">' + sm.units.sort((a, b) => a.k.localeCompare(b.k)).map(urow).join('') + '</div>' : '') +
    (sm.mats.length ? '<div class="tbox scroll">' + sm.mats.sort((a, b) => byName(a.n, b.n)).map(mrow).join('') + '</div>' : '') +
    (!sm.units.length && !sm.mats.length ? '<p class="muted" style="margin:0">Tempat ini masih kosong.</p>' : '') +
    '<div class="yn"><button class="no" data-action="placeclose">Scan lagi</button><button class="yes" data-action="placeopen" data-id="' + esc(t.id) + '">Buka semua</button></div>';
}

/* ---------- pemilih nama ---------- */
function openPicker(o) {
  S.picker = { q: '', ...o };
  const p = $('#picker'); p.hidden = false; pushOv('picker'); renderPicker();
  setTimeout(() => { const i = $('#pickq'); i && i.focus(); }, 60);
}
function renderPicker() {
  const pk = S.picker; if (!pk) return;
  $('#picker').innerHTML = '<h2>' + esc(pk.title || 'Pilih nama') + '</h2>' + (pk.sub ? '<p class="muted" style="margin:0">' + esc(pk.sub) + '</p>' : '') +
    '<input id="pickq" class="field" type="search" placeholder="' + (pk.items ? 'Cari' : 'Cari nama atau departemen') + '" autocomplete="off" aria-label="Cari" value="' + esc(pk.q) + '"><div class="pl" id="pickres"></div>' +
    '<button class="btn ghost" data-action="pickclose">Tutup</button>';
  fillPicker();
}
function fillPicker() {
  const pk = S.picker, el = $('#pickres'); if (!pk || !el) return;
  const q = norm(pk.q);
  if (pk.items) {
    const its = pk.items.map((it, i) => ({ it, i })).filter(({ it }) => !q || norm(it.l + ' ' + (it.s || '')).includes(q));
    el.innerHTML = its.length ? its.map(({ it, i }) => '<button class="row" data-action="pickitem" data-i="' + i + '">' + esc(it.l) + (it.s ? ' <small class="muted">' + esc(it.s) + '</small>' : '') + '</button>').join('') : '<p class="empty">Tidak ada yang cocok.</p>';
    return;
  }
  const rows = S.pekerja.filter(p => !q || norm(p.n + ' ' + p.d).includes(q));
  let h = '';
  if (pk.same && !q) h += '<button class="row same" data-action="pickname" data-n="' + esc(pk.same) + '">Sama dengan mesin di atas · ' + esc(pk.same) + '</button>';
  const g = new Map(); rows.forEach(p => { const d = p.d || 'Tanpa departemen'; if (!g.has(d)) g.set(d, []); g.get(d).push(p); });
  h += [...g.entries()].sort((a, b) => byName(a[0], b[0])).map(([d, ps]) => '<div class="dept">' + esc(d) + '</div>' + ps.map(p => '<button class="row" data-action="pickname" data-n="' + esc(p.n) + '">' + esc(p.n) + '</button>').join('')).join('');
  if (!rows.length && !q) h += '<p class="empty">Daftar nama masih kosong. Ketik nama di kolom cari, lalu tambahkan.</p>';
  const exact = S.pekerja.some(p => norm(p.n) === q);
  if (pk.allowNew !== false && q && !exact) h += '<button class="row" data-action="picknew" data-n="' + esc(clean(pk.q)) + '">+ Tambah “' + esc(clean(pk.q)) + '” sebagai nama baru</button>';
  if (!h) h = '<p class="empty">Tidak ada yang cocok.</p>';
  el.innerHTML = h;
}
function pickName(n) {
  const pk = S.picker; if (!pk) return;
  const cb = pk.onPick; closeTop(); if (cb) cb(n);
}
function pickItem(i) {
  const pk = S.picker; if (!pk || !pk.items) return;
  const it = pk.items[Number(i)], cb = pk.onPick;
  if (cb && it) S.pending = () => cb(it);
  closeTop();
}
function pickEditor(cb, title) {
  openPicker({ title: title || 'Siapa Anda?', sub: 'Hanya ' + editors().length + ' orang yang boleh mengubah data. Nama dicatat di log.', items: editors().map(n => ({ v: n, l: n })),
    onPick: it => { S.me = it.v; lsSet('qrg.me', it.v); renderChrome(); if (cb) cb(); } });
}
function ensureMe(cb) {
  if (S.me && isEditor(S.me)) return cb();
  pickEditor(cb);
}
