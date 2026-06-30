import { Injectable, inject, InjectionToken } from '@angular/core';
import { RandomizationConfig, RandomizationResult } from '../../core/models/randomization.model';
import {
  ConfigurationValidationError,
  UnsupportedLanguageError,
} from '../errors/code-generation-errors';
import { CodeGenerationStrategy } from './generation/base.strategy';
import { StaticMappingGuard } from './generation/static-mapping.guard';
import { UnifiedValidationAuthority } from '../../core/validation/unified-validator';

import { RStrategy } from './generation/r.strategy';
import { PythonStrategy } from './generation/python.strategy';
import { SasStrategy } from './generation/sas.strategy';
import { StataStrategy } from './generation/stata.strategy';
import { MethodologySpecificationService } from './methodology-specification.service';

export const CODE_GENERATION_STRATEGIES = new InjectionToken<CodeGenerationStrategy[]>('CODE_GENERATION_STRATEGIES', {
  providedIn: 'root',
  factory: () => {
    return [
      new RStrategy(),
      new PythonStrategy(),
      new SasStrategy(),
      new StataStrategy()
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
      throw new ConfigurationValidationError(errors[0], config);
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
