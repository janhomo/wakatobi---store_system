/* ---------- Impor Excel: isi rak dan mesin sekaligus (Kode Mesin, Kode Rak) ---------- */
const IR_COLS = { kode: ['kode mesin', 'kode', 'kode aset'], rak: ['kode rak', 'rak', 'tempat', 'isi tangan', 'kode rak isi tangan'] };
function irNorm(h) { return norm(String(h).replace(/[._()]/g, ' ').replace(/\s+/g, ' ')); }
function irResolveRak(v) {
  const s = clean(v); if (!s) return null;
  if (isLok(s.toUpperCase()) && T[s.toUpperCase()]) return T[s.toUpperCase()];
  const t = activePlaces().find(x => norm(x.n) === norm(s));
  return t || null;
}
function viewImporRak() {
  const ir = S.imr;
  const head = '<section class="card"><h3>Impor isi rak</h3><div class="stack">' +
    '<p class="note info">Satu baris = satu mesin. Kolom yang dikenali: Kode Mesin, Kode Rak. Kode Rak boleh "LOK-003" atau nama "Rak 014". Baris dengan Kode Rak kosong dilewati.</p>' +
    '<div class="two"><label class="btn ghost small" for="irFile" style="cursor:pointer">' + ic('upload', 20) + 'Pilih file Excel</label><button class="btn ghost small" data-action="ircontoh">Unduh contoh</button></div>' +
    '<input id="irFile" type="file" accept=".xlsx,.xls,.csv" hidden></div></section>';
  if (!ir) return head;
  if (ir.err) return head + '<p class="note bad">' + esc(ir.err) + '</p>';
  if (ir.res) {
    const r = ir.res;
    return head + '<section class="card"><h3>Hasil impor</h3><p style="margin:0 0 8px"><b>' + r.changed + '</b> mesin dipindah' + (r.nSkipped ? ', ' + r.nSkipped + ' dilewati' : '') + (r.nErrors ? ', <b style="color:var(--bad)">' + r.nErrors + ' gagal</b>' : '') + '.</p>' +
      (r.errors.length ? '<ul class="impl bad">' + r.errors.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
      (r.skipped.length ? '<ul class="impl">' + r.skipped.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
      '<button class="btn ghost" style="margin-top:10px" data-action="irreset">Impor file lain</button></section>';
  }
  const ok = ir.rows.filter(r => !r.bad), bad = ir.rows.length - ok.length;
  return head + '<section class="card"><h3>' + esc(ir.file) + '</h3>' +
    '<p style="margin:0 0 8px"><b>' + ok.length + '</b> baris siap' + (bad ? ', <b style="color:var(--bad)">' + bad + ' bermasalah</b> (tidak ikut)' : '') + '.</p>' +
    '<div class="tblwrap"><table class="tbl small"><thead><tr><th>#</th><th>Kode</th><th>Mesin</th><th>Rak tujuan</th></tr></thead><tbody>' +
    ir.rows.slice(0, 40).map(r => '<tr class="' + (r.bad ? 'badrow' : '') + '"><td>' + r.line + '</td><td>' + esc(r.kode) + '</td><td>' + esc(r.nama) + (r.bad ? '<br><small>' + esc(r.bad) + '</small>' : '') + '</td><td>' + esc(r.rakNama) + '</td></tr>').join('') +
    '</tbody></table></div>' + (ir.rows.length > 40 ? '<p class="muted" style="font-size:13px">Menampilkan 40 baris pertama dari ' + ir.rows.length + '.</p>' : '') +
    '<div class="two" style="margin-top:12px"><button class="btn ghost" data-action="irreset">Batal</button><button class="btn" data-action="irgo"' + (ok.length && !ir.busy ? '' : ' disabled') + '>' + (ir.busy ? 'Mengimpor ' + ir.done + '/' + ok.length + '…' : 'Impor ' + ok.length + ' mesin') + '</button></div></section>';
}
function irRender() { if (S.view === 'imporrak') $('#app').innerHTML = viewImporRak(); }
async function irLoad(file) {
  S.imr = { file: file.name, rows: [] };
  try {
    if (file.size > 3 * 1024 * 1024) throw new Error('File terlalu besar (maks 3 MB).');
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }).filter(r => r.some(c => clean(c) !== ''));
    if (data.length < 2) throw new Error('File kosong atau hanya berisi judul kolom.');
    let hi = -1, map = {};
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const m = {};
      data[i].forEach((h, ci) => { const k = irNorm(h); Object.entries(IR_COLS).forEach(([key, names]) => { if (m[key] === undefined && names.includes(k)) m[key] = ci; }); });
      if (m.kode !== undefined) { hi = i; map = m; break; }
    }
    if (hi < 0) throw new Error('Judul kolom "Kode Mesin" tidak ditemukan di baris atas.');
    if (map.rak === undefined) throw new Error('Judul kolom "Kode Rak" tidak ditemukan.');
    const rows = [];
    data.slice(hi + 1).forEach((r, i) => {
      const kode = clean(r[map.kode]).toUpperCase(), rakTxt = clean(r[map.rak]);
      let bad = '', rakNama = '';
      if (!kode) { bad = 'Kode mesin kosong.'; }
      else if (!U[kode]) bad = 'Mesin ' + kode + ' tidak ditemukan.';
      if (!bad && !rakTxt) bad = 'Kode rak kosong (dilewati).';
      if (!bad) { const t = irResolveRak(rakTxt); if (!t) bad = 'Rak "' + rakTxt + '" tidak ditemukan.'; else rakNama = t.n + ' · ' + t.id; }
      rows.push({ line: hi + i + 2, kode, nama: U[kode] ? unitTitle(U[kode]) : '', rakTxt, rakNama, bad });
    });
    if (!rows.length) throw new Error('Tidak ada baris data.');
    if (rows.length > 400) throw new Error('Maksimal 400 baris sekali impor.');
    S.imr = { file: file.name, rows };
  } catch (e) { S.imr = { file: file.name, rows: [], err: e.message || 'File tidak bisa dibaca.' }; }
  irRender();
}
function irGo() {
  const ir = S.imr; if (!ir || ir.busy) return;
  const ok = ir.rows.filter(r => !r.bad).map(r => ({ kode: r.kode, rak: r.rakTxt })); if (!ok.length) return;
  ensureMe(async () => {
    ir.busy = true; ir.done = 0; irRender();
    const tot = { changed: 0, skipped: [], errors: [], nSkipped: 0, nErrors: 0 };
    try {
      for (let i = 0; i < ok.length; i += 150) {
        const r = await api('imporRak', { rows: ok.slice(i, i + 150), oleh: S.me });
        tot.changed += r.changed; tot.nSkipped += r.nSkipped; tot.nErrors += r.nErrors;
        r.skipped.forEach(x => tot.skipped.length < 30 && tot.skipped.push(x)); r.errors.forEach(x => tot.errors.length < 30 && tot.errors.push(x));
        ir.done = Math.min(ok.length, i + 150); irRender();
      }
    } catch (e) { ir.busy = false; irRender(); failed(e); if (tot.changed) { ir.res = tot; irRender(); loadAll(true); } return; }
    ir.busy = false; ir.res = tot; irRender(); loadAll(true); toast(tot.changed + ' mesin dipindah.');
  });
}
function irContoh() {
  const racks = activePlaces().filter(t => /^rak /i.test(t.n)).slice(0, 2);
  const units = S.units.filter(u => !u.off).slice(0, 2);
  const a = [['Kode Mesin', 'Kode Rak'],
    [units[0] ? units[0].k : 'BOR-001', racks[0] ? racks[0].n : 'Rak 001'],
    [units[1] ? units[1].k : 'GRD-001', racks[1] ? racks[1].n : 'Rak 002']];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(a), 'Isi Rak'); XLSX.writeFile(wb, 'contoh_impor_rak.xlsx');
}
