const CACHE_NAME = 'xdv-taxi-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

// Install — cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  // Auto-activate new service worker (no reload needed)
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// Fetch — network-first strategy for API, cache-first for static
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // API calls: network only (don't cache dynamic data)
  if (url.pathname.startsWith('/api')) return;

  // Static assets: network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Push notification received
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = {
      title: 'XDV Taxi',
      body: event.data.text(),
    };
  }

  const options = {
    body: payload.body || payload.message,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      url: payload.url || '/',
      notificationId: payload.notificationId,
    },
    actions: payload.actions || [],
    tag: payload.tag || 'default',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'XDV Taxi', options)
  );
});

// Notification click — open the relevant page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if already open
      const existingClient = clients.find(
        (client) => client.url.includes(self.location.origin)
      );
      if (existingClient) {
        existingClient.navigate(url);
        return existingClient.focus();
      }
      // Otherwise open new window
      return self.clients.openWindow(url);
    })
  );
});
