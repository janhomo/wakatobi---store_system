'use strict';
const CFG = window.CONFIG || {};
const API_URL = CFG.API_URL || '';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const norm = s => clean(s).toLowerCase();
const p2 = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
const today = () => ymd(new Date());
const nowIso = () => { const d = new Date(); return ymd(d) + 'T' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()); };
const nowHM = () => { const d = new Date(); return p2(d.getHours()) + ':' + p2(d.getMinutes()); };
const parseYmd = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const fmtDate = s => parseYmd(s).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtShort = s => parseYmd(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtHM = t => t ? String(t).slice(11, 16) : '';
const fmtDT = t => t ? parseYmd(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ' ' + fmtHM(t) : '';
const daysFromToday = s => Math.round((parseYmd(s) - parseYmd(today())) / 86400000);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const byName = (a, b) => String(a).localeCompare(String(b), 'id');

/* ---------- ikon ---------- */
const IC = {
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  tool: '<path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.8a3.5 3.5 0 010 6.4M18 14.4c2.2.7 3.5 2.6 3.5 5.6"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  qr: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>',
  refresh: '<path d="M20 11a8 8 0 00-14-4M4 5v4h4M4 13a8 8 0 0014 4M20 19v-4h-4"/>',
  logout: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  box: '<path d="M4 8l8-4 8 4v9l-8 4-8-4zM4 8l8 4 8-4M12 12v9"/>',
  cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  img: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4 4 3 3-2 4 3"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  rotl: '<path d="M4 9a8 8 0 1114 6M4 4v5h5"/>',
  rotr: '<path d="M20 9a8 8 0 10-14 6M20 4v5h-5"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
  print: '<path d="M7 9V4h10v5M7 17H5a1 1 0 01-1-1v-5a2 2 0 012-2h12a2 2 0 012 2v5a1 1 0 01-1 1h-2"/><rect x="7" y="14" width="10" height="6"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5"/>',
  book: '<path d="M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h10"/>',
  minus: '<path d="M5 12h14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  alert: '<path d="M12 4l9 16H3zM12 10v4M12 17h.01"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'
};
const ic = (n, s = 24) => '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>';

/* ---------- tampilan: Otomatis (ikut perangkat), Terang, Gelap ---------- */
const THEMES = ['auto', 'light', 'dark'], THEME_L = { auto: 'Otomatis', light: 'Terang', dark: 'Gelap' };
const getTheme = () => { const t = lsGet('qrg.theme', 'auto'); return THEMES.includes(t) ? t : 'auto'; };
function setTheme(t) {
  lsSet('qrg.theme', t);
  if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
}

/* ---------- state ---------- */
const KONDISI = ['Normal', 'Servis', 'Rusak', 'Rusak total', 'Belum dicek'];
const MJENIS = ['Servis rutin', 'Ganti sparepart', 'Perbaikan', 'Kalibrasi', 'Pengecekan', 'Lainnya'];
const S = {
  view: 'mesin', nm: null, wj: null, jid: null, kode: null, tid: null, mid: null, tab: 'unit', filter: '', q: '',
  jenis: [], units: [], kategori: [], tempat: [], material: [], pekerja: [], maintServer: [], pengServer: [], pengDate: null, belumServer: [], cfg: { jamPulang: '17:00', pengedit: ['Abidin', 'Vikar', 'La Ode Riyan Syaputra'] },
  loaded: false, loadError: null, tok: lsGet('qrg.tok', ''), me: lsGet('qrg.me', ''),
  ov: [], pending: null, form: null, confirmDel: null,
  rwDate: null, rw: { list: null, error: false }, riw: { key: null, list: null, error: false }, logs: { list: null, error: false },
  scan: null, picker: null, justAdded: null, focus: null
};
let J = {}, U = {}, JU = {}, T = {}, M = {};

function statusOf(label) {
  const l = norm(label);
  if (l === 'normal') return 'ok';
  if (l === 'rusak' || l === 'rusak total') return 'bad';
  if (!l || l === 'belum dicek') return 'unk';
  return 'warn';
}
function buildMaps() {
  J = {}; U = {}; JU = {}; T = {}; M = {};
  S.tempat.forEach(t => { T[t.id] = t; });
  S.material.forEach(m => { M[m.id] = m; });
  S.jenis.forEach(j => { J[j.id] = j; JU[j.id] = []; });
  S.units.forEach(u => { U[u.k] = u; if (JU[u.j]) JU[u.j].push(u); });
  Object.values(JU).forEach(l => l.sort((a, b) => (Number(a.u) || 0) - (Number(b.u) || 0) || a.k.localeCompare(b.k)));
}
function setUnits(list) {
  S.units = list.map(u => ({ ...u, off: !!u.off, cond: clean(u.sl) || 'Belum dicek', s: u.off ? 'unk' : statusOf(u.sl), sl: u.off ? 'Nonaktif' : (clean(u.sl) || 'Belum dicek') }));
}
function applyData(d) {
  S.jenis = d.jenis || []; S.kategori = d.kategori || []; S.tempat = d.tempat || []; S.material = d.material || [];
  setUnits(d.unit || []);
  buildMaps();
  S.pekerja = d.pekerja || []; S.maintServer = d.maintenance || d.maint || []; S.belumServer = d.belum || []; S.cfg = { ...S.cfg, ...(d.cfg || {}) };
  if (!S.cfg.pengedit || !S.cfg.pengedit.length) S.cfg.pengedit = ['Abidin', 'Vikar', 'La Ode Riyan Syaputra'];
  S.loaded = true;
  if (typeof syncFoto === 'function') syncFoto();
}
/* ---------- mesin dikelompokkan per nama: nama > merek/model > unit ---------- */
const nameKey = j => norm(j.n);
function nameGroups() {
  const m = new Map();
  S.jenis.forEach(j => {
    const k = nameKey(j);
    if (!m.has(k)) m.set(k, { key: k, name: j.n, cat: j.c, jenis: [] });
    m.get(k).jenis.push(j);
  });
  m.forEach(g => g.jenis.sort((a, b) => byName(a.b, b.b) || byName(a.m, b.m)));
  return m;
}
const nameGroup = k => nameGroups().get(k) || null;
const nameUnits = g => g.jenis.reduce((a, j) => a.concat(JU[j.id] || []), []);
const editors = () => S.cfg.pengedit;
const isEditor = n => editors().some(e => norm(e) === norm(n));
const deptList = () => [...new Set(S.pekerja.map(p => p.d).filter(Boolean))].sort(byName);
const deptOf = nama => { const p = S.pekerja.find(p => norm(p.n) === norm(nama)); return p ? p.d : ''; };
const jenisOf = u => J[u.j] || { id: u.j, n: u.k, b: '', m: '', c: '' };
const mesinText = u => { const j = jenisOf(u); return j.n + ' (unit ' + u.u + ')'; };
const modelText = j => [j.b, j.m].filter(Boolean).join(' ');
const subText = j => [j.b, j.m].filter(Boolean).join(' · ');
const unitTitle = u => jenisOf(u).n + ' · Unit ' + u.u;
function patchUnit(kode, kondisi) {
  const u = U[kode]; if (!u) return;
  u.cond = kondisi; u.sl = u.off ? 'Nonaktif' : kondisi; u.s = u.off ? 'unk' : statusOf(kondisi);
}

/* ---------- tempat penyimpanan ---------- */
const isLok = v => /^LOK-\d{3}$/.test(String(v || ''));
const placeOf = u => (u && isLok(u.loc) ? T[u.loc] : null);
const hasPlace = u => !!placeOf(u);
const placeName = u => { const t = placeOf(u); return t ? t.n : ''; };
const placeText = u => { const t = placeOf(u); return t ? t.n + (t.l ? ' · ' + t.l : '') : 'Belum punya tempat'; };
const activePlaces = () => S.tempat.filter(t => !t.off).sort((a, b) => byName(a.n, b.n));
function placeSummary(tid) {
  const held = heldMap();
  const us = S.units.filter(u => !u.off && u.loc === tid);
  const mats = allMaterial().filter(m => !m.off && m.loc === tid);
  return { units: us, out: us.filter(u => held.has(u.k)).length, mats, low: mats.filter(isLow).length };
}

/* ---------- material dan stok (dengan catatan stok yang menunggu terkirim) ---------- */
function stokApply(q, p) {
  const j = Number(String(p.jumlah).replace(',', '.')) || 0;
  return p.tipe === 'Keluar' ? Math.round((q - j) * 1000) / 1000 : p.tipe === 'Masuk' ? Math.round((q + j) * 1000) / 1000 : j;
}
function allMaterial() {
  const pend = Q.items.filter(i => i.action === 'stok');
  return S.material.map(m => {
    let q = m.q; pend.forEach(i => { if (i.payload.mat === m.id) q = stokApply(q, i.payload); });
    return pend.length && q !== m.q ? { ...m, q, pending: true } : m;
  });
}
const isLow = m => m.lo > 0 && m.q <= m.lo;
const fmtQty = n => { const r = Math.round(n * 1000) / 1000; return r.toLocaleString('id-ID', { maximumFractionDigits: 3 }); };

/* ---------- servis berikutnya: dari catatan maintenance, atau interval panduan ---------- */
function addMonths(ymdStr, n) { const d = parseYmd(ymdStr); const day = d.getDate(); d.setMonth(d.getMonth() + n); if (d.getDate() < day) d.setDate(0); return ymd(d); }
function nextService(k) {
  const u = U[k]; if (!u) return '';
  const l = maintFor(k); if (!l.length) return '';
  if (l[0].next) return l[0].next;
  const j = J[u.j]; return j && j.pi > 0 ? addMonths(l[0].tgl, j.pi) : '';
}
function serviceText(k) {
  const n = nextService(k); if (!n) return { t: 'Belum ada jadwal', c: '' };
  const d = daysFromToday(n);
  return d < 0 ? { t: 'Terlewat ' + (-d) + ' hari', c: 'late' } : d === 0 ? { t: 'Hari ini', c: 'warn' } : { t: d + ' hari lagi', c: d <= 7 ? 'warn' : '' };
}

/* ---------- indikator loading: tombol berputar, garis proses di bawah header, tulisan status ---------- */
const Busy = { n: 0, btn: null, orig: '', msg: '', ok: false, edit: false };
function busyRender() {
  const pr = $('#prog'), sb = $('#savebar'); if (!pr || !sb) return;
  pr.hidden = Busy.n === 0;
  if (Busy.n > 0) { sb.hidden = false; sb.className = 'savebar'; sb.textContent = Busy.msg; }
  else if (Busy.ok) { sb.hidden = false; sb.className = 'savebar ok'; sb.textContent = 'Tersimpan'; }
  else sb.hidden = true;
}
function busyBegin(msg, withBtn) {
  Busy.n++; Busy.ok = false; clearTimeout(Busy.t);
  Busy.msg = msg || 'Menyimpan ke Sheet. Mohon tunggu, jangan tutup halaman.';
  if (withBtn && !Busy.btn) {
    const b = window.__btn;
    if (b && b.isConnected && b.tagName === 'BUTTON') { Busy.btn = b; Busy.orig = b.innerHTML; b.disabled = true; b.classList.add('loading'); b.innerHTML = '<span class="spin"></span>Menyimpan…'; }
  }
  busyRender();
}
function busyEnd(ok) {
  Busy.n = Math.max(0, Busy.n - 1);
  if (Busy.n === 0) {
    if (Busy.btn) { if (Busy.btn.isConnected) { Busy.btn.innerHTML = Busy.orig; Busy.btn.disabled = false; Busy.btn.classList.remove('loading'); } Busy.btn = null; }
    if (ok) { Busy.ok = true; Busy.t = setTimeout(() => { Busy.ok = false; busyRender(); }, 2200); }
  }
  busyRender();
}
/* aksi yang menulis ke Sheet */
const WRITE_ACTIONS = new Set(['addUnit', 'editUnit', 'editJenis', 'nonaktifUnit', 'aktifkanUnit', 'renameMerek', 'gabungJenis', 'addTempat', 'editTempat', 'nonaktifTempat', 'aktifTempat', 'setTempat',
  'fotoSet', 'fotoHapus', 'panduanSimpan', 'addMaterial', 'editMaterial', 'statusMaterial', 'stok', 'imporUnit', 'savePekerja', 'arsipkan', 'addPengambilan', 'returnPengambilan', 'batalKembali',
  'cancelPengambilan', 'addMaintenance', 'deleteMaintenance', 'buatRak', 'saranTolak', 'pulihKondisi', 'imporRak']);

/* ---------- API dan login ---------- */
async function raw(action, payload = {}) {
  if (!API_URL || API_URL.includes('PASTE')) throw { code: 'config' };
  let res;
  try { res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, ...payload }) }); }
  catch (e) { throw { code: 'network' }; }
  try { return await res.json(); } catch (e) { throw { code: 'server' }; }
}
async function api(action, payload = {}) {
  const w = WRITE_ACTIONS.has(action);
  if (w) busyBegin(null, !Q.busy);
  let ok = false;
  try { return await api_(action, payload, () => { ok = true; }); }
  finally { if (w) busyEnd(ok); }
}
async function api_(action, payload, done) {
  const j = await raw(action, { token: S.tok, ...payload });
  if (!j.ok) {
    if (j.error === 'pin') { S.tok = ''; lsSet('qrg.tok', ''); throw { code: 'pin' }; }
    throw { code: 'server', message: j.error };
  }
  done();
  return j;
}
async function doLogin(pin) {
  const j = await raw('login', { pin });
  if (j.ok) { S.tok = j.token; lsSet('qrg.tok', j.token); return { ok: true }; }
  return { ok: false, error: j.error, sisa: j.sisa, menit: j.menit };
}
function showPin(msg) {
  $('#pin').hidden = false;
  const e = $('#pinErr'); e.hidden = !msg; e.textContent = msg || '';
  setTimeout(() => $('#pinInput').focus(), 50);
}

/* ---------- antrean: catatan disimpan di HP dulu, lalu dikirim ---------- */
const Q = { items: lsGet('qrg.queue', []), busy: false };
function saveQ() { lsSet('qrg.queue', Q.items); renderChrome(); }
function enqueue(action, payload) { Q.items.push({ action, payload }); saveQ(); flush(); }
function dropQueued(pred) {
  const i = Q.items.findIndex((it, idx) => pred(it) && !(Q.busy && idx === 0));
  if (i >= 0) { Q.items.splice(i, 1); saveQ(); return true; }
  return false;
}
async function flush() {
  if (Q.busy || !Q.items.length) return;
  Q.busy = true; let sent = false;
  try {
    while (Q.items.length) {
      const it = Q.items[0];
      try {
        await api(it.action, it.payload); sent = true;
        if (it.action === 'stok' && M[it.payload.mat]) { M[it.payload.mat].q = stokApply(M[it.payload.mat].q, it.payload); if (S.view === 'mat' && S.mid === it.payload.mat) setTimeout(loadStokLog, 0); }
      }
      catch (e) {
        if (e.code === 'network' || e.code === 'config') break;
        if (e.code === 'pin') { showPin('Masuk lagi dengan PIN.'); break; }
        toast('Satu catatan ditolak server: ' + (e.message || 'error'));
      }
      Q.items.shift(); saveQ();
    }
  } finally { Q.busy = false; renderChrome(); }
  if (sent && !Q.items.length) loadAll(true);
}
function allEntries() {
  const map = new Map();
  S.belumServer.concat(S.pengServer).forEach(e => map.set(e.id, { ...e }));
  Q.items.forEach(it => {
    const p = it.payload;
    if (it.action === 'addPengambilan') {
      if (!map.has(p.id)) map.set(p.id, { id: p.id, tgl: p.tgl, nama: p.nama, dept: p.dept || '', kode: p.kode, mesin: p.mesin, model: p.model, ts: p.waktu, kembali: '', kondisi: '', cat: '', pending: true });
    } else if (it.action === 'returnPengambilan') {
      const e = map.get(p.id);
      if (e) { if (!e.kembali) e.kembali = p.waktu; e.kondisi = p.kondisi || 'Baik'; if (p.cat) e.cat = p.cat; e.pending = true; }
    } else if (it.action === 'batalKembali') {
      const e = map.get(p.id); if (e) { e.kembali = ''; e.kondisi = ''; }
    } else if (it.action === 'cancelPengambilan') map.delete(p.id);
  });
  return [...map.values()];
}
const byTs = (a, b) => String(a.ts || '').localeCompare(String(b.ts || ''));
const entriesFor = d => allEntries().filter(e => e.tgl === d).sort(byTs);
const openEntries = () => allEntries().filter(e => !e.kembali).sort(byTs);
const heldMap = () => { const m = new Map(); openEntries().forEach(e => { if (!m.has(e.kode)) m.set(e.kode, e); }); return m; };
const isLate = e => !e.kembali && (e.tgl < today() || nowHM() >= (S.cfg.jamPulang || '17:00'));
function maintAll() {
  const del = new Set(Q.items.filter(i => i.action === 'deleteMaintenance').map(i => i.payload.id));
  const ids = new Set(S.maintServer.map(e => e.id));
  const out = S.maintServer.filter(e => !del.has(e.id));
  Q.items.filter(i => i.action === 'addMaintenance' && !ids.has(i.payload.id) && !del.has(i.payload.id))
    .forEach(i => out.push({ id: i.payload.id, k: i.payload.kode, tgl: i.payload.tgl, jenis: i.payload.jenis, oleh: i.payload.oleh, cat: i.payload.cat, next: i.payload.next, pending: true }));
  return out;
}
const maintFor = k => maintAll().filter(m => m.k === k).sort((a, b) => b.tgl.localeCompare(a.tgl));
function maintSummary(k) {
  const l = maintFor(k); if (!l.length) return { n: 0 };
  const withNext = l.find(m => m.next);
  return { n: l.length, last: l[0].tgl, next: withNext ? withNext.next : '' };
}
const currentDate = () => (S.view === 'riwayat' && S.rwDate ? S.rwDate : today());

async function loadAll(silent) {
  const tgl = currentDate();
  if (!silent) busyBegin('Memuat data dari Sheet…');
  try {
    const j = await api('bootstrap', { tgl });
    S.pengServer = j.pengambilan || []; S.pengDate = tgl;
    applyData(j); S.loadError = null;
    lsSet('qrg.c3', { jenis: j.jenis, unit: j.unit, kategori: j.kategori, tempat: j.tempat, material: j.material, pekerja: j.pekerja, maintenance: j.maintenance, belum: j.belum, cfg: j.cfg });
  } catch (e) {
    if (e.code === 'pin') { showPin(S.tok === '' && lsGet('qrg.hadTok', false) ? 'Masuk lagi dengan PIN.' : ''); return; }
    S.loadError = e.code;
  } finally { if (!silent) busyEnd(false); }
  lsSet('qrg.hadTok', true);
  refresh();
}

/* ---------- navigasi dengan riwayat browser (tombol Back Android) ---------- */
const URL_ = location.pathname + location.search;
function curState() { return { v: S.view, nm: S.nm, wj: S.wj, jid: S.jid, kode: S.kode, tid: S.tid, mid: S.mid, tab: S.tab, ovn: S.ov.length }; }
function resetTransient() { S.confirmDel = null; S.form = null; S.justAdded = null; if (S.view !== 'panduan') S.pd = null; }
function syncState() { try { history.replaceState({ ...curState(), d: (history.state && history.state.d) || 0 }, '', URL_); } catch (e) {} }
function go(view, o = {}) {
  if (S.ov.length) { S.pending = () => go(view, o); history.go(-S.ov.length); return; }
  S.view = view; S.nm = o.nm || null; S.jid = o.jid || null; S.kode = o.kode || null; S.tid = o.tid || null; S.mid = o.mid || null; S.tab = o.tab || 'unit'; S.focus = null;
  resetTransient(); S.form = o.form || null; S.justAdded = o.justAdded || null;
  if (view === 'riwayat') S.rwDate = null;
  const st = curState();
  if (o.root) { st.d = 0; history.replaceState(st, '', URL_); }
  else if (o.replace) { st.d = (history.state && history.state.d) || 0; history.replaceState(st, '', URL_); }
  else { st.d = ((history.state && history.state.d) || 0) + 1; history.pushState(st, '', URL_); }
  render(); window.scrollTo(0, 0); onEnter();
}
function back() {
  if (S.ov.length) { history.back(); return; }
  if (history.state && history.state.d > 0) history.back(); else go('mesin', { root: true });
}
function pushOv(name) {
  S.ov.push(name);
  const st = curState(); st.d = (history.state && history.state.d) || 0;
  history.pushState(st, '', URL_);
}
function closeTop() { if (S.ov.length) history.back(); }
function closeOv(name) {
  if (name === 'scan') { stopCamera(); $('#scan').hidden = true; S.scan = null; if (S.view === 'tambahtempat') render(); }
  else if (name === 'picker') { $('#picker').hidden = true; S.picker = null; }
  else if (name === 'drawer') { if (!S.pinned) $('#drawer').hidden = true; }
  else if (name === 'foto') { $('#fotoSheet').hidden = true; S.fotoEd = null; }
  else if (name === 'stok') { $('#stokSheet').hidden = true; S.stokEd = null; }
}
window.addEventListener('popstate', e => {
  const st = e.state || { v: 'mesin', d: 0, ovn: 0 };
  const target = st.ovn || 0;
  while (S.ov.length > target) closeOv(S.ov.pop());
  if (st.v !== S.view || (st.nm || null) !== S.nm || (st.jid || null) !== S.jid || (st.kode || null) !== S.kode || (st.tid || null) !== S.tid || (st.mid || null) !== S.mid || (st.tab || 'unit') !== S.tab) {
    S.view = st.v; S.nm = st.nm || null; S.wj = st.wj || null; S.jid = st.jid || null; S.kode = st.kode || null; S.tid = st.tid || null; S.mid = st.mid || null; S.tab = st.tab || 'unit'; resetTransient();
    if (S.view === 'riwayat') S.rwDate = null;
    render(); onEnter();
  } else refresh();
  const p = S.pending; S.pending = null; if (p) p();
});
function onEnter() {
  if (S.view === 'profil' && S.tab === 'riw') loadRiwayatUnit();
  if (S.view === 'mat') loadStokLog();
  if (S.view === 'panduan' && !(S.pd && S.pd.list)) loadPanduan();
  if (S.view === 'jenis' && S.tab === 'panduan') loadPanduan();
  if (S.view === 'riwayat') loadRingkasan();
  if (S.view === 'log') loadLogs();
  if (S.view === 'jenis' && S.tab === 'riwayat') loadRiwayatJenis();
  if (S.view === 'jenis' && S.tab === 'panduan') loadPanduan();
  if (S.view === 'jenis' && (S.focus || S.kode)) setTimeout(() => { const el = $('.ucard.focus'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' }); }, 30);
  if (S.pengDate !== currentDate()) loadAll(true);
}
function openUnit(k) { const u = U[k]; if (u) go('profil', { kode: k, jid: u.j }); }
const curJid = () => S.jid || (S.kode && U[S.kode] ? U[S.kode].j : null);

/* ---------- util UI ---------- */
let toastTimer = null;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3400); }
let audioCtx = null;
function beep(ok) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = ok ? 880 : 200; o.type = 'sine'; g.gain.value = .15;
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + (ok ? .09 : .25));
  } catch (e) {}
  try { navigator.vibrate && navigator.vibrate(ok ? 50 : [90, 60, 90]); } catch (e) {}
}
function groupBy(list) {
  const m = new Map();
  list.forEach(e => { const k = norm(e.nama); if (!m.has(k)) m.set(k, { name: e.nama, dept: e.dept || deptOf(e.nama), items: [] }); m.get(k).items.push(e); });
  return [...m.values()].sort((a, b) => byName(a.name, b.name));
}
function deptGroups() {
  const g = new Map();
  S.pekerja.forEach(p => { const d = p.d || 'Tanpa departemen'; if (!g.has(d)) g.set(d, []); g.get(d).push(p); });
  return [...g.entries()].sort((a, b) => byName(a[0], b[0]));
}
function prefixOfKat(kat) { const k = S.kategori.find(x => norm(x.c) === norm(kat)); return k ? k.p : ''; }
function nextCode(prefix) {
  if (!prefix) return '';
  let max = 0;
  S.units.forEach(u => { const m = /^([A-Z]{3})-(\d+)$/.exec(u.k); if (m && m[1] === prefix) max = Math.max(max, Number(m[2])); });
  return prefix + '-' + String(max + 1).padStart(3, '0');
}
function nextUnitNo(jid) {
  const l = (JU[jid] || []).map(u => Number(u.u) || 0);
  return (l.length ? Math.max(...l) : 0) + 1;
}
const merekList = () => {
  const m = new Map();
  S.jenis.forEach(j => { if (j.b) { const k = norm(j.b); if (!m.has(k)) m.set(k, { name: j.b, n: 0 }); m.get(k).n++; } });
  return [...m.values()].sort((a, b) => byName(a.name, b.name));
};
