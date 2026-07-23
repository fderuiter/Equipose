import { RandomizationConfig, BlockRule } from '../models/randomization.model';
import { getTotalRatio, simplifyRatios } from '../../shared/statistical/ratio-simplification';

export interface ValidationFailure {
  code: string;
  property: string;
  message: string;
}

export class UnifiedValidationAuthority {
  /**
   * Validates a RandomizationConfig for structural and mathematical correctness.
   * Returns an array of ValidationFailures. If the array is empty, the config is valid.
   */
  static validate(config: Partial<RandomizationConfig>): ValidationFailure[] {
    const errors: ValidationFailure[] = [];

    // 1. Arm validation
    if (!config.arms || config.arms.length === 0) {
      errors.push({ code: 'ERR_ARMS_EMPTY', property: 'arms', message: 'Arms array is empty. At least one treatment arm is required.' });
      return errors;
    }

    const totalRatioRaw = getTotalRatio(config.arms);
    if (totalRatioRaw === 0) {
      errors.push({ code: 'ERR_RATIO_ZERO', property: 'arms', message: 'Total arm ratio must be greater than zero' });
      return errors;
    }

    const totalRatio = getTotalRatio(simplifyRatios(config.arms));

    // 2. Minimization specific validation
    if (config.randomizationMethod === 'MINIMIZATION') {
      const n = config.minimizationConfig?.totalSampleSize;
      if (!Number.isFinite(n) || (n as number) <= 0) {
        errors.push({ code: 'ERR_MINIMIZATION_N', property: 'minimizationConfig.totalSampleSize', message: 'Total sample size must be a positive number for minimization.' });
      }
      const pVal = config.minimizationConfig?.p;
      if (!Number.isFinite(pVal) || (pVal as number) < 0.5 || (pVal as number) > 1.0) {
        errors.push({ code: 'ERR_MINIMIZATION_P', property: 'minimizationConfig.p', message: 'Minimization probability `p` must be a number between 0.5 and 1.0.' });
      }

      // Check contradictory configs
      if (
        (config.blockSizes && config.blockSizes.length > 0) ||
        config.globalBlockStrategy ||
        (config.siteBlockOverrides && Object.keys(config.siteBlockOverrides).length > 0) ||
        (config.stratumBlockOverrides && Object.keys(config.stratumBlockOverrides).length > 0)
      ) {
        errors.push({ code: 'ERR_INCOMPATIBLE_BLOCK_CONFIG', property: 'blockSizes', message: 'Block sizes and strategies are not compatible with Minimization method' });
      }

      if (config.capStrategy === 'PROPORTIONAL') {
        errors.push({ code: 'ERR_PROPORTIONAL_CAP_UNSUPPORTED', property: 'capStrategy', message: 'Proportional cap strategy is not currently supported with Minimization method' });
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
      errors.push({ code: 'ERR_NO_BLOCK_SIZE', property: 'blockSizes', message: 'At least one block size must be configured' });
    } else {
      for (const size of allSizes) {
        if (size <= 0) {
          errors.push({ code: 'ERR_BLOCK_SIZE_POSITIVE', property: 'blockSizes', message: `Block size must be a positive integer. Got ${size}` });
        } else if (size % totalRatio !== 0) {
          errors.push({ code: 'ERR_BLOCK_SIZE_MULTIPLE', property: 'blockSizes', message: `Block size ${size} is not a multiple of total ratio ${totalRatio}` });
        }
      }
    }

    return errors;
  }
}
