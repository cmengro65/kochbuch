// Service Worker: hält die App ohne Internet verfügbar.
const CACHE = 'kochbuch-202611130935';
const SCHALE = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SCHALE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if(e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Rezeptdaten: immer zuerst das Netz, sonst die letzte gespeicherte Fassung
  if(url.pathname.endsWith('.enc')){
    e.respondWith(fetch(e.request).then(r => {
      if(r.ok){ const k = r.clone(); caches.open(CACHE).then(c => c.put(url.pathname, k)); }
      return r;
    }).catch(() => caches.match(url.pathname)));
    return;
  }
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(t => t || fetch(e.request)));
});
