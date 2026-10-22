// Service worker sederhana: jaringan dulu, cadangan dari cache supaya aplikasi tetap terbuka saat sinyal hilang.
const CACHE = 'qrg-v5';
const FILES = ['./', 'index.html', 'label.html', 'config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'logo-gelap.png', 'logo-terang.png',
  'lib/jsQR.js', 'lib/qrcode.js', 'lib/xlsx.full.min.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()).catch(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('index.html')))
  );
});
