// FibreFlow Service Worker
// Provides offline support and caching for the application

const CACHE_NAME = 'fibreflow-v10-2025-07-21-auth';
const RUNTIME_CACHE = 'fibreflow-runtime-v10';

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
      fetch(request)
        .catch(() => {
          // Return cached index.html only if offline
          return caches.match('/index.html');
        })
    );
    return;
  }
  
  // Handle chunk files - always fetch fresh to avoid version mismatches
  if (url.pathname.includes('chunk-') || url.pathname.includes('.js')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Don't cache chunk files to avoid version conflicts
          return response;
        })
        .catch(() => {
          // If offline and it's a JS file, try cache as last resort
          return caches.match(request);
        })
    );
    return;
  }

  // For all other requests, use network-first strategy
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Don't cache if not a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        // Cache runtime assets (but not chunks)
        if (!url.pathname.includes('chunk-')) {
          caches.open(RUNTIME_CACHE)
            .then((cache) => {
              cache.put(request, responseToCache);
            });
        }

        return response;
      })
      .catch(() => {
        // Network failed, check if we have a cached version
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('FibreFlow SW: Serving from cache (offline):', request.url);
              return cachedResponse;
            }
            // No cache available
            throw new Error('Network error and no cache available');
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