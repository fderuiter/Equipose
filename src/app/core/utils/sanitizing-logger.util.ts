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
  try {
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
      // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
      const clonedRegExp = new RegExp(val.source, val.flags);
      visited.set(val, clonedRegExp);
      return clonedRegExp as any;
    }

    // 5. Handle Set objects
    if (val instanceof Set) {
      const clonedSet = new Set();
      visited.set(val, clonedSet);
      for (const item of val) {
        try {
          clonedSet.add(sanitize(item, visited));
        } catch {
          clonedSet.add('[Error accessing property]');
        }
      }
      return clonedSet as any;
    }

    // 6. Handle Map objects
    if (val instanceof Map) {
      const clonedMap = new Map();
      visited.set(val, clonedMap);
      for (const [k, v] of val.entries()) {
        try {
          const sanitizedKey = sanitize(k, visited);
          const isSensitive = typeof k === 'string' && isSensitiveKey(k);
          const sanitizedVal = isSensitive ? '[REDACTED]' : sanitize(v, visited);
          clonedMap.set(sanitizedKey, sanitizedVal);
        } catch {
          try {
            clonedMap.set('[Error accessing key]', '[Error accessing property]');
          } catch {}
        }
      }
      return clonedMap as any;
    }

    // 7. Handle Array objects
    if (Array.isArray(val)) {
      const clonedArr: any[] = [];
      visited.set(val, clonedArr);
      for (const item of val) {
        try {
          clonedArr.push(sanitize(item, visited));
        } catch {
          clonedArr.push('[Error accessing property]');
        }
      }
      return clonedArr as any;
    }

    // 8. Handle Error objects (including subclasses like CodeGenerationError)
    if (val instanceof Error) {
      const clonedError = Object.create(Object.getPrototypeOf(val));
      
      // Explicitly copy standard error properties (usually non-enumerable)
      try {
        clonedError.message = val.message;
      } catch {
        clonedError.message = '[Error accessing message]';
      }
      try {
        clonedError.name = val.name;
      } catch {
        clonedError.name = '[Error accessing name]';
      }
      try {
        clonedError.stack = val.stack;
      } catch {
        clonedError.stack = '[Error accessing stack]';
      }

      visited.set(val, clonedError);

      // Copy and sanitize other properties (enumerable or custom properties)
      let keys: (string | symbol)[] = [];
      try {
        keys = Reflect.ownKeys(val);
      } catch {
        // Fallback if ownKeys throws
      }
      for (const key of keys) {
        if (key === 'message' || key === 'name' || key === 'stack') {
          continue;
        }
        try {
          if (isSensitiveKey(key)) {
            clonedError[key] = '[REDACTED]';
          } else {
            clonedError[key] = sanitize((val as any)[key], visited);
          }
        } catch {
          clonedError[key] = '[Error accessing property]';
        }
      }
      return clonedError;
    }

    // 9. Handle generic Objects/class instances
    const clonedObj = Object.create(Object.getPrototypeOf(val));
    visited.set(val, clonedObj);

    let keys: (string | symbol)[] = [];
    try {
      keys = Reflect.ownKeys(val);
    } catch {
      // Fallback if ownKeys throws
    }
    for (const key of keys) {
      try {
        if (isSensitiveKey(key)) {
          clonedObj[key] = '[REDACTED]';
        } else {
          clonedObj[key] = sanitize((val as any)[key], visited);
        }
      } catch {
        clonedObj[key] = '[Error accessing property]';
      }
    }

    return clonedObj;
  } catch {
    // Top-level fallback inside sanitize
    return '[Error sanitizing object]' as any;
  }
}

/**
 * Custom JSON.stringify replacer that handles circular references and serializes Error properties.
 */
export function safeJsonStringify(val: any): string {
  try {
    const seen = new WeakSet();
    return JSON.stringify(val, (_key, value) => {
      try {
        if (value instanceof Error) {
          const errorObj: any = {
            name: value.name,
            message: value.message,
            stack: value.stack,
          };
          let keys: (string | symbol)[] = [];
          try {
            keys = Reflect.ownKeys(value);
          } catch {
            // ignore
          }
          for (const k of keys) {
            if (typeof k === 'string' && !['name', 'message', 'stack'].includes(k)) {
              try {
                if (isSensitiveKey(k)) {
                  errorObj[k] = '[REDACTED]';
                } else {
                  errorObj[k] = (value as any)[k];
                }
              } catch {
                errorObj[k] = '[Error accessing property]';
              }
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
      } catch {
        return '[Error accessing property]';
      }
    }, 2);
  } catch {
    return '[Serialization failed]';
  }
}

/**
 * Centralized sanitizing logger utility to ensure diagnostic outputs do not expose
 * raw randomization configurations or sensitive clinical trial properties.
 */
export class SanitizingLogger {
  static log(...args: any[]): void {
    try {
      const sanitizedArgs = args.map(arg => {
        try {
          return sanitize(arg);
        } catch {
          return '[Sanitization failed]';
        }
      });
      console.log(...sanitizedArgs);
    } catch {
      console.log(...args);
    }
  }

  static warn(...args: any[]): void {
    try {
      const sanitizedArgs = args.map(arg => {
        try {
          return sanitize(arg);
        } catch {
          return '[Sanitization failed]';
        }
      });
      console.warn(...sanitizedArgs);
    } catch {
      console.warn(...args);
    }
  }

  static error(...args: any[]): void {
    try {
      const sanitizedArgs = args.map(arg => {
        try {
          return sanitize(arg);
        } catch {
          return '[Sanitization failed]';
        }
      });
      console.error(...sanitizedArgs);
    } catch {
      console.error(...args);
    }
  }

  static info(...args: any[]): void {
    try {
      const sanitizedArgs = args.map(arg => {
        try {
          return sanitize(arg);
        } catch {
          return '[Sanitization failed]';
        }
      });
      console.info(...sanitizedArgs);
    } catch {
      console.info(...args);
    }
  }

  /**
   * Generates a copyable, redacted JSON diagnostics payload replacing sensitive values with explicit redaction markers.
   */
  static copyRedactedPayload(payload: any): string {
    try {
      const sanitized = sanitize(payload);
      return safeJsonStringify(sanitized);
    } catch {
      try {
        return safeJsonStringify(payload);
      } catch {
        return '{"error": "Failed to generate diagnostics payload"}';
      }
    }
  }
}
