import { Injectable, inject, InjectionToken } from '@angular/core';
import { RandomizationConfig, RandomizationResult } from '../../core/models/randomization.model';
import {
  ConfigurationValidationError,
  UnsupportedLanguageError,
} from '../errors/code-generation-errors';
import { CodeGenerationStrategy, BaseOrchestrator } from './generation/base.strategy';
import { StaticMappingGuard } from './generation/static-mapping.guard';
import { UnifiedValidationAuthority } from '../../core/validation/unified-validator';

import { R_CONFIG } from './generation/r.strategy';
import { PYTHON_CONFIG } from './generation/python.strategy';
import { SAS_CONFIG } from './generation/sas.strategy';
import { STATA_CONFIG } from './generation/stata.strategy';
import { MethodologySpecificationService } from './methodology-specification.service';

export const CODE_GENERATION_STRATEGIES = new InjectionToken<CodeGenerationStrategy[]>('CODE_GENERATION_STRATEGIES', {
  providedIn: 'root',
  factory: () => {
    return [
      new BaseOrchestrator(R_CONFIG),
      new BaseOrchestrator(PYTHON_CONFIG),
      new BaseOrchestrator(SAS_CONFIG),
      new BaseOrchestrator(STATA_CONFIG)
    ];
  }
});

@Injectable({ providedIn: 'root' })
export class CodeGeneratorService {
  private strategies = inject(CODE_GENERATION_STRATEGIES, { optional: true }) || [];
  private methodologySpec = inject(MethodologySpecificationService);

  /**
   * Phase 0 – Language dispatch entry point.
   * Runs pre-flight config validation, then delegates to the appropriate generator.
   */
  generate(language: 'R' | 'SAS' | 'Python' | 'STATA', config: RandomizationConfig, metadata?: RandomizationResult['metadata']): string {
    this.validateConfig(config);
    
    const strategy = this.strategies.find(s => s.language === language);
    if (!strategy) {
      throw new UnsupportedLanguageError(language as string, config);
    }

    let output: string;
    if (config.randomizationMethod === 'MINIMIZATION') {
      output = strategy.generateMinimization(config, metadata);
    } else {
      output = strategy.generate(config, metadata);
    }

    let header = '';
    const manifest = this.methodologySpec.generateManifest(config, metadata);
    if (language === 'R' || language === 'Python') {
      header = this.methodologySpec.formatAsLineComments(manifest, '#');
    } else {
      header = this.methodologySpec.formatAsSasComment(manifest);
    }

    const finalOutput = `${header}\n\n${output}`;

    // Static mapping guard runs after generation
    StaticMappingGuard.verify(language, config, finalOutput);
    return finalOutput;
  }

  /**
   * Phase 1 – Pre-flight validation.
   */
  private validateConfig(config: RandomizationConfig): void {
    const errors = UnifiedValidationAuthority.validate(config);
    if (errors.length > 0) {
      throw new ConfigurationValidationError(errors, config);
    }
  }

  generateR(config: RandomizationConfig, metadata?: RandomizationResult['metadata']): string {
    return this.generate('R', config, metadata);
  }

  generatePython(config: RandomizationConfig, metadata?: RandomizationResult['metadata']): string {
    return this.generate('Python', config, metadata);
  }

  generateSas(config: RandomizationConfig, metadata?: RandomizationResult['metadata']): string {
    return this.generate('SAS', config, metadata);
  }

  generateStata(config: RandomizationConfig, metadata?: RandomizationResult['metadata']): string {
    return this.generate('STATA', config, metadata);
  }
}
