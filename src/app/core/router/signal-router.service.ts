import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SignalRouter {
  private currentUrl = signal<string>(window.location.href);
  
  public path = computed(() => {
    const parsed = new URL(this.currentUrl(), window.location.origin || 'http://localhost');
    return parsed.pathname;
  });

  public queryParams = computed(() => {
    const parsed = new URL(this.currentUrl(), window.location.origin || 'http://localhost');
    const result: Record<string, string> = {};
    parsed.searchParams.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  });

  constructor() {
    window.addEventListener('popstate', () => {
      this.currentUrl.set(window.location.href);
    });
  }

  navigate(path: string, queryParams?: Record<string, string>): void {
    const parsed = new URL(path, window.location.origin || 'http://localhost');
    
    if (queryParams && Object.keys(queryParams).length > 0) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          parsed.searchParams.set(key, value);
        }
      });
    }
    
    const targetUrl = parsed.pathname + parsed.search + parsed.hash;
    const currentParsed = new URL(this.currentUrl(), window.location.origin || 'http://localhost');
    const currentUrlRelative = currentParsed.pathname + currentParsed.search + currentParsed.hash;
    
    if (targetUrl !== currentUrlRelative) {
      window.history.pushState(null, '', targetUrl);
      this.currentUrl.set(window.location.href);
    }
  }
}
