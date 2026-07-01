import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AnnouncerService {
  readonly announcement = signal<string>('');

  announce(message: string): void {
    // We update the signal. To ensure repeated identical messages are announced,
    // we could temporarily clear it, but since it's an aria-live region, some browsers 
    // prefer toggling or we can rely on standard text change. 
    // Wait, setting to empty string and then setting the message might be better, or just rely on setting it.
    // Setting to empty then setting after a tick is the most robust way, but simple assignment might suffice if it's not the exact same string repeatedly in the exact same millisecond.
    // Actually, screen readers might not announce if the text is exactly the same and hasn't changed.
    // Let's toggle it by clearing first and setting it via setTimeout or just set it.
    // Since we don't have RxJS easily or don't need to complicate it, let's just do:
    this.announcement.set('');
    setTimeout(() => {
      this.announcement.set(message);
    }, 50);
  }
}
