import { expect, Page } from '@playwright/test';
import { FocusAuditor } from './a11y';

const FIRST_WIZARD_STEP = 1;
const REVIEW_WIZARD_STEP = 6;

export async function openGenerator(page: Page): Promise<void> {
  await page.goto('http://127.0.0.1:4200/generator');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('generator-page')).toBeVisible();
  await expect(page.locator('form')).toBeVisible();
  
  const ackCheckbox = page.locator('#acknowledge');
  const ackLabel = page.getByText('I have read and understand');
  if (await ackLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
    await ackLabel.click();
    await FocusAuditor.assertFocusTransition(page, async () => {
      await page.getByRole('button', { name: /^Next$/i }).click();
      // Wait for step 1 to be active
      await expect(page.locator('#step-header-1')).toHaveClass(/bg-indigo-50/);
      await page.waitForTimeout(300); // give animation a moment to finish
    });
  }
}

export async function loadPreset(page: Page, preset: 'Simple' | 'Standard' | 'Complex'): Promise<void> {
  await page.getByRole('button', { name: new RegExp(`^${preset}$`, 'i') }).click();
}

/**
 * Navigate forward to a wizard step using 1-based numbering.
 * Valid values map to the 6-step generator wizard (1 = Setup, 6 = Review).
 */
export async function goToStep(page: Page, step: number): Promise<void> {
  for (let i = 0; i < Math.max(0, step - FIRST_WIZARD_STEP); i++) {
    await FocusAuditor.assertFocusTransition(page, async () => {
      await page.locator("button:has-text('Next'):visible").first().click();
      await page.waitForTimeout(300);
    });
  }
}

export async function goToReviewStep(page: Page): Promise<void> {
  await goToStep(page, REVIEW_WIZARD_STEP);
  await expect(page.getByRole('button', { name: /Run Statistical QA/i })).toBeVisible();
}

export async function goBackToFirstStep(page: Page): Promise<void> {
  for (let i = 0; i < Math.max(0, REVIEW_WIZARD_STEP - FIRST_WIZARD_STEP); i++) {
    await FocusAuditor.assertFocusTransition(page, async () => {
      await page.getByRole('button', { name: /^Previous$/i }).click();
      await page.waitForTimeout(300);
    });
  }
}

export async function generateSchemaFromPreset(page: Page, preset: 'Simple' | 'Standard' | 'Complex' = 'Complex'): Promise<void> {
  await openGenerator(page);
  await loadPreset(page, preset);
  await goToReviewStep(page);
  await FocusAuditor.assertFocusTransition(page, async () => {
    await page.getByRole('button', { name: /Generate Schema/i }).click();
    await expect(page.locator('#results-section')).toBeVisible({ timeout: 15000 });
  });
}
