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
      }
    } catch {
      // Never throw from within GlobalErrorHandler
    }

    // Call the default behavior to log to console
    console.error(error);
  }
}
