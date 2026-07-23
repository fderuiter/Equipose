import { Injectable, signal, effect, OnDestroy } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AnnouncementService implements OnDestroy {
  private liveRegion: HTMLElement;
  private messageSignal = signal<string>('');
  private politenessSignal = signal<'polite' | 'assertive'>('polite');

  constructor() {
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'sr-only'; // Assuming sr-only exists
    document.body.appendChild(this.liveRegion);

    effect((onCleanup) => {
      const message = this.messageSignal();
      const politeness = this.politenessSignal();

      this.liveRegion.setAttribute('aria-live', politeness);
      this.liveRegion.textContent = message;

      if (message) {
        const timeoutId = setTimeout(() => {
          this.messageSignal.set('');
        }, 3000);

        onCleanup(() => {
          clearTimeout(timeoutId);
        });
      }
    });
  }

  announce(message: string, politeness: 'polite' | 'assertive' = 'polite'): void {
    this.politenessSignal.set(politeness);
    this.messageSignal.set(message);
  }

  ngOnDestroy(): void {
    if (this.liveRegion && this.liveRegion.parentNode) {
      try {
        this.liveRegion.parentNode.removeChild(this.liveRegion);
      } catch (e) {
        // Defensive bypass for JSDOM parentNode sync issues
      }
    }
  }
}
