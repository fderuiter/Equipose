#!/usr/bin/env node
/**
 * scripts/validate-syntax.mjs
 *
 * Unified static syntax validator for Equipose-generated SAS and Stata scripts.
 * Runs both SAS and Stata syntax checks from a single command.
 */

import { readdir } from 'fs/promises';
import { join, resolve } from 'path';
import { validateFile as validateSasFile } from './validate-sas-syntax.mjs';
import { validateFile as validateStataFile } from './validate-stata-syntax.mjs';

const FIXTURE_ROOT = resolve(process.cwd(), 'artifacts', 'code-generation-fixtures');

async function collectFiles(dir, ext) {
  const files = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files; // directory does not exist yet (e.g. first run)
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(full, ext));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(ext.toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  console.log('=== Unified SAS & Stata Static Syntax Validator ===');
  console.log(`Scanning: ${FIXTURE_ROOT}\n`);

  const sasFiles = await collectFiles(FIXTURE_ROOT, '.sas');
  const stataFiles = await collectFiles(FIXTURE_ROOT, '.do');

  if (sasFiles.length === 0 && stataFiles.length === 0) {
    console.error(
      'ERROR: No .sas or .do files found under artifacts/code-generation-fixtures/.\n' +
      'Please run the code generator or export step to generate fixtures first.'
    );
    process.exit(1);
  }

  console.log(`Found ${sasFiles.length} SAS (.sas) file(s)`);
  console.log(`Found ${stataFiles.length} Stata (.do) file(s)\n`);

  let totalErrors = 0;
  const results = [];

  // Validate SAS files
  for (const file of sasFiles) {
    const relPath = file.replace(process.cwd() + '/', '');
    try {
      const errors = await validateSasFile(file);
      results.push({ type: 'SAS', file: relPath, errors });
      totalErrors += errors.length;
    } catch (err) {
      results.push({ type: 'SAS', file: relPath, errors: [`Execution error during SAS validation: ${err.message}`] });
      totalErrors += 1;
    }
  }

  // Validate Stata files
  for (const file of stataFiles) {
    const relPath = file.replace(process.cwd() + '/', '');
    try {
      const errors = await validateStataFile(file);
      results.push({ type: 'Stata', file: relPath, errors });
      totalErrors += errors.length;
    } catch (err) {
      results.push({ type: 'Stata', file: relPath, errors: [`Execution error during Stata validation: ${err.message}`] });
      totalErrors += 1;
    }
  }

  // Report results
  for (const { type, file, errors } of results) {
    if (errors.length === 0) {
      console.log(`  ✓  [${type}] ${file}`);
    } else {
      console.log(`  ✗  [${type}] ${file} — ${errors.length} error(s):`);
      for (const err of errors) {
        console.log(`       - ${err}`);
      }
    }
  }

  console.log('');
  if (totalErrors > 0) {
    console.log(`UNIFIED_SYNTAX_CHECK: FAIL — ${totalErrors} error(s) found.`);
    process.exit(1);
  } else {
    console.log('UNIFIED_SYNTAX_CHECK: PASS — All SAS and Stata scripts validated successfully!');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
