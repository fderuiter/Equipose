import { RandomizationConfig } from 'src/app/domain/core/models/randomization.model';
import { BaseReportingStrategy } from './base-reporting.strategy';

export class MinimizationReportingStrategy extends BaseReportingStrategy {
  generateNarrative(config: RandomizationConfig): string {
    const paragraphs: string[] = [];
    const p = config.minimizationConfig?.p ?? 0.8;

    // 1. Core algorithm description
    paragraphs.push(
      'This RTSM (Randomization and Trial Supply Management) randomization plan ' +
      'employs Pocock-Simon Minimization utilizing a seeded pseudo-random ' +
      'number generator (PRNG) to ensure reproducibility for IRT/IWRS implementation systems. ' +
      'This dynamic allocation algorithm evaluates existing marginal counts ' +
      'to assign treatments in a way that minimizes overall imbalance across ' +
      'the active trial population.'
    );

    // 2. Algorithm specifics
    paragraphs.push(
      `Minimization Parameters: The algorithm uses a biased-coin probability (p) of ${p}. ` +
      'When determining the optimal assignment, the system calculates an imbalance score ' +
      'for each potential treatment using a sum-of-ranges calculation based on current ' +
      'marginal subject counts. The treatment arm that yields the lowest total imbalance ' +
      'is selected as the preferred arm with probability p.'
    );

    // 3. Stratification factors
    paragraphs.push(this.buildStratificationNarrative(config));

    // 4. Cap strategy
    paragraphs.push(this.buildCapStrategyNarrative(config));

    // 5. Reproducibility / seed
    paragraphs.push(this.buildReproducibilityNarrative(config));

    return paragraphs.join('\n\n');
  }
}
