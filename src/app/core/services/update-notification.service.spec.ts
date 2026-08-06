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

  describe('cleanupOrphanedCaches', () => {
    let scriptElements: HTMLScriptElement[] = [];
    let linkElements: HTMLLinkElement[] = [];

    beforeEach(() => {
      // Stub location to a non-localhost domain to allow cleanupOrphanedCaches to run
      vi.stubGlobal('location', {
        search: '',
        hostname: 'example.com',
        origin: 'https://example.com',
        reload: vi.fn()
      });

      // Stub navigator to bypass webdriver checks
      vi.stubGlobal('navigator', {
        webdriver: false,
        serviceWorker: {
          getRegistration: () => Promise.resolve(null),
          addEventListener: vi.fn()
        }
      });
    });

    afterEach(() => {
      scriptElements.forEach(s => s.remove());
      linkElements.forEach(l => l.remove());
      scriptElements = [];
      linkElements = [];
    });

    const addMockScript = (url: string) => {
      const script = document.createElement('script');
      script.src = url;
      document.body.appendChild(script);
      scriptElements.push(script);
    };

    const addMockStylesheet = (url: string) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      document.head.appendChild(link);
      linkElements.push(link);
    };

    it('should scan all app-cache-v keys and preserve the cache with the highest match score', async () => {
      // Mock fetch to return latest cache as app-cache-v3
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("const CACHE_NAME = 'app-cache-v3';")
      }));

      // Add mock resources on the origin
      const origin = 'https://example.com';
      const jsUrl1 = `${origin}/main.js`;
      const jsUrl2 = `${origin}/vendor.js`;
      const cssUrl = `${origin}/styles.css`;

      addMockScript(jsUrl1);
      addMockScript(jsUrl2);
      addMockStylesheet(cssUrl);

      // We have cache keys: app-cache-v1, app-cache-v2, app-cache-v3, other-cache
      const cacheKeys = ['app-cache-v1', 'app-cache-v2', 'app-cache-v3', 'other-cache'];
      const deletedCaches: string[] = [];

      // Setup cache contents
      // app-cache-v1 contains only jsUrl1 (score = 1)
      // app-cache-v2 contains jsUrl1, jsUrl2, cssUrl (score = 3)
      // app-cache-v3 contains none of them (score = 0)
      const mockCaches: Record<string, any> = {
        'app-cache-v1': {
          match: vi.fn().mockImplementation(async (url: string) => {
            return url === jsUrl1 ? {} : null;
          })
        },
        'app-cache-v2': {
          match: vi.fn().mockImplementation(async (url: string) => {
            return [jsUrl1, jsUrl2, cssUrl].includes(url) ? {} : null;
          })
        },
        'app-cache-v3': {
          match: vi.fn().mockResolvedValue(null)
        },
        'other-cache': {
          match: vi.fn().mockResolvedValue(null)
        }
      };

      const cachesMock = {
        keys: vi.fn().mockResolvedValue(cacheKeys),
        open: vi.fn().mockImplementation(async (key: string) => mockCaches[key]),
        delete: vi.fn().mockImplementation(async (key: string) => {
          deletedCaches.push(key);
          return true;
        })
      };
      vi.stubGlobal('caches', cachesMock);

      TestBed.configureTestingModule({
        providers: [UpdateNotificationService]
      });
      service = TestBed.inject(UpdateNotificationService);

      // Directly invoke the private cleanup method and await its completion
      await (service as any).cleanupOrphanedCaches();

      // app-cache-v2 should be the active cache (highest score: 3 vs 1 vs 0)
      // app-cache-v3 is the latest cache
      // app-cache-v1 is obsolete and should be deleted
      // other-cache is not deleted because it doesn't start with 'app-cache-v'
      expect(deletedCaches).toContain('app-cache-v1');
      expect(deletedCaches).not.toContain('app-cache-v2');
      expect(deletedCaches).not.toContain('app-cache-v3');
      expect(deletedCaches).not.toContain('other-cache');
    });

    it('should break ties in match scores by prioritizing the newest cache version in descending lexicographical order', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("const CACHE_NAME = 'app-cache-v3';")
      }));

      const origin = 'https://example.com';
      const jsUrl = `${origin}/common.js`;
      addMockScript(jsUrl);

      // app-cache-v1 and app-cache-v2 both match the loaded resource (tie score = 1)
      const cacheKeys = ['app-cache-v1', 'app-cache-v2', 'app-cache-v3'];
      const deletedCaches: string[] = [];

      const mockCaches: Record<string, any> = {
        'app-cache-v1': {
          match: vi.fn().mockImplementation(async (url: string) => {
            return url === jsUrl ? {} : null;
          })
        },
        'app-cache-v2': {
          match: vi.fn().mockImplementation(async (url: string) => {
            return url === jsUrl ? {} : null;
          })
        },
        'app-cache-v3': {
          match: vi.fn().mockResolvedValue(null)
        }
      };

      const cachesMock = {
        keys: vi.fn().mockResolvedValue(cacheKeys),
        open: vi.fn().mockImplementation(async (key: string) => mockCaches[key]),
        delete: vi.fn().mockImplementation(async (key: string) => {
          deletedCaches.push(key);
          return true;
        })
      };
      vi.stubGlobal('caches', cachesMock);

      TestBed.configureTestingModule({
        providers: [UpdateNotificationService]
      });
      service = TestBed.inject(UpdateNotificationService);

      await (service as any).cleanupOrphanedCaches();

      // Tie between v1 and v2 is broken: v2 is lexicographically higher than v1 and is preserved
      // v3 is latest, so also preserved
      // v1 is deleted
      expect(deletedCaches).toContain('app-cache-v1');
      expect(deletedCaches).not.toContain('app-cache-v2');
      expect(deletedCaches).not.toContain('app-cache-v3');
    });

    it('should scan all cache keys starting with app-cache-v completely instead of terminating at the first match', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("const CACHE_NAME = 'app-cache-v3';")
      }));

      const origin = 'https://example.com';
      const jsUrl = `${origin}/main.js`;
      addMockScript(jsUrl);

      const cacheKeys = ['app-cache-v1', 'app-cache-v2', 'app-cache-v3'];

      const mockCaches: Record<string, any> = {
        'app-cache-v1': {
          match: vi.fn().mockResolvedValue({}) // Matches first, but should keep scanning
        },
        'app-cache-v2': {
          match: vi.fn().mockResolvedValue({})
        },
        'app-cache-v3': {
          match: vi.fn().mockResolvedValue(null)
        }
      };

      const cachesMock = {
        keys: vi.fn().mockResolvedValue(cacheKeys),
        open: vi.fn().mockImplementation(async (key: string) => mockCaches[key]),
        delete: vi.fn().mockResolvedValue(true)
      };
      vi.stubGlobal('caches', cachesMock);

      TestBed.configureTestingModule({
        providers: [UpdateNotificationService]
      });
      service = TestBed.inject(UpdateNotificationService);

      await (service as any).cleanupOrphanedCaches();

      // Verify that all caches starting with 'app-cache-v' were opened and scanned
      expect(cachesMock.open).toHaveBeenCalledWith('app-cache-v1');
      expect(cachesMock.open).toHaveBeenCalledWith('app-cache-v2');
      expect(cachesMock.open).toHaveBeenCalledWith('app-cache-v3');

      // Verify each cache's match method was called
      expect(mockCaches['app-cache-v1'].match).toHaveBeenCalled();
      expect(mockCaches['app-cache-v2'].match).toHaveBeenCalled();
      expect(mockCaches['app-cache-v3'].match).toHaveBeenCalled();
    });

    it('should tolerate errors during cache opening or matching without crashing', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("const CACHE_NAME = 'app-cache-v3';")
      }));

      const origin = 'https://example.com';
      const jsUrl = `${origin}/main.js`;
      addMockScript(jsUrl);

      const cacheKeys = ['app-cache-v1', 'app-cache-v2', 'app-cache-v3'];
      const deletedCaches: string[] = [];

      const mockCaches: Record<string, any> = {
        'app-cache-v1': {
          match: vi.fn().mockRejectedValue(new Error('Cache read error')) // This throws!
        },
        'app-cache-v2': {
          match: vi.fn().mockResolvedValue({}) // This matches successfully
        },
        'app-cache-v3': {
          match: vi.fn().mockResolvedValue(null)
        }
      };

      const cachesMock = {
        keys: vi.fn().mockResolvedValue(cacheKeys),
        open: vi.fn().mockImplementation(async (key: string) => {
          if (key === 'app-cache-v1') {
            throw new Error('Cache open error'); // This also throws!
          }
          return mockCaches[key];
        }),
        delete: vi.fn().mockImplementation(async (key: string) => {
          deletedCaches.push(key);
          return true;
        })
      };
      vi.stubGlobal('caches', cachesMock);

      TestBed.configureTestingModule({
        providers: [UpdateNotificationService]
      });
      service = TestBed.inject(UpdateNotificationService);

      // The call must resolve successfully and not crash
      await expect((service as any).cleanupOrphanedCaches()).resolves.not.toThrow();

      // v2 should have been recognized as the active cache since v1 threw errors (score 0/error)
      // v3 is latest.
      // So v1 should be deleted.
      expect(deletedCaches).toContain('app-cache-v1');
      expect(deletedCaches).not.toContain('app-cache-v2');
      expect(deletedCaches).not.toContain('app-cache-v3');
    });

    it('should exit cleanly if sw.js fetch fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false
      }));

      const cachesMock = {
        keys: vi.fn()
      };
      vi.stubGlobal('caches', cachesMock);

      TestBed.configureTestingModule({
        providers: [UpdateNotificationService]
      });
      service = TestBed.inject(UpdateNotificationService);

      await expect((service as any).cleanupOrphanedCaches()).resolves.not.toThrow();
      expect(cachesMock.keys).not.toHaveBeenCalled();
    });
  });
});
