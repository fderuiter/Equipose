import { test, expect } from '@playwright/test';

test.describe('Update Banner Sticky Layout and Query Mocking', () => {
  test('should display the update banner when mock-update=true is appended to URL', async ({ page }) => {
    // Navigate with the mock-update query parameter
    await page.goto('http://localhost:4200/?mock-update=true');

    const banner = page.locator('app-update-banner');
    await expect(banner).toBeVisible();

    // Verify it is positioned sticky and at top-0
    const bannerBox = await banner.boundingBox();
    expect(bannerBox).not.toBeNull();
    expect(bannerBox!.y).toBe(0);

    const bannerStyle = await banner.evaluate((el) => {
      const computed = window.getComputedStyle(el.firstElementChild as HTMLElement);
      return {
        position: computed.position,
        top: computed.top,
        zIndex: computed.zIndex
      };
    });

    expect(bannerStyle.position).toBe('sticky');
    expect(bannerStyle.top).toBe('0px');
    expect(bannerStyle.zIndex).toBe('40');

    // Verify it naturally displaces the header down
    const header = page.locator('header');
    await expect(header).toBeVisible();
    const headerBox = await header.boundingBox();
    expect(headerBox).not.toBeNull();

    // The header top should start exactly at or below the bottom of the banner
    expect(headerBox!.y).toBeGreaterThanOrEqual(bannerBox!.height);

    // Verify transitions are disabled on the banner
    const bannerContainerStyle = await banner.evaluate((el) => {
      const computed = window.getComputedStyle(el.firstElementChild as HTMLElement);
      return computed.transitionProperty;
    });
    // With transition-none, transitionProperty is typically "none"
    expect(bannerContainerStyle).toBe('none');
  });

  test('should support small viewports down to 320px responsively without clipping', async ({ page }) => {
    // Set viewport to 320px width
    await page.setViewportSize({ width: 320, height: 600 });
    await page.goto('http://localhost:4200/?mock-update=true');

    const banner = page.locator('app-update-banner');
    await expect(banner).toBeVisible();

    // Verify the buttons and text are visible and not clipped
    const reloadBtn = page.getByRole('button', { name: /Reload & Update/i });
    const dismissBtn = page.getByRole('button', { name: /Dismiss update notification/i });

    await expect(reloadBtn).toBeVisible();
    await expect(dismissBtn).toBeVisible();

    // Verify no horizontal overflow in the viewport
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflow).toBe(false);

    // Bounding box checks to ensure buttons are fully on-screen
    const reloadBox = await reloadBtn.boundingBox();
    const dismissBox = await dismissBtn.boundingBox();

    expect(reloadBox).not.toBeNull();
    expect(dismissBox).not.toBeNull();

    expect(reloadBox!.x).toBeGreaterThanOrEqual(0);
    expect(reloadBox!.x + reloadBox!.width).toBeLessThanOrEqual(320);

    expect(dismissBox!.x).toBeGreaterThanOrEqual(0);
    expect(dismissBox!.x + dismissBox!.width).toBeLessThanOrEqual(320);
  });

  test('should dismiss the banner when dismiss button is clicked', async ({ page }) => {
    await page.goto('http://localhost:4200/?mock-update=true');

    const banner = page.locator('app-update-banner');
    await expect(banner).toBeVisible();

    const dismissBtn = page.getByRole('button', { name: /Dismiss update notification/i });
    await dismissBtn.click();

    await expect(banner).toBeHidden();
  });

  test('should show tooltips cleanly with higher stacking z-index', async ({ page }) => {
    await page.goto('http://localhost:4200/?mock-update=true');

    const dismissBtn = page.getByRole('button', { name: /Dismiss update notification/i });
    await dismissBtn.hover();

    const tooltip = page.locator('div[role="tooltip"]');
    await expect(tooltip).toBeVisible();

    // Bounding box of tooltip should display clearly
    const tooltipBox = await tooltip.boundingBox();
    expect(tooltipBox).not.toBeNull();

    const tooltipZIndex = await tooltip.evaluate((el) => {
      return window.getComputedStyle(el).zIndex;
    });

    // Tooltip should stack at higher depth (z-index 9999) compared to banner (z-index 40)
    expect(parseInt(tooltipZIndex, 10)).toBe(9999);
  });
});
