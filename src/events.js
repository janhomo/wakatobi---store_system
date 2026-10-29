/* ---------- aksi ---------- */
const errText = e => e.code === 'network' ? 'Tidak ada sinyal. Mengubah data mesin butuh koneksi.' : e.code === 'pin' ? 'Masuk lagi dengan PIN.' : e.code === 'config' ? 'Server belum diatur.' : (e.message || 'Gagal menyimpan.');
function failed(e) { if (e.code === 'pin') showPin('Masuk lagi dengan PIN.'); toast(errText(e)); }
function armConfirm(id) { S.confirmDel = id; renderLive(); setTimeout(() => { if (S.confirmDel === id) { S.confirmDel = null; renderLive(); } }, 4000); }
const val = id => (($('#' + id) || {}).value || '');
function returnIds(ids, kondisi) { ids.forEach(id => enqueue('returnPengambilan', { id, waktu: nowIso(), kondisi: kondisi || 'Baik' })); }

/* simpan perubahan data mesin: butuh sinyal, tercatat atas nama pengubah */
async function callEdit(action, payload, doneText, after) {
  if (Busy.edit) { toast('Sedang menyimpan. Mohon tunggu.'); return; }
  ensureMe(async () => {
    Busy.edit = true; busyBegin(null, true);
    let ok = false;
    try {
      const j = await api(action, { ...payload, oleh: S.me });
      busyBegin('Memuat data terbaru dari Sheet…');
      try { await loadAll(true); } finally { busyEnd(false); }
      ok = true;
      toast(typeof doneText === 'function' ? doneText(j) : doneText);
      after ? after(j) : back();
    } catch (e) { failed(e); }
    finally { Busy.edit = false; busyEnd(ok); }
  });
}
function saveUnit() {
  const u = U[S.kode]; if (!u) return;
  const f = { u: clean(val('uu')), sl: ksegVal('uk'), loc: clean(val('uloc')), pm: clean(val('upm')), sn: clean(val('usn')), tb: val('utb'), gs: val('ugs'), cat: val('ucat').trim() };
  if (!f.u) { toast('Isi nomor unit.'); return; }
  callEdit('editUnit', { kode: u.k, f }, j => j.changed ? 'Perubahan disimpan.' : 'Tidak ada yang berubah.');
}
function saveJenis() {
  const j = J[curJid()]; if (!j) return;
  const f = { c: selVal('jkat', 'jkatNew'), n: clean(val('jn')), b: selVal('jmerek', 'jmerekNew'), m: clean(val('jm')), awalan: clean(val('jawalan')) };
  if (!f.c) { toast('Pilih kategori.'); return; }
  if (!f.n) { toast('Isi nama mesin.'); return; }
  callEdit('editJenis', { id: j.id, f }, r => r.changed ? 'Jenis diubah. Berlaku untuk ' + r.unit + ' unit.' : 'Tidak ada yang berubah.');
}
function saveSkema() {
  const jid = curJid(); if (!jid) return;
  const label = clean(val('skLabel')), tipe = val('skTipe');
  if (!label) { toast('Isi nama kolom.'); return; }
  const f = S.skForm || {};
  if (f.id) callEdit('skemaEditKolom', { jenisId: jid, kolomId: f.id, label, tipe }, r => r.changed ? 'Kolom diubah.' : 'Tidak ada yang berubah.', () => { S.skForm = null; render(); });
  else callEdit('skemaAddKolom', { jenisId: jid, label, tipe }, 'Kolom ditambahkan.', () => { S.skForm = null; render(); });
}
function gabungJenis() {
  const ke = val('jgab'); if (!ke) { toast('Pilih jenis tujuan.'); return; }
  callEdit('gabungJenis', { dari: curJid(), ke }, r => 'Digabung. ' + r.moved + ' unit dipindah.', r => go('jenis', { jid: r.ke, replace: true }));
}
function saveTambah() {
  const f = S.form, print = this && this.print;
  const unit = { u: clean(val('tu')), sn: clean(val('tsn')), sl: ksegVal('tk') || 'Normal', loc: clean(val('tloc')), pm: clean(val('tpm')), cat: val('tcat').trim() };
  const payload = { f: unit };
  if (f.step === 'baru') {
    const c = selVal('tkat', 'tkatNew'), n = clean(val('tnama'));
    if (!c) { toast('Pilih kategori.'); return; }
    if (!n) { toast('Isi nama mesin.'); return; }
    payload.jenis = { c, n, b: selVal('tmerek', 'tmerekNew'), m: clean(val('tmodel')), awalan: clean(val('tawalan')) };
  } else payload.jenisId = f.jid;
  callEdit('addUnit', payload, j => 'Unit baru: ' + j.kode, j => {
    if (print) location.href = 'label.html?kode=' + encodeURIComponent(j.kode);
    else if (f.from === 'jenis') { S.focus = j.kode; back(); }
    else go('jenis', { jid: j.jenisId, kode: j.kode, replace: true });
  });
}

function afterOv(fn) { if (S.ov.length) { S.pending = fn; history.go(-S.ov.length); } else fn(); }

document.addEventListener('click', async e => {
  const t = e.target.closest('[data-action]'); if (!t) return;
  const a = t.dataset.action; window.__btn = t;
  if (['jenis', 'openunit', 'tambahunit', 'root', 'nama', 'tambahjenis', 'wjenis', 'rakbuat'].includes(a) || (t.tagName === 'A' && t.getAttribute('href') === '#')) e.preventDefault();
  /* tombol dua langkah: tekan sekali untuk memastikan */
  if (t.dataset.confirm) {
    if (t.dataset.armed !== '1') {
      t.dataset.armed = '1'; t.dataset.orig = t.textContent; t.textContent = t.dataset.confirm;
      setTimeout(() => { if (t.isConnected && t.dataset.armed === '1') { t.dataset.armed = ''; t.textContent = t.dataset.orig; } }, 6000);
      return;
    }
    t.dataset.armed = ''; t.textContent = t.dataset.orig;
  }
  switch (a) {
    /* navigasi */
    case 'menu': openDrawer(); break;
    case 'dclose': closeTop(); break;
    case 'dgo': go(t.dataset.view, { root: true }); break;
    case 'root': if (S.view === t.dataset.view) window.scrollTo(0, 0); else go(t.dataset.view, { root: true }); break;
    case 'back': back(); break;
    case 'dme': pickEditor(() => toast('Nama diganti: ' + S.me), 'Nama saya'); break;
    case 'dtheme': setTheme(t.dataset.t); renderDrawer(); toast('Tampilan: ' + THEME_L[getTheme()]); break;
    case 'dlang': setLang(t.dataset.l); if (!$('#drawer').hidden) renderDrawer(); break;
    case 'dreload': closeTop(); toast('Memuat ulang…'); loadAll(); break;
    case 'logout': S.tok = ''; lsSet('qrg.tok', ''); lsSet('qrg.hadTok', false); closeTop(); showPin(); break;
    case 'nama': go('nama', { nm: t.dataset.nm }); break;
    case 'wnama': S.nm = t.dataset.nm; S.wj = null; S.tab = 'unit'; syncState(); renderJlist(); break;
    case 'wjenis': S.wj = t.dataset.id; syncState(); renderDetail(); break;
    case 'wtab': S.tab = t.dataset.t; syncState(); renderDetail(); break;
    case 'tambahjenis': { const g = nameGroup(t.dataset.nm); go('tambah', { form: { step: 'baru', n: g ? g.name : '', c: g ? g.cat : '', from: 'nama' } }); break; }
    case 'jenis': go('jenis', { jid: t.dataset.id }); break;
    case 'openunit': openUnit(t.dataset.k); break;
    case 'jtab': S.tab = t.dataset.t; history.replaceState({ ...curState(), d: (history.state && history.state.d) || 0 }, '', URL_); $('#app').innerHTML = viewJenis(); if (S.tab === 'riwayat') loadRiwayatJenis(); if (S.tab === 'panduan') loadPanduan(); break;
    case 'filter': S.filter = t.dataset.f; renderJlist(); break;
    case 'pickpm': {
      const inp = $('#' + t.dataset.for), lab = $('#' + t.dataset.for + '-l');
      openPicker({ title: 'Pemilik', sub: 'Departemen yang memiliki mesin ini. Boleh dikosongkan.', items: [{ v: '', l: 'Belum diisi' }, ...deptList().map(d => ({ v: d, l: d }))],
        onPick: it => { if (inp) inp.value = it.v; if (lab) lab.textContent = it.v || 'Belum diisi'; } });
      break;
    }
    case 'uedit': go('unit', { kode: t.dataset.k, jid: U[t.dataset.k].j }); break;
    case 'jedit': go('jedit', { jid: curJid() }); break;
    case 'tambah': go('tambah', { form: { step: 'pilih' } }); break;
    case 'tambahunit': go('tambah', { form: { step: 'isi', jid: t.dataset.id, from: 'jenis' } }); break;
    case 'tpick': S.form = { step: 'isi', jid: t.dataset.id }; render(); window.scrollTo(0, 0); break;
    case 'tnew': S.form = { step: 'baru' }; render(); window.scrollTo(0, 0); break;
    case 'tback': S.form = { step: 'pilih' }; render(); window.scrollTo(0, 0); break;
    /* simpan data */
    case 'tsave': saveTambah.call({ print: !!t.dataset.print }); break;
    case 'usave': saveUnit(); break;
    case 'jsave': saveJenis(); break;
    case 'jgab': gabungJenis(); break;
    case 'uoff': { const alasan = clean(val('ualasan')); if (!alasan) { toast('Isi alasan menonaktifkan.'); break; } callEdit('nonaktifUnit', { kode: S.kode, alasan }, 'Unit dinonaktifkan.'); break; }
    case 'uon': callEdit('aktifkanUnit', { kode: S.kode }, 'Unit diaktifkan kembali.'); break;
    case 'kpick': t.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === t))); break;
    case 'mrekedit': {
      const m = merekList().find(x => x.name === t.dataset.m); if (!m) break;
      $('#mrekForm').innerHTML = '<section class="card" style="margin-top:12px"><h3>Ubah nama merek</h3><div class="stack"><p class="note info" id="mrekNote">“' + esc(m.name) + '” dipakai di ' + m.n + ' jenis. Semuanya ikut berubah.</p>' +
        '<input id="mrekNew" class="field" type="text" value="' + esc(m.name) + '" autocomplete="off" aria-label="Nama merek baru" data-from="' + esc(m.name) + '">' +
        '<div class="two"><button class="btn" data-action="mreksave" data-m="' + esc(m.name) + '" data-confirm="Ya, ubah ' + m.n + ' jenis">Simpan</button><button class="btn ghost" data-action="mrekcancel">Batal</button></div></div></section>';
      const i = $('#mrekNew'); i.focus(); i.select(); i.scrollIntoView({ block: 'center' });
      break;
    }
    case 'mrekcancel': $('#mrekForm').innerHTML = ''; break;
    case 'mreksave': {
      const to = clean(val('mrekNew')), from = t.dataset.m;
      if (!to) { toast('Isi nama merek.'); break; }
      if (to === from) { toast('Nama belum diubah.'); break; }
      callEdit('renameMerek', { from, to }, r => r.changed ? 'Merek diubah di ' + r.changed + ' jenis.' : 'Tidak ada yang berubah.', () => render());
      break;
    }
    /* foto */
    case 'fotoedit': openFoto(t.dataset.id); break;
    case 'fotoclose': closeTop(); break;
    case 'fotocam': $('#fileCam').click(); break;
    case 'fotogal': $('#fileGal').click(); break;
    case 'fotorot': if (S.fotoEd && S.fotoEd.src) { S.fotoEd.rot = (S.fotoEd.rot + Number(t.dataset.d) + 4) % 4; S.fotoEd.ox = 0; S.fotoEd.oy = 0; makeWork(); drawCrop(); } break;
    case 'fotoback': if (S.fotoEd) { S.fotoEd.step = 'pilih'; renderFoto(); } break;
    case 'fotosave': fotoSave(); break;
    case 'fotohapus': fotoHapus(); break;
    /* profil mesin */
    case 'ptab': S.tab = t.dataset.t; history.replaceState({ ...curState(), d: (history.state && history.state.d) || 0 }, '', URL_); $('#app').innerHTML = viewProfil(); renderLive(); if (S.tab === 'riw') loadRiwayatUnit(); break;
    case 'opentab': go('jenis', { jid: t.dataset.id, tab: t.dataset.t }); break;
    /* penyimpanan */
    case 'opentempat': go('tempat', { tid: t.dataset.id }); break;
    case 'tempatbaru': go('tempatform', {}); break;
    case 'tempatedit': go('tempatform', { tid: t.dataset.id }); break;
    case 'subrakbaru': go('tempatform', { form: { induk: t.dataset.id } }); break;
    case 'tempatsave': saveTempat(); break;
    case 'tempatoff': callEdit('nonaktifTempat', { id: t.dataset.id }, 'Tempat dinonaktifkan.', () => go('tempatlist', { root: true })); break;
    case 'tempataktif': callEdit('aktifTempat', { id: t.dataset.id }, 'Tempat diaktifkan kembali.', () => render()); break;
    case 'toggleoff': S.showOffT = !S.showOffT; renderTempatList(); break;
    case 'tambahke': go('tambahtempat', { tid: t.dataset.id, form: { tab: t.dataset.tab || 'mesin', q: '', filt: 'belum', sel: [], selM: [] } }); break;
    case 'atab': if (S.form) { S.form.tab = t.dataset.t; S.form.q = ''; S.form.filt = 'belum'; $('#app').innerHTML = viewTambahTempat(); renderTambahTempat(); } break;
    case 'afilt': if (S.form) { S.form.filt = t.dataset.f; renderTambahTempat(); } break;
    case 'selunit': case 'selmat': if (S.form) { const l = a === 'selunit' ? S.form.sel : S.form.selM, i = l.indexOf(t.dataset.k); if (i >= 0) l.splice(i, 1); else l.push(t.dataset.k); renderTambahTempat(); } break;
    case 'ascan': openScan({ mode: 'tambah' }); break;
    case 'asave': saveTambahTempat(); break;
    case 'scanopenunit': go('profil', { kode: t.dataset.k, jid: U[t.dataset.k].j }); break;
    case 'placeclose': if (S.scan) { S.scan.place = null; S.scan.paused = false; lastCode = ''; renderScan(); } break;
    case 'placeopen': go('tempat', { tid: t.dataset.id }); break;
    case 'rakambil': {
      if (!S.scan) break;
      S.scan.mode = 'ambil';
      const fb = scanAmbil(t.dataset.k);
      beep(fb.type === 'ok' || fb.type === 'warn'); setFb(fb);
      break;
    }
    case 'pickplace': {
      const inp = $('#' + t.dataset.for), lab = $('#' + t.dataset.for + '-l');
      openPicker({ title: 'Tempat simpan', sub: 'Pilih rak, lemari, atau kontainer.', items: [{ v: '', l: 'Belum punya tempat' }, ...activePlaces().map(p => ({ v: p.id, l: p.n, s: p.l || p.id }))],
        onPick: it => { if (inp) inp.value = it.v; if (lab) lab.textContent = it.v ? it.l : 'Belum punya tempat'; if (t.dataset.for === 'tloc' && S.form) S.form.loc = it.v; } });
      break;
    }
    case 'pickitem': pickItem(t.dataset.i); break;
    /* material dan stok */
    case 'matbaru': go('matform', { form: { loc: '' } }); break;
    case 'matedit': go('matform', { mid: S.mid }); break;
    case 'matsave': saveMat(); break;
    case 'matonoff': callEdit('statusMaterial', { id: S.mid, off: t.dataset.off === '1' }, t.dataset.off === '1' ? 'Material dinonaktifkan.' : 'Material diaktifkan kembali.'); break;
    case 'openmat': go('mat', { mid: t.dataset.id }); break;
    case 'mcat': S.mcat = t.dataset.c; renderMatList(); break;
    case 'toggleoffm': S.showOffM = !S.showOffM; renderMatList(); break;
    case 'stokopen': openStok(t.dataset.id, t.dataset.t); break;
    case 'stokclose': closeTop(); break;
    case 'stoktipe': if (S.stokEd) { const m = stokMat(); S.stokEd.tipe = t.dataset.t; S.stokEd.jumlah = t.dataset.t === 'Koreksi' && m ? String(m.q) : '1'; renderStok(); } break;
    case 'stokstep': if (S.stokEd) { const j = Math.max(0, Math.round(((stokNum() || 0) + Number(t.dataset.d)) * 1000) / 1000); S.stokEd.jumlah = String(j); $('#stokJ').value = S.stokEd.jumlah; stokPreview(); } break;
    case 'stokq': if (S.stokEd) { S.stokEd.jumlah = t.dataset.n; $('#stokJ').value = t.dataset.n; stokPreview(); } break;
    case 'stoknama': openPicker({ title: 'Siapa?', sub: 'Nama pekerja yang mengambil atau menerima.', onPick: n => { if (S.stokEd) { S.stokEd.nama = n; renderStok(); } } }); break;
    case 'stokgo': stokSubmit(); break;
    /* panduan */
    case 'pdedit': go('panduan', { jid: curJid() }); break;
    case 'pdsave': savePanduan(); break;
    case 'pdver': if (S.pd) { S.pd.vi = Number(t.dataset.i); const el = $('#live-pd'); if (el) el.innerHTML = livePanduan(); } break;
    case 'pdmaint': pdMaint(); break;
    /* impor excel */
    case 'impcontoh': impContoh(); break;
    case 'impreset': S.imp = null; impRender(); break;
    case 'impgo': impGo(); break;
    /* impor isi rak */
    case 'ircontoh': irContoh(); break;
    case 'irreset': S.imr = null; irRender(); break;
    case 'irgo': irGo(); break;
    /* impor foto massal */
    case 'fipick': fiPick(Number(t.dataset.i)); break;
    case 'firemove': fiRemove(Number(t.dataset.i)); break;
    case 'fireset': fiReset(); break;
    case 'figo': fiGo(); break;
    /* dasbor */
    case 'dasborprint': window.print(); break;
    /* menu */
    case 'dscan': afterOv(() => openScan({ mode: 'ambil' })); break;
    case 'srterima': saranTerima(t.dataset.id); break;
    case 'srtolak': saranTolakSet(t.dataset.id); break;
    case 'srbatal': saranTolakSet(t.dataset.id, true); break;
    case 'srtoggle': S.showRj = !S.showRj; renderLive(); break;
    case 'rakbuat': callEdit('buatRak', { dari: 1, sampai: 50 }, r => r.dibuat + ' rak dibuat, ' + r.dilewati + ' sudah ada.', () => renderLive()); break;
    /* maintenance */
    case 'maintopen': $('#maintForm').hidden = false; t.hidden = true; $('#mCat').focus(); break;
    case 'maintcancel': $('#maintForm').hidden = true; $('#maintOpenBtn').hidden = false; break;
    case 'delmaint': if (S.confirmDel === t.dataset.id) { S.confirmDel = null; enqueue('deleteMaintenance', { id: t.dataset.id }); renderLive(); } else armConfirm(t.dataset.id); break;
    /* kolom maintenance custom per jenis */
    case 'skemaopen': go('skema', { jid: t.dataset.id }); break;
    case 'skadd': S.skForm = { label: '', tipe: 'teks' }; render(); break;
    case 'skedit': { const f = skemaFor(curJid()).find(x => x.id === t.dataset.id); if (f) { S.skForm = { ...f }; render(); } break; }
    case 'skcancel': S.skForm = null; render(); break;
    case 'sksave': saveSkema(); break;
    case 'skdel': {
      const key = 'sk:' + t.dataset.id;
      if (S.confirmDel === key) { S.confirmDel = null; callEdit('skemaHapusKolom', { jenisId: curJid(), kolomId: t.dataset.id }, 'Kolom dihapus.', () => render()); }
      else { S.confirmDel = key; render(); setTimeout(() => { if (S.confirmDel === key) { S.confirmDel = null; render(); } }, 4000); }
      break;
    }
    /* pengambilan */
    case 'uambil': openScanPreset('ambil', t.dataset.k); break;
    case 'uret': openScanPreset('kembali', t.dataset.k); break;
    case 'ret': returnIds([t.dataset.id], 'Baik'); toast('Dikembalikan.'); refresh(); break;
    case 'retrusak': returnIds([t.dataset.id], 'Rusak'); patchUnit(t.dataset.k, 'Rusak'); toast('Dikembalikan dan ditandai rusak.'); refresh(); break;
    /* scan */
    case 'scan': openScan({ mode: 'ambil' }); break;
    case 'scanclose': closeTop(); break;
    case 'scanmode': scanSetMode(t.dataset.mode); break;
    case 'scanmore': if (S.scan) { S.scan.paused = false; S.scan.fb = null; lastCode = ''; renderScan(); if (!stream) startCamera(); } break;
    case 'bremove': if (S.scan) { S.scan.basket = S.scan.basket.filter(b => b.kode !== t.dataset.k); if (!S.scan.basket.length) S.scan.paused = false; renderScan(); } break;
    case 'bkond': { const b = S.scan && S.scan.basket.find(x => x.kode === t.dataset.k); if (b) { b.kondisi = t.dataset.v; renderScan(); } break; }
    case 'bname': {
      const sc = S.scan, i = sc.basket.findIndex(x => x.kode === t.dataset.k), item = sc.basket[i];
      let same = ''; for (let k = i - 1; k >= 0; k--) if (sc.basket[k].name) { same = sc.basket[k].name; break; }
      openPicker({ title: 'Siapa yang mengambil?', sub: item.kode + ' · ' + unitTitle(U[item.kode]), same, onPick: n => { item.name = n; renderScan(); } });
      break;
    }
    case 'scanyes': scanYes(); break;
    case 'scanclear': if (S.scan) { S.scan.basket = []; S.scan.paused = false; S.scan.fb = null; renderScan(); } break;
    case 'scanundo': scanUndo(); break;
    case 'scanagain': if (S.scan) { S.scan.done = null; S.scan.paused = false; S.scan.fb = null; lastCode = ''; renderScan(); } break;
    case 'torch': if (stream) { torchOn = !torchOn; try { await stream.getVideoTracks()[0].applyConstraints({ advanced: [{ torch: torchOn }] }); } catch (err) { toast('Lampu tidak bisa dinyalakan.'); } } break;
    case 'pickclose': closeTop(); break;
    case 'pickname': pickName(t.dataset.n); break;
    case 'picknew': { const n = clean(t.dataset.n); if (n && await saveWorkers([...S.pekerja, { n, d: '' }])) pickName(n); break; }
    /* riwayat */
    case 'rwopen': S.rwDate = t.dataset.tgl; render(); loadAll(true); break;
    case 'rwback': S.rwDate = null; render(); loadRingkasan(); break;
    case 'print': printDay(); break;
    case 'export': exportXlsx(); break;
    case 'arsip':
      try { const j = await api('arsipkan', { tgl: S.rwDate }); toast('Diarsipkan: ' + j.jumlah + ' catatan.'); S.rwDate = null; render(); loadRingkasan(); loadAll(true); }
      catch (err) { toast(err.message || (err.code === 'network' ? 'Tidak ada sinyal.' : 'Gagal mengarsipkan.')); }
      break;
    /* pekerja */
    case 'addname': { const n = $('#newName'), d = $('#newDept'), v = clean(n.value); if (v) { if (await saveWorkers([...S.pekerja, { n: v, d: d.value }])) { n.value = ''; toast('Pekerja ditambahkan.'); } } else toast('Isi nama pekerja.'); break; }
    case 'doimport': {
      const items = parseImport(val('importText'));
      if (!items.length) { toast('Tidak ada baris yang bisa dibaca.'); break; }
      const before = S.pekerja.length;
      if (await saveWorkers([...S.pekerja, ...items])) { $('#importText').value = ''; $('#importInfo').textContent = ''; toast((S.pekerja.length - before) + ' pekerja baru ditambahkan.'); }
      break;
    }
    case 'delname': {
      const key = 'n:' + t.dataset.n;
      if (S.confirmDel === key) { S.confirmDel = null; if (await saveWorkers(S.pekerja.filter(p => p.n !== t.dataset.n))) toast('Dihapus dari daftar. Riwayat lamanya tetap tersimpan.'); }
      else armConfirm(key);
      break;
    }
  }
});

document.addEventListener('submit', async e => {
  const id = e.target.id;
  if (id === 'pinForm') {
    e.preventDefault();
    const pin = clean($('#pinInput').value), btn = $('#pinBtn');
    if (!/^\d{6}$/.test(pin)) { showPin('PIN terdiri dari 6 angka.'); return; }
    btn.disabled = true;
    try {
      const r = await doLogin(pin);
      if (r.ok) { $('#pin').hidden = true; $('#pinInput').value = ''; $('#pinErr').hidden = true; S.loadError = null; lsSet('qrg.hadTok', true); loadAll(); flush(); }
      else if (r.error === 'kunci') { $('#pinInput').value = ''; showPin('Terlalu banyak salah. Coba lagi dalam ' + r.menit + ' menit.'); }
      else { $('#pinInput').value = ''; showPin('PIN salah. Sisa percobaan: ' + (r.sisa ?? '?') + '.'); }
    } catch (err) { showPin(err.code === 'network' ? 'Tidak ada sinyal. Coba lagi.' : 'Server tidak menjawab. Coba lagi.'); }
    btn.disabled = false;
  } else if (id === 'maintForm') {
    e.preventDefault();
    const tgl = val('mDate'), next = val('mNext'), oleh = clean(val('mOleh'));
    if (!tgl) { toast('Isi tanggal maintenance.'); return; }
    lsSet('qrg.mOleh', oleh);
    const u = U[S.kode], jid = u ? u.j : '', cols = skemaFor(jid), data = {};
    cols.forEach(f => {
      const el = $('#mx_' + f.id); if (!el) return;
      if (f.tipe === 'centang') { if (el.checked) data[f.id] = true; }
      else { const v = clean(el.value); if (v) data[f.id] = v; }
    });
    const lampiran = clean(val('mPdf'));
    enqueue('addMaintenance', { id: uid(), kode: S.kode, tgl, jenis: val('mJenis'), oleh, cat: val('mCat').trim(), next, data, lampiran });
    $('#maintForm').hidden = true; $('#maintOpenBtn').hidden = false; $('#mCat').value = ''; $('#mNext').value = ''; $('#mPdf').value = '';
    cols.forEach(f => { const el = $('#mx_' + f.id); if (el) { if (f.tipe === 'centang') el.checked = false; else el.value = ''; } });
    renderLive(); toast('Maintenance dicatat.');
  }
});
document.addEventListener('input', e => {
  const id = e.target.id;
  if (id === 'q') { S.q = e.target.value; renderJlist(true); }
  else if (id === 'pq') { S.tq = e.target.value; renderTempatList(); }
  else if (id === 'mq') { S.mqq = e.target.value; renderMatList(); }
  else if (id === 'aq') { if (S.form) { S.form.q = e.target.value; renderTambahTempat(); } }
  else if (id === 'stokJ') { if (S.stokEd) { S.stokEd.jumlah = e.target.value; stokPreview(); } }
  else if (id === 'stokC') { if (S.stokEd) S.stokEd.cat = e.target.value; }
  else if (id === 'cropZoom') { if (S.fotoEd) { S.fotoEd.zoom = Number(e.target.value); drawCrop(); } }
  else if (id === 'tq') { S.form.q = e.target.value; const q = norm(e.target.value); $('#tlist').innerHTML = tambahList(S.jenis.filter(j => !q || norm([j.n, j.b, j.m].join(' ')).includes(q)).sort((a, b) => byName(a.n, b.n) || byName(a.b, b.b))); }
  else if (id === 'pickq') { S.picker.q = e.target.value; fillPicker(); }
  else if (id === 'pinInput') e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
  else if (id === 'tawalan' || id === 'jawalan') { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3); updateCodePrev(); }
  else if (id === 'importText') { const n = parseImport(e.target.value).length; $('#importInfo').textContent = n ? n + ' baris terbaca.' : ''; }
  else if (id === 'mrekNew') {
    const v = norm(e.target.value), from = e.target.dataset.from, other = merekList().find(m => norm(m.name) === v && norm(m.name) !== norm(from));
    $('#mrekNote').textContent = other ? 'Sudah ada merek “' + other.name + '”. Kedua merek akan digabung.' : '“' + from + '” akan diganti di semua jenis yang memakainya.';
  }
});
document.addEventListener('change', e => {
  const id = e.target.id, v = e.target.value;
  if (id === 'impFile') { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) impLoad(f); return; }
  if (id === 'irFile') { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) irLoad(f); return; }
  if (id === 'fiFile') { const fs = e.target.files; e.target.value = ''; if (fs && fs.length) fiPicked(fs); return; }
  if (id === 'fileCam' || id === 'fileGal') { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) fotoPicked(f); return; }
  if (id === 'tkat') { $('#tkatBox').hidden = v !== '__new'; updateCodePrev(); }
  else if (id === 'jkat') $('#jkatBox').hidden = v !== '__new';
  else if (id === 'tmerek') $('#tmerekBox').hidden = v !== '__new';
  else if (id === 'jmerek') $('#jmerekBox').hidden = v !== '__new';
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'newName') { e.preventDefault(); const b = document.querySelector('[data-action="addname"]'); if (b) b.click(); }
});

/* ---------- hash (stiker lama: #BOR-014) dan siklus aplikasi ---------- */
function codeFromHash() {
  const h = decodeURIComponent((location.hash || '').slice(1)).toUpperCase();
  return /^(?:[A-Z]{3}|LOK|MAT)-\d{3}$/.test(h) ? h : '';
}
function openCode(k) {
  if (isLok(k)) { if (T[k]) go('tempat', { tid: k }); else toast(k + ' tidak ada di daftar.'); }
  else if (/^MAT-/.test(k)) { if (M[k]) go('mat', { mid: k }); else toast(k + ' tidak ada di daftar.'); }
  else if (U[k]) openUnit(k); else toast(k + ' tidak ada di daftar.');
}
window.addEventListener('hashchange', () => { const k = codeFromHash(); if (k) { history.replaceState(history.state, '', URL_); openCode(k); } });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (S.scan) stopCamera(); }
  else { flush(); loadAll(true); if (S.scan && !S.scan.done) startCamera(); }
});
window.addEventListener('online', () => { flush(); loadAll(true); });

/* ---------- layar lebar: menu samping tetap terlihat ---------- */
function applyPinned(init) {
  S.pinned = isWide(); document.body.classList.toggle('pinned', S.pinned);
  const d = $('#drawer');
  if (S.pinned) { if (S.ov.includes('drawer')) S.ov.splice(S.ov.indexOf('drawer'), 1); renderDrawer(); d.hidden = false; }
  else if (!S.ov.includes('drawer')) d.hidden = true;
  if (!init) renderChrome();
}

/* ---------- mulai ---------- */
(function start() {
  document.documentElement.lang = LANG.cur;
  setupLangObserver();
  const c = lsGet('qrg.c3', null);
  if (c && c.jenis) applyData(c);
  const k = codeFromHash();
  if (k) { if (isLok(k)) { S.view = 'tempat'; S.tid = k; } else if (/^MAT-/.test(k)) { S.view = 'mat'; S.mid = k; } else { S.view = 'profil'; S.kode = k; } }
  applyPinned(true);
  history.replaceState({ ...curState(), d: 0 }, '', URL_);
  render();
  if (!S.tok && API_URL && !API_URL.includes('PASTE')) showPin(); else loadAll();
  flush();
  setInterval(() => { if (document.hidden || Q.busy || Busy.n) return; if (['nama', 'jenis', 'profil', 'hari', 'riwayat', 'tempat', 'tempatlist', 'material', 'mat'].includes(S.view) || S.scan) loadAll(true); }, 20000);
  window.matchMedia('(min-width: 1000px)').addEventListener('change', () => { applyPinned(); render(); });
  setInterval(flush, 25000);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
