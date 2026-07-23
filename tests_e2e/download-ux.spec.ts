import { test, expect } from '@playwright/test';
import { generateSchemaFromPreset, openGenerator, loadPreset, goToReviewStep } from './generator-helpers';

test.describe('Download UX Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', err => console.log(`Page Error: ${err.message}`));
  });

  test('should verify CSV and PDF export buttons in results grid', async ({ page }) => {
    // 1. Generate a schema using Simple preset
    await generateSchemaFromPreset(page, 'Simple');

    const resultsSection = page.locator('#results-section');
    await expect(resultsSection).toBeVisible();

    // 2. Assert CSV button is visible and enabled
    const csvButton = resultsSection.getByRole('button', { name: 'Export as CSV', exact: true });
    await expect(csvButton).toBeVisible();
    await expect(csvButton).toBeEnabled();

    // 3. Verify CSV download triggers
    const csvDownloadPromise = page.waitForEvent('download');
    await csvButton.dispatchEvent('click');
    const csvDownload = await csvDownloadPromise;
    expect(csvDownload.suggestedFilename()).toMatch(/randomization_.*\.csv$/);

    // 4. Assert PDF button is visible and enabled
    const pdfButton = resultsSection.getByRole('button', { name: 'Export as PDF', exact: true });
    await expect(pdfButton).toBeVisible();
    await expect(pdfButton).toBeEnabled();

    // 5. Verify PDF download triggers
    const pdfDownloadPromise = page.waitForEvent('download');
    await pdfButton.dispatchEvent('click');
    const pdfDownload = await pdfDownloadPromise;
    expect(pdfDownload.suggestedFilename()).toMatch(/randomization_.*\.pdf$/);
  });

  test('should verify Code Generator modal UX and download', async ({ page }) => {
    // 1. Navigate to Review & Generate step
    await openGenerator(page);
    await loadPreset(page, 'Simple');
    await goToReviewStep(page);

    // 2. Open Code Generator dropdown and select R Script
    const generateCodeBtn = page.getByRole('button', { name: /Generate Code/i });
    await generateCodeBtn.dispatchEvent('click');
    await page.getByRole('menuitem', { name: /R Script/i }).dispatchEvent('click');

    // 3. Assert modal is visible
    const modal = page.locator('div[role="dialog"]').filter({ hasText: 'Code Generator' });
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: /Code Generator/i })).toBeVisible();

    // 4. Assert Download button in modal is visible and enabled
    const downloadBtn = modal.getByRole('button', { name: /Download/i });
    await expect(downloadBtn).toBeVisible();
    await expect(downloadBtn).toBeEnabled();

    // 5. Verify language tabs update state (R, SAS, Python, Stata)
    const languages = [
      { name: 'R', extension: '.R' },
      { name: 'SAS', extension: '.sas' },
      { name: 'Python', extension: '.py' },
      { name: 'Stata', extension: '.do' }
    ];

    for (const lang of languages) {
      const tab = modal.getByRole('tab', { name: lang.name, exact: true });
      await tab.dispatchEvent('click');
      // Wait for code to refresh (represented by the Download button remaining enabled/visible)
      await expect(downloadBtn).toBeVisible();

      const downloadPromise = page.waitForEvent('download');
      await downloadBtn.dispatchEvent('click');
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain(lang.extension);
    }

    // 6. Close modal
    await modal.getByRole('button', { name: /Close/i }).dispatchEvent('click');
    await expect(modal).toBeHidden();
  });
});
