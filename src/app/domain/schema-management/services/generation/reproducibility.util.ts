import { MT19937 } from '../../../randomization-engine/core/mt19937';

export class ReproducibilityUtil {
  static get128BitHash(seed: string | undefined): string {
    return MT19937.get128BitHash(seed);
  }

  static hashCode(str: string | undefined): number {
    return MT19937.get31BitSeed(str);
  }
}
