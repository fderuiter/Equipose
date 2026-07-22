import { test, expect, Page } from '@playwright/test';
import { openGenerator, loadPreset, goToStep } from './generator-helpers';

async function verifyPayload(page: Page, expectedStrategy: string, checkFn?: (config: any) => void) {
  // Navigate to Step 6 (Review & Generate)
  // We use the specific visible "Next" button in the Enrollment Caps step
  const nextButton = page.locator("button:has-text('Next'):visible").first();
  await nextButton.dispatchEvent('click');

  await expect(page.locator('li#step-header-6')).toHaveClass(/bg-indigo-50/);
  const reviewJson = await page.locator('pre').textContent();
  const config = JSON.parse(reviewJson || '{}');
  expect(config.capStrategy).toBe(expectedStrategy);
  if (checkFn) checkFn(config);

  // Go back to step 5
  await page.getByRole('button', { name: /^Previous$/i }).dispatchEvent('click');
  await expect(page.locator('li#step-header-5')).toHaveClass(/bg-indigo-50/);
}

test.describe('Enrollment Cap Strategy Switching', () => {
  test.beforeEach(async ({ page }) => {
    await openGenerator(page);
    await loadPreset(page, 'Standard');
    // Navigate to Enrollment Caps step (Step 5)
    await goToStep(page, 5);
    await expect(page.locator('li#step-header-5')).toHaveClass(/bg-indigo-50/);
  });

  test('should transition from MANUAL_MATRIX to PROPORTIONAL and compute matrix', async ({ page }) => {
    // 1. Select Proportional strategy
    const propButton = page.getByRole('radio', { name: /Proportional/i });
    await propButton.dispatchEvent('click');
    await expect(propButton).toHaveAttribute('aria-checked', 'true', { timeout: 10000 });

    // 2. Set Global Cap
    const globalCapInput = page.locator('#globalCap');
    await globalCapInput.fill('200');
    await globalCapInput.blur();

    // 3. Set percentages (Standard preset has Age Group: <65, >=65)
    const age65Pct = page.locator('input[id="age-pct-<65"]');
    const ageOver65Pct = page.locator('input[id="age-pct->=65"]');
    await age65Pct.fill('60');
    await age65Pct.blur();
    await ageOver65Pct.fill('40');
    await ageOver65Pct.blur();

    // 4. Assert Compute Matrix is enabled and click it
    const computeButton = page.getByRole('button', { name: /Compute Matrix/i });
    await expect(computeButton).toBeEnabled();
    await computeButton.dispatchEvent('click');

    // 5. Verify computed stratum caps are displayed
    const stratumCapInputs = page.locator('div[formarrayname="stratumCaps"] input[type="number"]');
    await expect(stratumCapInputs).toHaveCount(2);
    await expect(stratumCapInputs.nth(0)).toHaveValue('120');
    await expect(stratumCapInputs.nth(1)).toHaveValue('80');

    // 6. Verify payload
    await verifyPayload(page, 'PROPORTIONAL', (config) => {
      expect(config.globalCap).toBe(200);
      expect(config.stratumCaps[0].cap).toBe(120);
      expect(config.stratumCaps[1].cap).toBe(80);
    });
  });

  test('should transition from PROPORTIONAL to MANUAL_MATRIX when editing a computed cap', async ({ page }) => {
    // 1. Setup Proportional and Compute
    await page.getByRole('radio', { name: /Proportional/i }).dispatchEvent('click');
    await page.locator('#globalCap').fill('100');
    await page.locator('#globalCap').blur();
    // tab
    await page.locator('input[id="age-pct-<65"]').fill('50');
    await page.locator('input[id="age-pct-<65"]').blur();
    // tab
    await page.locator('input[id="age-pct->=65"]').fill('50');
    await page.locator('input[id="age-pct->=65"]').blur();
    // tab
    await page.getByRole('button', { name: /Compute Matrix/i }).dispatchEvent('click');

    // 2. Edit a computed cap
    const firstCapInput = page.locator('div[formarrayname="stratumCaps"] input[type="number"]').first();
    await firstCapInput.fill('60');
    await firstCapInput.blur(); // allow the form logic to react

    // 3. Verify strategy switched to Manual Matrix
    const manualButton = page.getByRole('radio', { name: /Manual Matrix/i });
    await expect(manualButton).toHaveAttribute('aria-checked', 'true', { timeout: 10000 });
    await expect(page.locator('#globalCap')).not.toBeVisible();

    // 4. Verify payload
    await verifyPayload(page, 'MANUAL_MATRIX', (config) => {
      expect(config.stratumCaps[0].cap).toBe(60);
    });
  });

  test('should transition from MANUAL_MATRIX to MARGINAL_ONLY and back', async ({ page }) => {
    // 1. Select Marginal Only
    const marginalButton = page.getByRole('radio', { name: /Marginal Only/i });
    await marginalButton.dispatchEvent('click');
    await expect(marginalButton).toHaveAttribute('aria-checked', 'true', { timeout: 10000 });

    // 2. Set marginal caps
    const age65Marginal = page.locator('input[id="age-margcap-<65"]');
    await age65Marginal.fill('50');
    await age65Marginal.blur();

    // 3. Verify payload
    await verifyPayload(page, 'MARGINAL_ONLY', (config) => {
      const ageFactor = config.strata.find((s: any) => s.id === 'age');
      const levelLess65 = ageFactor.levelDetails.find((l: any) => l.name === '<65');
      expect(levelLess65.marginalCap).toBe(50);
    });

    // 4. Switch back to Manual Matrix
    const manualBtn = page.getByRole('radio', { name: /Manual Matrix/i });
    await manualBtn.dispatchEvent('click');
    await expect(manualBtn).toHaveAttribute('aria-checked', 'true', { timeout: 10000 });
    await verifyPayload(page, 'MANUAL_MATRIX');
  });

  test('should maintain strategy values when switching (no reset)', async ({ page }) => {
    // 1. Set up Proportional
    const propButton = page.getByRole('radio', { name: /Proportional/i });
    await propButton.dispatchEvent('click');
    await expect(propButton).toHaveAttribute('aria-checked', 'true', { timeout: 10000 });
    await page.locator('#globalCap').fill('100');
    await page.locator('#globalCap').blur();
    // tab
    await page.locator('input[id="age-pct-<65"]').fill('50');
    await page.locator('input[id="age-pct-<65"]').blur();
    // tab
    await page.locator('input[id="age-pct->=65"]').fill('50');
    await page.locator('input[id="age-pct->=65"]').blur();
    // tab

    // 2. Switch to Marginal Only and set a cap
    const marginalButton = page.getByRole('radio', { name: /Marginal Only/i });
    await marginalButton.dispatchEvent('click');
    await expect(marginalButton).toHaveAttribute('aria-checked', 'true', { timeout: 10000 });
    await page.locator('input[id="age-margcap-<65"]').fill('20');
    await page.locator('input[id="age-margcap-<65"]').blur();
    // tab

    // 3. Switch back to Proportional - percentages should be preserved
    await propButton.dispatchEvent('click');
    await expect(propButton).toHaveAttribute('aria-checked', 'true', { timeout: 10000 });
    await expect(page.locator('input[id="age-pct-<65"]')).toHaveValue('50');

    // 4. Verify payload
    await verifyPayload(page, 'PROPORTIONAL', (config) => {
      const ageFactor = config.strata.find((s: any) => s.id === 'age');
      expect(ageFactor.levelDetails[0].targetPercentage).toBe(50);
    });
  });
});
