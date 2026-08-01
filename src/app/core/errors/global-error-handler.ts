import { ErrorHandler, Injectable, inject, Injector } from '@angular/core';
import { UpdateNotificationService } from '../services/update-notification.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly injector = inject(Injector);

  handleError(error: any): void {
    try {
      const originalError = error?.rejection || error?.reason || error;
      
      let message = '';
      try {
        message = originalError?.message 
          ? String(originalError.message).toLowerCase() 
          : String(originalError).toLowerCase();
      } catch {
        // Fallback if String() throws (e.g. Object.create(null))
        message = '';
      }

      const isChunkLoadError = 
        message?.includes('failed to fetch dynamically imported module') ||
        message?.includes('importing a module script failed') ||
        message?.includes('loading chunk') ||
        message?.includes('chunkloaderror');

      if (isChunkLoadError) {
        const updateService = this.injector.get(UpdateNotificationService);
        updateService.requireUpdate();

        if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
          const isTestOrDev =
            (typeof navigator !== 'undefined' && navigator.webdriver) ||
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname === '::1' ||
            window.location.hostname === '0.0.0.0' ||
            window.location.hostname.endsWith('.localhost');

          if (isTestOrDev) {
            console.warn('Chunk load error reload skipped in testing/development environment.');
            return;
          }

          const now = Date.now();
          const lastReloadStr = sessionStorage.getItem('last-chunk-load-reload');
          const lastReload = lastReloadStr ? parseInt(lastReloadStr, 10) : 0;
          
          if (now - lastReload >= 10000) {
            sessionStorage.setItem('last-chunk-load-reload', String(now));
            try {
              window.location.reload();
            } catch {
              // Ignore in test/non-browser environment
            }
          } else {
            console.warn('Chunk load error reload skipped to prevent infinite reload loop.');
          }
        }
      }
    } catch {
      // Never throw from within GlobalErrorHandler
    }

    // Call the default behavior to log to console
    console.error(error);
  }
}
