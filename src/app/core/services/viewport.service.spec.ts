import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { ViewportService } from './viewport.service';
import { vi } from 'vitest';

describe('ViewportService', () => {
  let service: ViewportService;
  let matchMediaMock: ReturnType<typeof vi.fn>;
  let changeListeners: Record<string, ((e: any) => void)[]> = {};

  const MOBILE_QUERY = '(max-width: 599px)';
  const TABLET_QUERY = '(min-width: 600px) and (max-width: 1279px)';

  function setMediaQueryMatch(query: string, matches: boolean) {
    if (changeListeners[query]) {
      changeListeners[query].forEach(listener => listener({ matches } as any));
    }
  }

  function setupMatchMedia(initialMobile: boolean, initialTablet: boolean) {
    changeListeners = {};
    matchMediaMock = vi.fn().mockImplementation((query) => {
      let matches = false;
      if (query === MOBILE_QUERY) matches = initialMobile;
      if (query === TABLET_QUERY) matches = initialTablet;
      return {
        matches,
        addEventListener: (event: string, handler: any) => {
          if (event === 'change') {
            if (!changeListeners[query]) changeListeners[query] = [];
            changeListeners[query].push(handler);
          }
        },
        removeEventListener: (event: string, handler: any) => {
          if (event === 'change' && changeListeners[query]) {
            changeListeners[query] = changeListeners[query].filter(h => h !== handler);
          }
        }
      };
    });
    Object.defineProperty(window, 'matchMedia', { value: matchMediaMock, writable: true, configurable: true });
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create the service', () => {
    setupMatchMedia(false, false);
    TestBed.configureTestingModule({
      providers: [
        ViewportService,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ]
    });
    service = TestBed.inject(ViewportService);
    expect(service).toBeTruthy();
  });

  it('should default to desktop before any breakpoint fires (if matchMedia is false)', () => {
    setupMatchMedia(false, false);
    TestBed.configureTestingModule({
      providers: [
        ViewportService,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ]
    });
    service = TestBed.inject(ViewportService);
    expect(service.viewportSize()).toBe('desktop');
    expect(service.isDesktop()).toBe(true);
    expect(service.isMobile()).toBe(false);
    expect(service.isTablet()).toBe(false);
  });

  it('should set viewportSize to "mobile" when mobile query matches', () => {
    setupMatchMedia(true, false);
    TestBed.configureTestingModule({
      providers: [
        ViewportService,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ]
    });
    service = TestBed.inject(ViewportService);
    expect(service.viewportSize()).toBe('mobile');
    expect(service.isMobile()).toBe(true);
    expect(service.isTablet()).toBe(false);
    expect(service.isDesktop()).toBe(false);
  });

  it('should set viewportSize to "tablet" when tablet query matches', () => {
    setupMatchMedia(false, true);
    TestBed.configureTestingModule({
      providers: [
        ViewportService,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ]
    });
    service = TestBed.inject(ViewportService);
    expect(service.viewportSize()).toBe('tablet');
    expect(service.isTablet()).toBe(true);
    expect(service.isMobile()).toBe(false);
    expect(service.isDesktop()).toBe(false);
  });

  it('should set viewportSize to "desktop" when no handset/tablet breakpoint matches', () => {
    setupMatchMedia(false, false);
    TestBed.configureTestingModule({
      providers: [
        ViewportService,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ]
    });
    service = TestBed.inject(ViewportService);
    expect(service.viewportSize()).toBe('desktop');
    expect(service.isDesktop()).toBe(true);
  });

  it('should react to breakpoint changes over time (mobile → tablet → desktop)', () => {
    setupMatchMedia(true, false);
    TestBed.configureTestingModule({
      providers: [
        ViewportService,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ]
    });
    service = TestBed.inject(ViewportService);
    expect(service.viewportSize()).toBe('mobile');

    setMediaQueryMatch(MOBILE_QUERY, false);
    setMediaQueryMatch(TABLET_QUERY, true);
    TestBed.flushEffects();
    expect(service.viewportSize()).toBe('tablet');

    setMediaQueryMatch(TABLET_QUERY, false);
    TestBed.flushEffects();
    expect(service.viewportSize()).toBe('desktop');
  });

  it('should default to desktop on non-browser platforms (SSR)', () => {
    setupMatchMedia(true, false); // Even if true, SSR should ignore it
    TestBed.configureTestingModule({
      providers: [
        ViewportService,
        { provide: PLATFORM_ID, useValue: 'server' },
      ]
    });
    const ssrService = TestBed.inject(ViewportService);
    expect(ssrService.viewportSize()).toBe('desktop');
    // Ensure matchMedia is not called
    expect(matchMediaMock).not.toHaveBeenCalled();
  });
});
