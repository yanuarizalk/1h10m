import type { CacheDiagnostics } from './types';

// Global declaration for build variables injected by Vite
declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;

export interface SWRegistrationCallbacks {
  onUpdateAvailable?: (reloadCallback: () => void) => void;
  onUpdateDownloading?: () => void;
  onInstalled?: () => void;
  onOfflineReady?: () => void;
}

let registrationInstance: ServiceWorkerRegistration | null = null;
let newWorkerWaiting: ServiceWorker | null = null;

export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'v1.0.4-pjj-offline-matrix';
export const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString();

/**
 * Register Service Worker using modern navigator.serviceWorker API with Workbox lifecycle hooks
 */
export function registerServiceWorker(callbacks: SWRegistrationCallbacks = {}) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('[SIA-Orbit] Service Worker is not supported in this browser environment.');
    return;
  }

  window.addEventListener('load', async () => {
    try {
      // In VitePWA prompt mode, the SW file is served at /sw.js or virtual SW
      const swUrl = '/sw.js';
      const registration = await navigator.serviceWorker.register(swUrl, { scope: '/' });
      registrationInstance = registration;
      console.log('[SIA-Orbit SW] Service Worker registered with scope:', registration.scope);

      // 1. Check if a worker is already waiting (e.g. from previous tab/session)
      if (registration.waiting) {
        newWorkerWaiting = registration.waiting;
        callbacks.onUpdateAvailable?.(() => applyUpdateAndReload());
      }

      // 2. Listen for newly installing worker
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        callbacks.onUpdateDownloading?.();

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // A new update is ready!
              newWorkerWaiting = installingWorker;
              console.log('[SIA-Orbit SW] New update is installed and waiting for activation.');
              callbacks.onUpdateAvailable?.(() => applyUpdateAndReload());
            } else {
              // Content cached for the first time
              console.log('[SIA-Orbit SW] Content cached for offline use.');
              callbacks.onOfflineReady?.();
            }
          }
        });
      });

      // 3. Periodic or network-driven update check
      if (navigator.onLine) {
        registration.update().catch((err) => {
          console.debug('[SIA-Orbit SW] Initial update check notice:', err);
        });
      }
    } catch (err) {
      console.warn('[SIA-Orbit SW] Registration failed or running in dev fallback:', err);
    }
  });

  // Reload page ONLY once user explicitly consents and new service worker takes control
  let userConsentedReload = false;
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (userConsentedReload && !refreshing) {
      refreshing = true;
      window.location.reload();
    } else {
      console.log('[SIA-Orbit SW] controllerchange received without explicit user consent. Retaining current page state without reload.');
    }
  });

  // Export internal setter for user consent
  (window as any).__siaOrbitApplyUpdate = () => {
    userConsentedReload = true;
  };
}

/**
 * Trigger SKIP_WAITING with explicit user consent to activate the waiting Service Worker and reload
 */
export function applyUpdateAndReload() {
  if (typeof window !== 'undefined' && (window as any).__siaOrbitApplyUpdate) {
    (window as any).__siaOrbitApplyUpdate();
  }

  if (newWorkerWaiting) {
    newWorkerWaiting.postMessage({ type: 'SKIP_WAITING' });
  } else if (registrationInstance?.waiting) {
    registrationInstance.waiting.postMessage({ type: 'SKIP_WAITING' });
  } else {
    window.location.reload();
    return;
  }

  // Fallback in case controllerchange does not fire within 1500ms
  setTimeout(() => {
    window.location.reload();
  }, 1500);
}

/**
 * Manually trigger a service worker update check (e.g. clicked in Diagnostics modal)
 */
export async function checkForServiceWorkerUpdate(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !registrationInstance) {
    return false;
  }
  try {
    await registrationInstance.update();
    return !!(registrationInstance.waiting || registrationInstance.installing);
  } catch (error) {
    console.error('[SIA-Orbit SW] Update check failed:', error);
    return false;
  }
}

/**
 * Gather deep diagnostic telemetry for the System Transparency Modal
 */
export async function getCacheDiagnostics(): Promise<CacheDiagnostics> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const swRegistered = !!registrationInstance;
  const swActive = !!(registrationInstance?.active);
  const swWaiting = !!(registrationInstance?.waiting);

  let cacheList: { name: string; count: number }[] = [];
  if ('caches' in window) {
    try {
      const keys = await caches.keys();
      for (const key of keys) {
        const cache = await caches.open(key);
        const requests = await cache.keys();
        cacheList.push({ name: key, count: requests.length });
      }
    } catch (e) {
      console.warn('[SIA-Orbit SW] Could not list caches:', e);
    }
  }

  let storageUsage = { usedMb: 0, quotaMb: 0, percentage: 0 };
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      const usedMb = ((estimate.usage || 0) / (1024 * 1024));
      const quotaMb = ((estimate.quota || 0) / (1024 * 1024));
      const percentage = quotaMb > 0 ? (usedMb / quotaMb) * 100 : 0;
      storageUsage = {
        usedMb: Math.round(usedMb * 100) / 100,
        quotaMb: Math.round(quotaMb * 100) / 100,
        percentage: Math.round(percentage * 100) / 100,
      };
    } catch (e) {
      console.warn('[SIA-Orbit SW] Storage estimate failed:', e);
    }
  }

  return {
    isOnline,
    swRegistered,
    swActive,
    swWaiting,
    buildVersion: APP_VERSION,
    buildTimestamp: BUILD_TIME,
    cacheList,
    storageUsage,
    lastCheckedTime: new Date().toLocaleTimeString(),
  };
}
