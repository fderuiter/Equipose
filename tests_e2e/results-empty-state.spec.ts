import { test, expect } from '@playwright/test';
import { generateSchemaFromPreset } from './generator-helpers';

test.describe('Results Grid Empty State', () => {
  test.beforeEach(async ({ page }) => {
    // Use Simple preset to avoid virtual scroll complexities for this test
    await generateSchemaFromPreset(page, 'Simple');
  });

  test('should show empty state when filters return no results and allow clearing', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'Filtering is currently not supported in mobile layout');
    // 1. Verify rows are initially present
    const rows = page.locator('[data-testid="result-row"]');
    await expect(rows.first()).toBeVisible();
    const initialCount = await rows.count();
    expect(initialCount).toBeGreaterThan(0);

    // 2. Open Site filter
    const siteFilterBtn = page.getByRole('button', { name: 'Filter Site' });
    await expect(siteFilterBtn).toBeVisible();
    await siteFilterBtn.click({ force: true });

    // 3. Type a non-existent value in the search input
    // Using a more flexible locator for the search input
    const searchInput = page.locator('input[placeholder^="Search"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill('NON_EXISTENT_SITE_XYZ_123');

    // 4. Assert empty state message is visible
    // The text is "No subjects match the current filters."
    await expect(page.getByText('No subjects match the current filters.')).toBeVisible();

    // 5. Assert Clear Filters button is visible and click it
    const clearFiltersBtn = page.getByRole('button', { name: /Clear Filters/i });
    await expect(clearFiltersBtn).toBeVisible();
    await clearFiltersBtn.click({ force: true });

    // 6. Assert rows are visible again
    await expect(rows.first()).toBeVisible();
    const afterClearCount = await rows.count();
    expect(afterClearCount).toBe(initialCount);
  });
});
