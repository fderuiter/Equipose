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

/**
 * Service orchestrating RTSM Code Export for R, Python, SAS, and Stata in both Static and Dynamic modes.
 */
@Injectable({ providedIn: 'root' })
export class CodeGeneratorService {
  private strategies = inject(CODE_GENERATION_STRATEGIES, { optional: true }) || [];
  private methodologySpec = inject(MethodologySpecificationService);

  /**
   * Phase 0 – Language dispatch entry point.
   * Runs pre-flight config validation, then delegates to the appropriate generator.
   */
  generate(language: 'R' | 'SAS' | 'Python' | 'STATA', config: RandomizationConfig, metadata?: RandomizationResult['metadata'], mode: 'STATIC' | 'DYNAMIC' = 'STATIC'): string {
    this.validateConfig(config);
    
    const strategy = this.strategies.find(s => s.language === language);
    if (!strategy) {
      throw new UnsupportedLanguageError(language as string, config);
    }

    let output: string;
    if (config.randomizationMethod === 'MINIMIZATION') {
      output = strategy.generateMinimization(config, metadata, mode);
    } else {
      output = strategy.generate(config, metadata, mode);
    }

    let header: string;
    const manifest = this.methodologySpec.generateManifest(config, metadata);
    if (language === 'R' || language === 'Python') {
      header = this.methodologySpec.formatAsLineComments(manifest, '#');
    } else {
      header = this.methodologySpec.formatAsSasComment(manifest);
    }

    const warningText = `WARNING: SEQUENCE-PARITY & MULTI-USER INTEGRATION SAFETY
This script is generated to facilitate clinical trial randomization.
When deploying/integrating this code into multi-user clinical environments:
1. Ensure strict sequence-parity is maintained across concurrent allocation requests.
2. Concurrent access to the randomization/marginal counts state must be synchronized to prevent data race conditions, marginal state corruption, and silent allocation bias.
3. Use appropriate native thread-locking/mutex primitives (or external transactions) to wrap critical sections of state lookup and modification.`;

    let warningBlock: string;
    if (language === 'R' || language === 'Python') {
      warningBlock = warningText.split('\n').map(line => `# ${line}`).join('\n');
    } else {
      warningBlock = warningText.split('\n').map(line => `/* ${line} */`).join('\n');
    }

    const finalOutput = `${header}\n\n${warningBlock}\n\n${output}`;

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

  /**
   * Generates a Static Data Manifest containing the exact, hardcoded randomization list.
   * Optimized for readability, cell-for-cell consistency, and fast database seeding.
   */
  generateStatic(language: 'R' | 'SAS' | 'Python' | 'STATA', config: RandomizationConfig, metadata?: RandomizationResult['metadata']): string {
    return this.generate(language, config, metadata, 'STATIC');
  }

  /**
   * Generates a Dynamic Algorithmic Generator (Simulation Engine) script.
   * Contains parameters, seeding, and loops to build and shuffle the randomization schema locally.
   */
  generateDynamic(language: 'R' | 'SAS' | 'Python' | 'STATA', config: RandomizationConfig, metadata?: RandomizationResult['metadata']): string {
    return this.generate(language, config, metadata, 'DYNAMIC');
  }

  /**
   * Helper to generate Static R script.
   */
  generateR(config: RandomizationConfig, metadata?: RandomizationResult['metadata']): string {
    return this.generate('R', config, metadata, 'STATIC');
  }

  /**
   * Helper to generate Static Python script.
   */
  generatePython(config: RandomizationConfig, metadata?: RandomizationResult['metadata']): string {
    return this.generate('Python', config, metadata, 'STATIC');
  }

  /**
   * Helper to generate Static SAS script.
   */
  generateSas(config: RandomizationConfig, metadata?: RandomizationResult['metadata']): string {
    return this.generate('SAS', config, metadata, 'STATIC');
  }

  /**
   * Helper to generate Static Stata script.
   */
  generateStata(config: RandomizationConfig, metadata?: RandomizationResult['metadata']): string {
    return this.generate('STATA', config, metadata, 'STATIC');
  }
}
