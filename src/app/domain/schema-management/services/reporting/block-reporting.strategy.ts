import { RandomizationConfig } from 'src/app/domain/core/models/randomization.model';
import { BaseReportingStrategy } from './base-reporting.strategy';

export class BlockReportingStrategy extends BaseReportingStrategy {
  generateNarrative(config: RandomizationConfig): string {
    const paragraphs: string[] = [];

    // 1. Core algorithm description
    const hasStrata = (config.strata || []).length > 0;
    if (hasStrata) {
      paragraphs.push(
        'This RTSM (Randomization and Trial Supply Management) randomization plan ' +
        'employs stratified block randomization utilizing a seeded pseudo-random ' +
        'number generator (PRNG) to ensure reproducibility for IRT/IWRS implementation systems. ' +
        'A Fisher-Yates shuffle algorithm is applied within each block to produce ' +
        'an unpredictable treatment allocation sequence suitable for regulatory submission.'
      );
    } else {
      paragraphs.push(
        'This RTSM (Randomization and Trial Supply Management) randomization plan ' +
        'employs block randomization utilizing a seeded pseudo-random number ' +
        'generator (PRNG) to ensure reproducibility for IRT/IWRS implementation systems. ' +
        'A Fisher-Yates shuffle algorithm is applied within each block to produce ' +
        'an unpredictable treatment allocation sequence suitable for regulatory submission.'
      );
    }

    // 2. Block size strategy
    paragraphs.push(this.buildBlockNarrative(config));

    // 3. Stratification factors
    paragraphs.push(this.buildStratificationNarrative(config));

    // 4. Cap strategy
    paragraphs.push(this.buildCapStrategyNarrative(config));

    // 5. Reproducibility / seed
    paragraphs.push(this.buildReproducibilityNarrative(config));

    return paragraphs.join('\n\n');
  }

  private buildBlockNarrative(config: RandomizationConfig): string {
    const strategy    = config.globalBlockStrategy;
    const effectiveSizes = (strategy?.sizes ?? config.blockSizes ?? []);
    const sizesStr    = effectiveSizes.join(', ');

    let text: string;

    if (strategy) {
      if (strategy.selectionType === 'RANDOM_POOL') {
        text =
          `Block Size Strategy: Block sizes are randomly selected from the pool ` +
          `[${sizesStr}] at the start of each block (Block Selection Mode: RANDOM_POOL). ` +
          `This variable-block approach means the next treatment assignment cannot ` +
          `be predicted from the preceding sequence, providing an additional layer of ` +
          `protection against selection bias.`;
      } else {
        text =
          `Block Size Strategy: Block sizes are applied in a fixed sequence ` +
          `[${sizesStr}] (Block Selection Mode: FIXED_SEQUENCE), cycling back to the ` +
          `first size when the sequence is exhausted.`;
      }
      if (strategy.limits && Object.keys(strategy.limits).length > 0) {
        const limitsStr = Object.entries(strategy.limits)
          .map(([k, v]) => `size ${k} (max ${v} uses)`)
          .join(', ');
        text += ` Block-size usage limits are enforced: ${limitsStr}.`;
      }
    } else if (effectiveSizes.length === 1) {
      text =
        `Block Size Strategy: A fixed block size of ${effectiveSizes[0]} is used ` +
        `uniformly throughout the trial.`;
    } else {
      text =
        `Block Size Strategy: Block sizes are randomly selected from the pool ` +
        `[${sizesStr}] at the start of each block to prevent selection bias.`;
    }

    return text;
  }
}
