import { test, expect } from '@playwright/test';
import { openGenerator, loadPreset } from './generator-helpers';

test.describe('Wizard Persistence', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', err => console.log(`Page Error: ${err.message}`));
    await openGenerator(page);
  });

  test('should persist basic data and validity when navigating back from Step 2', async ({ page }) => {
    // Step 1: Setup & Metadata (openGenerator lands here)
    await loadPreset(page, 'Standard');
    await expect(page.locator('#protocolId')).toHaveValue('STD-002');

    // Move to Step 2: Algorithm & Arms
    await page.getByRole('button', { name: /^Next$/i }).click({ force: true });
    await expect(page.locator('#step-header-2')).toHaveClass(/bg-indigo-50/);

    // Move back to Step 1
    await page.getByRole('button', { name: /^Previous$/i }).click({ force: true });
    await expect(page.locator('#step-header-1')).toHaveClass(/bg-indigo-50/);

    // Assert data is preserved
    await expect(page.locator('#protocolId')).toHaveValue('STD-002');

    // Assert validity is preserved (Next button should be enabled)
    await expect(page.getByRole('button', { name: /^Next$/i })).toBeEnabled();
  });

  test('should maintain step validity (emerald markers) during full forward-backward traversal', async ({ page }) => {
    await loadPreset(page, 'Standard');

    // Go all the way to Step 6: Review & Generate
    for (let i = 1; i < 6; i++) {
      await page.getByRole('button', { name: /^Next$/i }).click({ force: true });
      // Ensure the step header for the previous step turned emerald (valid)
      await expect(page.locator(`#step-header-${i}`)).toHaveClass(/bg-emerald-50/);
    }

    await expect(page.locator('#step-header-6')).toHaveClass(/bg-indigo-50/);
    await expect(page.getByRole('button', { name: /Generate Schema/i })).toBeEnabled();

    // Go all the way back to Step 1
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: /^Previous$/i }).click({ force: true });
    }

    await expect(page.locator('#step-header-1')).toHaveClass(/bg-indigo-50/);

    // Go forward again and verify emerald markers are still there
    for (let i = 1; i < 6; i++) {
      await page.getByRole('button', { name: /^Next$/i }).click({ force: true });
      await expect(page.locator(`#step-header-${i}`)).toHaveClass(/bg-emerald-50/);
    }

    await expect(page.locator('#step-header-6')).toHaveClass(/bg-indigo-50/);
    await expect(page.getByRole('button', { name: /Generate Schema/i })).toBeEnabled();
  });

  test('should persist modified cap values in Step 5 when navigating forward and back', async ({ page }) => {
    await loadPreset(page, 'Standard');

    // Navigate to Step 5: Enrollment Caps
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: /^Next$/i }).click({ force: true });
    }
    await expect(page.locator('#step-header-5')).toHaveClass(/bg-indigo-50/);

    // Modify the first cap value
    const firstCapInput = page.locator('[formArrayName="stratumCaps"] input').first();
    await firstCapInput.fill('42');
    await firstCapInput.press('Tab');

    // Navigate forward to Step 6
    await page.getByRole('button', { name: /^Next$/i }).click({ force: true });
    await expect(page.locator('#step-header-6')).toHaveClass(/bg-indigo-50/);

    // Navigate back to Step 5
    await page.getByRole('button', { name: /^Previous$/i }).click({ force: true });
    await expect(page.locator('#step-header-5')).toHaveClass(/bg-indigo-50/);

    // Assert modified cap value is preserved
    await expect(firstCapInput).toHaveValue('42');
  });
});
