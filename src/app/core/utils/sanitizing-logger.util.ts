const SENSITIVE_KEY_PATTERNS = [
  'seed',
  'block',
  'strata',
  'stratum',
  'override'
];

function isSensitiveKey(key: string | number | symbol): boolean {
  const keyStr = String(key).toLowerCase();
  return SENSITIVE_KEY_PATTERNS.some(pattern => keyStr.includes(pattern));
}

/**
 * Deep-copies the input payload and replaces any sensitive clinical trial parameters
 * with "[REDACTED]". Circular references and special object types are handled safely.
 */
export function sanitize<T>(val: T, visited = new WeakMap<any, any>()): T {
  // 1. Handle primitives, functions, null, undefined
  if (val === null || typeof val !== 'object') {
    return val;
  }

  // 2. Prevent circular reference infinite loops
  if (visited.has(val)) {
    return visited.get(val);
  }

  // 3. Handle Date objects
  if (val instanceof Date) {
    const clonedDate = new Date(val.getTime());
    visited.set(val, clonedDate);
    return clonedDate as any;
  }

  // 4. Handle RegExp objects
  if (val instanceof RegExp) {
    const clonedRegExp = new RegExp(val.source, val.flags);
    visited.set(val, clonedRegExp);
    return clonedRegExp as any;
  }

  // 5. Handle Set objects
  if (val instanceof Set) {
    const clonedSet = new Set();
    visited.set(val, clonedSet);
    for (const item of val) {
      clonedSet.add(sanitize(item, visited));
    }
    return clonedSet as any;
  }

  // 6. Handle Map objects
  if (val instanceof Map) {
    const clonedMap = new Map();
    visited.set(val, clonedMap);
    for (const [k, v] of val.entries()) {
      const sanitizedKey = sanitize(k, visited);
      const isSensitive = typeof k === 'string' && isSensitiveKey(k);
      const sanitizedVal = isSensitive ? '[REDACTED]' : sanitize(v, visited);
      clonedMap.set(sanitizedKey, sanitizedVal);
    }
    return clonedMap as any;
  }

  // 7. Handle Array objects
  if (Array.isArray(val)) {
    const clonedArr: any[] = [];
    visited.set(val, clonedArr);
    for (const item of val) {
      clonedArr.push(sanitize(item, visited));
    }
    return clonedArr as any;
  }

  // 8. Handle Error objects (including subclasses like CodeGenerationError)
  if (val instanceof Error) {
    const clonedError = Object.create(Object.getPrototypeOf(val));
    
    // Explicitly copy standard error properties (usually non-enumerable)
    clonedError.message = val.message;
    clonedError.name = val.name;
    clonedError.stack = val.stack;

    visited.set(val, clonedError);

    // Copy and sanitize other properties (enumerable or custom properties)
    const keys = Reflect.ownKeys(val);
    for (const key of keys) {
      if (key === 'message' || key === 'name' || key === 'stack') {
        continue;
      }
      if (isSensitiveKey(key)) {
        clonedError[key] = '[REDACTED]';
      } else {
        clonedError[key] = sanitize((val as any)[key], visited);
      }
    }
    return clonedError;
  }

  // 9. Handle generic Objects/class instances
  const clonedObj = Object.create(Object.getPrototypeOf(val));
  visited.set(val, clonedObj);

  const keys = Reflect.ownKeys(val);
  for (const key of keys) {
    if (isSensitiveKey(key)) {
      clonedObj[key] = '[REDACTED]';
    } else {
      clonedObj[key] = sanitize((val as any)[key], visited);
    }
  }

  return clonedObj;
}

/**
 * Custom JSON.stringify replacer that handles circular references and serializes Error properties.
 */
export function safeJsonStringify(val: any): string {
  const seen = new WeakSet();
  return JSON.stringify(val, (key, value) => {
    if (value instanceof Error) {
      const errorObj: any = {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
      for (const k of Reflect.ownKeys(value)) {
        if (typeof k === 'string' && !['name', 'message', 'stack'].includes(k)) {
          errorObj[k] = (value as any)[k];
        }
      }
      return errorObj;
    }
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  }, 2);
}

/**
 * Centralized sanitizing logger utility to ensure diagnostic outputs do not expose
 * raw randomization configurations or sensitive clinical trial properties.
 */
export class SanitizingLogger {
  static log(...args: any[]): void {
    const sanitizedArgs = args.map(arg => sanitize(arg));
    console.log(...sanitizedArgs);
  }

  static warn(...args: any[]): void {
    const sanitizedArgs = args.map(arg => sanitize(arg));
    console.warn(...sanitizedArgs);
  }

  static error(...args: any[]): void {
    const sanitizedArgs = args.map(arg => sanitize(arg));
    console.error(...sanitizedArgs);
  }

  static info(...args: any[]): void {
    const sanitizedArgs = args.map(arg => sanitize(arg));
    console.info(...sanitizedArgs);
  }

  /**
   * Generates a copyable, redacted JSON diagnostics payload replacing sensitive values with explicit redaction markers.
   */
  static copyRedactedPayload(payload: any): string {
    const sanitized = sanitize(payload);
    return safeJsonStringify(sanitized);
  }
}
