/* ---------- Impor Excel: tambah banyak mesin sekaligus ---------- */
const IMP_COLS = [
  ['c', 'Kategori', ['kategori', 'category', 'kat']],
  ['n', 'Nama mesin', ['nama mesin', 'nama', 'mesin', 'alat', 'nama alat', 'nama barang', 'barang']],
  ['b', 'Merek', ['merek', 'merk', 'brand']],
  ['m', 'Model', ['model', 'tipe', 'type']],
  ['u', 'No. unit', ['no unit', 'nomor unit', 'unit', 'no. unit', 'no']],
  ['sl', 'Kondisi', ['kondisi', 'status', 'keadaan']],
  ['loc', 'Tempat', ['tempat', 'tempat simpan', 'lokasi', 'lokasi simpan', 'rak']],
  ['sn', 'No. seri', ['no seri', 'no. seri', 'seri', 'serial', 'serial number', 'no seri pabrik', 'sn']],
  ['cat', 'Catatan', ['catatan', 'keterangan', 'note', 'notes', 'ket']]
];
const KOND_ALIAS = { baik: 'Normal', bagus: 'Normal', ok: 'Normal', normal: 'Normal', servis: 'Servis', service: 'Servis', rusak: 'Rusak', 'rusak total': 'Rusak total', 'belum dicek': 'Belum dicek' };
function viewImpor() {
  const im = S.imp;
  const head = '<section class="card"><h3>Impor dari Excel</h3><div class="stack">' +
    '<p class="note info">Satu baris = satu unit mesin. Kolom yang dikenali: ' + IMP_COLS.map(c => c[1]).join(', ') + '. Wajib: Kategori dan Nama mesin. Kategori harus sudah ada. No. unit kosong = nomor otomatis. Mesin yang sama dan nomor unit yang sama dilewati.</p>' +
    '<div class="two"><label class="btn ghost small" for="impFile" style="cursor:pointer">' + ic('upload', 20) + 'Pilih file Excel</label><button class="btn ghost small" data-action="impcontoh">Unduh contoh</button></div>' +
    '<input id="impFile" type="file" accept=".xlsx,.xls,.csv" hidden></div></section>';
  if (!im) return head;
  if (im.err) return head + '<p class="note bad">' + esc(im.err) + '</p>';
  if (im.res) {
    const r = im.res;
    return head + '<section class="card"><h3>Hasil impor</h3><p style="margin:0 0 8px"><b>' + r.unit + '</b> unit masuk' + (r.jenis ? ', ' + r.jenis + ' jenis baru' : '') + (r.nSkipped ? ', ' + r.nSkipped + ' dilewati' : '') + (r.nErrors ? ', <b style="color:var(--bad)">' + r.nErrors + ' gagal</b>' : '') + '.</p>' +
      (r.errors.length ? '<ul class="impl bad">' + r.errors.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
      (r.skipped.length ? '<ul class="impl">' + r.skipped.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
      '<button class="btn ghost" style="margin-top:10px" data-action="impreset">Impor file lain</button></section>';
  }
  const ok = im.rows.filter(r => !r.bad), bad = im.rows.length - ok.length;
  const miss = IMP_COLS.filter(c => im.map[c[0]] === undefined).map(c => c[1]);
  return head + '<section class="card"><h3>' + esc(im.file) + '</h3>' +
    '<p style="margin:0 0 8px"><b>' + ok.length + '</b> baris siap' + (bad ? ', <b style="color:var(--bad)">' + bad + ' bermasalah</b> (tidak ikut)' : '') + '.</p>' +
    (miss.length ? '<p class="muted" style="margin:0 0 8px;font-size:14px">Kolom tidak ditemukan: ' + esc(miss.join(', ')) + '.</p>' : '') +
    '<div class="tblwrap"><table class="tbl small"><thead><tr><th>#</th><th>Kategori</th><th>Nama</th><th>Merek</th><th>Model</th><th>Unit</th><th>Kondisi</th></tr></thead><tbody>' +
    im.rows.slice(0, 30).map(r => '<tr class="' + (r.bad ? 'badrow' : '') + '"><td>' + r.line + '</td><td>' + esc(r.d.c) + '</td><td>' + esc(r.d.n) + (r.bad ? '<br><small>' + esc(r.bad) + '</small>' : '') + '</td><td>' + esc(r.d.b) + '</td><td>' + esc(r.d.m) + '</td><td>' + esc(r.d.u) + '</td><td>' + esc(r.d.sl) + '</td></tr>').join('') +
    '</tbody></table></div>' + (im.rows.length > 30 ? '<p class="muted" style="font-size:13px">Menampilkan 30 baris pertama dari ' + im.rows.length + '.</p>' : '') +
    (im.warnLoc ? '<p class="note warn" style="margin-top:8px">' + im.warnLoc + ' baris punya tempat yang belum ada di Penyimpanan. Tempat dikosongkan untuk baris itu.</p>' : '') +
    '<div class="two" style="margin-top:12px"><button class="btn ghost" data-action="impreset">Batal</button><button class="btn" data-action="impgo"' + (ok.length && !im.busy ? '' : ' disabled') + '>' + (im.busy ? 'Mengimpor ' + im.done + '/' + ok.length + '…' : 'Impor ' + ok.length + ' unit') + '</button></div></section>';
}
function impRender() { if (S.view === 'impor') $('#app').innerHTML = viewImpor(); }
function impNorm(h) { return norm(String(h).replace(/[._]/g, ' ').replace(/\s+/g, ' ')); }
async function impLoad(file) {
  S.imp = { file: file.name, rows: [], map: {} };
  try {
    if (file.size > 3 * 1024 * 1024) throw new Error('File terlalu besar (maks 3 MB).');
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }).filter(r => r.some(c => clean(c) !== ''));
    if (data.length < 2) throw new Error('File kosong atau hanya berisi judul kolom.');
    /* baris judul = baris pertama (dalam 10 baris awal) yang mengenali kolom Nama dan Kategori */
    let hi = -1, map = {};
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const m = {};
      data[i].forEach((h, ci) => { const k = impNorm(h); IMP_COLS.forEach(([key, , names]) => { if (m[key] === undefined && names.includes(k)) m[key] = ci; }); });
      if (m.n !== undefined && m.c !== undefined) { hi = i; map = m; break; }
    }
    if (hi < 0) throw new Error('Judul kolom Kategori dan Nama mesin tidak ditemukan di baris atas.');
    const kat = new Map(S.kategori.map(k => [norm(k.c), k.c])), tp = new Set(activePlaces().map(t => norm(t.n)));
    const rows = []; let warnLoc = 0;
    data.slice(hi + 1).forEach((r, i) => {
      const g = key => map[key] === undefined ? '' : clean(r[map[key]]);
      const d = { c: g('c'), n: g('n'), b: g('b'), m: g('m'), u: g('u'), sl: g('sl'), loc: g('loc'), sn: g('sn'), cat: map.cat === undefined ? '' : String(r[map.cat] ?? '').trim() };
      let bad = '';
      if (!d.c || !d.n) bad = 'Kategori dan nama wajib diisi.';
      else if (!kat.has(norm(d.c))) bad = 'Kategori "' + d.c + '" belum ada.';
      else d.c = kat.get(norm(d.c));
      if (!bad && d.sl) { const a = KOND_ALIAS[norm(d.sl)]; if (a) d.sl = a; else bad = 'Kondisi "' + d.sl + '" tidak dikenal.'; }
      if (!bad && d.u && !/^\d+$/.test(d.u)) bad = 'No. unit harus angka.';
      if (d.loc && !tp.has(norm(d.loc))) warnLoc++;
      rows.push({ line: hi + i + 2, d, bad });
    });
    if (!rows.length) throw new Error('Tidak ada baris data.');
    if (rows.length > 2000) throw new Error('Maksimal 2000 baris sekali impor.');
    S.imp = { file: file.name, rows, map, warnLoc };
  } catch (e) { S.imp = { file: file.name, rows: [], map: {}, err: e.message || 'File tidak bisa dibaca.' }; }
  impRender();
}
function impGo() {
  const im = S.imp; if (!im || im.busy) return;
  const ok = im.rows.filter(r => !r.bad).map(r => r.d); if (!ok.length) return;
  ensureMe(async () => {
    im.busy = true; im.done = 0; impRender();
    const tot = { unit: 0, jenis: 0, skipped: [], errors: [], nSkipped: 0, nErrors: 0 };
    try {
      for (let i = 0; i < ok.length; i += 150) {
        const r = await api('imporUnit', { rows: ok.slice(i, i + 150), oleh: S.me });
        tot.unit += r.unit; tot.jenis += r.jenis; tot.nSkipped += r.nSkipped; tot.nErrors += r.nErrors;
        r.skipped.forEach(x => tot.skipped.length < 30 && tot.skipped.push(x)); r.errors.forEach(x => tot.errors.length < 30 && tot.errors.push(x));
        im.done = Math.min(ok.length, i + 150); impRender();
      }
    } catch (e) { im.busy = false; impRender(); failed(e); if (tot.unit) { im.res = tot; impRender(); loadAll(true); } return; }
    im.busy = false; im.res = tot; impRender(); loadAll(true); toast(tot.unit + ' unit diimpor.');
  });
}
function impContoh() {
  const a = [IMP_COLS.map(c => c[1]), [(S.kategori[0] && S.kategori[0].c) || 'Listrik', 'Bor', 'Bosch', 'GBH 2-28', '', 'Normal', 'Rak 1', 'SN12345', 'contoh'], [(S.kategori[0] && S.kategori[0].c) || 'Listrik', 'Gerinda', 'Makita', '9553B', '2', 'Servis', '', '', '']];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(a), 'Mesin'); XLSX.writeFile(wb, 'contoh_impor_mesin.xlsx');
}
