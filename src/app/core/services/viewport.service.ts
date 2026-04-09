import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export type ViewportSize = 'mobile' | 'tablet' | 'desktop';

/**
 * Global viewport service that observes CDK breakpoints and exposes the
 * current viewport state as a reactive Angular Signal.
 *
 * Breakpoint mapping:
 *  - mobile  → Handset  (< 600 px, portrait or landscape)
 *  - tablet  → Tablet   (600 px – 1279 px, portrait or landscape)
 *  - desktop → everything else (Web / large screens)
 */
@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly breakpointObserver = inject(BreakpointObserver);

  /** Raw signal updated by the BreakpointObserver subscription. */
  private readonly _viewportSize = signal<ViewportSize>('desktop');

  /** Reactive signal exposing the current viewport category. */
  readonly viewportSize = this._viewportSize.asReadonly();

  /** Convenience computed booleans for template use. */
  readonly isMobile = computed(() => this._viewportSize() === 'mobile');
  readonly isTablet = computed(() => this._viewportSize() === 'tablet');
  readonly isDesktop = computed(() => this._viewportSize() === 'desktop');

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      // SSR: default to desktop so heavy components render for crawlers.
      return;
    }

    this.breakpointObserver
      .observe([
        Breakpoints.Handset,
        Breakpoints.TabletPortrait,
        Breakpoints.TabletLandscape,
      ])
      .pipe(takeUntilDestroyed())
      .subscribe(state => {
        if (state.breakpoints[Breakpoints.Handset]) {
          this._viewportSize.set('mobile');
        } else if (
          state.breakpoints[Breakpoints.TabletPortrait] ||
          state.breakpoints[Breakpoints.TabletLandscape]
        ) {
          this._viewportSize.set('tablet');
        } else {
          this._viewportSize.set('desktop');
        }
      });
  }
}
