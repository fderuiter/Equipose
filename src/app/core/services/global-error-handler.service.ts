import { ErrorHandler, Injectable, Injector, NgZone, inject } from '@angular/core';
import { ToastService } from './toast.service';
import { LoggingService } from './logging.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly injector = inject(Injector);
  private readonly zone = inject(NgZone);
  private readonly loggingService = inject(LoggingService);

  handleError(error: unknown): void {
    const toastService = this.injector.get(ToastService);
    
    // Log the error through our centralized logging service
    this.loggingService.error('Unhandled exception caught by GlobalErrorHandler:', error);

    // Extract message for the user
    let message = 'An unexpected error occurred.';
    if (error instanceof Error) {
      message = error.message;
    } else if (error && typeof error === 'object' && error.message) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }

    // Trigger toast notification
    this.zone.run(() => {
      toastService.showError(message);
    });
  }
}
