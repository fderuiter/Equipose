import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ThemeService } from './theme.service';
import { vi } from 'vitest';

describe('ThemeService', () => {
  let service: ThemeService;
  let mockDocument: { documentElement: { classList: { add: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn>; contains: ReturnType<typeof vi.fn> } } };
  let mockMatchMedia: ReturnType<typeof vi.fn>;
  let mediaQueryListeners: ((e: MediaQueryListEvent) => void)[];

  beforeEach(() => {
    mediaQueryListeners = [];
    mockDocument = {
      documentElement: {
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
          contains: vi.fn()
        }
      }
    };

    mockMatchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: (_event: string, handler: (e: MediaQueryListEvent) => void) => {
        mediaQueryListeners.push(handler);
      },
      removeEventListener: (_event: string, handler: (e: MediaQueryListEvent) => void) => {
        mediaQueryListeners = mediaQueryListeners.filter(h => h !== handler);
      }
    });

    Object.defineProperty(window, 'matchMedia', { value: mockMatchMedia, writable: true, configurable: true });
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: DOCUMENT, useValue: mockDocument }
      ]
    });
    service = TestBed.inject(ThemeService);
    TestBed.tick();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should default to System mode when no saved preference exists', () => {
    expect(service.mode()).toBe('System');
  });

  it('should load saved Dark mode from localStorage on construction', () => {
    localStorage.setItem('theme-preference', 'Dark');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: DOCUMENT, useValue: mockDocument }
      ]
    });
    const newService = TestBed.inject(ThemeService);
    expect(newService.mode()).toBe('Dark');
  });

  it('should load saved Light mode from localStorage on construction', () => {
    localStorage.setItem('theme-preference', 'Light');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: DOCUMENT, useValue: mockDocument }
      ]
    });
    const newService = TestBed.inject(ThemeService);
    expect(newService.mode()).toBe('Light');
  });

  it('should be Light (not dark) when mode is Light regardless of system preference', () => {
    service.setMode('Light');
    TestBed.tick();
    expect(service.isDark()).toBe(false);
  });

  it('should be Dark when mode is Dark regardless of system preference', () => {
    service.setMode('Dark');
    TestBed.tick();
    expect(service.isDark()).toBe(true);
  });

  it('should follow system preference when mode is System and system is light', () => {
    service.setMode('System');
    TestBed.tick();
    // mockMatchMedia returns matches: false (light)
    expect(service.isDark()).toBe(false);
  });

  it('should add dark class to html element when isDark is true', () => {
    service.setMode('Dark');
    TestBed.tick();
    expect(mockDocument.documentElement.classList.add).toHaveBeenCalledWith('dark');
  });

  it('should remove dark class from html element when isDark is false', () => {
    service.setMode('Light');
    TestBed.tick();
    expect(mockDocument.documentElement.classList.remove).toHaveBeenCalledWith('dark');
  });

  it('should save mode to localStorage when setMode is called', () => {
    service.setMode('Dark');
    expect(localStorage.getItem('theme-preference')).toBe('Dark');
    service.setMode('Light');
    expect(localStorage.getItem('theme-preference')).toBe('Light');
    service.setMode('System');
    expect(localStorage.getItem('theme-preference')).toBe('System');
  });

  it('should update isDark when OS theme changes to dark via media query event', () => {
    service.setMode('System');
    TestBed.tick();
    expect(service.isDark()).toBe(false);

    // Simulate OS switching to dark
    mediaQueryListeners.forEach(handler =>
      handler({ matches: true } as MediaQueryListEvent)
    );
    TestBed.tick();
    expect(service.isDark()).toBe(true);
  });

  it('should not update isDark on OS change when mode is explicitly Light', () => {
    service.setMode('Light');
    TestBed.tick();

    // Simulate OS switching to dark
    mediaQueryListeners.forEach(handler =>
      handler({ matches: true } as MediaQueryListEvent)
    );
    TestBed.tick();
    // Still light because mode is explicitly 'Light'
    expect(service.isDark()).toBe(false);
  });

  it('should default to Comfortable density mode when no saved preference exists', () => {
    expect(service.density()).toBe('Comfortable');
  });

  it('should load saved Compact density mode from localStorage on construction', () => {
    localStorage.setItem('density-preference', 'Compact');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: DOCUMENT, useValue: mockDocument }
      ]
    });
    const newService = TestBed.inject(ThemeService);
    expect(newService.density()).toBe('Compact');
  });

  it('should save density to localStorage when setDensity is called', () => {
    service.setDensity('Compact');
    expect(localStorage.getItem('density-preference')).toBe('Compact');
    service.setDensity('Comfortable');
    expect(localStorage.getItem('density-preference')).toBe('Comfortable');
  });

  it('should add density-compact class and remove density-comfortable when density is Compact', () => {
    service.setDensity('Compact');
    TestBed.tick();
    expect(mockDocument.documentElement.classList.add).withContext('Should add density-compact').toHaveBeenCalledWith('density-compact');
    expect(mockDocument.documentElement.classList.remove).withContext('Should remove density-comfortable').toHaveBeenCalledWith('density-comfortable');
  });

  it('should add density-comfortable class and remove density-compact when density is Comfortable', () => {
    service.setDensity('Comfortable');
    TestBed.tick();
    expect(mockDocument.documentElement.classList.add).withContext('Should add density-comfortable').toHaveBeenCalledWith('density-comfortable');
    expect(mockDocument.documentElement.classList.remove).withContext('Should remove density-compact').toHaveBeenCalledWith('density-compact');
  });

  it('should dynamically update layout tokens based on density mode', () => {
    service.setDensity('Comfortable');
    expect(service.layout().cardPadding).toBe('p-6');
    service.setDensity('Compact');
    expect(service.layout().cardPadding).toBe('p-4');
  });
});
