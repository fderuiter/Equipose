import { test as base, expect } from './fixtures';
import { Page } from '@playwright/test';
import { execFile } from 'child_process';
import { mkdir, readFile, rm, writeFile, copyFile } from 'fs/promises';
import { join, resolve } from 'path';
import { promisify } from 'util';
import { goToStep, loadPreset, openGenerator } from './generator-helpers';
import { commandExists, getRscriptCandidates, resolveExecutable } from '../src/testing/runtime-command.util';

type Language = 'R' | 'Python' | 'SAS' | 'Stata';

type ScenarioDefinition = {
  id: string;
  protocolId: string;
  configure: (page: Page) => Promise<void>;
};

type ScriptFixture = {
  exportScenarioScripts: (scenario: ScenarioDefinition) => Promise<void>;
};

const artifactRoot = resolve(process.cwd(), 'artifacts', 'code-generation-fixtures');
const execFileAsync = promisify(execFile);

const languageTabs: { language: Language; tabName: RegExp; extension: string; marker: string }[] = [
  { language: 'R', tabName: /^R$/i, extension: 'R', marker: 'init_mt' },
  { language: 'Python', tabName: /^Python$/i, extension: 'py', marker: 'import pandas as pd' },
  { language: 'SAS', tabName: /^SAS$/i, extension: 'sas', marker: '%let seed' },
  { language: 'Stata', tabName: /^Stata$/i, extension: 'do', marker: 'mata:' },
];

const test = base.extend<ScriptFixture>({
  exportScenarioScripts: async ({ page }, use, testInfo) => {
    await use(async scenario => {
      page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
      await openGenerator(page);
      await scenario.configure(page);
      const generateSchemaBtn = page.getByRole('button', { name: /Generate Schema/i });
      await expect(generateSchemaBtn).toBeVisible({ timeout: 10_000 });
      await expect(generateSchemaBtn).toBeEnabled();
      await generateSchemaBtn.dispatchEvent('click');

      const workerRoot = join(artifactRoot, testInfo.project.name || "default");
      const scenarioDir = join(workerRoot, scenario.id);
      await mkdir(scenarioDir, { recursive: true });
      const files: { language: Language; file: string }[] = [];

      const generateCodeBtn = page.getByRole('button', { name: /Generate Code/i });
      await expect(generateCodeBtn).toBeVisible();
      await generateCodeBtn.dispatchEvent('click');
      await page.getByRole('menuitem', { name: /R Script/i }).first().dispatchEvent('click');

      const modal = page.getByRole('dialog', { name: 'Code Generator' });
      await expect(modal).toBeVisible({ timeout: 10_000 });
      const codeBlock = modal.getByTestId('generated-code');
      await expect(codeBlock).toContainText(new RegExp(scenario.protocolId), { timeout: 10_000 });

      for (const { language, tabName, extension, marker } of languageTabs) {
        await modal.getByRole('tab', { name: tabName }).dispatchEvent('click');
        await page.waitForTimeout(200);

        await expect(codeBlock).toContainText(new RegExp(scenario.protocolId), { timeout: 10_000 });
        await expect(codeBlock).toContainText(marker, { timeout: 10_000 });

        const downloadPromise = page.waitForEvent('download', { timeout: 10_000 });
        await modal.getByRole('button', { name: /Download/i }).first().dispatchEvent('click');
        const download = await downloadPromise;

        const outputFile = `${scenario.id}.${extension}`;
        await download.saveAs(join(scenarioDir, outputFile));
        files.push({ language, file: outputFile });
      }

      await modal.getByRole('button', { name: /Close/i }).first().dispatchEvent('click');

      // Copy the mt19937 dependency so the generated R script can source it locally.
      await copyFile(
        resolve(process.cwd(), 'src/app/domain/randomization-engine/runtimes/mt19937_v1.0.0.r'),
        join(scenarioDir, 'mt19937_v1.0.0.r')
      );

      await writeFile(
        join(scenarioDir, 'manifest.json'),
        JSON.stringify({ scenario: scenario.id, protocolId: scenario.protocolId, files }, null, 2),
        'utf-8',
      );
    });
  },
});

test.describe.configure({ mode: 'serial' });

test.describe('Code generation fixtures for script execution checks', () => {
  test.skip(process.env.CODEGEN_FIXTURES !== '1', 'Runs only in dedicated code-generation fixture CI job.');
  test.setTimeout(420_000);

  const assertSubprocessSuccess = async (
    command: string,
    args: string[],
    description: string,
    options?: { env?: NodeJS.ProcessEnv; cwd?: string },
  ): Promise<void> => {
    try {
      await execFileAsync(command, args, {
        cwd: options?.cwd ?? process.cwd(),
        maxBuffer: 10 * 1024 * 1024,
        env: options?.env ?? process.env,
      });
    } catch (error) {
      const failure = error as {
        code?: number;
        message: string;
        stdout?: string;
        stderr?: string;
      };
      throw new Error(
        `${description} failed (exit code: ${failure.code ?? 'unknown'}).\n` +
        `Command: ${command} ${args.join(' ')}\n` +
        `stdout:\n${failure.stdout ?? ''}\n` +
        `stderr:\n${failure.stderr ?? ''}\n` +
        `error: ${failure.message}`,
      );
    }
  };

  test.beforeAll(async () => {
    await rm(artifactRoot, { recursive: true, force: true });
    await mkdir(artifactRoot, { recursive: true });
  });

  test('exports representative complex schemas and scripts for CI artifacts', async ({ page, exportScenarioScripts }, testInfo) => {
    const workerRoot = join(artifactRoot, testInfo.project.name || "default");
    const scenarios: ScenarioDefinition[] = [
      {
        id: 'block',
        protocolId: 'FXT-BLOCK-001',
        configure: async (currentPage: Page) => {
          await loadPreset(currentPage, 'Simple');
          await currentPage.locator('#protocolId').fill('FXT-BLOCK-001');
          await currentPage.locator('#studyName').fill('Fixture Block Scenario');
          await goToStep(currentPage, 4);
          await currentPage.locator('#blockSizesStr').fill('4, 6');
          const val = await currentPage.locator('#blockSizesStr').inputValue();
          console.log('blockSizesStr value after fill:', val);
          await currentPage.getByRole('button', { name: /^Next$/i }).dispatchEvent('click');
          await currentPage.getByRole('button', { name: /^Next$/i }).dispatchEvent('click');
        },
      },
      {
        id: 'minimization-only',
        protocolId: 'FXT-MIN-ONLY-001',
        configure: async (currentPage: Page) => {
          await loadPreset(currentPage, 'Simple');
          await currentPage.locator('#protocolId').fill('FXT-MIN-ONLY-001');
          await currentPage.locator('#studyName').fill('Fixture Minimization Only Scenario');
          await goToStep(currentPage, 2);
          await currentPage.getByRole('radio', { name: 'Minimization' }).first().dispatchEvent('click');
          await currentPage.getByRole('button', { name: /^Next$/i }).dispatchEvent('click');
          await currentPage.getByRole('button', { name: /\+ Add Factor/i }).dispatchEvent('click');
          const firstStratum = currentPage.locator('[formArrayName="strata"] > div').first();
          await firstStratum.locator('#factorName0').fill('Biomarker Group');
          const levelsInput = firstStratum.locator('app-tag-input input').first();
          await levelsInput.fill('High');
          await levelsInput.press('Enter');
          await levelsInput.fill('Low');
          await levelsInput.press('Enter');
          const probabilityInputs = firstStratum.locator('input[type="number"]');
          await probabilityInputs.nth(0).fill('40');
          await probabilityInputs.nth(1).fill('60');
          await currentPage.getByRole('button', { name: /^Next$/i }).dispatchEvent('click');
          await currentPage.getByRole('button', { name: /^Next$/i }).dispatchEvent('click');
          await currentPage.getByRole('radio', { name: 'Marginal Only' }).first().dispatchEvent('click');
          const margCapInputs = currentPage.locator('input[id*="-margcap-"]');
          await margCapInputs.nth(0).fill('100');
          await margCapInputs.nth(1).fill('100');
          await currentPage.getByRole('button', { name: /^Next$/i }).dispatchEvent('click');
        },
      },
      {
        id: 'zero-cap',
        protocolId: 'FXT-ZERO-CAP-001',
        configure: async (currentPage: Page) => {
          await loadPreset(currentPage, 'Standard');
          await currentPage.locator('#protocolId').fill('FXT-ZERO-CAP-001');
          await currentPage.locator('#studyName').fill('Fixture Zero Cap Scenario');
          await goToStep(currentPage, 5);
          await currentPage.getByRole('radio', { name: 'Manual Matrix' }).first().dispatchEvent('click');
          const capRows = currentPage.locator('[formArrayName="stratumCaps"] > div');
          const capCount = await capRows.count();
          for (let capIndex = 0; capIndex < capCount; capIndex++) {
            await capRows.nth(capIndex).locator('input').fill('0');
          }
          await currentPage.getByRole('button', { name: /^Next$/i }).dispatchEvent('click');
        },
      },
      {
        id: 'multi-strata',
        protocolId: 'FXT-MULTI-001',
        configure: async (currentPage: Page) => {
          await loadPreset(currentPage, 'Complex');
          await currentPage.locator('#protocolId').fill('FXT-MULTI-001');
          await currentPage.locator('#studyName').fill('Fixture Multi-Strata Scenario');
          await goToStep(currentPage, 6);
        },
      },
      {
        id: 'cap-strategy',
        protocolId: 'FXT-CAP-001',
        configure: async (currentPage: Page) => {
          await loadPreset(currentPage, 'Complex');
          await currentPage.locator('#protocolId').fill('FXT-CAP-001');
          await currentPage.locator('#studyName').fill('Fixture Cap Strategy Scenario');
          await goToStep(currentPage, 5);
          await currentPage.getByRole('radio', { name: 'Proportional' }).first().dispatchEvent('click');
          await currentPage.locator('#globalCap').fill('120');
          await currentPage.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll("input[id*='-pct-']")) as HTMLInputElement[];
            const byFactor = new Map<string, HTMLInputElement[]>();
            for (const input of inputs) {
              const factorId = input.id.split('-pct-')[0];
              const entries = byFactor.get(factorId) ?? [];
              entries.push(input);
              byFactor.set(factorId, entries);
            }
            for (const group of byFactor.values()) {
              group.forEach((input, index) => {
                input.value = index === 0 ? '100' : '0';
                input.dispatchEvent(new Event('input', { bubbles: true }));
              });
            }
          });
          await currentPage.getByRole('button', { name: /Compute Matrix/i }).dispatchEvent('click');
          await currentPage.getByRole('button', { name: /^Next$/i }).dispatchEvent('click');
        },
      },
      {
        id: 'unicode-character-labels',
        protocolId: 'FXT-UNICODE-001',
        configure: async (currentPage: Page) => {
          await loadPreset(currentPage, 'Simple');
          await currentPage.locator('#protocolId').fill('FXT-UNICODE-001');
          await currentPage.locator('#studyName').fill('Fixture Unicode Labels Scenario');
          await goToStep(currentPage, 2);
          await currentPage.locator('#armName0').fill('Dose α/β');
          await currentPage.locator('#armName1').fill('Placebo™ & Control');
          await currentPage.getByRole('button', { name: /^Next$/i }).dispatchEvent('click');
          const sitesInput = currentPage.locator('#sitesLabel + app-tag-input input');
          await sitesInput.fill('Site-Ω-01');
          await sitesInput.press('Enter');
          await currentPage.getByRole('button', { name: /\+ Add Factor/i }).dispatchEvent('click');
          const firstStratum = currentPage.locator('[formArrayName="strata"] > div').first();
          await firstStratum.locator('#factorName0').fill('Éligibilité-Group');
          const levelsInput = firstStratum.locator('app-tag-input input').first();
          await levelsInput.fill('≤50yrs');
          await levelsInput.press('Enter');
          await levelsInput.fill('>50yrs naïve');
          await levelsInput.press('Enter');
          await currentPage.getByRole('button', { name: /^Next$/i }).dispatchEvent('click');
          await currentPage.getByRole('button', { name: /^Next$/i }).dispatchEvent('click');
          await currentPage.getByRole('button', { name: /^Next$/i }).dispatchEvent('click');
        },
      },
      {
        id: 'weird-chars',
        protocolId: 'FXT-WEIRD-001',
        configure: async (currentPage: Page) => {
          await loadPreset(currentPage, 'Simple');
          await currentPage.locator('#protocolId').fill('FXT-WEIRD-001');
          await currentPage.locator('#studyName').fill('Fixture Weird Characters Scenario');
          await goToStep(currentPage, 3);
          await currentPage.getByRole('button', { name: /\+ Add Factor/i }).dispatchEvent('click');
          const firstStratum = currentPage.locator('[formArrayName="strata"] > div').first();
          await firstStratum.locator('#factorName0').fill('Special Group');
          const levelsInput = firstStratum.locator('app-tag-input input').first();
          await levelsInput.fill("O'Brien");     // single quote
          await levelsInput.press('Enter');
          await levelsInput.fill('Type "A"');    // double quote
          await levelsInput.press('Enter');
          await levelsInput.fill('C:\\path');    // backslash (JS = C:\path)
          await levelsInput.press('Enter');
          await levelsInput.fill('α-Ω type');   // Unicode BMP characters
          await levelsInput.press('Enter');
          await levelsInput.fill('semi;colon');  // semicolon
          await levelsInput.press('Enter');
          await currentPage.waitForTimeout(500);
          await currentPage.getByRole('button', { name: /^Next$/i }).dispatchEvent('click');
          await currentPage.getByRole('button', { name: /^Next$/i }).dispatchEvent('click');
          await currentPage.getByRole('button', { name: /^Next$/i }).dispatchEvent('click');
        },
      },
    ];

    for (const scenario of scenarios) {
      await exportScenarioScripts(scenario);
    }

    const summary = await Promise.all(
      scenarios.map(async scenario => {
        const manifestPath = join(workerRoot, scenario.id, 'manifest.json');
        const raw = await readFile(manifestPath, 'utf-8');
        return JSON.parse(raw) as { scenario: string; files: Array<{ file: string }> };
      }),
    );

    expect(summary).toHaveLength(7);
    summary.forEach(entry => expect(entry.files).toHaveLength(4));
    expect(summary.map(entry => entry.scenario)).toEqual(expect.arrayContaining(scenarios.map(scenario => scenario.id)));

    // Verify structural properties against the UI schema configuration
    // (Requirement: Structural Parity Verification)
    const blockSas = await readFile(join(workerRoot, 'block', 'block.sas'), 'utf-8');
    const blockStata = await readFile(join(workerRoot, 'block', 'block.do'), 'utf-8');
    expect(blockSas).toContain('%let block_sizes = 4 6;');
    expect(blockStata).toContain('local block_1 4');
    expect(blockStata).toContain('local block_2 6');

    const zeroCapStata = await readFile(join(workerRoot, 'zero-cap', 'zero-cap.do'), 'utf-8');
    const zeroCapAssignments = [...zeroCapStata.matchAll(/local cap = (\d+)/g)].map(match => Number(match[1]));
    expect(zeroCapAssignments.length).toBeGreaterThan(0);
    expect(zeroCapAssignments.every(cap => cap === 0)).toBe(true);

    const minimizationOnlyContents = await Promise.all([
      readFile(join(workerRoot, 'minimization-only', 'minimization-only.R'), 'utf-8'),
      readFile(join(workerRoot, 'minimization-only', 'minimization-only.py'), 'utf-8'),
      readFile(join(workerRoot, 'minimization-only', 'minimization-only.sas'), 'utf-8'),
      readFile(join(workerRoot, 'minimization-only', 'minimization-only.do'), 'utf-8'),
    ]);
    minimizationOnlyContents.forEach(content => {
      expect(content).toContain('Algorithm: Pocock-Simon Minimization');
    });

    // Verify special characters are properly escaped in all four generated languages.
    const weirdCharsR     = await readFile(join(workerRoot, 'weird-chars', 'weird-chars.R'),   'utf-8');
    const weirdCharsPy    = await readFile(join(workerRoot, 'weird-chars', 'weird-chars.py'),  'utf-8');
    const weirdCharsSas   = await readFile(join(workerRoot, 'weird-chars', 'weird-chars.sas'), 'utf-8');
    const weirdCharsStata = await readFile(join(workerRoot, 'weird-chars', 'weird-chars.do'),  'utf-8');

    // R: single quote passes through; double-quote and backslash are escaped.
    expect(weirdCharsR).toContain(`"O'Brien"`);
    expect(weirdCharsR).toContain('"Type \\"A\\""');
    expect(weirdCharsR).toContain('"C:\\\\path"');
    expect(weirdCharsR).toContain('"α-Ω type"');
    expect(weirdCharsR).toContain('"semi;colon"');

    // Python: identical escape rules to R.
    expect(weirdCharsPy).toContain(`"O'Brien"`);
    expect(weirdCharsPy).toContain('"Type \\"A\\""');
    expect(weirdCharsPy).toContain('"C:\\\\path"');
    expect(weirdCharsPy).toContain('"α-Ω type"');
    expect(weirdCharsPy).toContain('"semi;colon"');

    // SAS: double-quote is doubled; backslash is literal.
    expect(weirdCharsSas).toContain(`"O'Brien"`);
    expect(weirdCharsSas).toContain('"Type ""A"""');
    expect(weirdCharsSas).toContain('"C:\\path"');
    expect(weirdCharsSas).toContain('"α-Ω type"');
    expect(weirdCharsSas).toContain('"semi;colon"');

    // Stata: compound double-quotes `"..."' allow all chars; backslash is literal.
    expect(weirdCharsStata).toContain("`\"O'Brien\"'");
    expect(weirdCharsStata).toContain('`"Type "A""\'');
    expect(weirdCharsStata).toContain('`"C:\\path"\'');
    expect(weirdCharsStata).toContain('`"α-Ω type"\'');
    expect(weirdCharsStata).toContain('`"semi;colon"\'');

    const pythonExecutable = process.env.PYTHON || 'python3';

    const pythonScripts = scenarios.map(scenario => ({ path: join(workerRoot, scenario.id, `${scenario.id}.py`), dir: join(workerRoot, scenario.id) }));
    const hasPython = await commandExists(pythonExecutable, {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024,
    });
    expect(hasPython).toBe(true);

    await assertSubprocessSuccess(
      pythonExecutable,
      ['-c', 'import numpy, pandas'],
      'Python dependency preflight check for generated scripts',
    );

    for (const { path: scriptPath, dir: scriptDir } of pythonScripts) {
      await assertSubprocessSuccess(
        pythonExecutable,
        [scriptPath],
        `Generated Python script execution (${scriptPath})`,
        { env: { ...process.env, PYTHON: pythonExecutable }, cwd: scriptDir },
      );
    }

    const rscriptExecutable = await resolveExecutable(getRscriptCandidates(), {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024,
    });
    if (rscriptExecutable) {
      for (const scenario of scenarios) {
        const workerRoot = join(artifactRoot, testInfo.project.name || "default");
        const scenarioDir = join(workerRoot, scenario.id);
        const scriptPath = join(scenarioDir, `${scenario.id}.R`);
        await assertSubprocessSuccess(rscriptExecutable, [scriptPath], `Generated R script execution (${scriptPath})`, {
          cwd: scenarioDir
        });
      }
    } else if (process.env.GITHUB_ACTIONS === 'true') {
      throw new Error('Rscript is required in CI for generated R script execution checks.');
    }

    await assertSubprocessSuccess('node', ['scripts/validate-sas-syntax.mjs'], 'Generated SAS script static validation');
  });
});
