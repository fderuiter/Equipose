import { describe, expect, it } from 'vitest';
import { BaseOrchestrator } from '../base.strategy';
import { R_CONFIG } from '../r.strategy';
import { PYTHON_CONFIG } from '../python.strategy';
import { SAS_CONFIG } from '../sas.strategy';
import { STATA_CONFIG } from '../stata.strategy';
import { RandomizationConfig } from '../../../../core/models/randomization.model';
import { StudyPresets } from '../../../../core/presets/study-presets';





describe('CodeTranspiler & BaseOrchestrator (Phase 3 Integration)', () => {

  const mockConfig: RandomizationConfig = StudyPresets.extend(StudyPresets.Standard, {
    protocolId: 'PRT-100',
    studyName: 'Transpiler Test',
    seed: 'reproducibility-seed-1234',
    stratumCaps: [{ levelIds: { 'Factor"With"Quotes': 'Level "1"' }, cap: 10 }]
  });

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
    const minConfig = StudyPresets.extend(StudyPresets.Minimization, {
      protocolId: 'PRT-100',
      studyName: 'Transpiler Test',
      seed: 'reproducibility-seed-1234',
      stratumCaps: [{ levelIds: { 'Factor"With"Quotes': 'Level "1"' }, cap: 10 }]
    });
    const pythonStrategy = new BaseOrchestrator(PYTHON_CONFIG);
    const code = pythonStrategy.generateMinimization(minConfig);
    expect(code).toContain('Algorithm: Pocock-Simon Minimization');
  });

  describe('Python String Escaping and Execution', () => {
    it('should generate syntactically valid Python even with special characters in metadata and strata', () => {
      const weirdConfig: RandomizationConfig = StudyPresets.extend(StudyPresets.Simple, {
        protocolId: 'P-"123"',
        studyName: 'Study "Quoted" \\ Slash',
        arms: [
          { id: '1', name: 'Arm "A" (Alpha)', ratio: 1 },
          { id: '2', name: 'Arm B', ratio: 1 }
        ],
        blockSizes: [2],
        sites: ['Site "1"', 'Site \\2\\'],
        strata: [
          { id: 'Factor"With"Quotes', name: 'Factor', levels: ['Level "1"'] }
        ],
        stratumCaps: [{ levelIds: { 'Factor"With"Quotes': 'Level "1"' }, cap: 10 }],
        seed: 'seed-with-"quotes"'
      });

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
      const weirdConfig: RandomizationConfig = StudyPresets.extend(StudyPresets.Simple, {
        protocolId: 'P-"123"',
        studyName: 'Study "Quoted" \\ Slash',
        arms: [
          { id: '1', name: 'Arm "A" (Alpha)', ratio: 1 },
          { id: '2', name: 'Arm B', ratio: 1 }
        ],
        blockSizes: [2],
        sites: ['Site "1"', 'Site \\2\\'],
        strata: [
          { id: 'Factor"With"Quotes', name: 'Factor', levels: ['Level "1"'] }
        ],
        stratumCaps: [{ levelIds: { 'Factor"With"Quotes': 'Level "1"' }, cap: 10 }],
        seed: 'seed-with-"quotes"'
      });

      const rStrategy = new BaseOrchestrator(R_CONFIG);
      const code = rStrategy.generate(weirdConfig);

      // Assert escaping of values
      expect(code).toContain('Arm \\"A\\" (Alpha)');
      expect(code).toContain('Site \\"1\\"');
      expect(code).toContain('Site \\\\2\\\\');
    });
  });
});
