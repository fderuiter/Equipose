export class InMemoryStorage implements Storage {
  private store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  clear(): void {
    this.store = {};
  }

  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
}

export class SafeStorage implements Storage {
  private readonly fallback = new InMemoryStorage();
  private readonly storageType: 'localStorage' | 'sessionStorage';

  constructor(storageType: 'localStorage' | 'sessionStorage') {
    this.storageType = storageType;
  }

  private isFunctional(): boolean {
    try {
      if (typeof window === 'undefined') {
        return false;
      }
      const storage = window[this.storageType];
      if (!storage) {
        return false;
      }
      const testKey = '__storage_test_probe__';
      storage.setItem(testKey, 'test_val');
      const val = storage.getItem(testKey);
      storage.removeItem(testKey);
      return val === 'test_val';
    } catch {
      return false;
    }
  }

  get length(): number {
    if (this.isFunctional()) {
      try {
        return window[this.storageType].length;
      } catch {
        return this.fallback.length;
      }
    }
    return this.fallback.length;
  }

  clear(): void {
    if (this.isFunctional()) {
      try {
        window[this.storageType].clear();
        return;
      } catch {
        // fall through
      }
    }
    this.fallback.clear();
  }

  getItem(key: string): string | null {
    if (this.isFunctional()) {
      try {
        return window[this.storageType].getItem(key);
      } catch {
        return this.fallback.getItem(key);
      }
    }
    return this.fallback.getItem(key);
  }

  key(index: number): string | null {
    if (this.isFunctional()) {
      try {
        return window[this.storageType].key(index);
      } catch {
        return this.fallback.key(index);
      }
    }
    return this.fallback.key(index);
  }

  removeItem(key: string): void {
    if (this.isFunctional()) {
      try {
        window[this.storageType].removeItem(key);
        return;
      } catch {
        // fall through
      }
    }
    this.fallback.removeItem(key);
  }

  setItem(key: string, value: string): void {
    if (this.isFunctional()) {
      try {
        window[this.storageType].setItem(key, value);
        return;
      } catch {
        // fall through
      }
    }
    this.fallback.setItem(key, value);
  }
}

export const safeLocalStorage = new SafeStorage('localStorage');
export const safeSessionStorage = new SafeStorage('sessionStorage');
