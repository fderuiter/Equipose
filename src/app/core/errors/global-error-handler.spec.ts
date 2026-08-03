import { GlobalErrorHandler } from './global-error-handler';
import { TestBed } from '@angular/core/testing';
import { UpdateNotificationService } from '../services/update-notification.service';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('GlobalErrorHandler', () => {
  let errorHandler: GlobalErrorHandler;
  let updateServiceMock: any;
  let originalLocation: any;
  let mockReload: any;
  
  beforeEach(() => {
    updateServiceMock = {
      requireUpdate: vi.fn()
    };
    
    TestBed.configureTestingModule({
      providers: [
        GlobalErrorHandler,
        { provide: UpdateNotificationService, useValue: updateServiceMock }
      ]
    });
    
    errorHandler = TestBed.inject(GlobalErrorHandler);
    
    // Silence console.error in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Clear sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }

    // Safely mock location reload
    originalLocation = window.location;
    mockReload = vi.fn();
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      hostname: 'example.com',
      reload: mockReload
    } as any;
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it('should call updateService.requireUpdate when chunk load error occurs', () => {
    const error = new Error('Failed to fetch dynamically imported module: ...');
    errorHandler.handleError(error);
    expect(updateServiceMock.requireUpdate).toHaveBeenCalled();
  });

  it('should not call updateService.requireUpdate for normal errors', () => {
    const error = new Error('Some normal error');
    errorHandler.handleError(error);
    expect(updateServiceMock.requireUpdate).not.toHaveBeenCalled();
  });
  
  it('should handle strings', () => {
    errorHandler.handleError('ChunkLoadError: loading chunk failed');
    expect(updateServiceMock.requireUpdate).toHaveBeenCalled();
  });

  it('should unwrap promise rejection (Zone style)', () => {
    const error = { rejection: new Error('Failed to fetch dynamically imported module: ...') };
    errorHandler.handleError(error);
    expect(updateServiceMock.requireUpdate).toHaveBeenCalled();
  });

  it('should unwrap promise rejection (unhandledrejection style)', () => {
    const error = { reason: new Error('Failed to fetch dynamically imported module: ...') };
    errorHandler.handleError(error);
    expect(updateServiceMock.requireUpdate).toHaveBeenCalled();
  });

  it('should not throw if error is null or undefined', () => {
    expect(() => errorHandler.handleError(null)).not.toThrow();
    expect(() => errorHandler.handleError(undefined)).not.toThrow();
    expect(() => errorHandler.handleError({ reason: null })).not.toThrow();
  });

  it('should not throw if error is an object without a prototype', () => {
    const error = Object.create(null);
    expect(() => errorHandler.handleError(error)).not.toThrow();
  });

  it('should trigger browser reload on chunk load failure', () => {
    const error = new Error('Failed to fetch dynamically imported module: ...');
    errorHandler.handleError(error);
    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('should not trigger browser reload on standard errors', () => {
    const error = new Error('Standard JavaScript runtime error');
    errorHandler.handleError(error);
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('should prevent reload loops if a second chunk load error occurs within 10 seconds', () => {
    const error = new Error('Failed to fetch dynamically imported module: ...');
    
    // First error triggers reload
    errorHandler.handleError(error);
    expect(mockReload).toHaveBeenCalledTimes(1);

    // Second error within 10 seconds should NOT trigger reload
    errorHandler.handleError(error);
    expect(mockReload).toHaveBeenCalledTimes(1); // Still 1
  });

  it('should not trigger browser reload if navigator.webdriver is true', () => {
    const originalWebdriver = Object.getOwnPropertyDescriptor(navigator, 'webdriver');
    Object.defineProperty(navigator, 'webdriver', {
      value: true,
      configurable: true
    });

    try {
      const error = new Error('Failed to fetch dynamically imported module: ...');
      errorHandler.handleError(error);
      expect(mockReload).not.toHaveBeenCalled();
    } finally {
      if (originalWebdriver) {
        Object.defineProperty(navigator, 'webdriver', originalWebdriver);
      } else {
        delete (navigator as any).webdriver;
      }
    }
  });

  it('should not trigger browser reload if window.location.hostname is 127.0.0.1', () => {
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      hostname: '127.0.0.1',
      reload: mockReload
    } as any;

    try {
      const error = new Error('Failed to fetch dynamically imported module: ...');
      errorHandler.handleError(error);
      expect(mockReload).not.toHaveBeenCalled();
    } finally {
      window.location = originalLocation;
    }
  });

  it('should not trigger browser reload if window.location.hostname ends with .localhost', () => {
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      hostname: 'app.localhost',
      reload: mockReload
    } as any;

    try {
      const error = new Error('Failed to fetch dynamically imported module: ...');
      errorHandler.handleError(error);
      expect(mockReload).not.toHaveBeenCalled();
    } finally {
      window.location = originalLocation;
    }
  });

  it('should not trigger browser reload if window.location.hostname is localhost', () => {
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      hostname: 'localhost',
      reload: mockReload
    } as any;

    try {
      const error = new Error('Failed to fetch dynamically imported module: ...');
      errorHandler.handleError(error);
      expect(mockReload).not.toHaveBeenCalled();
    } finally {
      window.location = originalLocation;
    }
  });
});
