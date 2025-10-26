const CACHE_NAME = 'vacuum-diag-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalacja Service Workera
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache otwarty');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Aktywacja
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Usuwanie starego cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Strategia: Network First, fallback do Cache
self.addEventListener('fetch', (event) => {
  // Pomijamy żądania do API sterownika (zawsze z sieci)
  if (event.request.url.includes('/errorcounter') || 
      event.request.url.includes('/out.cgx') ||
      event.request.url.includes('/manualControl')) {
    return;
  }

  // Pomijamy żądania z nieobsługiwanych schematów (np. chrome-extension)
  if (event.request.url.startsWith('chrome-extension://') ||
      event.request.url.startsWith('moz-extension://') ||
      event.request.url.startsWith('safari-extension://') ||
      !event.request.url.startsWith('http://') && !event.request.url.startsWith('https://')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Sprawdzamy czy odpowiedź jest prawidłowa
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Klonujemy odpowiedź
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
