
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ServiceWorkerManager, isServiceWorkerSupported } from './lib/sw-utils';
import { AuthProvider } from './lib/auth';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

/**
 * Initialize Service Worker for PWA functionality
 * This enables offline support, caching strategies, and push notifications
 */
async function initializeServiceWorker(): Promise<void> {
  if (!isServiceWorkerSupported()) {
    console.info('Service Workers not supported in this browser');
    return;
  }

  try {
    // Create Service Worker Manager with proper typing
    const swManager = await ServiceWorkerManager.create('/sw.ts', {
      scope: '/',
      type: 'module',
    });

    if (!swManager) {
      console.warn('Failed to initialize Service Worker Manager');
      return;
    }

    // Listen for updates
    swManager.onUpdate((state) => {
      console.log('Service Worker state updated:', state);

      if (state.hasUpdateWaiting) {
        console.log('A new version of the app is available');
        // Optionally, show a notification to the user
        // This could trigger a UI component to prompt the user to reload
      }
    });

    // Listen for errors
    swManager.onError((error, context) => {
      console.error(`Service Worker error (${context}):`, error);
    });

    // Check for updates periodically (every 6 hours)
    setInterval(
      () => {
        swManager.checkForUpdates().catch((error) => {
          console.error('Error checking for Service Worker updates:', error);
        });
      },
      6 * 60 * 60 * 1000
    );

    console.log('Service Worker initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Service Worker:', error);
  }
}

/**
 * Start the application
 */
async function startApp(): Promise<void> {
  // Initialize Service Worker first
  await initializeServiceWorker();

  // Render the React application
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>
  );
}

// Start the app
startApp().catch((error) => {
  console.error('Failed to start application:', error);
});
