/**
 * Service Worker for JG_Finance PWA
 *
 * Caching Strategy:
 * - Cache-First: Static assets (HTML, CSS, JS, images, fonts)
 * - Network-First: API requests (with cache fallback)
 * - Stale-While-Revalidate: UI assets
 *
 * @type {ServiceWorkerGlobalScope}
 */

/// <reference lib="webworker" />
// @ts-check

// Workbox manifest injection point (DO NOT REMOVE)
/** @type {Array} */
const PRECACHE_MANIFEST = self.__WB_MANIFEST || [];

const CACHE_PREFIX = 'jg-finance';
const CACHE_VERSION = '1.0.0';
const STATIC_CACHE = `${CACHE_PREFIX}-static-${CACHE_VERSION}`;
const API_CACHE = `${CACHE_PREFIX}-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `${CACHE_PREFIX}-images-${CACHE_VERSION}`;

// Static assets to precache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// API endpoints that should be cached
const API_ENDPOINTS = [
  '/api/expenses',
  '/api/categories',
  '/api/budgets',
  '/api/investments/accounts',
  '/api/investments/holdings',
  '/api/investments/transactions',
  '/api/issues',
  '/api/labels',
  '/api/users',
];

/**
 * Install event: precache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);

        // Add workbox precache manifest assets
        if (PRECACHE_MANIFEST.length > 0) {
          console.log('[SW] Precaching Workbox manifest assets');
          await cache.addAll(
            PRECACHE_MANIFEST.map((item) => (typeof item === 'string' ? item : item.url))
          ).catch((err) => {
            console.warn('[SW] Some precache assets failed:', err);
          });
        }

        // Add fallback static assets
        console.log('[SW] Precaching fallback static assets');
        await cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn('[SW] Failed to precache some assets:', err);
        });
      } catch (error) {
        console.error('[SW] Install event error:', error);
      }
    })()
  );

  // Skip waiting to activate immediately
  self.skipWaiting();
});

/**
 * Activate event: cleanup old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            // Delete caches that don't match current version
            return cacheName.startsWith(CACHE_PREFIX) &&
                   !cacheName.includes(CACHE_VERSION);
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );

  // Clients claim: take control of all pages immediately
  self.clients.claim();
});

/**
 * Fetch event: implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (only cache same-origin)
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // Determine cache strategy based on request type
  if (url.pathname.startsWith('/api/')) {
    // Network-First for API requests
    event.respondWith(networkFirstStrategy(request));
  } else if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico)$/i) ||
    url.pathname.includes('/components/icons/')
  ) {
    // Cache-First for images
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
  } else if (
    url.pathname.match(/\.(js|css|woff|woff2|ttf|eot)$/i) ||
    url.pathname === '/' ||
    url.pathname === '/index.html'
  ) {
    // Cache-First for static assets
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
  } else {
    // Stale-While-Revalidate for everything else
    event.respondWith(staleWhileRevalidateStrategy(request));
  }
});

/**
 * Cache-First Strategy: Use cache, fallback to network
 */
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      console.log('[SW] Cache hit:', request.url);
      return cached;
    }

    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }

    return response;
  } catch (err) {
    console.warn('[SW] Fetch failed for:', request.url, err);

    // Return a basic offline response
    return createOfflineResponse();
  }
}

/**
 * Network-First Strategy: Try network, fallback to cache
 */
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);

    // Cache successful API responses
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (err) {
    console.warn('[SW] Network request failed for:', request.url, err);

    // Try to return cached version
    const cached = await caches.match(request);
    if (cached) {
      console.log('[SW] Returning cached API response:', request.url);
      return cached;
    }

    // Return offline response
    return createOfflineResponse();
  }
}

/**
 * Stale-While-Revalidate Strategy: Return cached immediately, update in background
 */
async function staleWhileRevalidateStrategy(request) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      const cache = caches.open(STATIC_CACHE);
      cache.then((c) => c.put(request, response.clone()));
    }
    return response;
  });

  return cached || fetchPromise.catch(() => createOfflineResponse());
}

/**
 * Create offline fallback response
 */
function createOfflineResponse() {
  return new Response(
    JSON.stringify({
      error: 'You are offline. Some features may be limited.',
      offline: true,
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Handle messages from clients (for cache management)
 */
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    });
  }
});

/**
 * Handle periodic background sync (optional, for future use)
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-expenses') {
    event.waitUntil(
      fetch('/api/expenses')
        .then((response) => response.json())
        .then((data) => {
          console.log('[SW] Background sync completed:', data);
        })
        .catch((err) => {
          console.warn('[SW] Background sync failed:', err);
        })
    );
  }
});

console.log('[SW] Service Worker loaded successfully');
