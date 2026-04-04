const CACHE_NAME = 'intouch-v1';
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetched;
    })
  );
});

// ── Native Web Push ──────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'InTouch', body: event.data ? event.data.text() : '' };
  }

  const title = data.title ?? 'InTouch';
  const body = data.body ?? '';
  const icon = '/icons/icon-192.svg';
  const badge = '/icons/icon-192.svg';

  // Forward to any open app windows (foreground message handling)
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        client.postMessage({ type: 'PUSH_RECEIVED', notification: { title, body } });
      }
      // Always show notification (browser may suppress it if app is focused — that's fine)
      return self.registration.showNotification(title, {
        body,
        icon,
        badge,
        data: data.data ?? {},
        tag: 'intouch-reminder',
        renotify: true,
      });
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if open, otherwise open new one
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow('/');
    })
  );
});
