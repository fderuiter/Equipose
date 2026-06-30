import { MT19937 } from '../../../randomization-engine/core/mt19937';

export class ReproducibilityUtil {
  static get128BitHash(seed: string | undefined): string {
    return MT19937.get128BitHash(seed);
  }

  static hashCode(str: string | undefined): number {
    const hex128 = this.get128BitHash(str);
    let hash = 2166136261;
    for (let i = 0; i < hex128.length; i++) {
      hash ^= hex128.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
      hash |= 0;
    }
    return (hash >>> 0) % 2147483647;
  }
}
