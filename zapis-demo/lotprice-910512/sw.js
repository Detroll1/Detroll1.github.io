/* Офлайн-оболочка: страница записи открывается и без сети, как приложение. */
const CACHE = 'zapis-v3';
const SHELL = [
  './', './index.html', './style.css', './app.js', './config.json',
  './manifest.json', './icon.svg', './icon-192.png', './icon-512.png',
  './assets/fonts/Inter-Regular.woff2', './assets/fonts/Inter-SemiBold.woff2',
  './assets/fonts/Inter-Bold.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.headers.get('accept') && req.headers.get('accept').includes('text/html')) {
    e.respondWith(
      fetch(req)
        .then((r) => { caches.open(CACHE).then((c) => c.put(req, r.clone())); return r; })
        .catch(() => caches.match(req).then((m) => m || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then((m) => m || fetch(req).then((r) => {
      if (r.ok) caches.open(CACHE).then((c) => c.put(req, r.clone()));
      return r;
    }))
  );
});
