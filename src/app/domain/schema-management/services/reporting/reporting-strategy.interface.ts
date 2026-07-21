import { RandomizationConfig } from 'src/app/domain/core/models/randomization.model';

export interface ReportingStrategy {
  generateNarrative(config: RandomizationConfig): string;
}
