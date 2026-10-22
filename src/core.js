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
  chev: '<path d="M9 5l7 7-7 7"/>'
};
const ic = (n, s = 24) => '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>';

/* ---------- state ---------- */
const KONDISI = ['Normal', 'Servis', 'Rusak', 'Rusak total', 'Belum dicek'];
const MJENIS = ['Servis rutin', 'Ganti sparepart', 'Perbaikan', 'Kalibrasi', 'Pengecekan', 'Lainnya'];
const S = {
  view: 'mesin', jid: null, kode: null, tab: 'unit', filter: '', q: '',
  jenis: [], units: [], kategori: [], pekerja: [], maintServer: [], pengServer: [], pengDate: null, belumServer: [], cfg: { jamPulang: '17:00' },
  loaded: false, loadError: null, tok: lsGet('qrg.tok', ''), me: lsGet('qrg.me', ''),
  ov: [], pending: null, form: null, confirmDel: null,
  rwDate: null, rw: { list: null, error: false }, riw: { key: null, list: null, error: false }, logs: { list: null, error: false },
  scan: null, picker: null, justAdded: null, focus: null
};
let J = {}, U = {}, JU = {};

function statusOf(label) {
  const l = norm(label);
  if (l === 'normal') return 'ok';
  if (l === 'rusak' || l === 'rusak total') return 'bad';
  if (!l || l === 'belum dicek') return 'unk';
  return 'warn';
}
function buildMaps() {
  J = {}; U = {}; JU = {};
  S.jenis.forEach(j => { J[j.id] = j; JU[j.id] = []; });
  S.units.forEach(u => { U[u.k] = u; if (JU[u.j]) JU[u.j].push(u); });
  Object.values(JU).forEach(l => l.sort((a, b) => (Number(a.u) || 0) - (Number(b.u) || 0) || a.k.localeCompare(b.k)));
}
function setUnits(list) {
  S.units = list.map(u => ({ ...u, off: !!u.off, cond: clean(u.sl) || 'Belum dicek', s: u.off ? 'unk' : statusOf(u.sl), sl: u.off ? 'Nonaktif' : (clean(u.sl) || 'Belum dicek') }));
}
function applyData(d) {
  S.jenis = d.jenis || []; S.kategori = d.kategori || [];
  setUnits(d.unit || []);
  buildMaps();
  S.pekerja = d.pekerja || []; S.maintServer = d.maintenance || d.maint || []; S.belumServer = d.belum || []; S.cfg = d.cfg || S.cfg;
  S.loaded = true;
}
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

/* ---------- API dan login ---------- */
async function raw(action, payload = {}) {
  if (!API_URL || API_URL.includes('PASTE')) throw { code: 'config' };
  let res;
  try { res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, ...payload }) }); }
  catch (e) { throw { code: 'network' }; }
  try { return await res.json(); } catch (e) { throw { code: 'server' }; }
}
async function api(action, payload = {}) {
  const j = await raw(action, { token: S.tok, ...payload });
  if (!j.ok) {
    if (j.error === 'pin') { S.tok = ''; lsSet('qrg.tok', ''); throw { code: 'pin' }; }
    throw { code: 'server', message: j.error };
  }
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
      try { await api(it.action, it.payload); sent = true; }
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
  try {
    const j = await api('bootstrap', { tgl });
    S.pengServer = j.pengambilan || []; S.pengDate = tgl;
    applyData(j); S.loadError = null;
    lsSet('qrg.c3', { jenis: j.jenis, unit: j.unit, kategori: j.kategori, pekerja: j.pekerja, maintenance: j.maintenance, belum: j.belum, cfg: j.cfg });
  } catch (e) {
    if (e.code === 'pin') { showPin(S.tok === '' && lsGet('qrg.hadTok', false) ? 'Masuk lagi dengan PIN.' : ''); return; }
    S.loadError = e.code;
  }
  lsSet('qrg.hadTok', true);
  refresh();
}

/* ---------- navigasi dengan riwayat browser (tombol Back Android) ---------- */
const URL_ = location.pathname + location.search;
function curState() { return { v: S.view, jid: S.jid, kode: S.kode, tab: S.tab, ovn: S.ov.length }; }
function resetTransient() { S.confirmDel = null; S.form = null; S.justAdded = null; }
function go(view, o = {}) {
  if (S.ov.length) { S.pending = () => go(view, o); history.go(-S.ov.length); return; }
  S.view = view; S.jid = o.jid || null; S.kode = o.kode || null; S.tab = o.tab || 'unit'; S.focus = null;
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
  if (name === 'scan') { stopCamera(); $('#scan').hidden = true; S.scan = null; }
  else if (name === 'picker') { $('#picker').hidden = true; S.picker = null; }
  else if (name === 'drawer') { $('#drawer').hidden = true; }
}
window.addEventListener('popstate', e => {
  const st = e.state || { v: 'mesin', d: 0, ovn: 0 };
  const target = st.ovn || 0;
  while (S.ov.length > target) closeOv(S.ov.pop());
  if (st.v !== S.view || (st.jid || null) !== S.jid || (st.kode || null) !== S.kode || (st.tab || 'unit') !== S.tab) {
    S.view = st.v; S.jid = st.jid || null; S.kode = st.kode || null; S.tab = st.tab || 'unit'; resetTransient();
    if (S.view === 'riwayat') S.rwDate = null;
    render(); onEnter();
  } else refresh();
  const p = S.pending; S.pending = null; if (p) p();
});
function onEnter() {
  if (S.view === 'riwayat') loadRingkasan();
  if (S.view === 'log') loadLogs();
  if (S.view === 'jenis' && S.tab === 'riwayat') loadRiwayatJenis();
  if (S.view === 'jenis' && (S.focus || S.kode)) setTimeout(() => { const el = $('.ucard.focus'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' }); }, 30);
  if (S.pengDate !== currentDate()) loadAll(true);
}
function openUnit(k) { const u = U[k]; if (u) go('jenis', { jid: u.j, kode: k }); }
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
