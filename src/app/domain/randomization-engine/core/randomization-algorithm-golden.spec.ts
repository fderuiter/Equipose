import goldenFixtures from 'src/app/domain/randomization-engine/core/randomization-algorithm-golden.json';
import { generateRandomizationSchema } from 'src/app/domain/randomization-engine/core/randomization-algorithm';
import { RandomizationConfig } from 'src/app/domain/core/models/randomization.model';
import { TestBed } from '@angular/core/testing';
import { CodeGeneratorService } from '../../schema-management/services/code-generator.service';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { commandExists, getRscriptCandidates, resolveExecutable } from '../../../../testing/runtime-command.util';

const execFileAsync = promisify(execFile);

const checkPythonEnv = async (command: string): Promise<boolean> => {
  try {
    await execFileAsync(command, ['-c', 'import numpy, pandas']);
    return true;
  } catch {
    return false;
  }
};

// Helper function to parse CSV robustly (handling basic quoted strings without internal commas)
const parseCsv = (csv: string) => {
  const lines = csv.trim().split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
    const row: any = {};
    headers.forEach((h, i) => {
      row[h] = values[i];
    });
    return row;
  });
};

// Function to compare script outputs with golden schema and pinpoint failures
const compareOutputs = (scriptOutput: any[], goldenSchema: any[], key: string, language: string) => {
  if (scriptOutput.length !== goldenSchema.length) {
    throw new Error(`[${language}] Mismatch in scenario "${key}": expected ${goldenSchema.length} rows, got ${scriptOutput.length}`);
  }
  
  for (let i = 0; i < goldenSchema.length; i++) {
    const expected = goldenSchema[i];
    const actual = scriptOutput[i];
    
    // In generated scripts, 'Treatment' corresponds to the arm name
    const factorsToCompare = [
      { field: 'SubjectID', expected: expected.subjectId },
      { field: 'Site', expected: expected.site },
      { field: 'Treatment', expected: expected.treatmentArm },
      { field: 'BlockNumber', expected: String(expected.blockNumber) },
      { field: 'BlockSize', expected: String(expected.blockSize) },
      { field: 'StratumCode', expected: expected.stratumCode }
    ];

    for (const factor of factorsToCompare) {
      const actualVal = String(actual[factor.field]).trim();
      const expectedVal = String(factor.expected).trim();
      if (actualVal !== expectedVal) {
        throw new Error(`[${language}] Mismatch in scenario "${key}" at subject index ${i} for factor "${factor.field}". Expected: "${expectedVal}", Got: "${actualVal}"`);
      }
    }
  }
};

describe('Golden Regression Fixtures', () => {
  let codeGenerator: CodeGeneratorService;
  let hasPython = false;
  let hasR = false;
  let rscriptExecutable: string | null = null;
  const pythonExecutable = process.env['PYTHON'] || 'python3';

  beforeAll(async () => {
    TestBed.configureTestingModule({ providers: [CodeGeneratorService] });
    codeGenerator = TestBed.inject(CodeGeneratorService);
    hasPython = await commandExists(pythonExecutable) && await checkPythonEnv(pythonExecutable);
    rscriptExecutable = await resolveExecutable(getRscriptCandidates());
    hasR = rscriptExecutable !== null;
  });

  for (const [key, fixture] of Object.entries(goldenFixtures)) {
    it(`should match golden output for ${key} in Core TS, R, and Python`, async () => {
      const config = fixture.config as RandomizationConfig;
      const result = generateRandomizationSchema(config);

      const schema = result.schema.map(r => ({
        subjectId: r.subjectId,
        site: r.site,
        stratum: r.stratum,
        stratumCode: r.stratumCode,
        blockNumber: r.blockNumber,
        blockSize: r.blockSize,
        treatmentArm: r.treatmentArm,
        treatmentArmId: r.treatmentArmId
      }));

      // 1. Core TS verification
      expect(schema).toEqual(fixture.schema);

      // Directory containing the PRNG runtime modules
      const runtimesDir = join(process.cwd(), 'src/app/domain/randomization-engine/runtimes');

      // 2. R script verification
      if (hasR) {
        const rCode = codeGenerator.generateR(config, result.metadata);
        const rPath = join('/tmp', `test-${key}.R`);
        await writeFile(rPath, rCode);
        const { stdout: rStdout } = await execFileAsync(rscriptExecutable!, [rPath], { cwd: runtimesDir });
        
        if (fixture.schema.length === 0) {
          // If expected schema is empty, script output might just be an empty string or missing headers
          expect(rStdout.trim()).toBe('""');
        } else {
          const rLines = rStdout.split('\n');
          const csvStartIndex = rLines.findIndex(line => line.includes('SubjectID') || line.includes('"SubjectID"'));
          if (csvStartIndex === -1) throw new Error(`[R] Could not find CSV output for scenario "${key}"`);
          const rCsv = parseCsv(rLines.slice(csvStartIndex).join('\n'));
          compareOutputs(rCsv, fixture.schema, key, 'R');
        }
      } else {
        if (process.env['GITHUB_ACTIONS'] === 'true') throw new Error('Rscript is required in CI');
      }

      // 3. Python script verification
      if (hasPython) {
        const pyCode = codeGenerator.generatePython(config, result.metadata);
        const pyPath = join('/tmp', `test-${key}.py`);
        await writeFile(pyPath, pyCode);
        const { stdout: pyStdout } = await execFileAsync(pythonExecutable, [pyPath], { cwd: runtimesDir });
        
        if (fixture.schema.length === 0) {
          // Python empty dataframe CSV is just a newline or empty string
          expect(pyStdout.trim()).toBe('');
        } else {
          const pyLines = pyStdout.split('\n');
          const csvStartIndex = pyLines.findIndex(line => line.includes('SubjectID') || line.includes('"SubjectID"'));
          if (csvStartIndex === -1) throw new Error(`[Python] Could not find CSV output for scenario "${key}"`);
          const pyCsv = parseCsv(pyLines.slice(csvStartIndex).join('\n'));
          compareOutputs(pyCsv, fixture.schema, key, 'Python');
        }
      } else {
        if (process.env['GITHUB_ACTIONS'] === 'true') throw new Error('Python is required in CI');
      }
    });
  }
});
