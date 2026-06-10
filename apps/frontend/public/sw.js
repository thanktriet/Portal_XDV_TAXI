// v3 — no caching, force clear old caches, reload clients
const CACHE_NAME = 'xdv-taxi-v3';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll())
      .then(clients => clients.forEach(c => c.navigate(c.url)))
  );
});

// No fetch handler — all requests go directly to network

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: 'XDV Taxi', body: event.data.text() };
  }
  const options = {
    body: payload.body || payload.message,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: { url: payload.url || '/', notificationId: payload.notificationId },
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
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin));
      if (existing) {
        existing.navigate(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
