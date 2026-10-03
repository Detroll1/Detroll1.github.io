/* Офлайн-оболочка: страница записи открывается и без сети, как приложение.
   Важно: файлы сначала берём из сети, кэш — только запасной. Иначе после обновления продукта
   у клиента остаются старые стили и скрипты и страница ломается. */
const CACHE = 'zapis-v5';
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
  e.respondWith(
    fetch(req)
      .then((r) => {
        if (r && r.ok) {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return r;
      })
      .catch(() => caches.match(req).then((m) => m || caches.match('./index.html')))
  );
});
