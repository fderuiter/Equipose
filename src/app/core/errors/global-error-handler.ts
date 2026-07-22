import { ErrorHandler, Injectable, inject, Injector } from '@angular/core';
import { UpdateNotificationService } from '../services/update-notification.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly injector = inject(Injector);

  handleError(error: any): void {
    const originalError = error?.rejection || error?.reason || error;
    const message = originalError?.message ? originalError.message.toLowerCase() : originalError?.toString().toLowerCase();

    const isChunkLoadError = 
      message?.includes('failed to fetch dynamically imported module') ||
      message?.includes('importing a module script failed') ||
      message?.includes('loading chunk') ||
      message?.includes('chunkloaderror');

    if (isChunkLoadError) {
      const updateService = this.injector.get(UpdateNotificationService);
      updateService.requireUpdate();
    }

    // Call the default behavior to log to console
    console.error(error);
  }
}
