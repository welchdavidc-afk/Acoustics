/* Acoustics Meter service worker: lets the app open and work with no connection.
   Bump CACHE when you change the app (the build number in index.html). */
const CACHE = 'acoustics-meter-20261027-2';
const SHELL = ['./', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

/* Network first (so a new version is picked up whenever the server is reachable),
   falling back to the saved copy when offline or slow. */
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 3000);
      const net = await fetch(r, { signal: ctl.signal, cache: 'no-store' });
      clearTimeout(timer);
      if (net && net.ok && net.status === 200) cache.put(r, net.clone());
      return net;
    } catch (err) {
      const hit = (await cache.match(r, { ignoreSearch: true })) || (await cache.match('./index.html'));
      return hit || Response.error();
    }
  })());
});
