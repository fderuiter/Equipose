import { GeneratedSchema, RandomizationConfig, RandomizationResult } from '../../core/models/randomization.model';

/**
 * Recursively sort the keys of a plain object alphabetically so that JSON
 * serialisation is always deterministic regardless of property-insertion order.
 */
function sortKeysDeep(value: unknown): unknown {
  if (typeof value === 'number') {
    return value.toFixed(10);
  }
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as object).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * Produce a deterministic JSON string for the fields of a
 * {@link RandomizationResult} that must be covered by the audit hash.
 *
 * The `auditHash` field itself is excluded so that the hash can be computed
 * before it is written back into the result object.
 */
export function buildHashPayload(
  config: RandomizationConfig,
  schema: GeneratedSchema[],
  generatedAt: string
): string {
  const payload = {
    config,
    generatedAt,
    schema
  };
  return JSON.stringify(sortKeysDeep(payload));
}

/**
 * Compute a SHA-256 hex digest of the given string using the native
 * Web Crypto API (`crypto.subtle`).  This function is safe to call
 * from both the browser main thread and inside Web Workers.
 *
 * @param data - The UTF-8 string to hash.
 * @returns A 64-character lowercase hexadecimal string.
 */
export async function sha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Pure JavaScript synchronous SHA-256 implementation.
 */
export function syncSha256(ascii: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  const words: number[] = [];
  const asciiLength = ascii.length * 8;
  
  for (let i = 0; i < ascii.length * 8; i += 8) {
    words[i >> 5] |= (ascii.charCodeAt(i / 8) & 255) << (24 - (i % 32));
  }

  // Padding
  words[asciiLength >> 5] |= 128 << (24 - (asciiLength % 32));
  words[(((asciiLength + 64) >>> 9) << 4) + 15] = asciiLength;

  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const w: number[] = new Array(64);

  for (let i = 0; i < words.length; i += 16) {
    let a = hash[0];
    let b = hash[1];
    let c = hash[2];
    let d = hash[3];
    let e = hash[4];
    let f = hash[5];
    let g = hash[6];
    let h = hash[7];

    for (let j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j] || 0;
      } else {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }

      const ch = (e & f) ^ (~e & g);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const temp1 = (h + s1 + ch + k[j] + w[j]) | 0;
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  return hash
    .map(word => {
      const hex = (word >>> 0).toString(16);
      return '00000000'.substring(hex.length) + hex;
    })
    .join('');
}

/**
 * Convenience function: compute the audit hash for a freshly generated
 * {@link RandomizationResult} (before `auditHash` has been written into it).
 */
export async function computeAuditHash(result: RandomizationResult): Promise<string> {
  const payload = buildHashPayload(
    result.metadata.config,
    result.schema,
    result.metadata.generatedAt
  );
  return sha256Hex(payload);
}
