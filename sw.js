// Service Worker: hält die App ohne Internet verfügbar.
const CACHE = 'kochbuch-202611131041';
const SCHALE = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  // cache:'reload' – am Zwischenspeicher des Browsers vorbei, sonst landet eine veraltete Fassung im Offline-Speicher
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SCHALE.map(u => new Request(u, {cache: 'reload'}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE && n !== 'kochbuch-bilder').map(n => caches.delete(n))))
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
  // Fotos: einmal laden, dann dauerhaft aus dem Speicher (Name ändert sich mit dem Inhalt)
  if(url.pathname.includes('/bilder/')){
    e.respondWith(caches.open('kochbuch-bilder').then(c => c.match(e.request).then(t => t || fetch(e.request).then(r => {
      if(r.ok) c.put(e.request, r.clone());
      return r;
    }))));
    return;
  }
  // Die App selbst: immer frisch aus dem Netz, ohne Netz aus dem Speicher
  if(e.request.mode === 'navigate'){
    e.respondWith(fetch(e.request, {cache: 'no-store'}).then(r => {
      if(r.ok){ const k = r.clone(); caches.open(CACHE).then(c => c.put('index.html', k)); }
      return r;
    }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(t => t || fetch(e.request)));
});
