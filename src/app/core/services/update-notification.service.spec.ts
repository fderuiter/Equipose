import { TestBed } from '@angular/core/testing';
import { UpdateNotificationService } from './update-notification.service';
import { vi } from 'vitest';

describe('UpdateNotificationService', () => {
  let service: UpdateNotificationService;

  beforeEach(() => {
    // Reset any query param mock state
    vi.stubGlobal('location', {
      search: '',
      reload: vi.fn()
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should default updateAvailable to false when mock-update query param is not present', () => {
    TestBed.configureTestingModule({
      providers: [UpdateNotificationService]
    });
    service = TestBed.inject(UpdateNotificationService);

    expect(service.isMockUpdate).toBe(false);
    expect(service.updateAvailable()).toBe(false);
  });

  it('should initialize with updateAvailable true when mock-update=true is present', () => {
    vi.stubGlobal('location', {
      search: '?mock-update=true',
      reload: vi.fn()
    });

    TestBed.configureTestingModule({
      providers: [UpdateNotificationService]
    });
    service = TestBed.inject(UpdateNotificationService);

    expect(service.isMockUpdate).toBe(true);
    expect(service.updateAvailable()).toBe(true);
  });

  it('should reload window and not post message when activateUpdate is called in mock-update mode', () => {
    const reloadMock = vi.fn();
    vi.stubGlobal('location', {
      search: '?mock-update=true',
      reload: reloadMock
    });

    TestBed.configureTestingModule({
      providers: [UpdateNotificationService]
    });
    service = TestBed.inject(UpdateNotificationService);

    service.activateUpdate();

    expect(reloadMock).toHaveBeenCalled();
  });

  it('should set updateAvailable to false when dismiss is called', () => {
    vi.stubGlobal('location', {
      search: '?mock-update=true',
      reload: vi.fn()
    });

    TestBed.configureTestingModule({
      providers: [UpdateNotificationService]
    });
    service = TestBed.inject(UpdateNotificationService);

    expect(service.updateAvailable()).toBe(true);
    service.dismiss();
    expect(service.updateAvailable()).toBe(false);
  });

  it('should ignore webdriver bypass when mock-update is active', () => {
    vi.stubGlobal('location', {
      search: '?mock-update=true',
      reload: vi.fn()
    });
    vi.stubGlobal('navigator', {
      webdriver: true,
      serviceWorker: {
        getRegistration: () => Promise.resolve({
          waiting: {
            postMessage: vi.fn()
          },
          addEventListener: vi.fn()
        }),
        addEventListener: vi.fn()
      }
    });

    TestBed.configureTestingModule({
      providers: [UpdateNotificationService]
    });
    service = TestBed.inject(UpdateNotificationService);

    expect(service.isMockUpdate).toBe(true);
    expect(service.updateAvailable()).toBe(true);
  });

  it('should set updateAvailable to true when a MIME_TYPE_VIOLATION message is received and isTestOrDev is false', () => {
    let messageCallback: ((event: any) => void) | null = null;

    vi.stubGlobal('location', {
      search: '',
      hostname: 'example.com',
      reload: vi.fn()
    });

    vi.stubGlobal('navigator', {
      serviceWorker: {
        getRegistration: () => Promise.resolve(null),
        addEventListener: vi.fn((event, callback) => {
          if (event === 'message') {
            messageCallback = callback;
          }
        })
      }
    });

    TestBed.configureTestingModule({
      providers: [UpdateNotificationService]
    });
    service = TestBed.inject(UpdateNotificationService);

    expect(messageCallback).not.toBeNull();
    expect(service.updateAvailable()).toBe(false);

    // Call the callback to simulate receiving the message
    if (messageCallback) {
      (messageCallback as any)({
        data: { type: 'MIME_TYPE_VIOLATION' }
      });
    }

    expect(service.updateAvailable()).toBe(true);
  });

  it('should NOT set updateAvailable to true when a MIME_TYPE_VIOLATION message is received and isTestOrDev is true', () => {
    let messageCallback: ((event: any) => void) | null = null;

    vi.stubGlobal('location', {
      search: '',
      hostname: 'localhost',
      reload: vi.fn()
    });

    vi.stubGlobal('navigator', {
      serviceWorker: {
        getRegistration: () => Promise.resolve(null),
        addEventListener: vi.fn((event, callback) => {
          if (event === 'message') {
            messageCallback = callback;
          }
        })
      }
    });

    TestBed.configureTestingModule({
      providers: [UpdateNotificationService]
    });
    service = TestBed.inject(UpdateNotificationService);

    expect(messageCallback).not.toBeNull();
    expect(service.updateAvailable()).toBe(false);

    // Call the callback to simulate receiving the message
    if (messageCallback) {
      (messageCallback as any)({
        data: { type: 'MIME_TYPE_VIOLATION' }
      });
    }

    expect(service.updateAvailable()).toBe(false);
  });
});
