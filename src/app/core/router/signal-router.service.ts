import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SignalRouter {
  private currentUrl = signal<string>(window.location.href);
  
  public path = computed(() => {
    const parsed = new URL(this.currentUrl(), window.location.origin || 'http://localhost');
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    return pathname;
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
    const initialUrl = new URL(window.location.href);
    if (initialUrl.pathname.length > 1 && initialUrl.pathname.endsWith('/')) {
      const normalizedPath = initialUrl.pathname.slice(0, -1);
      const target = normalizedPath + initialUrl.search + initialUrl.hash;
      window.history.replaceState(null, '', target);
      this.currentUrl.set(window.location.href);
    }

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
    
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    
    const targetUrl = pathname + parsed.search + parsed.hash;
    const currentParsed = new URL(this.currentUrl(), window.location.origin || 'http://localhost');
    let currentPathname = currentParsed.pathname;
    if (currentPathname.length > 1 && currentPathname.endsWith('/')) {
      currentPathname = currentPathname.slice(0, -1);
    }
    const currentUrlRelative = currentPathname + currentParsed.search + currentParsed.hash;
    
    if (targetUrl !== currentUrlRelative) {
      window.history.pushState(null, '', targetUrl);
      this.currentUrl.set(window.location.href);
    }
  }
}
