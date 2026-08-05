import { Injectable, signal } from '@angular/core';

/**
 * UpdateNotificationService
 *
 * Listens to native Service Worker lifecycle events and exposes a reactive
 * signal that the UI can use to display a non-intrusive update-available
 * banner. When the user confirms, the page reloads to activate the new
 * cache and service worker version.
 */
@Injectable({ providedIn: 'root' })
export class UpdateNotificationService {
  /** True when the update banner is forced via query param mock trigger. */
  readonly isMockUpdate = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mock-update') === 'true';

  /** True when a new application version has been detected and is ready. */
  readonly updateAvailable = signal(false);

  private waitingWorker: ServiceWorker | null = null;

  get isTestOrDev(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      (typeof navigator !== 'undefined' && navigator.webdriver) ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '::1' ||
      window.location.hostname === '0.0.0.0' ||
      window.location.hostname.endsWith('.localhost')
    );
  }

  constructor() {
    if (this.isMockUpdate) {
      this.updateAvailable.set(true);
    }

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;

        if (reg.waiting) {
          if (this.isTestOrDev && !this.isMockUpdate) return;
          this.waitingWorker = reg.waiting;
          this.updateAvailable.set(true);
        }

        reg.addEventListener('updatefound', () => {
          if (this.isTestOrDev && !this.isMockUpdate) return;
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.waitingWorker = newWorker;
                this.updateAvailable.set(true);
              }
            });
          }
        });
      });

      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'MIME_TYPE_VIOLATION') {
          if (this.isTestOrDev && !this.isMockUpdate) return;
          this.updateAvailable.set(true);
        }
      });

      let refreshing = false;
      const hasInitialController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hasInitialController || (this.isTestOrDev && !this.isMockUpdate)) return;
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      // Trigger cache garbage collection completely out-of-band
      setTimeout(() => {
        this.cleanupOrphanedCaches();
      }, 2000);
    }
  }

  /** Tell the waiting worker to activate, which will trigger the reload. */
  activateUpdate(): void {
    if (this.isMockUpdate) {
      window.location.reload();
      return;
    }
    if (this.waitingWorker) {
      this.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  }

  /** Force the update banner to show up (e.g. on chunk loading error) */
  requireUpdate(): void {
    if (this.isTestOrDev && !this.isMockUpdate) return;
    this.updateAvailable.set(true);
  }

  /** Dismiss the banner without reloading (user can reload manually later). */
  dismiss(): void {
    this.updateAvailable.set(false);
  }

  /**
   * Silently scans and cleans up obsolete caches left behind by skipped updates.
   * Runs in the background and catches all errors to prevent startup disruption.
   */
  private async cleanupOrphanedCaches(): Promise<void> {
    try {
      if (typeof window === 'undefined' || !('caches' in window)) return;

      // 1. Identify Latest Cache (Waiting or Active)
      const swResponse = await fetch('/sw.js');
      if (!swResponse.ok) return;

      const swContent = await swResponse.text();
      const cacheNameMatch = swContent.match(/CACHE_NAME\s*=\s*['"`]([^'"`]+)['"`]/);
      if (!cacheNameMatch) return;

      const latestCacheName = cacheNameMatch[1];

      // 2. Identify Active Cache
      const cacheKeys = await window.caches.keys();
      const loadedUrls = new Set<string>();

      if (typeof document !== 'undefined') {
        Array.from(document.scripts).forEach((script) => {
          if (script.src && script.src.startsWith(window.location.origin)) {
            loadedUrls.add(script.src);
          }
        });

        const links = document.querySelectorAll('link[rel="stylesheet"]');
        Array.from(links).forEach((link) => {
          const href = (link as HTMLLinkElement).href;
          if (href && href.startsWith(window.location.origin)) {
            loadedUrls.add(href);
          }
        });
      }

      let activeCacheName: string | null = null;
      for (const key of cacheKeys) {
        if (!key.startsWith('app-cache-v')) continue;

        const cache = await window.caches.open(key);
        for (const url of loadedUrls) {
          const match = await cache.match(url);
          if (match) {
            activeCacheName = key;
            break;
          }
        }
        if (activeCacheName) break;
      }

      // 3. Preservation & Safe Deletion
      for (const key of cacheKeys) {
        if (
          key.startsWith('app-cache-v') &&
          key !== latestCacheName &&
          key !== activeCacheName
        ) {
          await window.caches.delete(key);
        }
      }
    } catch {
      // Silent failures to avoid disrupting the user experience
    }
  }
}
