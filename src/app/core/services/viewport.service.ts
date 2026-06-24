import { Injectable, computed } from '@angular/core';
import { injectMediaQuery } from '../utils/media-query';

export type ViewportSize = 'mobile' | 'tablet' | 'desktop';

/**
 * Global viewport service that observes native breakpoints and exposes the
 * current viewport state as a reactive Angular Signal.
 *
 * Breakpoint mapping:
 *  - mobile  → < 600 px
 *  - tablet  → 600 px – 1279 px
 *  - desktop → >= 1280 px
 */
@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly _isMobileMatch = injectMediaQuery('(max-width: 599px)');
  private readonly _isTabletMatch = injectMediaQuery('(min-width: 600px) and (max-width: 1279px)');

  /** Reactive signal exposing the current viewport category. */
  readonly viewportSize = computed<ViewportSize>(() => {
    if (this._isMobileMatch()) return 'mobile';
    if (this._isTabletMatch()) return 'tablet';
    return 'desktop';
  });

  /** Convenience computed booleans for template use. */
  readonly isMobile = computed(() => this.viewportSize() === 'mobile');
  readonly isTablet = computed(() => this.viewportSize() === 'tablet');
  readonly isDesktop = computed(() => this.viewportSize() === 'desktop');
}
