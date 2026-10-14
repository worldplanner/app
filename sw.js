/* World Planner offline shell. Bump CACHE_VERSION after each deployment. */
const CACHE_VERSION = 'world-planner-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('world-planner-') && k !== CACHE_VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Cache the Excel library after its first successful online load; this cannot
  // make it available offline before the first online visit.
  if (url.hostname === 'cdnjs.cloudflare.com' && url.pathname.includes('/xlsx/')) {
    event.respondWith(caches.open(CACHE_VERSION).then(async cache => {
      const cached = await cache.match(req);
      try {
        const response = await fetch(req);
        if (response.ok) cache.put(req, response.clone());
        return response;
      } catch (e) { if (cached) return cached; throw e; }
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(response => {
      const copy = response.clone(); caches.open(CACHE_VERSION).then(c => c.put('./index.html', copy));
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(response => {
    if (response.ok) caches.open(CACHE_VERSION).then(cache => cache.put(req, response.clone()));
    return response;
  })));
});
