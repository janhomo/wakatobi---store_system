/* ---------- Panduan maintenance per jenis (berversi: versi lama tetap tersimpan) ---------- */
async function loadPanduan() {
  const jid = curJid(); if (!jid) return;
  S.pd = { jid, list: null, error: false, vi: 0 };
  const el = $('#live-pd'); if (el) el.innerHTML = livePanduan();
  try { const j = await api('panduanGet', { id: jid }); if (S.pd && S.pd.jid === jid) S.pd.list = j.panduan; }
  catch (e) { if (S.pd && S.pd.jid === jid) { S.pd.list = []; S.pd.error = true; } }
  const el2 = $('#live-pd'); if (el2) el2.innerHTML = livePanduan();
  if (S.view === 'panduan') $('#app').innerHTML = viewPanduanEdit();
}
const safeUrl = u => /^https?:\/\/[^\s]+$/i.test(String(u || '')) ? u : '';
const stepLines = t => String(t || '').split('\n').map(x => x.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean);
const bulletLines = t => String(t || '').split('\n').map(x => x.replace(/^\s*[-•*]\s*/, '').trim()).filter(Boolean);
function livePanduan() {
  const jid = curJid(), j = J[jid];
  if (!j) return '';
  if (!S.pd || S.pd.jid !== jid || S.pd.list === null) return '<p class="muted">Memuat…</p>';
  if (S.pd.error) return '<p class="muted">Panduan belum bisa dimuat. Cek sinyal.</p>';
  const list = S.pd.list;
  if (!list.length) return '<div class="card"><h3>Belum ada panduan</h3><p class="muted" style="margin:0 0 12px;font-size:15px">Isi panduan servis untuk ' + esc(j.n) + ': peringatan, alat dan bahan, langkah, dan jadwal servis.</p>' +
    '<button class="btn" data-action="pdedit">Tulis panduan</button></div>';
  const p = list[Math.min(S.pd.vi || 0, list.length - 1)], latest = list[0] === p;
  const sec = (t, inner) => '<section class="pdsec"><h3>' + t + '</h3>' + inner + '</section>';
  const url = safeUrl(p.u);
  return '<div class="pdhead"><div><b>' + (p.i ? 'Servis tiap ' + p.i + ' bulan' : 'Jadwal servis belum diatur') + '</b><small class="muted">Versi ' + p.v + (latest ? ' · terbaru' : ' · versi lama') + '</small></div></div>' +
    (!latest ? '<p class="note warn">Ini versi lama. <button class="btn small ghost" style="display:inline-flex;min-height:36px;margin-left:6px" data-action="pdver" data-i="0">Lihat versi terbaru</button></p>' : '') +
    (p.p ? '<div class="note warn pdwarn">' + ic('alert', 20) + '<span>' + esc(p.p).replace(/\n/g, '<br>') + '</span></div>' : '') +
    (p.a ? sec('Alat dan bahan', '<ul class="pdl">' + bulletLines(p.a).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>') : '') +
    (p.l ? sec('Langkah', '<ol class="pdl">' + stepLines(p.l).map(x => '<li>' + esc(x) + '</li>').join('') + '</ol>') : '') +
    '<p class="muted" style="font-size:13px;margin:10px 0">Terakhir diubah oleh ' + esc(p.o || '—') + ' · ' + esc(fmtDT(p.t)) + '</p>' +
    (url ? '<a class="btn ghost" style="margin-bottom:10px" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + ic('book', 20) + 'Buka manual (PDF)</a>' : '') +
    '<div class="two"><button class="btn" data-action="pdmaint">Catat maintenance</button><button class="btn ghost" data-action="pdedit">Ubah panduan</button></div>' +
    (list.length > 1 ? '<h2 class="h2">Riwayat versi</h2><ul class="vlist">' + list.map((x, i) => '<li><button data-action="pdver" data-i="' + i + '"' + (x === p ? ' aria-current="true"' : '') + '><b>Versi ' + x.v + '</b>' + (i === 0 ? ' <span class="pill ok">Terbaru</span>' : '') + '<br><small class="muted">' + esc(x.o || '—') + ' · ' + esc(fmtDT(x.t)) + '</small></button></li>').join('') + '</ul>' : '');
}
/* "Catat maintenance": langsung ke unit kalau jenisnya hanya punya satu unit, kalau tidak pilih dulu */
function pdMaint() {
  const jid = curJid(), us = (JU[jid] || []).filter(u => !u.off);
  const go1 = u => go('profil', { kode: u.k, jid, tab: 'maint' });
  if (!us.length) { toast('Belum ada unit untuk jenis ini.'); return; }
  if (us.length === 1) { go1(us[0]); return; }
  openPicker({ title: 'Unit mana?', sub: 'Pilih unit yang diservis.', items: us.map(u => ({ v: u.k, l: u.k + ' · Unit ' + u.u, s: hasPlace(u) ? placeName(u) : '' })), onPick: it => go1(U[it.v]) });
}

function viewPanduanEdit() {
  const jid = curJid(), j = J[jid];
  if (!j) return '<p class="empty">' + (S.loaded ? 'Jenis tidak ditemukan.' : 'Memuat…') + '</p>';
  if (!(S.pd && S.pd.jid === jid && S.pd.list)) return '<p class="empty">Memuat…</p>';
  const cur = S.pd.list[0] || { v: 0, p: '', a: '', l: '', i: 0, u: '' };
  const next = cur.v + 1;
  return '<div class="stack"><section class="card"><h3>Panduan ' + esc(j.n) + '</h3><div class="stack">' +
    '<p class="note info">' + (cur.v ? 'Versi ' + cur.v + ' tidak dihapus. Perubahan disimpan sebagai versi ' + next + '.' : 'Ini panduan pertama untuk ' + esc(j.n) + '.') + '</p>' +
    fld('pdi', 'Servis tiap berapa bulan (boleh kosong)', cur.i || '', { mode: 'numeric', ph: 'contoh: 3' }) +
    '<div><label class="lbl" for="pdp">Peringatan (boleh kosong)</label><textarea id="pdp" class="field" placeholder="contoh: Cabut kabel listrik sebelum membuka casing.">' + esc(cur.p) + '</textarea></div>' +
    '<div><label class="lbl" for="pda">Alat dan bahan (satu per baris)</label><textarea id="pda" class="field" placeholder="Kunci pas 10&#10;Grease&#10;Sikat karbon">' + esc(cur.a) + '</textarea></div>' +
    '<div><label class="lbl" for="pdl">Langkah (satu per baris)</label><textarea id="pdl" class="field tall" placeholder="Matikan dan cabut kabel&#10;Buka casing&#10;Bersihkan debu">' + esc(cur.l) + '</textarea></div>' +
    fld('pdu', 'Tautan manual PDF (boleh kosong)', cur.u, { type: 'url', ph: 'https://…' }) +
    '<button class="btn" data-action="pdsave">Simpan sebagai versi ' + next + '</button></div></section></div>';
}
function savePanduan() {
  const jid = curJid(); if (!jid) return;
  const i = clean(val('pdi')), u = clean(val('pdu'));
  if (i && !/^\d{1,3}$/.test(i)) { toast('Interval servis harus angka (bulan).'); return; }
  const p = val('pdp').trim(), a = val('pda').trim(), l = val('pdl').trim();
  if (!p && !a && !l) { toast('Isi minimal satu bagian panduan.'); return; }
  callEdit('panduanSimpan', { jid, p, a, l, u, i }, r => r.changed ? 'Panduan disimpan sebagai versi ' + r.v + '.' : 'Tidak ada yang berubah.');
}
