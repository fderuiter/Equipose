import { test, expect } from '@playwright/test';
import { openGenerator, loadPreset } from './generator-helpers';

test.describe('Determinism Test Suite', () => {
  test('generates identical Audit Hash for the same seed across Chromium, WebKit, and Firefox', async ({ page }) => {
    test.setTimeout(60000);
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

    await openGenerator(page);
    await loadPreset(page, 'Complex');

    await page.fill('input#protocolId', 'DET-100');
    await page.locator('input#subjectIdMask').clear();
    await page.fill('input#subjectIdMask', 'DET-{SITE}-{SEQ:3}');
    
    await page.fill('input#seed', 'deterministic-seed-2026');
    await page.keyboard.press('Tab');
    await page.locator("button:has-text('Next'):visible").first().click();

    await page.getByRole('radio', { name: 'Minimization' }).click({ force: true });
    
    // Wait for the Minimization state to be reflected in the UI
    await expect(page.getByRole('radio', { name: 'Minimization' })).toHaveClass(/bg-brand-600/, { timeout: 10000 });
    await expect(
      page.getByRole('button', { name: /Increase ratio for Low Dose/i })
    ).toBeVisible({ timeout: 15000 });

    await expect(
      page.getByRole('button', { name: /Increase ratio for Placebo/i })
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByRole('button', { name: 'Increase ratio for Low Dose' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Increase ratio for Placebo' })).toBeVisible({ timeout: 15000 });

    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: /Increase ratio for Low Dose/i }).click();
    }
    for (let i = 0; i < 6; i++) {
      await page.getByRole('button', { name: /Increase ratio for Placebo/i }).click();
    }
    await page.locator("button:has-text('Next'):visible").first().click();

    await page.fill('input[id="levelDistage_<65"]', '50');
    await page.fill('input[id="levelDistage_>=65"]', '50');
    await page.fill('input[id="levelDistgender_M"]', '50');
    await page.fill('input[id="levelDistgender_F"]', '50');
    await page.fill('input[id="levelDistregion_NA"]', '50');
    await page.fill('input[id="levelDistregion_EU"]', '50');
    await page.keyboard.press('Tab');
    
    await expect(page.locator("button:has-text('Next'):visible").first()).toBeEnabled();
    await page.locator("button:has-text('Next'):visible").first().click();

    await page.fill('input#baseProbability', '0.8');
    await page.fill('input#totalSampleSize', '100');
    await expect(page.locator("button:has-text('Next'):visible").first()).toBeEnabled();
    await page.locator("button:has-text('Next'):visible").first().click();

    await page.getByRole('radio', { name: 'Marginal Only' }).click();
    await page.fill('input[id="age-margcap-<65"]', '80');
    await page.fill('input[id="age-margcap->=65"]', '80');
    await expect(page.locator("button:has-text('Next'):visible").first()).toBeEnabled();
    await page.locator("button:has-text('Next'):visible").first().click();

    await page.getByRole('button', { name: /Generate Schema/i }).click();

    const toast = page.locator('.toast-error, .p-toast-message, [role="alert"]');
    try {
      if (await toast.first().isVisible({ timeout: 2000 })) {
        console.error("Toast error:", await toast.first().innerText());
      }
    } catch(e) {}

    const resultsSection = page.locator('#results-section');
    await expect(resultsSection).toBeVisible({ timeout: 15000 });

    const auditHashElement = page.locator('[data-testid="audit-hash-value"]');
    await expect(auditHashElement).toBeVisible();

    const hash = await auditHashElement.innerText();
    console.log(`Generated Hash: ${hash}`);
    
    expect(hash).toBe('bee2b6a37476...0a4dc268d78e');
  });
});
