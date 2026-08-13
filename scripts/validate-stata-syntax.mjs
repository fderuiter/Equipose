#!/usr/bin/env node
/**
 * scripts/validate-stata-syntax.mjs
 *
 * Static syntax validator for Equipose-generated Stata scripts.
 */

import { readdir, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import astValPkg from '../src/app/domain/schema-management/services/generation/ast-validator';
const ASTValidator = astValPkg.ASTValidator || astValPkg;

const FIXTURE_ROOT = resolve(process.cwd(), 'artifacts', 'code-generation-fixtures');

const REQUIRED_HEADER_PATTERNS = [
  { label: 'title comment',        re: /^\*\s*(Randomization Schema Configuration)\s*/i },
  { label: 'Protocol field',       re: /^\*\s*Protocol:/i },
  { label: 'App Version field',    re: /^\*\s*App Version:/i },
  { label: 'Generated At field',   re: /^\*\s*Generated At:/i },
  { label: 'PRNG\/Algorithm field', re: /^\*\s*(PRNG Algorithm|Algorithm):/i },
];

const ISO_TIMESTAMP_RE = /Generated At:\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/i;

export async function validateFile(filePath) {
  const src = await readFile(filePath, 'utf-8');
  const errors = [];
  const lines = src.split('\n');

  // Header validation
  for (const { label, re } of REQUIRED_HEADER_PATTERNS) {
    if (!lines.some(line => re.test(line))) {
      errors.push(`Missing required header field: ${label}`);
    }
  }

  const tsMatch = src.match(ISO_TIMESTAMP_RE);
  if (!tsMatch) {
    errors.push(`Missing or malformed "Generated At" ISO 8601 timestamp`);
  }

  lines.forEach((line, idx) => {
    // Check for common Stata macro dereferencing errors
    if (/`[a-zA-Z0-9_]+`/.test(line)) {
      errors.push(`Line ${idx + 1}: Invalid local macro dereference (uses two backticks instead of backtick and single quote)`);
    }
    if (/(?<!\w)'[a-zA-Z0-9_]+'/.test(line)) {
      errors.push(`Line ${idx + 1}: Invalid local macro dereference (uses two single quotes instead of backtick and single quote)`);
    }
    // Check for missing global scope definition
  });

  // AST-based validations
  const strata = [];
  const strataRegex = /local\s+strata_\d+\s+(?:\x60\"|")([^"'\s]+)(?:\"\'|")/g;
  let match;
  while ((match = strataRegex.exec(src)) !== null) {
    strata.push(match[1]);
  }
  const astErrors = ASTValidator.validateStata(src, strata);
  errors.push(...astErrors);

  return errors;
}

async function collectStataFiles(dir) {
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
      files.push(...await collectStataFiles(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.do')) {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  console.log('Stata Static Syntax Validator');
  console.log(`  Scanning: ${FIXTURE_ROOT}`);

  let stataFiles;
  if (process.argv[2]) {
    stataFiles = [resolve(process.argv[2])];
  } else {
    stataFiles = await collectStataFiles(FIXTURE_ROOT);
  }

  if (stataFiles.length === 0) {
    console.error(
      '\nERROR: No .do files found under artifacts/code-generation-fixtures/\n'
    );
    process.exit(1);
  }

  console.log(`  Found ${stataFiles.length} .do file(s)\n`);

  let totalErrors = 0;
  const results = [];

  for (const file of stataFiles) {
    const relPath = file.replace(process.cwd() + '/', '');
    const errors = await validateFile(file);
    results.push({ file: relPath, errors });
    if (errors.length > 0) {
      totalErrors += errors.length;
    }
  }

  for (const { file, errors } of results) {
    if (errors.length === 0) {
      console.log(`  ✓  ${file}`);
    } else {
      console.log(`  ✗  ${file} — ${errors.length} error(s):`);
      for (const err of errors) {
        console.log(`       - ${err}`);
      }
    }
  }

  if (totalErrors > 0) {
    console.log(`STATA_SYNTAX_CHECK: FAIL — ${totalErrors} error(s)`);
    process.exit(1);
  } else {
    console.log(`STATA_SYNTAX_CHECK: PASS — all ${stataFiles.length} file(s) validated`);
    process.exit(0);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
}
