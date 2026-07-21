import { Injectable, signal, computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT } from '@angular/common';
import { injectMediaQuery } from '@core/utils/media-query';

export type ThemeMode = 'Light' | 'Dark' | 'System';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  private readonly STORAGE_KEY = 'theme-preference';

  readonly mode = signal<ThemeMode>('System');
  private readonly systemPrefersDark = injectMediaQuery('(prefers-color-scheme: dark)');

  readonly isDark = computed(() => {
    const m = this.mode();
    if (m === 'Dark') return true;
    if (m === 'Light') return false;
    return this.systemPrefersDark();
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem(this.STORAGE_KEY) as ThemeMode | null;
      if (saved === 'Light' || saved === 'Dark' || saved === 'System') {
        this.mode.set(saved);
      }
    }

    effect(() => {
      const dark = this.isDark();
      const html = this.document.documentElement;
      if (dark) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    });
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.STORAGE_KEY, mode);
    }
  }
}
