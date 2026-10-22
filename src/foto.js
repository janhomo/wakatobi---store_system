/* ---------- foto per jenis: disimpan kecil (sekitar 360 px) di sheet Foto, disalin ke HP ---------- */
const FOTO = { cache: lsGet('qrg.foto', {}), busy: false };
const FOTO_PX = 360;
const fotoSrc = jid => { const c = FOTO.cache[jid]; return c && c.d ? c.d : ''; };
function thumbHtml(jid, size, cls) {
  const src = jid ? fotoSrc(jid) : '';
  return '<span class="thumb' + (cls ? ' ' + cls : '') + '"' + (jid ? ' data-foto="' + esc(jid) + '"' : '') + '>' + (src ? '<img src="' + src + '" alt="">' : ic('tool', size || 30)) + '</span>';
}
function refreshThumbs() {
  document.querySelectorAll('[data-foto]').forEach(el => {
    const src = fotoSrc(el.dataset.foto), has = !!el.querySelector('img');
    if (src && (!has || el.querySelector('img').getAttribute('src') !== src)) el.innerHTML = '<img src="' + src + '" alt="">';
    else if (!src && has) el.innerHTML = ic('tool', el.classList.contains('hero') ? 56 : 30);
  });
}
function saveFotoCache() { lsSet('qrg.foto', FOTO.cache); }
/* ambil foto yang belum ada di HP atau sudah berganti */
async function syncFoto() {
  const ids = new Set(S.jenis.filter(j => j.f).map(j => j.id));
  let dirty = false;
  Object.keys(FOTO.cache).forEach(id => { if (!ids.has(id)) { delete FOTO.cache[id]; dirty = true; } });
  if (dirty) { saveFotoCache(); refreshThumbs(); }
  const need = S.jenis.filter(j => j.f && (!FOTO.cache[j.id] || FOTO.cache[j.id].t !== j.f)).map(j => j.id);
  if (!need.length || FOTO.busy) return;
  FOTO.busy = true;
  try {
    for (let i = 0; i < need.length; i += 8) {
      const r = await api('fotoGet', { ids: need.slice(i, i + 8) });
      Object.entries(r.foto || {}).forEach(([id, f]) => { if (J[id] && f.d && String(f.d).startsWith('data:image/jpeg;base64,')) FOTO.cache[id] = { t: f.t, d: f.d }; });
      saveFotoCache(); refreshThumbs();
    }
  } catch (e) { /* tanpa sinyal: foto yang sudah ada tetap tampil */ }
  FOTO.busy = false;
}

/* ---------- pemotong foto ---------- */
const FV = 300; /* sisi kotak pemotong (px layar) */
async function loadBitmap(file) {
  try { if (window.createImageBitmap) return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) {}
  return await new Promise((res, rej) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); res(im); };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('gambar')); };
    im.src = url;
  });
}
function openFoto(jid) {
  if (S.ov.includes('foto')) return;
  S.fotoEd = { jid, step: 'pilih', src: null, rot: 0, zoom: 1, ox: 0, oy: 0, work: null, busy: false };
  $('#fotoSheet').hidden = false; pushOv('foto'); renderFoto();
}
function renderFoto() {
  const f = S.fotoEd; if (!f) return;
  const j = J[f.jid]; if (!j) { closeTop(); return; }
  let h = '<button class="dbg" data-action="fotoclose" aria-label="Tutup"></button><section class="fsheet" role="dialog" aria-label="Ganti foto"><div class="grab"></div>' +
    '<div class="sh-t">Foto · ' + esc(j.n) + '</div>';
  if (f.step === 'pilih') {
    const cur = fotoSrc(f.jid);
    h += '<div class="two"><button class="bigbtn pri" data-action="fotocam">' + ic('cam', 28) + 'Ambil foto</button><button class="bigbtn" data-action="fotogal">' + ic('img', 28) + 'Pilih dari galeri</button></div>' +
      '<div class="frow">' + thumbHtml(f.jid, 56, 'big') + '<p class="muted" style="margin:0;font-size:14px;line-height:1.4">' + (cur ? 'Foto sekarang.' : 'Belum ada foto.') + ' Foto ini dipakai untuk semua unit ' + esc(j.n) + '. Setelah dipilih, foto bisa digeser, diperbesar, dan diputar. Disimpan kecil supaya cepat dibuka.</p></div>' +
      (cur ? '<button class="btn ghost redo" data-action="fotohapus" data-confirm="Ya, hapus foto">Hapus foto</button>' : '') +
      '<button class="btn ghost" data-action="fotoclose">Tutup</button>';
  } else {
    h += '<div class="cropwrap"><canvas id="cropCv" width="' + FV * 2 + '" height="' + FV * 2 + '" style="width:' + FV + 'px;height:' + FV + 'px" aria-label="Pratinjau potongan foto"></canvas></div>' +
      '<p class="muted" style="margin:0;font-size:14px;text-align:center">Geser foto untuk memilih bagian yang dipotong.</p>' +
      '<div class="crctl"><button class="x2" data-action="fotorot" data-d="-1" aria-label="Putar ke kiri">' + ic('rotl', 24) + '</button>' +
      '<input id="cropZoom" type="range" min="1" max="4" step="0.01" value="' + f.zoom + '" aria-label="Perbesar"><button class="x2" data-action="fotorot" data-d="1" aria-label="Putar ke kanan">' + ic('rotr', 24) + '</button></div>' +
      '<div class="yn"><button class="no" data-action="fotoback">Ganti foto</button><button class="yes" data-action="fotosave"' + (f.busy ? ' disabled' : '') + '>' + (f.busy ? 'Menyimpan…' : 'Simpan foto') + '</button></div>';
  }
  $('#fotoSheet').innerHTML = h + '</section>';
  if (f.step === 'crop') drawCrop();
}
async function fotoPicked(file) {
  const f = S.fotoEd; if (!f || !file) return;
  try {
    const bmp = await loadBitmap(file);
    f.src = bmp; f.rot = 0; f.zoom = 1; f.ox = 0; f.oy = 0; f.step = 'crop';
    makeWork(); renderFoto();
  } catch (e) { toast('Foto ini tidak bisa dibaca. Coba foto lain.'); }
}
/* gambar kerja: sudah diputar dan dikecilkan (maks 1000 px) */
function makeWork() {
  const f = S.fotoEd, b = f.src, w0 = b.width || b.naturalWidth, h0 = b.height || b.naturalHeight;
  const sc = Math.min(1, 1000 / Math.max(w0, h0)), odd = f.rot % 2 !== 0;
  const w = Math.round(w0 * sc), h = Math.round(h0 * sc);
  const c = document.createElement('canvas'); c.width = odd ? h : w; c.height = odd ? w : h;
  const x = c.getContext('2d'); x.translate(c.width / 2, c.height / 2); x.rotate(f.rot * Math.PI / 2); x.drawImage(b, -w / 2, -h / 2, w, h);
  f.work = c;
}
function cropGeom(f, V) {
  const c = f.work, s = (V / Math.min(c.width, c.height)) * f.zoom, dw = c.width * s, dh = c.height * s;
  const mx = Math.max(0, (dw - V) / 2) / V, my = Math.max(0, (dh - V) / 2) / V;
  f.ox = Math.max(-mx, Math.min(mx, f.ox)); f.oy = Math.max(-my, Math.min(my, f.oy));
  return { x: V / 2 - dw / 2 + f.ox * V, y: V / 2 - dh / 2 + f.oy * V, w: dw, h: dh };
}
function drawCrop() {
  const f = S.fotoEd, cv = $('#cropCv'); if (!f || !cv || !f.work) return;
  const V = cv.width, g = cropGeom(f, V), x = cv.getContext('2d');
  x.fillStyle = '#222'; x.fillRect(0, 0, V, V); x.drawImage(f.work, g.x, g.y, g.w, g.h);
}
function exportFoto() {
  const f = S.fotoEd, g0 = cropGeom(f, 1000);
  let px = FOTO_PX;
  for (let round = 0; round < 6; round++) {
    const out = document.createElement('canvas'); out.width = out.height = px;
    const x = out.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, px, px);
    const k = px / 1000; x.imageSmoothingQuality = 'high'; x.drawImage(f.work, g0.x * k, g0.y * k, g0.w * k, g0.h * k);
    for (const q of [0.78, 0.68, 0.58, 0.48, 0.4]) {
      const d = out.toDataURL('image/jpeg', q);
      if (d.length <= 44000) return d;
    }
    px = Math.round(px * 0.85);
  }
  return '';
}
async function fotoSave() {
  const f = S.fotoEd; if (!f || f.busy) return;
  const d = exportFoto();
  if (!d) { toast('Foto terlalu besar. Pilih foto lain.'); return; }
  ensureMe(async () => {
    const fe = S.fotoEd; if (!fe) return;
    fe.busy = true; renderFoto();
    try {
      const r = await api('fotoSet', { jid: fe.jid, foto: d, oleh: S.me });
      FOTO.cache[fe.jid] = { t: r.t, d }; saveFotoCache();
      if (J[fe.jid]) J[fe.jid].f = r.t;
      fe.busy = false; closeTop(); refreshThumbs(); toast('Foto disimpan.'); loadAll(true);
    } catch (e) { if (S.fotoEd) { S.fotoEd.busy = false; renderFoto(); } failed(e); }
  });
}
async function fotoHapus() {
  const f = S.fotoEd; if (!f) return; const jid = f.jid;
  ensureMe(async () => {
    try {
      await api('fotoHapus', { jid, oleh: S.me });
      delete FOTO.cache[jid]; saveFotoCache(); if (J[jid]) J[jid].f = '';
      closeTop(); refreshThumbs(); toast('Foto dihapus.'); loadAll(true);
    } catch (e) { failed(e); }
  });
}
(function cropPointer() {
  let drag = null;
  document.addEventListener('pointerdown', e => {
    if (e.target.id !== 'cropCv' || !S.fotoEd) return;
    drag = { x: e.clientX, y: e.clientY, ox: S.fotoEd.ox, oy: S.fotoEd.oy }; e.target.setPointerCapture(e.pointerId); e.preventDefault();
  });
  document.addEventListener('pointermove', e => {
    if (!drag || !S.fotoEd) return;
    const r = $('#cropCv').getBoundingClientRect();
    S.fotoEd.ox = drag.ox + (e.clientX - drag.x) / r.width; S.fotoEd.oy = drag.oy + (e.clientY - drag.y) / r.height; drawCrop();
  });
  const end = () => { drag = null; };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  document.addEventListener('wheel', e => {
    if (e.target.id !== 'cropCv' || !S.fotoEd) return;
    e.preventDefault(); S.fotoEd.zoom = Math.max(1, Math.min(4, S.fotoEd.zoom * (e.deltaY < 0 ? 1.08 : 0.93))); const z = $('#cropZoom'); if (z) z.value = S.fotoEd.zoom; drawCrop();
  }, { passive: false });
})();
