// Arcella service worker: network-first app shell (so deploys show up at once), cache-first static assets.
const CACHE = 'arcella-v1';
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

const keep = (key, response) => {
  if (response.ok) {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(key, copy));
  }
  return response;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => keep('/', response)).catch(() => caches.match('/')));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => keep(request, response))));
});

// Message notifications: one per chat (a newer message replaces it and counts up), opening that chat when tapped.
self.addEventListener('push', (event) => {
  let alert = {};
  try {
    alert = event.data?.json() ?? {};
  } catch {
    // Not one of ours: show a plain notification below.
  }
  event.waitUntil(
    (async () => {
      if (Number.isInteger(alert.badge) && 'setAppBadge' in navigator) await navigator.setAppBadge(alert.badge).catch(() => {});
      const [earlier] = alert.tag ? await self.registration.getNotifications({ tag: alert.tag }) : [];
      const count = (earlier?.data?.count ?? 0) + 1;
      const title = alert.title || 'Arcella';
      await self.registration.showNotification(count > 1 ? `${title} (${count})` : title, {
        body: alert.body || 'New message',
        tag: alert.tag,
        renotify: Boolean(alert.tag),
        icon: alert.icon || '/icons/icon-192.png',
        badge: '/icons/badge-96.png',
        data: { url: alert.url || '/messages', count },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { url } = event.notification.data ?? {};
  event.waitUntil(
    (async () => {
      const [app] = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (!app) return self.clients.openWindow(url || '/messages');
      await app.focus();
      app.postMessage({ type: 'open', url });
    })(),
  );
});
