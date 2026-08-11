import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SanitizingLogger, sanitize, safeJsonStringify } from './sanitizing-logger.util';

describe('SanitizingLogger & Utilities', () => {
  describe('sanitize', () => {
    it('should pass through primitives, null, and undefined unmodified', () => {
      expect(sanitize(null)).toBeNull();
      expect(sanitize(undefined)).toBeUndefined();
      expect(sanitize(42)).toBe(42);
      expect(sanitize('hello')).toBe('hello');
      expect(sanitize(true)).toBe(true);
    });

    it('should clone Date and RegExp objects correctly', () => {
      const originalDate = new Date('2026-08-06T00:00:00.000Z');
      const clonedDate = sanitize(originalDate);
      expect(clonedDate).toBeInstanceOf(Date);
      expect(clonedDate.getTime()).toBe(originalDate.getTime());
      expect(clonedDate).not.toBe(originalDate);

      const originalRegExp = /abc/gi;
      const clonedRegExp = sanitize(originalRegExp);
      expect(clonedRegExp).toBeInstanceOf(RegExp);
      expect(clonedRegExp.source).toBe('abc');
      expect(clonedRegExp.flags).toBe('gi');
      expect(clonedRegExp).not.toBe(originalRegExp);
    });

    it('should clone and sanitize arrays', () => {
      const arr = [
        { seed: 'secret-seed', normalKey: 'safe' },
        'plain-string',
        { nested: { blockSizes: [4, 6] } }
      ];
      const sanitized = sanitize(arr);
      expect(sanitized).toEqual([
        { seed: '[REDACTED]', normalKey: 'safe' },
        'plain-string',
        { nested: { blockSizes: '[REDACTED]' } }
      ]);
      expect(sanitized).not.toBe(arr);
    });

    it('should clone and sanitize Set and Map objects', () => {
      const set = new Set([{ seed: '123' }, 'safe']);
      const sanitizedSet = sanitize(set);
      expect(sanitizedSet).toBeInstanceOf(Set);
      const items = Array.from(sanitizedSet);
      expect(items[0]).toEqual({ seed: '[REDACTED]' });
      expect(items[1]).toBe('safe');

      const map = new Map<any, any>([
        ['seed', '12345'],
        ['normalKey', { blockStructure: 'some-structure' }]
      ]);
      const sanitizedMap = sanitize(map);
      expect(sanitizedMap).toBeInstanceOf(Map);
      expect(sanitizedMap.get('seed')).toBe('[REDACTED]');
      expect(sanitizedMap.get('normalKey')).toEqual({ blockStructure: '[REDACTED]' });
    });

    it('should handle circular references without infinite loops', () => {
      const obj: any = { name: 'circular-test' };
      obj.self = obj;
      obj.nested = { parent: obj };

      const sanitized = sanitize(obj);
      expect(sanitized.name).toBe('circular-test');
      expect(sanitized.self).toBe(sanitized);
      expect(sanitized.nested.parent).toBe(sanitized);
    });

    it('should redact specified sensitive keys case-insensitively and keep others intact', () => {
      const payload = {
        seed: '12345',
        SEED_UPPER: '54321',
        blockConfig: { size: 4 },
        strata: ['age', 'gender'],
        stratumCap: 50,
        blockOverride: true,
        nonSensitive: 'keep-me',
        nested: {
          randomSeed: '9999',
          overrides: [1, 2, 3]
        }
      };

      const sanitized = sanitize(payload);
      expect(sanitized).toEqual({
        seed: '[REDACTED]',
        SEED_UPPER: '[REDACTED]',
        blockConfig: '[REDACTED]',
        strata: '[REDACTED]',
        stratumCap: '[REDACTED]',
        blockOverride: '[REDACTED]',
        nonSensitive: 'keep-me',
        nested: {
          randomSeed: '[REDACTED]',
          overrides: '[REDACTED]'
        }
      });
    });

    it('should preserve Error prototypes, messages, names, and stacks, but sanitize custom attributes', () => {
      class CustomError extends Error {
        context: any;
        constructor(message: string, context: any) {
          super(message);
          this.name = 'CustomError';
          this.context = context;
        }
      }

      const originalError = new CustomError('Something went wrong!', {
        seed: 'error-seed',
        studyName: 'My Study'
      });

      const sanitizedError = sanitize(originalError);
      expect(sanitizedError).toBeInstanceOf(CustomError);
      expect(sanitizedError).toBeInstanceOf(Error);
      expect(sanitizedError.name).toBe('CustomError');
      expect(sanitizedError.message).toBe('Something went wrong!');
      expect(sanitizedError.stack).toBe(originalError.stack);
      expect(sanitizedError.context).toEqual({
        seed: '[REDACTED]',
        studyName: 'My Study'
      });
    });
  });

  describe('safeJsonStringify', () => {
    it('should stringify primitive structures normally', () => {
      const obj = { a: 1, b: 'two' };
      expect(JSON.parse(safeJsonStringify(obj))).toEqual(obj);
    });

    it('should replace circular references with [Circular]', () => {
      const obj: any = { a: 1 };
      obj.self = obj;
      const jsonStr = safeJsonStringify(obj);
      expect(jsonStr).toContain('"[Circular]"');
    });

    it('should serialize Error properties like name, message, and stack', () => {
      const err = new Error('Test error');
      const jsonStr = safeJsonStringify(err);
      const parsed = JSON.parse(jsonStr);
      expect(parsed.name).toBe('Error');
      expect(parsed.message).toBe('Test error');
      expect(parsed.stack).toBeDefined();
    });
  });

  describe('SanitizingLogger console routing', () => {
    let logSpy: any;
    let warnSpy: any;
    let errorSpy: any;
    let infoSpy: any;

    beforeEach(() => {
      logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should route log messages through sanitizer', () => {
      SanitizingLogger.log('Message:', { seed: '123' });
      expect(logSpy).toHaveBeenCalledWith('Message:', { seed: '[REDACTED]' });
    });

    it('should route warn messages through sanitizer', () => {
      SanitizingLogger.warn('Warning:', { blockConfig: 'abc' });
      expect(warnSpy).toHaveBeenCalledWith('Warning:', { blockConfig: '[REDACTED]' });
    });

    it('should route error messages through sanitizer', () => {
      SanitizingLogger.error('Error:', { strata: 'xyz' });
      expect(errorSpy).toHaveBeenCalledWith('Error:', { strata: '[REDACTED]' });
    });

    it('should route info messages through sanitizer', () => {
      SanitizingLogger.info('Info:', { overrides: [] });
      expect(infoSpy).toHaveBeenCalledWith('Info:', { overrides: '[REDACTED]' });
    });

    it('should support copying redacted clipboard payloads', () => {
      const payload = {
        name: 'Failure',
        context: { seed: 'secret', blockSizes: [2, 4], ok: true }
      };
      const jsonStr = SanitizingLogger.copyRedactedPayload(payload);
      const parsed = JSON.parse(jsonStr);
      expect(parsed).toEqual({
        name: 'Failure',
        context: { seed: '[REDACTED]', blockSizes: '[REDACTED]', ok: true }
      });
    });

    it('should successfully sanitize objects with throwing getters without crashing', () => {
      const objWithThrowingGetter = {
        name: 'Safe Object',
        get dangerousProp() {
          throw new Error('Getter failure!');
        },
        seed: 'trial-seed'
      };
      
      const sanitized = sanitize(objWithThrowingGetter);
      expect(sanitized.name).toBe('Safe Object');
      expect(sanitized.dangerousProp).toBe('[Error accessing property]');
      expect(sanitized.seed).toBe('[REDACTED]');
    });

    it('should successfully sanitize errors with throwing getters without crashing', () => {
      const err = new Error('Test Error');
      Object.defineProperty(err, 'dangerousProp', {
        get() {
          throw new Error('Getter failure!');
        },
        enumerable: true,
        configurable: true
      });
      (err as any).seed = 'sensitive-seed';

      const sanitized = sanitize(err);
      expect(sanitized.name).toBe('Error');
      expect(sanitized.message).toBe('Test Error');
      expect(sanitized.dangerousProp).toBe('[Error accessing property]');
      expect(sanitized.seed).toBe('[REDACTED]');
    });

    it('should successfully sanitize objects with proxy traps that throw without crashing', () => {
      const target = {
        normal: 'value',
        seed: 'proxied-seed'
      };
      const proxy = new Proxy(target, {
        get(t, prop) {
          if (prop === 'dangerous') {
            throw new Error('Proxy trap failed!');
          }
          return (t as any)[prop];
        },
        ownKeys(_t) {
          return ['normal', 'seed', 'dangerous'];
        },
        getOwnPropertyDescriptor(_t, _prop) {
          return { enumerable: true, configurable: true };
        }
      });

      const sanitized = sanitize(proxy);
      expect(sanitized.normal).toBe('value');
      expect(sanitized.seed).toBe('[REDACTED]');
      expect(sanitized.dangerous).toBe('[Error accessing property]');
    });

    it('should handle safeJsonStringify with throwing properties safely', () => {
      const err = new Error('JSON stringify test error');
      Object.defineProperty(err, 'throwingKey', {
        get() { throw new Error('trap!'); },
        enumerable: true
      });
      const jsonStr = safeJsonStringify(err);
      const parsed = JSON.parse(jsonStr);
      expect(parsed.name).toBe('Error');
      expect(parsed.message).toBe('JSON stringify test error');
      expect(parsed.throwingKey).toBe('[Error accessing property]');
    });
  });
});
