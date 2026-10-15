// V Foods Service Worker — Robust Caching, Offline Support & Push Notifications
const CACHE_VERSION = 'vfoods-v2';
const STATIC_CACHE = `vfoods-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `vfoods-runtime-${CACHE_VERSION}`;
const MENU_CACHE = `vfoods-menu-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/vit-chennai-logo.png',
  '/manifest.json'
];

// Install: Precache core static shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate: Purge obsolete caches and claim clients immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== RUNTIME_CACHE && key !== MENU_CACHE)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Skip waiting message handler for seamless PWA updates
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch dispatcher
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') {
    return; // Service worker only caches GET requests
  }

  const url = new URL(request.url);

  // 1. STRICT NO-CACHE ZONE: Sensitive Financial & Auth operations
  const isStrictNoCache = (
    url.pathname.includes('/auth/v1/') ||
    url.pathname.includes('/rest/v1/orders') ||
    url.pathname.includes('/rest/v1/order_items') ||
    url.pathname.includes('/rest/v1/wallet') ||
    url.pathname.includes('/rest/v1/wallet_transactions') ||
    url.pathname.includes('/rest/v1/rpc/') ||
    url.pathname.includes('/verify_and_record_payment') ||
    url.pathname.includes('/api/paytm') ||
    url.searchParams.has('order_id')
  );

  if (isStrictNoCache) {
    return; // Pass through straight to network, never touch cache
  }

  // 2. Menu Images & Static Assets (Cache-First with Network Fallback)
  const isMenuImage = url.pathname.includes('/menu-images') || url.pathname.includes('/storage/v1/object/public/menu-images');
  const isStaticAsset = (
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.svg')
  );

  if (isMenuImage || isStaticAsset) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(cache => {
        return cache.match(request).then(cached => {
          if (cached) return cached;
          return fetch(request).then(response => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => {
            // Return cached default icon if available
            return caches.match('/vit-chennai-logo.png');
          });
        });
      })
    );
    return;
  }

  // 3. Read-Only Menu Data (Network-First with Offline Cache Fallback)
  const isReadOnlyMenuData = (
    url.pathname.includes('/rest/v1/menu_items') ||
    url.pathname.includes('/rest/v1/outlets')
  );

  if (isReadOnlyMenuData) {
    event.respondWith(
      caches.open(MENU_CACHE).then(cache => {
        return fetch(request)
          .then(response => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cache.match(request));
      })
    );
    return;
  }

  // 4. Navigation Requests (Network with fallback to /index.html)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // 5. Default static files (Vite bundles, CSS, JS)
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response && response.status === 200 && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});

// Push notification receiver
self.addEventListener('push', event => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'V Foods';
    const options = {
      body: data.body || '',
      icon: data.icon || '/vit-chennai-logo.png',
      badge: '/vit-chennai-logo.png',
      tag: data.tag || 'vfoods-notification',
      data: {
        url: data.url || '/orders'
      }
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Failed to parse push notification payload', err);
  }
});

// Notification click router: focuses existing tab or navigates
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/orders';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
