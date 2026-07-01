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
  /** True when a new application version has been detected and is ready. */
  readonly updateAvailable = signal(false);

  private waitingWorker: ServiceWorker | null = null;

  constructor() {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;

        if (reg.waiting) {
          this.waitingWorker = reg.waiting;
          this.updateAvailable.set(true);
        }

        reg.addEventListener('updatefound', () => {
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

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          document.location.reload();
        }
      });
    }
  }

  /** Tell the waiting worker to activate, which will trigger the reload. */
  activateUpdate(): void {
    if (this.waitingWorker) {
      this.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      document.location.reload();
    }
  }

  /** Dismiss the banner without reloading (user can reload manually later). */
  dismiss(): void {
    this.updateAvailable.set(false);
  }
}
