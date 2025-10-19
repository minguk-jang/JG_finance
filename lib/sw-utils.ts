/**
 * Service Worker Utilities - Type-safe SW registration and management
 *
 * Provides:
 * - Service Worker registration with error handling
 * - Type-safe message passing between main thread and SW
 * - PWA installation detection and prompt handling
 * - Update detection and user notification
 * - Connection state tracking
 */

/// <reference path="../types/pwa.d.ts" />

import type { PWAInstallationState, ServiceWorkerState } from '@/types/pwa';

// ============================================================================
// Constants
// ============================================================================

export const SW_MESSAGE_TYPES = {
  SKIP_WAITING: 'SKIP_WAITING',
  UPDATE_AVAILABLE: 'UPDATE_AVAILABLE',
  UPDATE_ACTIVATED: 'UPDATE_ACTIVATED',
  CACHE_CLEARED: 'CACHE_CLEARED',
  SYNC_REQUESTED: 'SYNC_REQUESTED',
} as const;

export type SWMessageType = typeof SW_MESSAGE_TYPES[keyof typeof SW_MESSAGE_TYPES];

// ============================================================================
// Message Types
// ============================================================================

/**
 * Type-safe message structure for SW communication
 */
export interface SWMessage<T = unknown> {
  type: SWMessageType | string;
  data?: T;
  timestamp: number;
}

/**
 * Message sent from main thread to Service Worker
 */
export interface MainToSWMessage<T = unknown> extends SWMessage<T> {
  type: string;
}

/**
 * Message sent from Service Worker to main thread
 */
export interface SWToMainMessage<T = unknown> extends SWMessage<T> {
  type: SWMessageType | string;
  clientId?: string;
}

// ============================================================================
// Event Types
// ============================================================================

export type SWUpdateListener = (state: ServiceWorkerState) => void;
export type SWInstallListener = (state: PWAInstallationState) => void;
export type SWErrorListener = (error: Error, context: string) => void;

// ============================================================================
// Service Worker Manager Class
// ============================================================================

/**
 * Manages Service Worker lifecycle with full type safety
 *
 * @example
 * ```typescript
 * const swManager = await ServiceWorkerManager.create('/sw.ts');
 *
 * swManager.onUpdate((state) => {
 *   if (state.hasUpdateWaiting) {
 *     showUpdatePrompt();
 *   }
 * });
 *
 * swManager.postMessage({ type: 'SKIP_WAITING' });
 * ```
 */
export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private controller: ServiceWorker | null = null;
  private updateListeners: Set<SWUpdateListener> = new Set();
  private errorListeners: Set<SWErrorListener> = new Set();
  private messageListeners: Map<string, Set<(msg: unknown) => void>> = new Map();

  /**
   * Private constructor - use create() factory method
   */
  private constructor(
    private scriptUrl: string,
    private options: Partial<ServiceWorkerRegistrationOptions> = {}
  ) {}

  /**
   * Factory method to create and initialize Service Worker Manager
   */
  static async create(
    scriptUrl: string,
    options?: Partial<ServiceWorkerRegistrationOptions>
  ): Promise<ServiceWorkerManager | null> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers not supported in this browser');
      return null;
    }

    const manager = new ServiceWorkerManager(scriptUrl, options);
    try {
      await manager.initialize();
      return manager;
    } catch (error) {
      manager.emitError(error instanceof Error ? error : new Error(String(error)), 'initialization');
      return null;
    }
  }

  /**
   * Initialize Service Worker registration and event listeners
   */
  private async initialize(): Promise<void> {
    try {
      this.registration = await navigator.serviceWorker.register(this.scriptUrl, {
        scope: '/',
        ...this.options,
      });

      this.controller = navigator.serviceWorker.controller;
      this.setupEventListeners();
      this.setupMessageListener();

      console.log('Service Worker registered successfully');
    } catch (error) {
      throw new Error(
        `Failed to register Service Worker: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Set up event listeners for lifecycle changes
   */
  private setupEventListeners(): void {
    if (!this.registration) return;

    // Listen for updates
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration?.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        this.emitUpdateState();
      });
    });

    // Listen for controller changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      this.controller = navigator.serviceWorker.controller;
      this.emitUpdateState();
    });

    // Listen for messages from Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleSWMessage(event.data);
    });
  }

  /**
   * Set up message listener for incoming messages from Service Worker
   */
  private setupMessageListener(): void {
    navigator.serviceWorker.addEventListener('message', (event: ExtendableMessageEvent) => {
      const message = event.data as SWToMainMessage;
      const listeners = this.messageListeners.get(message.type);
      if (listeners) {
        listeners.forEach((listener) => listener(message.data));
      }
    });
  }

  /**
   * Handle messages coming from Service Worker
   */
  private handleSWMessage(message: SWToMainMessage): void {
    switch (message.type) {
      case SW_MESSAGE_TYPES.UPDATE_AVAILABLE:
        this.emitUpdateState();
        break;
      case SW_MESSAGE_TYPES.UPDATE_ACTIVATED:
        console.log('Service Worker updated and activated');
        this.emitUpdateState();
        break;
      default:
        // Emit to registered listeners
        const listeners = this.messageListeners.get(message.type);
        if (listeners) {
          listeners.forEach((listener) => listener(message.data));
        }
    }
  }

  /**
   * Get current Service Worker state
   */
  getState(): ServiceWorkerState | null {
    if (!this.registration) return null;

    return {
      hasUpdateWaiting: this.registration.waiting !== null,
      isUpdating: this.registration.installing !== null,
      lastUpdateCheck: Date.now(),
      controller: this.registration.active,
      scope: this.registration.scope,
    };
  }

  /**
   * Post message to active Service Worker
   */
  postMessage<T = unknown>(message: MainToSWMessage<T> | string): void {
    if (!this.controller) {
      console.warn('Service Worker controller not available');
      return;
    }

    const payload: MainToSWMessage = typeof message === 'string' ? { type: message, timestamp: Date.now() } : message;

    if (!payload.timestamp) {
      payload.timestamp = Date.now();
    }

    this.controller.postMessage(payload);
  }

  /**
   * Skip waiting and claim clients (install new version)
   */
  skipWaiting(): void {
    this.postMessage({ type: SW_MESSAGE_TYPES.SKIP_WAITING, timestamp: Date.now() });
  }

  /**
   * Check for updates
   */
  async checkForUpdates(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      await this.registration.update();
      const hasUpdate = this.registration.waiting !== null;
      if (hasUpdate) {
        this.emitUpdateState();
      }
      return hasUpdate;
    } catch (error) {
      this.emitError(
        error instanceof Error ? error : new Error(String(error)),
        'checkForUpdates'
      );
      return false;
    }
  }

  /**
   * Unregister Service Worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      const success = await this.registration.unregister();
      if (success) {
        this.registration = null;
        this.controller = null;
        this.updateListeners.clear();
        this.errorListeners.clear();
        this.messageListeners.clear();
      }
      return success;
    } catch (error) {
      this.emitError(
        error instanceof Error ? error : new Error(String(error)),
        'unregister'
      );
      return false;
    }
  }

  /**
   * Listen for Service Worker updates
   */
  onUpdate(listener: SWUpdateListener): () => void {
    this.updateListeners.add(listener);
    return () => this.updateListeners.delete(listener);
  }

  /**
   * Listen for Service Worker errors
   */
  onError(listener: SWErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  /**
   * Listen for messages from Service Worker
   */
  onMessage<T = unknown>(messageType: string, listener: (data: T) => void): () => void {
    if (!this.messageListeners.has(messageType)) {
      this.messageListeners.set(messageType, new Set());
    }
    const listeners = this.messageListeners.get(messageType)!;
    listeners.add(listener as (msg: unknown) => void);

    return () => {
      listeners.delete(listener as (msg: unknown) => void);
      if (listeners.size === 0) {
        this.messageListeners.delete(messageType);
      }
    };
  }

  /**
   * Emit update state to all listeners
   */
  private emitUpdateState(): void {
    const state = this.getState();
    if (state) {
      this.updateListeners.forEach((listener) => listener(state));
    }
  }

  /**
   * Emit error to all listeners
   */
  private emitError(error: Error, context: string): void {
    console.error(`[SW Manager] ${context}:`, error);
    this.errorListeners.forEach((listener) => listener(error, context));
  }
}

// ============================================================================
// PWA Installation Manager
// ============================================================================

/**
 * Manages PWA installation prompt and state
 *
 * @example
 * ```typescript
 * const pwaManager = new PWAInstallationManager();
 *
 * pwaManager.onPrompt((state) => {
 *   if (state.canInstall && !state.isInstalled) {
 *     showInstallButton();
 *   }
 * });
 *
 * await pwaManager.install();
 * ```
 */
export class PWAInstallationManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private listeners: Set<SWInstallListener> = new Set();
  private state: PWAInstallationState = {
    canInstall: false,
    isInstalled: false,
    isStandalone: false,
    deferredPrompt: null,
  };

  constructor() {
    this.initialize();
  }

  /**
   * Initialize PWA installation detection
   */
  private initialize(): void {
    this.detectStandalone();
    this.setupBeforeInstallPrompt();
    this.setupAppInstalled();
  }

  /**
   * Detect if app is running in standalone mode
   */
  private detectStandalone(): void {
    const isStandalone =
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      (navigator.standalone === true) ||
      document.referrer.includes('android-app://');

    this.updateState({ isStandalone });
  }

  /**
   * Set up beforeinstallprompt event listener
   */
  private setupBeforeInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      this.deferredPrompt = event;
      this.updateState({
        canInstall: true,
        deferredPrompt: event,
      });
    });
  }

  /**
   * Set up appinstalled event listener
   */
  private setupAppInstalled(): void {
    window.addEventListener('appinstalled', () => {
      this.updateState({
        isInstalled: true,
        canInstall: false,
        deferredPrompt: null,
      });
    });
  }

  /**
   * Prompt user to install the app
   */
  async install(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.warn('Install prompt not available');
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        this.deferredPrompt = null;
        this.updateState({
          canInstall: false,
          deferredPrompt: null,
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Installation failed:', error);
      return false;
    }
  }

  /**
   * Dismiss the install prompt
   */
  dismiss(): void {
    this.deferredPrompt = null;
    this.updateState({
      canInstall: false,
      deferredPrompt: null,
    });
  }

  /**
   * Get current PWA state
   */
  getState(): PWAInstallationState {
    return { ...this.state };
  }

  /**
   * Listen for PWA state changes
   */
  onPrompt(listener: SWInstallListener): () => void {
    this.listeners.add(listener);
    // Emit current state immediately
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  /**
   * Update state and notify listeners
   */
  private updateState(partial: Partial<PWAInstallationState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((listener) => listener(this.state));
  }
}

// ============================================================================
// Connection Detection
// ============================================================================

/**
 * Manages connection state and provides adaptive loading hints
 */
export class ConnectionManager {
  private listeners: Set<(isOnline: boolean) => void> = new Set();
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.setupListeners();
  }

  /**
   * Set up online/offline event listeners
   */
  private setupListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });
  }

  /**
   * Check if device is online
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Get effective connection type for adaptive loading
   */
  getEffectiveConnectionType(): '4g' | '3g' | '2g' | 'slow-2g' | 'unknown' {
    const connection = navigator.connection ?? navigator.mozConnection ?? (navigator as any).webkitConnection;
    return (connection?.effectiveType as any) ?? 'unknown';
  }

  /**
   * Should load heavy resources based on connection
   */
  shouldLoadHeavyResources(): boolean {
    const effectiveType = this.getEffectiveConnectionType();
    const saveData = (navigator.connection as any)?.saveData ?? false;
    return !saveData && (effectiveType === '4g' || effectiveType === 'unknown');
  }

  /**
   * Listen for connection changes
   */
  onChange(listener: (isOnline: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of connection change
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.isOnline));
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if the browser supports Service Workers
 */
export function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator;
}

/**
 * Check if the browser supports PWA installation
 */
export function isPWAInstallationSupported(): boolean {
  return 'beforeinstallprompt' in window;
}

/**
 * Check if the app is running as an installed PWA
 */
export function isInstalledPWA(): boolean {
  return (
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    (navigator.standalone === true) ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Request permission for a specific API
 */
export async function requestPermission(
  name: 'notifications' | 'geolocation' | 'camera' | 'microphone'
): Promise<'granted' | 'denied' | 'prompt'> {
  if (!('permissions' in navigator)) {
    console.warn('Permissions API not supported');
    return 'prompt';
  }

  try {
    const result = await (navigator.permissions as any).query({ name });
    return result.state as 'granted' | 'denied' | 'prompt';
  } catch (error) {
    console.error(`Failed to query ${name} permission:`, error);
    return 'prompt';
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<boolean> {
  if (!('caches' in window)) {
    console.warn('Cache API not supported');
    return false;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    return true;
  } catch (error) {
    console.error('Failed to clear caches:', error);
    return false;
  }
}

/**
 * Get all cached resources
 */
export async function getCachedResources(cacheName: string): Promise<Response[]> {
  if (!('caches' in window)) {
    console.warn('Cache API not supported');
    return [];
  }

  try {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    const responses: Response[] = [];

    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        responses.push(response);
      }
    }

    return responses;
  } catch (error) {
    console.error(`Failed to get cached resources from ${cacheName}:`, error);
    return [];
  }
}
