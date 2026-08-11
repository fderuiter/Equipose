import { describe, it, expect, beforeAll } from 'vitest';
import { computeAuditHash } from './crypto-hash';
import { generateRandomizationSchema } from './randomization-algorithm';
import { RandomizationResult, RandomizationConfig } from '../../core/models/randomization.model';
import goldenFixtures from './randomization-algorithm-golden.json';
import { commandExists, getRscriptCandidates, resolveExecutable } from '../../../../testing/runtime-command.util';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile } from 'fs/promises';
import { join } from 'path';

const execFileAsync = promisify(execFile);

// [REQ-21CFR11-005]
describe('Crypto Hash Cross-Language Parity Integration Suite', () => {
  let hasPython = false;
  let hasR = false;
  let rscriptExecutable: string | null = null;
  const pythonExecutable = process.env['PYTHON'] || 'python3';

  beforeAll(async () => {
    hasPython = await commandExists(pythonExecutable);
    rscriptExecutable = await resolveExecutable(getRscriptCandidates());
    hasR = rscriptExecutable !== null;
  });

  it('should generate the exact same SHA-256 hash as the Python verification utility for the reference mock payload', async () => {
    const mockResult: RandomizationResult = {
      metadata: {
        protocolId: 'AUDIT-001',
        studyName: 'Audit Test',
        phase: 'Phase III',
        seed: 'fixedseed123',
        generatedAt: '2024-06-01T12:00:00.000Z',
        strata: [],
        config: {
          protocolId: 'AUDIT-001',
          studyName: 'Audit Test',
          phase: 'Phase III',
          arms: [
            { id: 'A', name: 'Active', ratio: 1 }
          ],
          sites: ['Site1'],
          strata: [],
          blockSizes: [2],
          stratumCaps: [],
          seed: 'fixedseed123',
          subjectIdMask: '{SITE}-{SEQ:3}',
          randomizationMethod: 'PERMUTED_BLOCK'
        },
        auditHash: ''
      },
      schema: []
    };

    const computedHash = await computeAuditHash(mockResult);
    
    // The pre-computed hash from scripts/verify_audit_hash.py self-test
    const expectedPythonHash = '8701cac6902a53c9d7626c9648df0db26370b1347236bff440797e9575b7f031';
    
    expect(computedHash).toBe(expectedPythonHash);
  });

  // Dynamically generate tests for each golden fixture scenario
  for (const [key, fixture] of Object.entries(goldenFixtures)) {
    it(`should successfully verify the audit hash for "${key}" scenario using external scripts`, async () => {
      // 1. Generate randomization result in TS
      const config = fixture.config as RandomizationConfig;
      const result = generateRandomizationSchema(config);

      // Ensure result matches the model requirements
      // Inject dummy/mock generatedAt timestamp if absent, or use the current time
      if (!result.metadata.generatedAt) {
        result.metadata.generatedAt = '2026-08-11T12:00:00.000Z';
      }

      // 2. Compute TS audit hash
      const computedHash = await computeAuditHash(result);
      result.metadata.auditHash = computedHash;

      // 3. Write out to temporary JSON file
      const tempJsonPath = join('/tmp', `audit-hash-test-${key}.json`);
      await writeFile(tempJsonPath, JSON.stringify(result, null, 2), 'utf-8');

      // 4. Run external Python verification script
      if (hasPython) {
        const pythonScriptPath = join(process.cwd(), 'scripts/verify_audit_hash.py');
        const { stdout } = await execFileAsync(pythonExecutable, [pythonScriptPath, tempJsonPath]);
        
        expect(stdout).toContain('Verification: SUCCESS');
      } else {
        if (process.env['GITHUB_ACTIONS'] === 'true') {
          throw new Error('Python is required in CI to verify audit hash parity.');
        }
      }

      // 5. Run external R verification script
      if (hasR) {
        const rScriptPath = join(process.cwd(), 'scripts/verify_audit_hash.R');
        const { stdout } = await execFileAsync(rscriptExecutable!, [rScriptPath, tempJsonPath]);
        
        expect(stdout).toContain('Verification: SUCCESS');
      } else {
        if (process.env['GITHUB_ACTIONS'] === 'true') {
          throw new Error('Rscript is required in CI to verify audit hash parity.');
        }
      }
    });
  }
});
