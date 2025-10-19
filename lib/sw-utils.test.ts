/**
 * Service Worker Utilities Type Safety Tests
 *
 * This file demonstrates proper typing for Service Worker integration
 * and validates type safety throughout the PWA stack.
 *
 * Run with: npx tsc --noEmit lib/sw-utils.test.ts
 */

import type {
  ServiceWorkerManager,
  PWAInstallationManager,
  ConnectionManager,
  SWMessage,
  MainToSWMessage,
  SWToMainMessage,
} from './sw-utils';

import type {
  PWAInstallationState,
  ServiceWorkerState,
  SWMessageType,
  BeforeInstallPromptEvent,
  ServiceWorkerGlobalScope,
} from '@/types/pwa';

// ============================================================================
// Type Safety Tests for PWA Types
// ============================================================================

/**
 * Test 1: BeforeInstallPromptEvent typing
 */
export function testBeforeInstallPromptEvent(): void {
  // This would be in an event listener context
  const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
    // Type-safe access to event properties
    event.preventDefault();

    // prompt() returns a Promise<void>
    const promptPromise: Promise<void> = event.prompt();

    // userChoice returns a Promise with specific structure
    event.userChoice.then((result) => {
      const outcome: 'accepted' | 'dismissed' = result.outcome;
      const platform: string = result.platform;

      console.log(`User ${outcome} install on ${platform}`);
    });

    // platforms is a readonly string array
    const platforms: readonly string[] = event.platforms;
    platforms.forEach((platform) => console.log(platform));
  };
}

/**
 * Test 2: Window extensions for PWA
 */
export function testWindowExtensions(): void {
  // Type-safe access to PWA-specific window properties
  if ('serviceWorker' in navigator) {
    const container: ServiceWorkerContainer = navigator.serviceWorker;
    console.log('Service Worker supported');
  }

  // Type-safe standalone detection
  const isStandalone: boolean | undefined = navigator.standalone;
  const isDisplayModeStandalone: boolean = window.matchMedia('(display-mode: standalone)').matches;

  // Type-safe connection information
  const connection = navigator.connection;
  if (connection) {
    const effectiveType: '4g' | '3g' | '2g' | 'slow-2g' = connection.effectiveType;
    const downlink: number | undefined = connection.downlink;
    const rtt: number | undefined = connection.rtt;
    const saveData: boolean | undefined = connection.saveData;
  }

  // Type-safe device memory
  const deviceMemory: number | undefined = navigator.deviceMemory;
  const hardwareConcurrency: number | undefined = navigator.hardwareConcurrency;
}

/**
 * Test 3: Service Worker Global Scope in SW
 */
export function testServiceWorkerGlobalScope(): void {
  // This would be inside a Service Worker script
  const handleInstall = (event: ExtendableEvent) => {
    event.waitUntil(
      (async () => {
        // Type-safe access to Service Worker global scope
        const cacheStorage: CacheStorage = self.caches;
        const clients: Clients = self.clients;
        const registration: ServiceWorkerRegistration = self.registration;

        // Open a cache
        const cache: Cache = await cacheStorage.open('v1');

        // Add URLs to cache
        await cache.addAll([
          '/',
          '/index.html',
          '/style.css',
        ]);
      })()
    );
  };
}

/**
 * Test 4: ServiceWorkerManager type safety
 */
export async function testServiceWorkerManager(): Promise<void> {
  // This demonstrates proper typing when using ServiceWorkerManager
  const mockManager: ServiceWorkerManager = {
    // getState returns ServiceWorkerState | null
    getState: (): ServiceWorkerState | null => ({
      hasUpdateWaiting: false,
      isUpdating: false,
      lastUpdateCheck: Date.now(),
      controller: null,
      scope: '/',
    }),

    // postMessage accepts type-safe messages
    postMessage: <T = unknown>(message: MainToSWMessage<T> | string) => {
      if (typeof message === 'string') {
        console.log(`Posting message: ${message}`);
      } else {
        console.log(`Posting message type: ${message.type}`);
      }
    },

    // skipWaiting posts the right message type
    skipWaiting: () => {
      console.log('Skipping waiting');
    },

    // checkForUpdates is async
    checkForUpdates: async (): Promise<boolean> => true,

    // unregister is async
    unregister: async (): Promise<boolean> => true,

    // Event listeners with proper typing
    onUpdate: (listener: (state: ServiceWorkerState) => void) => {
      return () => {
        // cleanup function
      };
    },

    onError: (listener: (error: Error, context: string) => void) => {
      return () => {
        // cleanup function
      };
    },

    onMessage: <T = unknown>(messageType: string, listener: (data: T) => void) => {
      return () => {
        // cleanup function
      };
    },
  };

  // Type-safe usage
  const state: ServiceWorkerState | null = mockManager.getState();
  if (state && state.hasUpdateWaiting) {
    console.log('Update available');
  }

  // Type-safe message posting
  const message: MainToSWMessage = {
    type: 'SKIP_WAITING',
    timestamp: Date.now(),
  };
  mockManager.postMessage(message);

  // Type-safe event listening
  const unsubscribe = mockManager.onUpdate((state) => {
    console.log('Service Worker updated:', state);
  });

  // Type-safe error handling
  mockManager.onError((error, context) => {
    console.error(`Error in ${context}:`, error);
  });

  // Type-safe message listening
  mockManager.onMessage<{ count: number }>('URLS_CACHED', (data) => {
    console.log(`Cached ${data.count} URLs`);
  });
}

/**
 * Test 5: PWAInstallationManager type safety
 */
export function testPWAInstallationManager(): void {
  // This demonstrates proper typing when using PWAInstallationManager
  const mockManager: PWAInstallationManager = {
    // install returns Promise<boolean>
    install: async (): Promise<boolean> => true,

    // dismiss returns void
    dismiss: () => {
      console.log('Dismissed');
    },

    // getState returns PWAInstallationState
    getState: (): PWAInstallationState => ({
      canInstall: true,
      isInstalled: false,
      isStandalone: false,
      deferredPrompt: null,
    }),

    // onPrompt listener receives PWAInstallationState
    onPrompt: (listener: (state: PWAInstallationState) => void) => {
      return () => {
        // cleanup function
      };
    },
  };

  // Type-safe usage
  const state: PWAInstallationState = mockManager.getState();

  if (state.canInstall && !state.isInstalled) {
    mockManager.install().then((success) => {
      if (success) {
        console.log('App installed successfully');
      }
    });
  }

  // Type-safe listener
  mockManager.onPrompt((state) => {
    console.log('Installation state:', {
      canInstall: state.canInstall,
      isInstalled: state.isInstalled,
      isStandalone: state.isStandalone,
    });
  });
}

/**
 * Test 6: Message type safety
 */
export function testMessageTypes(): void {
  // Main thread to SW message
  const mainToSW: MainToSWMessage = {
    type: 'SKIP_WAITING',
    data: undefined,
    timestamp: Date.now(),
  };

  // SW to main thread message
  const swToMain: SWToMainMessage = {
    type: 'UPDATE_AVAILABLE',
    data: { hasUpdate: true },
    timestamp: Date.now(),
  };

  // Custom typed messages
  const typedMessage: SWToMainMessage<{ count: number }> = {
    type: 'URLS_CACHED',
    data: { count: 5 },
    timestamp: Date.now(),
  };

  console.log('Message types validated');
}

/**
 * Test 7: Cache API type safety
 */
export async function testCacheAPI(): Promise<void> {
  // Type-safe cache operations
  const cache: Cache = await caches.open('v1');

  // add is Promise<void>
  const addPromise: Promise<void> = cache.add('/index.html');

  // addAll is Promise<void>
  const addAllPromise: Promise<void> = cache.addAll([
    '/',
    '/index.html',
    '/style.css',
  ]);

  // match returns Promise<Response | undefined>
  const matchResult: Promise<Response | undefined> = cache.match('/index.html');

  // matchAll returns Promise<Response[]>
  const matchAllResult: Promise<Response[]> = cache.matchAll();

  // delete is Promise<boolean>
  const deleteResult: Promise<boolean> = cache.delete('/index.html');

  // keys is Promise<Request[]>
  const keysResult: Promise<Request[]> = cache.keys();

  // put is Promise<void>
  const putResult: Promise<void> = cache.put(
    '/index.html',
    new Response('content')
  );
}

/**
 * Test 8: Fetch Event handling
 */
export function testFetchEventHandling(): void {
  // Type-safe fetch event handler
  const handleFetch = (event: FetchEvent) => {
    const request: Request = event.request;
    const url: string = request.url;
    const method: string = request.method;

    // respondWith accepts Response or Promise<Response>
    const response: Response = new Response('cached');
    event.respondWith(response);

    // Or with async
    event.respondWith(
      (async () => {
        const cache = await caches.open('v1');
        const cached = await cache.match(request);
        return cached || new Response('not found');
      })()
    );
  };
}

/**
 * Test 9: Service Worker State tracking
 */
export function testServiceWorkerState(): void {
  const state: ServiceWorkerState = {
    hasUpdateWaiting: true,
    isUpdating: false,
    lastUpdateCheck: Date.now(),
    controller: null,
    scope: '/',
  };

  // Type-safe property access
  if (state.hasUpdateWaiting) {
    console.log('New version available at:', state.scope);
  }

  if (state.isUpdating) {
    console.log('Update in progress since:', new Date(state.lastUpdateCheck));
  }

  const controller: ServiceWorker | null = state.controller;
  if (controller) {
    console.log('Active controller at:', controller.scriptURL);
  }
}

/**
 * Test 10: PWA Installation State tracking
 */
export function testPWAInstallationState(): void {
  const state: PWAInstallationState = {
    canInstall: true,
    isInstalled: false,
    isStandalone: false,
    deferredPrompt: null,
  };

  // Type-safe discriminated union
  if (state.canInstall && !state.isInstalled && !state.isStandalone) {
    console.log('Ready to install');
  } else if (state.isStandalone) {
    console.log('App is running in standalone mode');
  } else if (state.isInstalled) {
    console.log('App is already installed');
  }

  // Type-safe optional deferredPrompt
  if (state.deferredPrompt) {
    state.deferredPrompt.prompt().then(() => {
      console.log('Install prompt shown');
    });
  }
}

/**
 * Export validation message
 */
export const VALIDATION_COMPLETE = 'All PWA types are properly typed and validated' as const;
