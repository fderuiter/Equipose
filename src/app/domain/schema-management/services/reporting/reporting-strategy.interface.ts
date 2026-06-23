import { RandomizationConfig } from '../../../core/models/randomization.model';

export interface ReportingStrategy {
  generateNarrative(config: RandomizationConfig): string;
}
