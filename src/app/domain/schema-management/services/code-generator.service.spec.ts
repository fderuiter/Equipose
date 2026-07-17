import { TestBed } from '@angular/core/testing';
import { CodeGeneratorService, CODE_GENERATION_STRATEGIES } from './code-generator.service';
import { MethodologySpecificationService } from './methodology-specification.service';
import { describe, it, expect, beforeEach } from 'vitest';

describe('CodeGeneratorService', () => {
  let service: CodeGeneratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CodeGeneratorService,
        MethodologySpecificationService,
        // CODE_GENERATION_STRATEGIES is already provided in root via the token's factory
      ]
    });
    service = TestBed.inject(CodeGeneratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
