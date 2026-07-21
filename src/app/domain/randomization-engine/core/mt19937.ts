/* eslint-disable @typescript-eslint/no-deprecated */
/**
 * @deprecated Use Web Crypto API (`crypto.getRandomValues`) for random number generation and `sha256Hex` from `crypto-hash.ts` for hashing.
 */
class HashPRNG {
  private i = 0;
  private j = 0;
  private S: number[] = [];

  constructor(seed: string) {
    let key: number[] = [];
    const mask = 255;
    const width = 256;

    let smear = 0;
    let j_idx = 0;
    while (j_idx < seed.length) {
      const keyJ = key[mask & j_idx];
      const smearVal = keyJ === undefined ? 0 : keyJ * 19;
      smear ^= smearVal;
      key[mask & j_idx] = mask & (smear + seed.charCodeAt(j_idx++));
    }
    if (!key.length) key = [0];

    const keylen = key.length;
    let t: number;
    let i = 0;
    let j = 0;

    while (i < width) {
      this.S[i] = i++;
    }
    for (i = 0; i < width; i++) {
      this.S[i] = this.S[j = mask & (j + key[i % keylen] + (t = this.S[i]))];
      this.S[j] = t;
    }

    let count = width;
    let r = 0;
    i = this.i;
    j = this.j;
    while (count--) {
      t = this.S[i = mask & (i + 1)];
      r = r * width + this.S[mask & ((this.S[i] = this.S[j = mask & (j + t)]) + (this.S[j] = t))];
    }
    this.i = i;
    this.j = j;
  }

  int32(): number {
    let count = 4;
    let t: number;
    let r = 0;
    let i = this.i;
    let j = this.j;
    const mask = 255;
    const width = 256;

    while (count--) {
      t = this.S[i = mask & (i + 1)];
      r = r * width + this.S[mask & ((this.S[i] = this.S[j = mask & (j + t)]) + (this.S[j] = t))];
    }
    this.i = i;
    this.j = j;
    return r | 0;
  }
}

/**
 * @deprecated Use Web Crypto API (`crypto.getRandomValues`) for random number generation and `sha256Hex` from `crypto-hash.ts` for hashing.
 */
export class MT19937 {
  private mt: Uint32Array;
  private mti: number;

  constructor(seed: number) {
    this.mt = new Uint32Array(624);
    this.mt[0] = seed >>> 0;
    for (this.mti = 1; this.mti < 624; this.mti++) {
      const prev = this.mt[this.mti - 1];
      this.mt[this.mti] =
        (Math.imul(1812433253, prev ^ (prev >>> 30)) + this.mti) >>> 0;
    }
  }

  public random_int(): number {
    const mag01 = new Uint32Array([0x0, 0x9908b0df]);
    let y: number;

    if (this.mti >= 624) {
      let kk: number;
      for (kk = 0; kk < 227; kk++) {
        y = (this.mt[kk] & 0x80000000) | (this.mt[kk + 1] & 0x7fffffff);
        this.mt[kk] = this.mt[kk + 397] ^ (y >>> 1) ^ mag01[y & 0x1];
      }
      for (; kk < 623; kk++) {
        y = (this.mt[kk] & 0x80000000) | (this.mt[kk + 1] & 0x7fffffff);
        this.mt[kk] = this.mt[kk - 227] ^ (y >>> 1) ^ mag01[y & 0x1];
      }
      y = (this.mt[623] & 0x80000000) | (this.mt[0] & 0x7fffffff);
      this.mt[623] = this.mt[396] ^ (y >>> 1) ^ mag01[y & 0x1];

      this.mti = 0;
    }

    y = this.mt[this.mti++];

    y ^= (y >>> 11);
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= (y >>> 18);

    return y >>> 0;
  }

  random(): number {
    return this.random_int() * (1.0 / 4294967296.0);
  }

  static get128BitHash(seed: string | undefined): string {
    const s = seed || '';
    if (/^[0-9a-f]{32}$/i.test(s)) {
      return s.toLowerCase();
    }
    const rng = new HashPRNG(s);
    const arr = new Uint32Array(4);
    for (let i = 0; i < 4; i++) {
      arr[i] = Math.abs(rng.int32());
    }
    return Array.from(arr, (n) => n.toString(16).padStart(8, '0')).join('');
  }

  static get31BitSeed(str: string | undefined): number {
    const hex128 = MT19937.get128BitHash(str);
    let hash = 2166136261;
    for (let i = 0; i < hex128.length; i++) {
      hash ^= hex128.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
      hash |= 0;
    }
    return (hash >>> 0) % 2147483647;
  }
}
