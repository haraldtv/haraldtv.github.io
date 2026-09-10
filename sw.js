/* Simple offline cache. Bump CACHE when files change. */
const CACHE = 'padel-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './css/styles.css',
  './js/app.js',
  './js/db.js',
  './js/store.js',
  './js/tournament.js',
  './js/share.js',
  './js/pairing/index.js',
  './js/pairing/util.js',
  './js/pairing/random.js',
  './js/pairing/ranked.js',
  './js/pairing/rotation.js',
  './js/ui/dom.js',
  './js/ui/components.js',
  './js/ui/views/home.js',
  './js/ui/views/players.js',
  './js/ui/views/setup.js',
  './js/ui/views/tournament.js',
  './js/ui/views/history.js',
  './js/ui/views/settings.js',
  './js/ui/views/share.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Network first so a deploy is picked up straight away, cache as the fallback. */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
