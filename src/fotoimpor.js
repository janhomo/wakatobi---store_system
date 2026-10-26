/* ---------- Impor foto massal: banyak foto sekaligus, dicocokkan ke Jenis lewat nama file ---------- */
function fiStripExt(name) { return String(name).replace(/\.[a-z0-9]+$/i, ''); }
function fiMatch(stripped) {
  const up = clean(stripped).toUpperCase();
  if (J[up]) return up;
  const nq = norm(stripped);
  const cand = S.jenis.filter(j => norm(j.n) === nq || norm(j.n + ' ' + j.b + ' ' + j.m) === nq || norm([j.b, j.m].filter(Boolean).join(' ') + ' ' + j.n) === nq);
  return cand.length === 1 ? cand[0].id : null;
}
function viewFotoImpor() {
  const fi = S.fimp;
  const head = '<section class="card"><h3>Impor foto massal</h3><div class="stack">' +
    '<p class="note info">Satu foto untuk satu jenis mesin (bukan per unit). Nama file sebaiknya ID jenis, contoh ' + (S.jenis[0] ? esc(S.jenis[0].id) : 'J0004') + '.jpg. Kalau tidak cocok, pilih mesinnya satu per satu di bawah.</p>' +
    '<label class="btn ghost small" for="fiFile" style="cursor:pointer">' + ic('upload', 20) + 'Pilih banyak foto</label>' +
    '<input id="fiFile" type="file" accept="image/*" multiple hidden></div></section>';
  if (!fi || !fi.items.length) return head;
  const need = fi.items.filter(x => !x.jid).length, n = fi.items.length - need;
  return head + '<section class="card"><h3>' + fi.items.length + ' foto dipilih</h3>' +
    (need ? '<p class="note warn" style="margin-bottom:8px">' + need + ' foto belum punya pasangan mesin. Pilih manual dulu.</p>' : '<p class="note info" style="margin-bottom:8px">Semua foto sudah punya pasangan. Cek sekali lagi sebelum impor.</p>') +
    '<div class="tbox" id="fiList"></div>' +
    '<div class="two" style="margin-top:12px"><button class="btn ghost" data-action="fireset">Batal</button><button class="btn" data-action="figo"' + (need || fi.busy ? ' disabled' : '') + '>' + (fi.busy ? 'Mengimpor ' + fi.done + '/' + n + '…' : 'Impor ' + n + ' foto') + '</button></div>' +
    (fi.res ? '<p class="note' + (fi.res.err ? ' bad' : ' info') + '" style="margin-top:10px">' + esc(fi.res.msg) + '</p>' : '') +
    '</section>';
}
function fiRender() { if (S.view === 'fotoimpor') { $('#app').innerHTML = viewFotoImpor(); fiRenderList(); } }
function fiRenderList() {
  const fi = S.fimp, el = $('#fiList'); if (!fi || !el) return;
  el.innerHTML = fi.items.map((x, i) => '<div class="trow" style="gap:10px">' +
    '<span class="thumb sm"><img src="' + x.data + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px"></span>' +
    '<span class="nm"><b>' + esc(x.name) + '</b><small class="muted">' + (x.jid && J[x.jid] ? esc(J[x.jid].n + ' · ' + subText(J[x.jid])) : 'Belum cocok') + '</small></span>' +
    '<button class="btn ghost small" data-action="fipick" data-i="' + i + '">' + (x.jid ? 'Ganti' : 'Pilih mesin') + '</button>' +
    '<button class="x" data-action="firemove" data-i="' + i + '" aria-label="Keluarkan">' + ic('x', 20) + '</button></div>').join('');
}
async function fiSquare(bmp, px) {
  const w0 = bmp.width || bmp.naturalWidth, h0 = bmp.height || bmp.naturalHeight, side = Math.min(w0, h0);
  const sx = (w0 - side) / 2, sy = (h0 - side) / 2;
  const c = document.createElement('canvas'); c.width = c.height = px;
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.fillStyle = '#fff'; x.fillRect(0, 0, px, px);
  x.drawImage(bmp, sx, sy, side, side, 0, 0, px, px);
  for (const q of [0.78, 0.68, 0.58, 0.48, 0.4]) { const d = c.toDataURL('image/jpeg', q); if (d.length <= 44000) return d; }
  return c.toDataURL('image/jpeg', 0.35);
}
async function fiPicked(files) {
  const list = [...files].slice(0, 80);
  if (!list.length) return;
  S.fimp = S.fimp || { items: [], busy: false, done: 0, res: null };
  S.fimp.res = null; fiRender();
  for (const f of list) {
    try {
      const bmp = await loadBitmap(f), data = await fiSquare(bmp, FOTO_PX), stripped = fiStripExt(f.name);
      S.fimp.items.push({ name: f.name, data, jid: fiMatch(stripped) });
    } catch (e) { /* foto ini dilewati kalau tidak bisa dibaca */ }
    fiRender();
  }
}
function fiPick(i) {
  const fi = S.fimp; if (!fi || !fi.items[i]) return;
  openPicker({ title: 'Pilih mesin untuk ' + fi.items[i].name, items: S.jenis.slice().sort((a, b) => byName(a.n, b.n)).map(j => ({ v: j.id, l: j.n, s: subText(j) || j.id })),
    onPick: it => { fi.items[i].jid = it.v; fiRender(); } });
}
function fiRemove(i) { const fi = S.fimp; if (!fi) return; fi.items.splice(i, 1); fiRender(); }
function fiGo() {
  const fi = S.fimp; if (!fi || fi.busy || fi.items.some(x => !x.jid)) return;
  ensureMe(async () => {
    fi.busy = true; fi.done = 0; fi.res = null; fiRender();
    let ok = 0, fail = 0;
    for (const x of fi.items) {
      try { const r = await api('fotoSet', { jid: x.jid, foto: x.data, oleh: S.me }); FOTO.cache[x.jid] = { t: r.t, d: x.data }; if (J[x.jid]) J[x.jid].f = r.t; ok++; }
      catch (e) { fail++; }
      fi.done++; fiRender();
    }
    saveFotoCache(); fi.busy = false; fi.res = { msg: ok + ' foto tersimpan' + (fail ? ', ' + fail + ' gagal' : '') + '.', err: !!fail }; fi.items = [];
    fiRender(); refreshThumbs(); toast(ok + ' foto diimpor.'); loadAll(true);
  });
}
function fiReset() { S.fimp = null; fiRender(); }
