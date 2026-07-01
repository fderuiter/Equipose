import { inject, Injectable, PLATFORM_ID, signal, ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ToastComponent } from '../components/toast.component';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

const AUTO_DISMISS_MS = 3000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly appRef = inject(ApplicationRef);
  private readonly environmentInjector = inject(EnvironmentInjector);

  readonly toasts = signal<ToastMessage[]>([]);

  private containerAttached = false;

  showSuccess(message: string): void {
    this.show(message, 'success');
  }

  showError(message: string): void {
    this.show(message, 'error');
  }

  showInfo(message: string): void {
    this.show(message, 'info');
  }

  dismiss(id: string): void {
    this.toasts.update(ts => ts.filter(t => t.id !== id));
  }

  private show(message: string, type: ToastType): void {
    const id = globalThis.crypto.randomUUID();
    const toast: ToastMessage = { id, message, type };

    this.toasts.update(ts => [...ts, toast]);
    this.ensureContainerAttached();

    if (type !== 'error') {
      setTimeout(() => this.dismiss(id), AUTO_DISMISS_MS);
    }
  }

  private ensureContainerAttached(): void {
    if (!this.isBrowser || this.containerAttached) return;

    const componentRef = createComponent(ToastComponent, {
      environmentInjector: this.environmentInjector
    });

    // Make the host element behave like an overlay
    const hostEl = componentRef.location.nativeElement as HTMLElement;
    hostEl.style.position = 'fixed';
    hostEl.style.bottom = '24px';
    hostEl.style.right = '24px';
    hostEl.style.zIndex = '9999';

    document.body.appendChild(hostEl);
    this.appRef.attachView(componentRef.hostView);
    this.containerAttached = true;
  }
}
