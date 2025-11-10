// Service Worker for Push Notifications
const CACHE_NAME = 'yoforex-v1';

// Install event
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Install');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Push event - Handle push notifications
self.addEventListener('push', event => {
  console.log('[ServiceWorker] Push received');
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'New notification from YoForex',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.id || 1,
        url: data.url || '/'
      },
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/icons/checkmark.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/icons/xmark.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'YoForex', options)
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('[ServiceWorker] Notification click received');
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// Fetch event - For offline support (optional)
self.addEventListener('fetch', event => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API calls and WebSocket connections
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('socket.io')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(response => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
  );
});