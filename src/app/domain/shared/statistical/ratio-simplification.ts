import { MathUtil } from 'src/app/domain/core/utils/math.util';

export function simplifyRatios<T extends { ratio: number }>(arms: T[]): T[] {
  const ratioGcd = MathUtil.gcdArray(arms.map(a => a.ratio));
  return arms.map(arm => ({
    ...arm,
    ratio: arm.ratio / ratioGcd
  }));
}
