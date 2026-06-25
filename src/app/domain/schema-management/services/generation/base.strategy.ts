import { RandomizationConfig, RandomizationResult } from '../../../core/models/randomization.model';

export interface CodeGenerationStrategy {
  readonly language: 'R' | 'SAS' | 'Python' | 'STATA';
  generate(config: RandomizationConfig, metadata?: RandomizationResult['metadata']): string;
  generateMinimization(config: RandomizationConfig, metadata?: RandomizationResult['metadata']): string;
}
