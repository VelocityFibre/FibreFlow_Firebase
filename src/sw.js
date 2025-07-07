// FibreFlow Service Worker
// Provides offline support and caching for the application

const CACHE_NAME = 'fibreflow-v8-2025-07-07-mobile';
const RUNTIME_CACHE = 'fibreflow-runtime-v8';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/main.js',
  '/polyfills.js',
  '/styles.css',
  '/velocity-fibre-logo.jpeg',
  // Add other critical assets
];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  console.log('FibreFlow SW: Installing service worker');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('FibreFlow SW: Caching app shell');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        // Force activation of new service worker
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('FibreFlow SW: Activating service worker');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('FibreFlow SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Firebase Auth and Firestore requests
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('firestore') ||
      url.hostname.includes('googleapis')) {
    return;
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html')
        .then((response) => {
          return response || fetch(request);
        })
        .catch(() => {
          // Return offline page if available
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Skip caching for chunk files to avoid version mismatches
  if (url.pathname.includes('chunk-') && url.pathname.endsWith('.js')) {
    event.respondWith(
      fetch(request).catch(() => {
        // If chunk fetch fails, try to return index.html to trigger app reload
        return caches.match('/index.html');
      })
    );
    return;
  }

  // Handle other requests with cache-first strategy
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          console.log('FibreFlow SW: Serving from cache:', request.url);
          return response;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((fetchResponse) => {
            // Don't cache if not a valid response
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }

            // Clone the response
            const responseToCache = fetchResponse.clone();

            // Cache runtime assets
            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                cache.put(request, responseToCache);
              });

            return fetchResponse;
          })
          .catch(() => {
            // Network failed, check if we have a cached version
            return caches.match(request);
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('FibreFlow SW: Background sync triggered:', event.tag);
  
  if (event.tag === 'fibreflow-sync') {
    event.waitUntil(syncOfflineActions());
  }
});

// Push notifications (future enhancement)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    console.log('FibreFlow SW: Push notification received:', data);
    
    const options = {
      body: data.body,
      icon: '/velocity-fibre-logo.jpeg',
      badge: '/velocity-fibre-logo.jpeg',
      tag: 'fibreflow-notification',
      data: data.data
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('FibreFlow SW: Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  // Focus or open the app
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Helper function for syncing offline actions
async function syncOfflineActions() {
  try {
    // Get offline actions from IndexedDB (if implemented)
    // Sync with Firebase when online
    console.log('FibreFlow SW: Syncing offline actions...');
    
    // Implementation would depend on offline storage strategy
    // This is a placeholder for future enhancement
    
  } catch (error) {
    console.error('FibreFlow SW: Sync failed:', error);
    throw error;
  }
}

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  console.log('FibreFlow SW: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});