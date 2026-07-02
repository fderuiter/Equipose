import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SignalRouter {
  private currentUrl = signal<string>(window.location.pathname + window.location.search);
  
  public path = computed(() => {
    const url = this.currentUrl();
    return url.split('?')[0] || '/';
  });

  public queryParams = computed(() => {
    const url = this.currentUrl();
    const search = url.split('?')[1] || '';
    const params = new URLSearchParams(search);
    const result: Record<string, string> = {};
    params.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  });

  constructor() {
    window.addEventListener('popstate', () => {
      this.currentUrl.set(window.location.pathname + window.location.search);
    });
  }

  navigate(path: string, queryParams?: Record<string, string>): void {
    let url = path;
    if (queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.set(key, value);
        }
      });
      const qs = params.toString();
      if (qs) {
        url += '?' + qs;
      }
    }
    if (url !== this.currentUrl()) {
      window.history.pushState(null, '', url);
      this.currentUrl.set(window.location.pathname + window.location.search);
    }
  }
}
