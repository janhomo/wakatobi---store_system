/* ---------- Saran: aturan sederhana (tanpa AI). Tidak ada yang berubah sebelum Terima ditekan. ---------- */
const KAT_RULES = [
  [/kipas|blower|fan\b|kompresor/, 'Peralatan Udara'],
  [/gurinda|grinder|marble|cutter|potong/, 'Gurinda/Mesin Potong'],
  [/impact|bor\b|breker|breaker|drill/, 'Bor/Breker'],
  [/amplas|sander/, 'Mesin Amplas'],
  [/water ?jet|pembersih|steam/, 'Mesin Pembersihan'],
  [/pengaduk|mixer|molen/, 'Pengaduk']
];
function saranRejected() {
  try { const v = JSON.parse(S.cfg.saranTolak || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
}
const wattOf = n => { const m = /(\d{3,4})\s*w\b/i.exec(n || ''); return m ? Number(m[1]) : 0; };
function canonName(names) {
  const words = names.map(n => clean(n).split(' '));
  let base = [];
  for (let i = 0; i < words[0].length; i++) {
    const w = words[0][i];
    if (words.every(x => x[i] && norm(x[i]) === norm(w))) base.push(w); else break;
  }
  base = base.filter(w => !/^(k|\d{3,4}|w)$/i.test(w));
  const b = base.join(' ');
  if (norm(b) === 'gurinda') {
    const mx = Math.max(...names.map(wattOf));
    if (mx && mx <= 1000) return 'Gurinda kecil';
    if (mx >= 2000) return 'Gurinda besar';
  }
  return b || names[0];
}
const unitCount = j => (JU[j.id] || []).length;
function saranAll() {
  const out = [];
  /* 1. merek dan model sama, nama beda */
  const byBM = new Map();
  S.jenis.forEach(j => { if (j.b && j.m) { const k = norm(j.b) + '|' + norm(j.m); if (!byBM.has(k)) byBM.set(k, []); byBM.get(k).push(j); } });
  byBM.forEach((list, k) => {
    if (new Set(list.map(j => norm(j.n))).size < 2) return;
    const names = [...new Set(list.map(j => j.n))];
    out.push({ id: 'n:' + k, type: 'nama', jenis: list, input: canonName(names), label: 'Samakan nama',
      title: 'Merek dan model sama, nama berbeda', detail: list[0].b + ' ' + list[0].m + ': ' + list.map(j => j.n + ' (' + unitCount(j) + ' unit)').join(', ') + '.',
      hint: 'Nama baru untuk semuanya. Jenis digabung jadi satu, nomor unit tidak boleh bentrok.' });
  });
  S.jenis.forEach(j => {
    if (!j.b) out.push({ id: 'b:' + j.id, type: 'merek', jenis: [j], input: '', ph: 'Tulis merek', label: 'Isi merek', title: 'Merek masih kosong', detail: j.n + (j.m ? ' ' + j.m : '') + ' · ' + unitCount(j) + ' unit.' });
    if (!j.m) out.push({ id: 'm:' + j.id, type: 'model', jenis: [j], input: '', ph: 'Tulis model / tipe', label: 'Isi model', title: 'Model masih kosong', detail: j.n + (j.b ? ' ' + j.b : '') + ' · ' + unitCount(j) + ' unit.' });
    if (!j.c || !S.kategori.some(k => norm(k.c) === norm(j.c))) {
      const r = KAT_RULES.find(([re, c]) => re.test(norm(j.n)) && S.kategori.some(k => norm(k.c) === norm(c)));
      out.push({ id: 'c:' + j.id, type: 'kategori', jenis: [j], input: r ? r[1] : '', select: true, label: 'Isi kategori', title: 'Kategori belum diisi', detail: j.n + (j.b ? ' ' + j.b : '') + (j.m ? ' ' + j.m : '') + ' · ' + unitCount(j) + ' unit.' });
    }
  });
  return out;
}
const saranList = () => { const rj = new Set(saranRejected()); return saranAll().filter(x => !rj.has(x.id)); };
const saranDitolak = () => { const rj = new Set(saranRejected()); return saranAll().filter(x => rj.has(x.id)); };

function saranCard(x, rejected) {
  let inp = '';
  if (x.select) inp = '<select id="sr-' + esc(x.id) + '" class="field" aria-label="Kategori">' + (x.input ? '' : '<option value="">Pilih kategori</option>') + S.kategori.map(k => k.c).sort(byName).map(c => '<option' + (norm(c) === norm(x.input) ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select>';
  else inp = '<input id="sr-' + esc(x.id) + '" class="field" type="text" value="' + esc(x.input) + '"' + (x.ph ? ' placeholder="' + esc(x.ph) + '"' : '') + ' autocomplete="off" aria-label="' + esc(x.label) + '">';
  return '<section class="card saran" data-sid="' + esc(x.id) + '"><div class="sh-row"><b>' + esc(x.title) + '</b><span class="pill warn">' + esc(x.type) + '</span></div>' +
    '<p class="muted" style="margin:6px 0 10px;font-size:15px">' + esc(x.detail) + '</p>' + (x.hint ? '<p class="muted" style="margin:0 0 8px;font-size:13px">' + esc(x.hint) + '</p>' : '') +
    (rejected ? '' : '<div class="stack">' + inp + '<div class="two"><button class="btn ghost" data-action="srtolak" data-id="' + esc(x.id) + '">Tolak</button><button class="btn" data-action="srterima" data-id="' + esc(x.id) + '">Terima</button></div></div>') +
    (rejected ? '<button class="btn ghost small" data-action="srbatal" data-id="' + esc(x.id) + '">Munculkan lagi</button>' : '') + '</section>';
}
function viewSaran() { return '<div id="live-saran"></div>'; }
function liveSaran() {
  if (!S.loaded) return '<p class="empty">Memuat…</p>';
  const list = saranList(), rj = saranDitolak();
  let h = '<p class="note info" style="margin-bottom:12px">Saran dibuat dari aturan sederhana, bukan AI. Data tidak berubah sebelum Anda menekan Terima. Hanya ' + esc(editors().join(', ')) + ' yang bisa menerima.</p>';
  h += list.length ? list.map(x => saranCard(x)).join('') : '<p class="empty">Tidak ada saran. Data sudah rapi.</p>';
  if (rj.length) h += '<button class="btn ghost small block" style="margin-top:10px" data-action="srtoggle">' + (S.showRj ? 'Sembunyikan' : 'Lihat') + ' saran yang ditolak (' + rj.length + ')</button>' + (S.showRj ? '<div style="margin-top:10px">' + rj.map(x => saranCard(x, true)).join('') + '</div>' : '');
  return h;
}
function saranTerima(id) {
  const x = saranAll().find(y => y.id === id); if (!x) return;
  const el = $('#sr-' + CSS.escape(id)), v = clean(el ? el.value : '');
  if (!v) { toast('Isi dulu kolomnya.'); return; }
  const j0 = x.jenis[0];
  const done = () => { render(); };
  if (x.type === 'merek') callEdit('editJenis', { id: j0.id, f: { c: j0.c, n: j0.n, b: v, m: j0.m } }, 'Merek diisi.', done);
  else if (x.type === 'model') callEdit('editJenis', { id: j0.id, f: { c: j0.c, n: j0.n, b: j0.b, m: v } }, 'Model diisi.', done);
  else if (x.type === 'kategori') callEdit('editJenis', { id: j0.id, f: { c: v, n: j0.n, b: j0.b, m: j0.m } }, 'Kategori diisi.', done);
  else if (x.type === 'nama') {
    const target = x.jenis.find(j => norm(j.n) === norm(v)) || x.jenis.slice().sort((a, b) => unitCount(b) - unitCount(a))[0], others = x.jenis.filter(j => j !== target);
    ensureMe(async () => {
      busyBegin('Menyimpan ke Sheet. Mohon tunggu, jangan tutup halaman.', true);
      try {
        if (target.n !== v) await api('editJenis', { id: target.id, f: { c: target.c, n: v, b: target.b, m: target.m }, oleh: S.me });
        for (const o of others) await api('gabungJenis', { dari: o.id, ke: target.id, oleh: S.me });
        await loadAll(true); toast('Nama disamakan: ' + v); render();
      } catch (e) { failed(e); await loadAll(true); render(); }
      finally { busyEnd(false); }
    });
  }
}
function saranTolakSet(id, batal) {
  ensureMe(async () => {
    try {
      const j = await api('saranTolak', { id, batal: !!batal, oleh: S.me });
      S.cfg.saranTolak = j.saranTolak; render(); toast(batal ? 'Saran dimunculkan lagi.' : 'Saran ditolak.');
    } catch (e) { failed(e); }
  });
}
