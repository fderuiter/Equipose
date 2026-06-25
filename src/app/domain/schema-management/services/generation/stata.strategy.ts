import { Injectable } from '@angular/core';
import { RandomizationConfig, RandomizationResult } from '../../../core/models/randomization.model';
import { CodeGenerationStrategy } from './base.strategy';
import { CodeTranspiler } from './ir/transpiler';
import { MethodologySpecificationService } from '../methodology-specification.service';

@Injectable()
export class StataStrategy implements CodeGenerationStrategy {
  readonly language = 'STATA';

  constructor(private methodologySpec: MethodologySpecificationService) {}

  generate(config: RandomizationConfig, metadata?: RandomizationResult['metadata']): string {
    const manifest = this.methodologySpec.generateManifest(config, metadata);
    const header = this.methodologySpec.formatAsSasComment(manifest); // STATA also supports /* */ comments
    return `${header}\n\n${CodeTranspiler.transpile(this.language, config, 'BLOCK')}`;
  }

  generateMinimization(config: RandomizationConfig, metadata?: RandomizationResult['metadata']): string {
    const manifest = this.methodologySpec.generateManifest(config, metadata);
    const header = this.methodologySpec.formatAsSasComment(manifest);
    return `${header}\n\n${CodeTranspiler.transpile(this.language, config, 'MINIMIZATION')}`;
  }
}
