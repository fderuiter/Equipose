import { signal, inject, PLATFORM_ID, DestroyRef, Signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export function injectMediaQuery(query: string, fallback = false): Signal<boolean> {
  const platformId = inject(PLATFORM_ID);
  
  if (!isPlatformBrowser(platformId) || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return signal(fallback).asReadonly();
  }

  const mq = window.matchMedia(query);
  const matches = signal(mq?.matches ?? fallback);

  if (mq) {
    const listener = (e: MediaQueryListEvent) => matches.set(e.matches);
    mq.addEventListener?.('change', listener);

    inject(DestroyRef).onDestroy(() => {
      mq.removeEventListener?.('change', listener);
    });
  }

  return matches.asReadonly();
}
