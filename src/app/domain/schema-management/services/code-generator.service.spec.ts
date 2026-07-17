import { TestBed } from '@angular/core/testing';
import { CodeGeneratorService } from './code-generator.service';
import { MethodologySpecificationService } from './methodology-specification.service';

describe('CodeGeneratorService', () => {
  let service: CodeGeneratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CodeGeneratorService,
        MethodologySpecificationService,
        // is already provided in root via the token's factory
      ]
    });
    service = TestBed.inject(CodeGeneratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
