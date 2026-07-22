#!/usr/bin/env node
/**
 * scripts/validate-metadata.mjs
 *
 * Automated metadata and provenance validator for all generated scripts.
 *
 * Scans artifacts/code-generation-fixtures/ for:
 *  - .py (Python)
 *  - .R (R)
 *  - .sas (SAS)
 *  - .do (Stata)
 *
 * Asserts each contains:
 *  1. Protocol ID
 *  2. App Version (vX.Y.Z)
 *  3. Generated At (ISO 8601)
 *  4. Algorithm description
 *
 * Exit code 0 if all files pass.
 * Exit code 1 if any file is missing metadata or malformed.
 */

import { readdir, readFile } from 'fs/promises';
import { join, resolve } from 'path';

const FIXTURE_ROOT = resolve(process.cwd(), 'artifacts', 'code-generation-fixtures');

const EXPECTED_METADATA = [
  { label: 'Protocol field',       re: /Protocol:\s+\S+/i },
  { label: 'App Version field',    re: /App Version:\s+v\d+\.\d+\.\d+/i },
  { label: 'Generated At field',   re: /Generated At:\s*\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/i },
  { label: 'Algorithm field',      re: /(Algorithm|PRNG Algorithm):\s+.+/i },
];

async function collectGeneratedFiles(dir) {
  const files = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectGeneratedFiles(full));
    } else if (entry.isFile()) {
      const ext = entry.name.split('.').pop().toLowerCase();
      if (['py', 'r', 'sas', 'do'].includes(ext) && !entry.name.startsWith('mt19937_')) {
        files.push(full);
      }
    }
  }
  return files;
}

async function validateMetadata(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const errors = [];

  for (const { label, re } of EXPECTED_METADATA) {
    if (!re.test(content)) {
      errors.push(`Missing or malformed ${label}`);
    }
  }
  return errors;
}

async function main() {
  console.log('--- Generated Code Metadata & Provenance Validator ---');
  console.log(`Scanning: ${FIXTURE_ROOT}`);

  const files = await collectGeneratedFiles(FIXTURE_ROOT);
  if (files.length === 0) {
    console.error('ERROR: No generated scripts found in fixture root.');
    process.exit(1);
  }

  console.log(`Found ${files.length} scripts to validate.\n`);

  let totalErrors = 0;
  for (const file of files) {
    const rel = file.replace(process.cwd() + '/', '');
    const errors = await validateMetadata(file);
    if (errors.length === 0) {
      console.log(`  ✓  ${rel}`);
    } else {
      console.log(`  ✗  ${rel} — ${errors.length} error(s):`);
      errors.forEach(err => console.log(`       - ${err}`));
      totalErrors += errors.length;
    }
  }

  console.log('\n--- Result ---');
  if (totalErrors > 0) {
    console.log(`METADATA_CHECK: FAIL — ${totalErrors} error(s) total.`);
    process.exit(1);
  } else {
    console.log(`METADATA_CHECK: PASS — all ${files.length} scripts have valid metadata headers.`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
