const CACHE_NAME = 'omnireader-v2';
const PRECACHE_URLS = [
  '/',
  '/index.html',
];

// Install — precache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, cache fallback (for API calls), cache first for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Don't cache OpenRouter API calls
  if (url.hostname === 'openrouter.ai') return;

  // Cache-first for static assets (fonts, JS, CSS)
  if (url.pathname.match(/\.(js|css|svg|woff2|woff|ttf)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first for HTML/pages
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
