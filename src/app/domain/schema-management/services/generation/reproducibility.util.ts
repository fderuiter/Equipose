import { MT19937Internal } from '../../../randomization-engine/core/mt19937';

export class ReproducibilityUtil {
  static get128BitHash(seed: string | undefined): string {
    return MT19937Internal.get128BitHash(seed);
  }

  static hashCode(str: string | undefined): number {
    return MT19937Internal.get31BitSeed(str);
  }
}
