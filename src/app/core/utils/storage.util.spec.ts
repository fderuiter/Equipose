import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InMemoryStorage, SafeStorage, safeLocalStorage, safeSessionStorage } from './storage.util';

describe('InMemoryStorage', () => {
  it('should support item get, set, remove, clear, length and key', () => {
    const storage = new InMemoryStorage();
    expect(storage.length).toBe(0);
    expect(storage.getItem('key1')).toBeNull();

    storage.setItem('key1', 'val1');
    expect(storage.length).toBe(1);
    expect(storage.getItem('key1')).toBe('val1');
    expect(storage.key(0)).toBe('key1');

    storage.setItem('key2', 'val2');
    expect(storage.length).toBe(2);

    storage.removeItem('key1');
    expect(storage.length).toBe(1);
    expect(storage.getItem('key1')).toBeNull();

    storage.clear();
    expect(storage.length).toBe(0);
    expect(storage.key(0)).toBeNull();
  });
});

describe('SafeStorage', () => {
  let originalLocalStorage: Storage;
  let originalSessionStorage: Storage;

  beforeEach(() => {
    originalLocalStorage = window.localStorage;
    originalSessionStorage = window.sessionStorage;
  });

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: originalSessionStorage,
      writable: true,
      configurable: true,
    });
  });

  it('should use native localStorage when fully functional', () => {
    const safe = new SafeStorage('localStorage');
    safe.setItem('test_native', '123');
    expect(window.localStorage.getItem('test_native')).toBe('123');
    expect(safe.getItem('test_native')).toBe('123');
    safe.removeItem('test_native');
    expect(safe.getItem('test_native')).toBeNull();
  });

  it('should fall back to InMemoryStorage when localStorage is blocked or throws', () => {
    // Mock localStorage to throw on any setItem
    const blockedStorage = {
      length: 0,
      clear: () => { throw new Error('Blocked'); },
      getItem: () => { throw new Error('Blocked'); },
      key: () => { throw new Error('Blocked'); },
      removeItem: () => { throw new Error('Blocked'); },
      setItem: () => { throw new Error('Blocked'); },
    } as unknown as Storage;

    Object.defineProperty(window, 'localStorage', {
      value: blockedStorage,
      writable: true,
      configurable: true,
    });

    const safe = new SafeStorage('localStorage');
    
    // Should not throw!
    expect(() => safe.setItem('test_fallback', 'abc')).not.toThrow();
    expect(safe.getItem('test_fallback')).toBe('abc');
    expect(safe.length).toBe(1);
    expect(safe.key(0)).toBe('test_fallback');

    safe.removeItem('test_fallback');
    expect(safe.length).toBe(0);

    safe.setItem('key_to_clear', 'xyz');
    expect(safe.length).toBe(1);
    safe.clear();
    expect(safe.length).toBe(0);
  });
});

describe('Exported Safe Storages', () => {
  it('should be instantiated and defined', () => {
    expect(safeLocalStorage).toBeDefined();
    expect(safeSessionStorage).toBeDefined();
  });
});
