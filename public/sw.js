const CACHE_NAME = 'uparqueo-cache-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Solo interceptar peticiones GET
  if (event.request.method !== 'GET') return;

  // Estrategia Network-First: Siempre intenta ir a la red primero para obtener la última versión
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si la red responde bien, actualizamos el caché
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(async err => {
        // Si la red falla (offline), buscamos en el caché
        console.error('SW fetch falló, usando caché:', err);
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // Fallback si es una navegación
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
  );
});
