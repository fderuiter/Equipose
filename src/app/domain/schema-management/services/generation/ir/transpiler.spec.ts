import { describe, expect, it } from 'vitest';
import { CodeTranspiler } from './transpiler';
import { RandomizationConfig } from '../../../../core/models/randomization.model';

describe('CodeTranspiler Metadata Validation', () => {
  const mockConfig: RandomizationConfig = {
    protocolId: 'TEST-PROT-001',
    studyName: 'Test Study',
    phase: 'Phase I',
    arms: [{ id: 'A', name: 'Arm A', ratio: 1 }],
    sites: ['Site 1'],
    strata: [],
    blockSizes: [2],
    stratumCaps: [{ levelIds: {}, cap: 4 }],
    seed: 'test-seed',
    subjectIdMask: '{SITE}-{SEQ:3}',
    randomizationMethod: 'BLOCK'
  };

  const languages = ['R', 'Python', 'SAS', 'STATA'] as const;

  languages.forEach(lang => {
    describe(`${lang} Metadata`, () => {
      it(`should contain the expected version header and provenance for ${lang}`, () => {
        const code = CodeTranspiler.transpile(lang, mockConfig, 'BLOCK');

        // Assert Protocol ID
        expect(code).toContain('Protocol: TEST-PROT-001');

        // Assert App Version
        expect(code).toMatch(/App Version: v\d+\.\d+\.\d+/);

        // Assert Generated At (ISO 8601 subset check)
        expect(code).toMatch(/Generated At: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

        // Assert Algorithm
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
      stratumBlockOverrides: undefined
    } as RandomizationConfig;
    const code = CodeTranspiler.transpile('Python', minConfig, 'MINIMIZATION');
    expect(code).toContain('Algorithm: Pocock-Simon Minimization');
  });
});
