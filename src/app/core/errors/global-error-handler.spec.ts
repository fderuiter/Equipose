import { GlobalErrorHandler } from './global-error-handler';
import { TestBed } from '@angular/core/testing';
import { UpdateNotificationService } from '../services/update-notification.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('GlobalErrorHandler', () => {
  let errorHandler: GlobalErrorHandler;
  let updateServiceMock: any;
  
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
});
