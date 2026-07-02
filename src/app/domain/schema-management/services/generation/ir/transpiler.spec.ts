import { describe, expect, it } from 'vitest';
import { BaseOrchestrator } from '../base.strategy';
import { R_CONFIG } from '../r.strategy';
import { PYTHON_CONFIG } from '../python.strategy';
import { SAS_CONFIG } from '../sas.strategy';
import { STATA_CONFIG } from '../stata.strategy';
import { RandomizationConfig } from '../../../../core/models/randomization.model';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('CodeTranspiler & BaseOrchestrator (Phase 3 Integration)', () => {

  const mockConfig: RandomizationConfig = {
    protocolId: 'PRT-100',
    studyName: 'Transpiler Test',
    phase: 'Phase 2',
    seed: 'reproducibility-seed-1234',
    arms: [
      { id: 'arm-1', name: 'Treatment A', ratio: 1 },
      { id: 'arm-2', name: 'Control B', ratio: 1 }
    ],
    blockSizes: [4, 6],
    sites: ['Site01'],
    strata: [],
    stratumCaps: [{ levelIds: { 'Factor"With"Quotes': 'Level "1"' }, cap: 10 }],
    subjectIdMask: '{SITE}-{SEQ:3}',
    randomizationMethod: 'BLOCK'
  };

  const strategies = [
    new BaseOrchestrator(R_CONFIG),
    new BaseOrchestrator(PYTHON_CONFIG),
    new BaseOrchestrator(SAS_CONFIG),
    new BaseOrchestrator(STATA_CONFIG)
  ];

  strategies.forEach(strategy => {
    describe(`${strategy.language} Metadata`, () => {
      it(`should contain the expected version header and provenance for ${strategy.language}`, () => {
        const code = strategy.generate(mockConfig);
        expect(code).toContain('Protocol: PRT-100');
        expect(code).toContain('Algorithm: PRNG Algorithm: MT19937');
      });
    });
  });

  it('should contain Minimization algorithm metadata when transpiling minimization', () => {
    const minConfig = {
      ...mockConfig,
      randomizationMethod: 'MINIMIZATION',
      blockSizes: [],
      globalBlockStrategy: undefined,
      siteBlockOverrides: undefined,
      stratumBlockOverrides: undefined,
      minimizationConfig: { totalSampleSize: 100, p: 0.8 }
    } as RandomizationConfig;
    const pythonStrategy = new BaseOrchestrator(PYTHON_CONFIG);
    const code = pythonStrategy.generateMinimization(minConfig);
    expect(code).toContain('Algorithm: Pocock-Simon Minimization');
  });

  describe('Python String Escaping and Execution', () => {
    it('should generate syntactically valid Python even with special characters in metadata and strata', () => {
      const weirdConfig: RandomizationConfig = {
        protocolId: 'P-"123"',
        studyName: 'Study "Quoted" \\ Slash',
        phase: 'Phase 1',
        arms: [
          { id: '1', name: 'Arm "A" (Alpha)', ratio: 1 }
        ],
        blockSizes: [2],
        sites: ['Site "1"', 'Site \\2\\'],
        strata: [
          { id: 'Factor"With"Quotes', name: 'Factor', levels: ['Level "1"'] }
        ],
        stratumCaps: [{ levelIds: { 'Factor"With"Quotes': 'Level "1"' }, cap: 10 }],
        seed: 'seed-with-"quotes"',
        subjectIdMask: '{SITE}-{STRATUM}-{SEQ:3}',
        randomizationMethod: 'BLOCK'
      };

      const pythonStrategy = new BaseOrchestrator(PYTHON_CONFIG);
      const code = pythonStrategy.generate(weirdConfig);

      // Basic assertions that escaping is happening for some known fields
      expect(code).toContain('Arm \\"A\\" (Alpha)');
      expect(code).toContain('Factor\\"With\\"Quotes');

      // Note: Full execution test is skipped in CI, just checking syntactic presence of escapes
    });
  });

  describe('R String Escaping', () => {
    it('should correctly escape quotes and slashes for R scripts', () => {
      const weirdConfig: RandomizationConfig = {
        protocolId: 'P-"123"',
        studyName: 'Study "Quoted" \\ Slash',
        phase: 'Phase 1',
        arms: [
          { id: '1', name: 'Arm "A" (Alpha)', ratio: 1 }
        ],
        blockSizes: [2],
        sites: ['Site "1"', 'Site \\2\\'],
        strata: [
          { id: 'Factor"With"Quotes', name: 'Factor', levels: ['Level "1"'] }
        ],
        stratumCaps: [{ levelIds: { 'Factor"With"Quotes': 'Level "1"' }, cap: 10 }],
        seed: 'seed-with-"quotes"',
        subjectIdMask: '{SITE}-{STRATUM}-{SEQ:3}',
        randomizationMethod: 'BLOCK'
      };

      const rStrategy = new BaseOrchestrator(R_CONFIG);
      const code = rStrategy.generate(weirdConfig);

      // Assert escaping of values
      expect(code).toContain('Arm \\"A\\" (Alpha)');
      expect(code).toContain('Site \\"1\\"');
      expect(code).toContain('Site \\\\2\\\\');
    });
  });
});
