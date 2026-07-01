import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AnnouncementService {
  private liveRegion: HTMLElement;

  constructor() {
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'sr-only'; // Assuming sr-only exists
    document.body.appendChild(this.liveRegion);
  }

  announce(message: string, politeness: 'polite' | 'assertive' = 'polite'): void {
    this.liveRegion.setAttribute('aria-live', politeness);
    this.liveRegion.textContent = message;
    
    // Clear after a brief delay to ensure it can be announced again if needed
    setTimeout(() => {
      this.liveRegion.textContent = '';
    }, 3000);
  }
}
