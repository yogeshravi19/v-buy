// V-BUY Service Worker — Offline-first caching strategy
const CACHE_NAME = 'vbuy-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/vit-chennai-logo.png',
  '/manifest.json',
];

// Install: cache static shell
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API calls, cache-first for static assets
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // API and Supabase calls: always network, no cache
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.pathname.startsWith('/api/')
  ) {
    return; // let browser handle natively
  }

  // For navigation requests, serve cached index.html as fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, images, fonts)
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response && response.status === 200) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, cloned));
        }
        return response;
      });
    })
  );
});

// Push notifications (for future backend push)
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'V-BUY', {
      body: data.body || '',
      icon: '/vit-chennai-logo.png',
      badge: '/vit-chennai-logo.png',
      tag: data.tag || 'vbuy-notification',
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
