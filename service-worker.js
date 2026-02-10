const CACHE_NAME = 'running-v1.0.24';
const urlsToCache = [
  './styles.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './data/sessions.json',
  './sessions.json'
  // NO cachear: ./ , index.html, app.js, version.json → siempre desde red para no revertir versión
];

// Instalación del Service Worker (skipWaiting para que la nueva versión tome control enseguida)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Estrategia: shell de app siempre desde red; el resto cache first
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const isShell = event.request.mode === 'navigate' ||
    url.endsWith('/') || url.endsWith('index.html') || url.includes('app.js') || url.includes('version.json');

  if (isShell) {
    // Documento, app.js y version.json: siempre red, no cachear (evita que vuelva a versión antigua)
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) return response;
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') return response;
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          return response;
        });
      })
  );
});
