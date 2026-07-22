import { test, expect, Page } from '@playwright/test';
import { generateSchemaFromPreset } from './generator-helpers';

/**
 * Helper: navigate to the generator page and generate a schema using the
 * Complex (Multi-strata) preset, which reliably produces many rows for
 * virtual-scroll verification.
 */
async function generateComplexSchema(page: Page) {
  await generateSchemaFromPreset(page, 'Complex');
}

test.describe('Results Grid Operations', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', err => console.log(`Page Error: ${err.message}`));
    await generateComplexSchema(page);
  });

  // ---------------------------------------------------------------------------
  // Basic grid rendering
  // ---------------------------------------------------------------------------
  test('should display the results grid with at least one data row', async ({ page }) => {
    const rows = page.locator('#results-section [data-testid="result-row"]');
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('should show protocol ID and seed in the results header', async ({ page }) => {
    const header = page.locator('#results-section').first();
    await expect(header.getByText(/Protocol:/i)).toBeVisible();
    await expect(header.getByText(/Seed:/i)).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Table View Verification
  // ---------------------------------------------------------------------------
  test('scrollable table viewport should be present in flat view', async ({ page }) => {
    const viewport = page.locator('#results-section div.overflow-auto');
    await expect(viewport).toBeVisible();
  });

  test('DOM should contain the generated rows', async ({ page }) => {
    const totalRows = await page.locator('#results-section [data-testid="result-row"]').count();
    expect(totalRows).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // Column headers and sorting
  // ---------------------------------------------------------------------------
  test('should show sortable column headers in flat view', async ({ page }) => {
    const subjectIdHeader = page.locator('#results-section thead th').first();
    await expect(subjectIdHeader.getByRole('button', { name: /Sort by Subject ID/i })).toBeVisible();
  });

  test('should show filter icon on Site column', async ({ page }) => {
    const filterBtn = page.locator('#results-section thead').getByRole('button', { name: /Filter Site/i });
    await expect(filterBtn).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Blinding toggle
  // ---------------------------------------------------------------------------
  test('should start in the blinded state', async ({ page }) => {
    const firstRow = page.locator('[data-testid="result-row"]').first();
    const armCell = firstRow.locator('[data-testid="result-arm-cell"]');
    await expect(armCell).toContainText('*** BLINDED ***');
  });

  test('should reveal treatment arms after clicking the blinding toggle', async ({ page }) => {
    const toggleLabel = page.locator('#results-section span.cursor-pointer').filter({ hasText: 'Blinded' });
    await toggleLabel.click();

    const firstRow = page.locator('[data-testid="result-row"]').first();
    const armCell = firstRow.locator('[data-testid="result-arm-cell"]');
    await expect(armCell).not.toContainText('*** BLINDED ***');
    await expect(armCell).not.toBeEmpty();
  });

  test('should re-blind the schema when the toggle is clicked a second time', async ({ page }) => {
    const unblindToggleLabel = page.locator('#results-section span.cursor-pointer').filter({ hasText: 'Blinded' });
    const firstRow = page.locator('[data-testid="result-row"]').first();
    const armCell = firstRow.locator('[data-testid="result-arm-cell"]');

    await unblindToggleLabel.click(); // unblind
    await expect(armCell).not.toContainText('*** BLINDED ***');

    const blindToggleLabel = page.locator('#results-section span.cursor-pointer').filter({ hasText: 'Unblinded' });
    await blindToggleLabel.click(); // re-blind
    await expect(armCell).toContainText('*** BLINDED ***');
  });

  // ---------------------------------------------------------------------------
  // CSV export
  // ---------------------------------------------------------------------------
  test('should trigger a CSV download when the CSV button is clicked', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    const csvButton = page.locator('#results-section').getByRole('button', { name: /CSV/i });
    // Use evaluate to bypass any CSS pointer-events: none
    await csvButton.evaluate((node: HTMLElement) => node.click());
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/randomization_.*\.csv$/);
  });

  test('CSV filename should contain "blinded" when the schema is blinded', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    const csvButton = page.locator('#results-section').getByRole('button', { name: /CSV/i });
    await csvButton.evaluate((node: HTMLElement) => node.click());
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('blinded');
  });

  // ---------------------------------------------------------------------------
  // PDF export
  // ---------------------------------------------------------------------------
  // [REQ-EXPORT-002]
  test('should trigger a PDF download when the PDF button is clicked', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    const pdfButton = page.locator('#results-section').getByRole('button', { name: 'Export as PDF', exact: true });
    await pdfButton.evaluate((node: HTMLElement) => node.click());
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/randomization_.*\.pdf$/);
  });
});
