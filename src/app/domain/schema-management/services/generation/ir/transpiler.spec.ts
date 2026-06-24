import { describe, expect, it } from 'vitest';
import { CodeTranspiler } from './transpiler';
import { RandomizationConfig } from '../../../../core/models/randomization.model';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

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

  describe('Python String Escaping and Execution', () => {
    it('should generate syntactically valid Python even with special characters in metadata and strata', () => {
      const weirdConfig: RandomizationConfig = {
        protocolId: 'PROT"-$METACH-$(echo)',
        studyName: 'Study with "Quotes" and \\Backslashes\\',
        phase: 'Phase I',
        arms: [
          { id: 'A', name: 'Arm "A" (Alpha)', ratio: 1 },
          { id: 'B', name: "Arm 'B' (Beta)", ratio: 1 }
        ],
        sites: ['Site "1"', 'Site \\2\\'],
        strata: [
          {
            id: 'Factor"With"Quotes',
            levels: ['Level "1"', "Level '2'", 'Level\\With\\Backslash', 'Unicode-α-Ω']
          }
        ],
        blockSizes: [2, 4],
        stratumCaps: [
          { levelIds: { 'Factor"With"Quotes': 'Level "1"' }, cap: 2 },
          { levelIds: { 'Factor"With"Quotes': "Level '2'" }, cap: 2 }
        ],
        seed: 'seed-with-"quotes"',
        subjectIdMask: '{SITE}-{STRATUM}-{SEQ:3}',
        randomizationMethod: 'BLOCK'
      };

      const code = CodeTranspiler.transpile('Python', weirdConfig, 'BLOCK');

      // Basic assertions that escaping is happening for some known fields
      expect(code).toContain('Arm \\"A\\" (Alpha)');
      expect(code).toContain('Factor\\"With\\"Quotes');

      const tmpFile = join(tmpdir(), `test_generated_${Date.now()}.py`);
      try {
        writeFileSync(tmpFile, code);
        // We expect this to pass if the syntax is valid.
        // We use python3 -m py_compile to check syntax without full execution if preferred,
        // but the plan says "executes without errors".
        // The generated script needs numpy and pandas.
        execSync(`python3 ${tmpFile}`, { stdio: 'pipe' });
      } catch (error: any) {
        const stderr = error.stderr?.toString() || '';
        const stdout = error.stdout?.toString() || '';
        throw new Error(`Python execution failed.\nSTDOUT: ${stdout}\nSTDERR: ${stderr}\nCODE:\n${code}`);
      } finally {
        try { unlinkSync(tmpFile); } catch {}
      }
    });
  });
});
