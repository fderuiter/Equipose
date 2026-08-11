import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import { writeFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('Two-Way Registry Verification and Alignment', () => {
  const repoRoot = join(__dirname, '../../../../..');
  const tempSpecPath = join(repoRoot, 'src/app/domain/core/validation/temp-test-mismatch.spec.ts');

  it('should pass validation when the codebase is fully aligned', () => {
    const res = spawnSync('node', ['scripts/generate-rtm.mjs'], { cwd: repoRoot, encoding: 'utf-8' });
    expect(res.status).toBe(0);
  });

  it('should fail immediately with an exit error if a test-level requirement tag maps to a different strategic pillar', () => {
    // 1. Write a temporary file with a mismatched pillar tag (obfuscate tags so the scanner doesn't scan this test file)
    const reqPart = 'REQ-' + 'ZERO-TRUST-001';
    const pillarPart = '@' + 'pillar:Reproducibility';
    writeFileSync(
      tempSpecPath,
      `// [${reqPart}]\n// ${pillarPart}\ntest('mismatched zero-trust test', () => {});\n`,
      'utf-8'
    );

    try {
      // 2. Run the validation engine / generator script
      const res = spawnSync('node', ['scripts/generate-rtm.mjs'], { cwd: repoRoot, encoding: 'utf-8' });

      // 3. Verify it terminates immediately with exit code 1 and outputs error
      expect(res.status).toBe(1);
      expect(res.stderr).toContain('Mismatched tags');
      expect(res.stderr).toContain(reqPart);
      expect(res.stderr).toContain('Zero-Trust');
      expect(res.stderr).toContain('Reproducibility');
    } finally {
      // 4. Clean up temporary file
      if (existsSync(tempSpecPath)) {
        unlinkSync(tempSpecPath);
      }
    }
  });
});
