import { test, expect } from '@playwright/test';
import { checkA11y } from './a11y';

test.describe('Accessibility (WCAG 2.1 AA)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', err => console.log(`Page Error: ${err.message}`));
  });

  test('Landing page should have no critical/serious accessibility violations', async ({ page }) => {
    await page.goto('http://localhost:4200');
    await expect(page.getByRole('heading', { name: /Equipose/i })).toBeVisible();
    await checkA11y(page);
  });

  test('About page should have no critical/serious accessibility violations', async ({ page }) => {
    await page.goto('http://localhost:4200/about');
    await expect(page.getByRole('heading', { name: /About Equipose/i })).toBeVisible();
    await checkA11y(page);
  });

  test('Generator page (configuration wizard) should have no critical/serious accessibility violations', async ({ page }) => {
    await page.goto('http://localhost:4200/generator');
    const complexPresetBtn = page.getByRole('button', { name: /Complex \(Multi-strata\)/i });
    await complexPresetBtn.waitFor({ state: 'visible' });
    await checkA11y(page);
  });

  test('Results grid should have no critical/serious accessibility violations after schema generation', async ({ page }) => {
    await page.goto('http://localhost:4200/generator');

    // Wait for the generator UI to be ready before interacting with it
    const complexPresetBtn = page.getByRole('button', { name: /Complex \(Multi-strata\)/i });
    await complexPresetBtn.waitFor({ state: 'visible' });

    // Load a preset and generate a schema to render the results grid
    await complexPresetBtn.click();

    const generateSchemaBtn = page.getByRole('button', { name: /Generate Schema/i });
    await generateSchemaBtn.click();

    // Wait for results grid to be visible
    const resultsSection = page.locator('#results-section');
    await resultsSection.waitFor({ state: 'visible', timeout: 15000 });

    await checkA11y(page);
  });
});
