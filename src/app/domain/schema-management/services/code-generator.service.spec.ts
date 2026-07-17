import { TestBed } from '@angular/core/testing';
import { CodeGeneratorService } from './code-generator.service';
import { MethodologySpecificationService } from './methodology-specification.service';
import { RandomizationConfig } from '../../core/models/randomization.model';

describe('CodeGeneratorService Dual-Mode', () => {
  let service: CodeGeneratorService;

  const standardBlockConfig: RandomizationConfig = {
    protocolId: 'PRT-BLOCK',
    studyName: 'Standard Block',
    phase: 'Phase III',
    arms: [
      { id: 'A', name: 'Active', ratio: 1 },
      { id: 'B', name: 'Placebo', ratio: 1 }
    ],
    sites: ['Site1', 'Site2'],
    strata: [{ id: 'age', name: 'Age', levels: ['<65', '>=65'] }],
    blockSizes: [4],
    stratumCaps: [
      { levelIds: { age: '<65' }, cap: 10 },
      { levelIds: { age: '>=65' }, cap: 10 }
    ],
    seed: 'standard_seed',
    subjectIdMask: '{SITE}-{SEQ:3}',
    randomizationMethod: 'BLOCK',
    capStrategy: 'MANUAL_MATRIX'
  };

  const minimizationConfig: RandomizationConfig = {
    protocolId: 'PRT-MIN',
    studyName: 'Minimization',
    phase: 'Phase II',
    arms: [
      { id: 'A', name: 'Active', ratio: 1 },
      { id: 'B', name: 'Placebo', ratio: 1 }
    ],
    sites: ['Site1'],
    strata: [{ id: 'age', name: 'Age', levels: ['<65', '>=65'] }],
    blockSizes: [],
    stratumCaps: [],
    seed: 'min_seed',
    subjectIdMask: '{SITE}-{SEQ:3}',
    randomizationMethod: 'MINIMIZATION',
    capStrategy: 'MANUAL_MATRIX',
    minimizationConfig: { p: 0.8, totalSampleSize: 100 }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CodeGeneratorService,
        MethodologySpecificationService
      ]
    });
    service = TestBed.inject(CodeGeneratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Static Manifest (Mode 1)', () => {
    it('should generate static code for R', () => {
      const code = service.generateStatic('R', standardBlockConfig);
      expect(code).toContain('schema_list[[1]] <- data.frame(');
      expect(code).toContain('"SubjectID" = c(');
      expect(code).not.toContain('build_block <- function');
    });

    it('should generate static code for Python', () => {
      const code = service.generateStatic('Python', standardBlockConfig);
      expect(code).toContain('schema = {');
      expect(code).toContain('"SubjectID": [');
      expect(code).not.toContain('def build_block');
    });

    it('should generate static code for SAS', () => {
      const code = service.generateStatic('SAS', standardBlockConfig);
      expect(code).toContain('array arr_SubjectID');
      expect(code).toContain('do i = 1 to');
      expect(code).not.toContain('link build_block;');
    });

    it('should generate static code for STATA', () => {
      const code = service.generateStatic('STATA', standardBlockConfig);
      expect(code).toContain('schema_out = J(');
      expect(code).toContain('st_addvar("str100", "SubjectID")');
      expect(code).not.toContain('build_block(real scalar size)');
    });
  });

  describe('Dynamic Generator (Mode 2)', () => {
    it('should generate dynamic code for R', () => {
      const code = service.generateDynamic('R', standardBlockConfig);
      expect(code).toContain('build_block <- function');
      expect(code).toContain('tasks <- list()');
      expect(code).not.toContain('schema_list[[1]] <- data.frame(');
    });

    it('should generate dynamic code for Python', () => {
      const code = service.generateDynamic('Python', standardBlockConfig);
      expect(code).toContain('def build_block');
      expect(code).toContain('tasks = [');
      expect(code).not.toContain('"SubjectID": [');
    });

    it('should generate dynamic code for SAS', () => {
      const code = service.generateDynamic('SAS', standardBlockConfig);
      expect(code).toContain('build_block:');
      expect(code).toContain('link build_block;');
      expect(code).not.toContain('array arr_SubjectID');
    });

    it('should generate dynamic code for STATA', () => {
      const code = service.generateDynamic('STATA', standardBlockConfig);
      expect(code).toContain('build_block(real scalar size)');
      expect(code).toContain('task_caps = (');
      expect(code).not.toContain('schema_out[1, .] =');
    });
  });

  describe('Error Handling', () => {
    it('should throw an error when generating dynamic code for Minimization', () => {
      expect(() => {
        service.generateDynamic('R', minimizationConfig);
      }).toThrow('Dynamic simulation engine is not supported for Pocock-Simon Minimization. Please use Static Manifest mode.');
    });

    it('should throw an error when generating dynamic code with marginal caps', () => {
      const marginalConfig = { ...standardBlockConfig, capStrategy: 'MARGINAL_ONLY' as const };
      expect(() => {
        service.generateDynamic('Python', marginalConfig);
      }).toThrow('Dynamic simulation engine is not supported for MARGINAL_ONLY cap strategy. Please use Static Manifest mode.');
    });
  });
});
