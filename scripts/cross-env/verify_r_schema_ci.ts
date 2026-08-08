import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert';

const repoRoot = process.cwd();

console.log('Running standalone schema verification...');

// Check 1: Downloads the code-generation fixture artifact before the R verification step
const workflowPath = resolve(repoRoot, '.github/workflows/ci.yml');
const workflow = readFileSync(workflowPath, 'utf-8');

assert.ok(
  workflow.includes('needs: [setup, code_generation_fixtures]'),
  'Workflow should require setup and code_generation_fixtures'
);
assert.ok(
  workflow.includes('- name: Download code-generation fixture scripts'),
  'Workflow should download code-generation fixture scripts'
);
assert.ok(
  workflow.includes('name: code-generation-fixtures'),
  'Workflow should refer to name: code-generation-fixtures'
);
assert.ok(
  workflow.includes('path: artifacts/code-generation-fixtures/'),
  'Workflow path should be artifacts/code-generation-fixtures/'
);
assert.ok(
  workflow.includes('Rscript scripts/cross-env/verify_r_schema.R artifacts/code-generation-fixtures'),
  'Workflow should run Rscript verify_r_schema.R'
);

// Check 2: Bridges the R verifier to the exported UI fixture directory
const verifierPath = resolve(repoRoot, 'scripts/cross-env/verify_r_schema.R');
const verifier = readFileSync(verifierPath, 'utf-8');

assert.ok(
  verifier.includes('artifacts", "code-generation-fixtures"'),
  'Verifier should target artifacts/code-generation-fixtures'
);
assert.ok(
  verifier.includes('verify_generated_scripts'),
  'Verifier should contain verify_generated_scripts'
);
assert.ok(
  verifier.includes('sys.source(basename(script_path), envir = env)'),
  'Verifier should source each script using sys.source'
);

console.log('Standalone schema verification completed successfully.');
