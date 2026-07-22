import { MathUtil } from '../../core/utils/math.util';

export function getTotalRatio<T extends { ratio: number }>(arms: T[]): number {
  let sum = 0;
  for (const arm of arms) sum += arm.ratio;
  return sum;
}

export function simplifyRatios<T extends { ratio: number }>(arms: T[]): T[] {
  const ratioGcd = MathUtil.gcdArray(arms.map(a => a.ratio));
  return arms.map(arm => ({
    ...arm,
    ratio: arm.ratio / ratioGcd
  }));
}
