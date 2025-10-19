/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// Cleanup outdated caches
cleanupOutdatedCaches();

// 네트워크 우선 - API 요청
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 24시간
      }),
    ],
  })
);

// 캐시 우선 - 이미지
registerRoute(
  ({ url }) => /\.(png|jpg|jpeg|svg|gif|webp)$/i.test(url.pathname),
  new CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30일
      }),
    ],
  })
);

// 캐시 우선 - 폰트
registerRoute(
  ({ url }) => /\.(woff|woff2|ttf|otf|eot)$/i.test(url.pathname),
  new CacheFirst({
    cacheName: 'font-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 24 * 60 * 60, // 60일
      }),
    ],
  })
);

// Stale-While-Revalidate - Tailwind CDN
registerRoute(
  ({ url }) => url.hostname === 'cdn.tailwindcss.com',
  new StaleWhileRevalidate({
    cacheName: 'tailwind-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 24 * 60 * 60, // 24시간
      }),
    ],
  })
);

// 메시지 핸들러 - 클라이언트와 통신
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName);
      });
    });
  }
});

// 설치 이벤트
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      // 즉시 활성화
      self.skipWaiting();
    })()
  );
});

// 활성화 이벤트
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      // 이전 캐시 정리
      const cacheNames = await caches.keys();
      const cacheWhitelist = [
        'api-cache',
        'image-cache',
        'font-cache',
        'tailwind-cache',
        'workbox-cache-v1',
      ];

      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })()
  );

  // 모든 클라이언트에 제어권 확보
  self.clients.claim();
});

// Fetch 이벤트 - 오프라인 폴백
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;

  // 네비게이션 요청의 경우 오프라인 폴백
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request).then((response) => {
          return (
            response ||
            caches.match('/offline.html').then((offlineResponse) => {
              return offlineResponse || new Response('Offline', { status: 503 });
            })
          );
        });
      })
    );
  }
});

export {};
