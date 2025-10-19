/**
 * PWA (Progressive Web App) Type Definitions
 *
 * This file provides comprehensive type definitions for:
 * - BeforeInstallPromptEvent
 * - Service Worker API enhancements
 * - Cache API extensions
 * - Window interface extensions for PWA features
 *
 * Supports both browser and Service Worker environments
 */

// ============================================================================
// BeforeInstallPromptEvent - Install Prompt Handling
// ============================================================================

/**
 * Raised when the browser detects that a website is installable as a PWA.
 * Allows apps to show custom install UI instead of relying on the browser's default.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent
 */
interface BeforeInstallPromptEvent extends Event {
  /**
   * Returns a Promise that resolves to a DeferredPrompt object.
   * Can be called multiple times on the same event object.
   */
  prompt(): Promise<void>;

  /**
   * Returns a Promise that resolves with a user choice object:
   * { outcome: 'accepted' | 'dismissed', platform: string }
   */
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;

  /**
   * List of platforms the app can be installed on.
   * Examples: 'web', 'play', 'itunes'
   */
  readonly platforms: string[];
}

// ============================================================================
// Window Interface Extensions - PWA Features
// ============================================================================

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent;
  appinstalled: Event;
}

interface Window {
  /**
   * Service Worker Container - Manages registration and lifecycle of service workers.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer
   */
  readonly serviceWorker: ServiceWorkerContainer;

  /**
   * NavigatorUAData for User-Agent Client Hints
   * Provides secure access to browser/device information
   */
  readonly navigation?: Navigation;

  /**
   * Detected User-Agent data (for Progressive Enhancement)
   */
  readonly userAgentData?: NavigatorUAData;
}

// ============================================================================
// Navigator Extensions - PWA APIs
// ============================================================================

interface Navigator {
  /**
   * Service Worker Container access through Navigator
   */
  readonly serviceWorker: ServiceWorkerContainer;

  /**
   * User-Agent Client Hints API
   * Secure replacement for parsing User-Agent string
   */
  readonly userAgentData?: NavigatorUAData;

  /**
   * Standalone mode detection (iOS)
   * Returns true if the app is running in full screen mode (added by iOS)
   */
  readonly standalone?: boolean;

  /**
   * Connection information for bandwidth-aware optimizations
   */
  readonly connection?: NetworkInformation;

  /**
   * Device memory hint for adaptive resource loading
   */
  readonly deviceMemory?: number;

  /**
   * Number of logical processors available
   */
  readonly hardwareConcurrency?: number;
}

// ============================================================================
// NetworkInformation - Connection Status API
// ============================================================================

interface NetworkInformation extends EventTarget {
  /**
   * Effective connection type: 4g, 3g, 2g, slow-2g
   */
  readonly effectiveType: 'slow-2g' | '2g' | '3g' | '4g';

  /**
   * Bandwidth estimate in Mbps
   */
  readonly downlink?: number;

  /**
   * Round-trip time estimate in ms
   */
  readonly rtt?: number;

  /**
   * Whether data saver mode is enabled
   */
  readonly saveData?: boolean;

  /**
   * Fires when connection type or status changes
   */
  onchange: ((this: NetworkInformation, ev: Event) => void) | null;
}

// ============================================================================
// User-Agent Client Hints
// ============================================================================

interface NavigatorUAData {
  /**
   * Returns true if the brand is significant in the user agent string
   */
  readonly brands: UADataValues[];

  /**
   * Mobile device indicator
   */
  readonly mobile: boolean;

  /**
   * Operating system platform
   */
  readonly platform: string;

  /**
   * Returns a promise with high-entropy user agent data
   * Should only be called in response to user activation
   */
  getHighEntropyValues(hints: string[]): Promise<UADataValues>;
}

interface UADataValues {
  brand: string;
  version: string;
}

// ============================================================================
// Service Worker API Type Enhancements
// ============================================================================

/**
 * Service Worker scope and options for fine-grained control
 */
interface ServiceWorkerRegistrationOptions {
  /**
   * Scope of the service worker (URL pathname)
   * @default scope of the registering script
   */
  scope?: string;

  /**
   * How to interpret the scope URL
   * @default 'clients'
   */
  scopeUrl?: string;

  /**
   * Type of worker: 'classic' or 'module'
   * @default 'classic'
   */
  type?: WorkerType;

  /**
   * Update frequency check timing
   * @default 'default'
   */
  updateViaCache?: 'imports' | 'all' | 'none';
}

type WorkerType = 'classic' | 'module';

/**
 * Enhanced ServiceWorkerContainer with better typing
 */
interface ServiceWorkerContainerEventMap {
  controllerchange: Event;
  message: ExtendableMessageEvent;
  error: Event;
}

interface ServiceWorkerContainer extends EventTarget {
  readonly controller: ServiceWorker | null;
  readonly ready: Promise<ServiceWorkerRegistration>;
  oncontrollerchange: ((this: ServiceWorkerContainer, ev: Event) => void) | null;
  onmessage: ((this: ServiceWorkerContainer, ev: ExtendableMessageEvent) => void) | null;
  onerror: ((this: ServiceWorkerContainer, ev: Event) => void) | null;
  getRegistrations(): Promise<ServiceWorkerRegistration[]>;
  getRegistration(clientURL?: string | URL): Promise<ServiceWorkerRegistration | undefined>;
  register(scriptURL: string | URL, options?: ServiceWorkerRegistrationOptions): Promise<ServiceWorkerRegistration>;
  startMessages(): void;
}

interface ServiceWorkerRegistration {
  readonly scope: string;
  readonly updateViaCache: ServiceWorkerUpdateViaCache;
  readonly installing: ServiceWorker | null;
  readonly waiting: ServiceWorker | null;
  readonly active: ServiceWorker | null;
  readonly navigationPreload: NavigationPreloadManager;
  readonly onupdatefound: ((this: ServiceWorkerRegistration, ev: Event) => void) | null;
  getNotifications(options?: GetNotificationOptions): Promise<Notification[]>;
  showNotification(title: string, options?: NotificationOptions): Promise<void>;
  update(): Promise<void>;
  unregister(): Promise<boolean>;
}

interface NavigationPreloadManager {
  enable(): Promise<void>;
  disable(): Promise<void>;
  getState(): Promise<NavigationPreloadState>;
  onprogressupdate: ((this: ServiceWorkerRegistration, ev: ProgressEvent) => void) | null;
}

interface NavigationPreloadState {
  enabled: boolean;
  headerValue: string;
}

type ServiceWorkerUpdateViaCache = 'imports' | 'all' | 'none';

interface GetNotificationOptions {
  tag?: string;
}

interface NotificationOptions {
  actions?: NotificationAction[];
  badge?: string;
  body?: string;
  data?: any;
  dir?: 'auto' | 'ltr' | 'rtl';
  icon?: string;
  image?: string;
  lang?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  timestamp?: number;
  vibrate?: number | number[];
}

interface NotificationAction {
  action: string;
  icon?: string;
  title: string;
}

interface ServiceWorker extends EventTarget {
  readonly scriptURL: string;
  readonly state: 'parsed' | 'installing' | 'installed' | 'activating' | 'activated' | 'redundant';
  onError: ((this: ServiceWorker, ev: ErrorEvent) => void) | null;
  postMessage(msg: unknown, transfer?: Transferable[]): void;
}

// ============================================================================
// Service Worker Global Scope
// ============================================================================

/**
 * Extends the global scope available inside a Service Worker
 * Use with: declare const self: ServiceWorkerGlobalScope;
 */
interface ServiceWorkerGlobalScope extends WorkerGlobalScope {
  readonly caches: CacheStorage;
  readonly clients: Clients;
  readonly registration: ServiceWorkerRegistration;
  onactivate: ((this: ServiceWorkerGlobalScope, ev: ExtendableEvent) => void) | null;
  onbeforeunload: ((this: ServiceWorkerGlobalScope, ev: BeforeUnloadEvent) => void) | null;
  onfetch: ((this: ServiceWorkerGlobalScope, ev: FetchEvent) => void) | null;
  oninstall: ((this: ServiceWorkerGlobalScope, ev: ExtendableEvent) => void) | null;
  onmessage: ((this: ServiceWorkerGlobalScope, ev: ExtendableMessageEvent) => void) | null;
  onmessageerror: ((this: ServiceWorkerGlobalScope, ev: MessageEvent) => void) | null;
  onsync: ((this: ServiceWorkerGlobalScope, ev: SyncEvent) => void) | null;
  onpush: ((this: ServiceWorkerGlobalScope, ev: PushEvent) => void) | null;
  onnotificationclick: ((this: ServiceWorkerGlobalScope, ev: NotificationEvent) => void) | null;
  onnotificationclose: ((this: ServiceWorkerGlobalScope, ev: NotificationEvent) => void) | null;
  skipWaiting(): Promise<void>;
  postMessage(msg: unknown, transfer?: Transferable[]): void;
}

// ============================================================================
// Cache API - Enhanced Type Safety
// ============================================================================

/**
 * Represents a named cache storage area
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Cache
 */
interface Cache {
  add(request: RequestInfo): Promise<void>;
  addAll(requests: RequestInfo[]): Promise<void>;
  delete(request: RequestInfo, options?: CacheQueryOptions): Promise<boolean>;
  keys(request?: RequestInfo, options?: CacheQueryOptions): Promise<Request[]>;
  match(request: RequestInfo, options?: CacheQueryOptions): Promise<Response | undefined>;
  matchAll(request?: RequestInfo, options?: CacheQueryOptions): Promise<Response[]>;
  put(request: RequestInfo, response: Response): Promise<void>;
}

interface CacheQueryOptions {
  ignoreMethod?: boolean;
  ignoreSearch?: boolean;
  ignoreVary?: boolean;
}

interface CacheStorage {
  delete(cacheName: string): Promise<boolean>;
  has(cacheName: string): Promise<boolean>;
  keys(): Promise<string[]>;
  match(request: RequestInfo, options?: CacheQueryOptions): Promise<Response | undefined>;
  open(cacheName: string): Promise<Cache>;
}

type RequestInfo = Request | string;

// ============================================================================
// Clients API - Service Worker Client Management
// ============================================================================

interface Client {
  readonly focused: boolean;
  readonly frameType: FrameType;
  readonly id: string;
  readonly type: ClientType;
  readonly url: string;
  postMessage(msg: unknown, transfer?: Transferable[]): void;
}

interface WindowClient extends Client {
  focus(): Promise<WindowClient>;
  navigate(url: string | URL): Promise<WindowClient | null>;
  readonly ancestorOrigins: string[];
  readonly frameType: 'auxiliary' | 'top-level' | 'nested' | 'none';
  readonly visibilityState: VisibilityState;
}

interface Clients {
  claim(): Promise<void>;
  get(id: string): Promise<Client | undefined>;
  matchAll(options?: ClientQueryOptions): Promise<Client[]>;
  openWindow(url: string | URL): Promise<WindowClient | null>;
}

interface ClientQueryOptions {
  includeUncontrolled?: boolean;
  type?: ClientType;
}

type ClientType = 'window' | 'worker' | 'sharedworker';
type FrameType = 'auxiliary' | 'top-level' | 'nested' | 'none';
type VisibilityState = 'hidden' | 'visible';

// ============================================================================
// Fetch Event Handling
// ============================================================================

interface FetchEvent extends ExtendableEvent {
  readonly request: Request;
  readonly preloadResponse?: Promise<Response>;
  readonly clientId: string;
  readonly isReload: boolean;
  readonly resultingClientId: string;
  respondWith(r: Promise<Response> | Response): void;
  waitUntil(f: Promise<any>): void;
}

interface ExtendableEvent extends Event {
  waitUntil(f: Promise<any>): void;
}

interface ExtendableMessageEvent extends ExtendableEvent {
  readonly data: unknown;
  readonly origin: string;
  readonly lastEventId: string;
  readonly ports: MessagePort[];
  readonly source: Client | ServiceWorker | MessagePort | null;
  postMessage(msg: unknown, transfer?: Transferable[]): void;
}

// ============================================================================
// Background Sync API
// ============================================================================

interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
  readonly lastChance: boolean;
}

interface SyncManager {
  getTags(): Promise<string[]>;
  register(tag: string): Promise<void>;
}

// ============================================================================
// Push Notification API
// ============================================================================

interface PushEvent extends ExtendableEvent {
  readonly data: PushMessageData;
  readonly origin: string;
}

interface PushMessageData {
  arrayBuffer(): ArrayBuffer;
  blob(): Blob;
  json(): unknown;
  text(): string;
}

interface PushManager {
  getSubscription(): Promise<PushSubscription | null>;
  permissionState(options?: PushSubscriptionOptionsInit): Promise<PermissionStatus>;
  subscribe(options?: PushSubscriptionOptionsInit): Promise<PushSubscription>;
}

interface PushSubscription {
  readonly endpoint: string;
  readonly expirationTime: number | null;
  readonly options: PushSubscriptionOptions;
  getKey(name: 'p256dh' | 'auth'): ArrayBuffer | null;
  toJSON(): PushSubscriptionJSON;
  unsubscribe(): Promise<boolean>;
}

interface PushSubscriptionJSON {
  endpoint: string;
  expirationTime: number | null;
  keys: Record<string, string>;
}

interface PushSubscriptionOptions {
  readonly applicationServerKey: BufferSource | null;
  readonly userVisibleOnly: boolean;
}

interface PushSubscriptionOptionsInit {
  applicationServerKey?: BufferSource | string;
  userVisibleOnly?: boolean;
}

// ============================================================================
// Notification Event Handling
// ============================================================================

interface NotificationEvent extends ExtendableEvent {
  readonly action: string;
  readonly notification: Notification;
  readonly reply?: string;
}

// ============================================================================
// Permissions API
// ============================================================================

type PermissionStatus = 'granted' | 'denied' | 'prompt';
type PermissionName =
  | 'accelerometer'
  | 'ambient-light-sensor'
  | 'bluetooth'
  | 'camera'
  | 'clipboard-read'
  | 'clipboard-write'
  | 'geolocation'
  | 'gyroscope'
  | 'magnetometer'
  | 'microphone'
  | 'midi'
  | 'notifications'
  | 'payment-handler'
  | 'persistent-storage'
  | 'push'
  | 'storage-access'
  | 'usb'
  | 'xr-spatial-tracking';

// ============================================================================
// PWA Installation Status
// ============================================================================

/**
 * Represents the PWA installation state
 * Used for tracking whether the app is installed and display status
 */
interface PWAInstallationState {
  canInstall: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
}

/**
 * Options for PWA installation flow
 */
interface PWAInstallationOptions {
  /**
   * Automatically dismiss the install prompt after this duration (ms)
   * Set to 0 to disable auto-dismiss
   */
  autoPromptTimeout?: number;

  /**
   * Show the install prompt immediately or wait for user action
   */
  showPromptImmediately?: boolean;

  /**
   * Custom install flow handler
   */
  onInstallPrompt?: (prompt: BeforeInstallPromptEvent) => void;
}

// ============================================================================
// Service Worker Registration State
// ============================================================================

/**
 * Represents the complete state of a Service Worker registration
 * Used for managing update cycles and lifecycle
 */
interface ServiceWorkerState {
  /**
   * Is there a new version waiting for activation?
   */
  hasUpdateWaiting: boolean;

  /**
   * Is an update currently being installed?
   */
  isUpdating: boolean;

  /**
   * Timestamp of last update check
   */
  lastUpdateCheck: number;

  /**
   * Current active Service Worker controller
   */
  controller: ServiceWorker | null;

  /**
   * Scope of this registration
   */
  scope: string;
}

// ============================================================================
// Caching Strategy Types
// ============================================================================

/**
 * Strategies for caching in Service Workers
 */
type CacheStrategy = 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'network-only' | 'cache-only';

interface CacheOptions {
  /**
   * Name of the cache store
   */
  cacheName: string;

  /**
   * Caching strategy to use
   */
  strategy: CacheStrategy;

  /**
   * Cache versioning/expiration (in seconds)
   */
  maxAge?: number;

  /**
   * URL patterns to include/exclude
   */
  urlPatterns?: {
    include?: RegExp[];
    exclude?: RegExp[];
  };
}
