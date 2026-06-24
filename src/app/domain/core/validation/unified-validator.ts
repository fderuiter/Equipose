import { RandomizationConfig, BlockRule } from '../models/randomization.model';

export class UnifiedValidationAuthority {
  /**
   * Validates a RandomizationConfig for structural and mathematical correctness.
   * Returns an array of error messages. If the array is empty, the config is valid.
   */
  static validate(config: Partial<RandomizationConfig>): string[] {
    const errors: string[] = [];

    // 1. Arm validation
    if (!config.arms || config.arms.length === 0) {
      errors.push('Arms array is empty. At least one treatment arm is required.');
      return errors;
    }

    const totalRatio = config.arms.reduce((sum, arm) => sum + arm.ratio, 0);
    if (totalRatio === 0) {
      errors.push('Total arm ratio must be greater than zero');
      return errors;
    }

    // 2. Minimization specific validation
    if (config.randomizationMethod === 'MINIMIZATION') {
      const n = config.minimizationConfig?.totalSampleSize;
      if (!Number.isFinite(n) || (n as number) <= 0) {
        errors.push('Total sample size must be a positive number for minimization.');
      }
      const pVal = config.minimizationConfig?.p;
      if (!Number.isFinite(pVal) || (pVal as number) < 0.5 || (pVal as number) > 1.0) {
        errors.push('Minimization probability `p` must be a number between 0.5 and 1.0.');
      }

      // Check contradictory configs
      if (
        (config.blockSizes && config.blockSizes.length > 0) ||
        config.globalBlockStrategy ||
        (config.siteBlockOverrides && Object.keys(config.siteBlockOverrides).length > 0) ||
        (config.stratumBlockOverrides && Object.keys(config.stratumBlockOverrides).length > 0)
      ) {
        errors.push('Block sizes and strategies are not compatible with Minimization method');
      }

      if (config.capStrategy === 'PROPORTIONAL') {
        errors.push('Proportional cap strategy is not currently supported with Minimization method');
      }

      return errors; // Skip block size validation
    }

    // 3. Block validation (for BLOCK method)
    const allSizes = new Set<number>(config.blockSizes || []);
    const addRule = (rule: BlockRule) => rule.sizes.forEach(s => allSizes.add(s));
    
    if (config.globalBlockStrategy) addRule(config.globalBlockStrategy);
    if (config.siteBlockOverrides) Object.values(config.siteBlockOverrides).forEach(addRule);
    if (config.stratumBlockOverrides) Object.values(config.stratumBlockOverrides).forEach(addRule);

    if (allSizes.size === 0) {
      errors.push('At least one block size must be configured');
    } else {
      for (const size of allSizes) {
        if (size <= 0) {
          errors.push(`Block size must be a positive integer. Got ${size}`);
        } else if (size % totalRatio !== 0) {
          errors.push(`Block size ${size} is not a multiple of total ratio ${totalRatio}`);
        }
      }
    }

    return errors;
  }
}
