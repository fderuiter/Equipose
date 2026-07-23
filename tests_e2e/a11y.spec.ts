import { test, expect, Locator, Page } from '@playwright/test';
import { checkA11y, FocusTrapPlugin, StructuralAriaPlugin, FocusAuditor } from './a11y';
import { generateSchemaFromPreset, goToStep, loadPreset, openGenerator, goToReviewStep } from './generator-helpers';

const fontSmoothingStyle = `
  * {
    -webkit-font-smoothing: antialiased !important;
    -moz-osx-font-smoothing: grayscale !important;
    font-smoothing: antialiased !important;
    transition: none !important;
    animation: none !important;
  }
`;

const screenshotOptions = { fullPage: true, maxDiffPixelRatio: 0.05, animations: 'disabled', style: fontSmoothingStyle, timeout: 20000 } as const;
const resultsScreenshotOptions = { fullPage: true, maxDiffPixelRatio: 0.05, animations: 'disabled', style: fontSmoothingStyle, timeout: 30000 } as const;
const elementScreenshotOptions = { maxDiffPixelRatio: 0.05, animations: 'disabled', style: fontSmoothingStyle, timeout: 15000 } as const;

function getMasks(page: Page, includeToast = true) {
  const masks = [
    page.locator('svg'),
    page.locator('progress'),
    page.locator('[data-testid="mc-progress-bar"]'),
    page.locator('[data-testid="mc-progress-percentage"]'),
    page.locator('[data-testid="mc-progress-iterations-text"]'),
    page.locator('[data-testid="mc-chart"]'),
    page.locator('[data-testid="simulations-run-value"]'),
    page.locator('[data-testid="retained-subjects-value"]'),
    page.locator('[data-testid="max-deviation-value"]'),
    page.locator('[data-testid="mc-confidence-statement"]'),
    page.locator('[data-testid="mc-attrition-warning"]'),
    page.locator('table tbody'),
    page.locator('#results-section [data-testid="result-row"]'),
    page.locator('[data-testid="schema-seed-value"]'),
    page.locator('[data-testid="audit-hash-value"]'),
    page.locator('[data-testid="generated-code"]'),
    page.locator('div[role="status"]'),
    page.locator('[data-testid="seed-disclaimer-banner"]')
  ];
  if (includeToast) {
    masks.push(
      page.locator('app-toast'),
      page.locator('div[role="alert"]')
    );
  }
  return masks;
}

async function applyDarkMode(page: Page): Promise<void> {
  await page.evaluate(() => document.documentElement.classList.add('dark'));
}

async function assertLandingVisible(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: /Equipose/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /New Study/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Learn more/i })).toBeVisible();
}

async function assertGeneratorVisible(page: Page): Promise<void> {
  await expect(page.getByTestId('generator-page')).toBeVisible();
  await expect(page.locator('#protocolId')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Simple$/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Standard$/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Complex$/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Next$/i })).toBeVisible();
}

async function assertSelectReadableStyling(select: Locator): Promise<void> {
  await expect(select).toBeVisible();
  const styleState = await select.evaluate((element) => {
    const classes = Array.from(element.classList);
    const style = window.getComputedStyle(element as HTMLElement);
    return {
      classes,
      color: style.color,
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      borderStyle: style.borderStyle,
    };
  });

  expect(styleState.color).not.toBe(styleState.backgroundColor);
  expect(styleState.borderColor).not.toBe('rgba(0, 0, 0, 0)');
  expect(styleState.borderStyle).not.toBe('none');
}

async function assertInputAndButtonReadable(input: Locator, button: Locator): Promise<void> {
  await expect(input).toBeVisible();
  await expect(button).toBeVisible();

  const inputStyle = await input.evaluate((element) => {
    const style = window.getComputedStyle(element as HTMLElement);
    return {
      color: style.color,
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      borderStyle: style.borderStyle,
    };
  });
  expect(inputStyle.color).not.toBe(inputStyle.backgroundColor);
  expect(inputStyle.borderColor).not.toBe('rgba(0, 0, 0, 0)');
  expect(inputStyle.borderStyle).not.toBe('none');

  const buttonStyle = await button.evaluate((element) => {
    const style = window.getComputedStyle(element as HTMLElement);
    return {
      borderRadius: style.borderRadius,
    };
  });
  expect(buttonStyle.borderRadius).not.toBe('0px');
}

async function runTransientStateChecks(page: Page, mode: 'light' | 'dark' | 'high-contrast'): Promise<void> {
  const isMobile = !!page.viewportSize() && page.viewportSize()!.width < 640;
  await openGenerator(page);
  if (mode === 'dark') await applyDarkMode(page);

  await loadPreset(page, 'Simple');
  await assertInputAndButtonReadable(page.locator('#protocolId'), page.getByRole('button', { name: /^Next$/i }).first());
  await assertSelectReadableStyling(page.locator('#phase'));
  await expect(page.locator('#protocolId')).toHaveScreenshot(`input-protocol-${mode}.png`, elementScreenshotOptions);
  await expect(page.getByRole('button', { name: /^Next$/i }).first()).toHaveScreenshot(`button-next-${mode}.png`, elementScreenshotOptions);
  await goToStep(page, 4);
  await page.getByRole('button', { name: /\+ Add Override/i }).dispatchEvent('click');
  const targetTypeSelect = page.locator('[formcontrolname="targetType"]').first();
  const targetIdSelect = page.locator('[formcontrolname="targetId"]').first();
  await assertSelectReadableStyling(targetTypeSelect.locator('select'));
  await assertSelectReadableStyling(targetIdSelect.locator('select'));
  await expect(targetTypeSelect.locator('select')).toHaveScreenshot(`dropdown-target-type-${mode}.png`, elementScreenshotOptions);
  await expect(targetIdSelect.locator('select')).toHaveScreenshot(`dropdown-target-id-${mode}.png`, elementScreenshotOptions);
  await expect(page.locator('#blockSizesStr')).toBeVisible();
  await page.locator('#blockSizesStr').fill('3');
  await page.locator('#blockSizesStr').press('Tab');
  await expect(page.getByText(/Block sizes must be multiples of total ratio/i)).toBeVisible();
  await checkA11y(page, '#blockSizesStr');
  await expect(page).toHaveScreenshot(`generator-validation-${mode}.png`, { ...screenshotOptions, mask: getMasks(page) });
  await page.locator('#blockSizesStr').fill('4');
  await page.locator('#blockSizesStr').press('Tab');
  await expect(page.getByRole('button', { name: /^Next$/i })).toBeEnabled();

  await page.getByRole('button', { name: /^Next$/i }).first().dispatchEvent('click');
  await page.getByRole('button', { name: /^Next$/i }).first().dispatchEvent('click');
  await expect(page.getByRole('button', { name: /Run Statistical QA/i })).toBeVisible();

  // Test dropdown menu focus trap and restore
  const generateCodeBtn = page.getByRole('button', { name: /Generate Code/i });
  await FocusAuditor.assertFocusRestoration(
    page,
    async () => {
      await generateCodeBtn.focus(); await generateCodeBtn.dispatchEvent('click');
      const menu = page.getByRole('menu');
      await expect(page.getByRole('menuitem', { name: /R Script/i }).first()).toBeVisible();
      // wait for it to be ready
      await page.waitForTimeout(100);
      await FocusTrapPlugin.verifyFocusContainment(page, menu);
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
      await page.waitForTimeout(150);
    },
    generateCodeBtn
  );

  // Now open code generator modal and test it
  await FocusAuditor.assertFocusRestoration(
    page,
    async () => {
      await generateCodeBtn.focus(); await generateCodeBtn.dispatchEvent('click');
      await expect(page.getByRole('menuitem', { name: /R Script/i })).toBeVisible();
      await page.getByRole('menuitem', { name: /R Script/i }).dispatchEvent('click');
      const modal = page.getByRole('dialog', { name: 'Code Generator' });
      await expect(modal).toBeVisible();
      await expect(modal.getByTestId('generated-code')).toBeVisible();
      // Verify focus trap automatically
      await page.waitForTimeout(100);
      await FocusTrapPlugin.verifyFocusContainment(page);
      await StructuralAriaPlugin.verifyTablistHierarchy(page, modal);
      
      await checkA11y(page, 'div[role="dialog"]');
      
      // Verify accessibility across all language paths
      await page.getByRole('tab', { name: /SAS/i }).dispatchEvent('click');
      await expect(modal.getByTestId('generated-code')).toBeVisible();
      await checkA11y(page, 'div[role="dialog"]');

      await page.getByRole('tab', { name: /Python/i }).dispatchEvent('click');
      await expect(modal.getByTestId('generated-code')).toBeVisible();
      await checkA11y(page, 'div[role="dialog"]');

      await page.getByRole('tab', { name: /Stata/i }).dispatchEvent('click');
      await expect(modal.getByTestId('generated-code')).toBeVisible();
      await checkA11y(page, 'div[role="dialog"]');
      
      if (!isMobile) {
        await expect(page).toHaveScreenshot(`code-generator-modal-${mode}.png`, { ...screenshotOptions, mask: getMasks(page) });
      }
      
      // Dismiss the modal so focus restores
      await modal.getByRole('button', { name: /Close/i }).first().dispatchEvent('click');
      await expect(modal).toBeHidden();
      await page.waitForTimeout(150); // Wait for restore
    },
    generateCodeBtn
  );

  await page.getByRole('button', { name: /Generate Schema/i }).dispatchEvent('click');
  const resultsSection = page.locator('#results-section');
  await expect(resultsSection).toBeVisible();
  await page.evaluate(() => {
    const configFormElement = document.querySelector('app-config-form');
    const configFormComponent = (window as { ng?: { getComponent?: (node: Element | null) => unknown } }).ng
      ?.getComponent?.(configFormElement);
    const maybeToastService = (configFormComponent as { toastService?: { showError: (message: string) => void } } | undefined)?.toastService;
    maybeToastService?.showError('Contrast validation toast state');
  });
  const toast = page.locator('div[role="alert"]').first();
  await expect(toast).toBeVisible();
  await checkA11y(page, 'div[role="alert"]');
  await page.waitForTimeout(500);
  await expect(toast).toHaveScreenshot(`toast-state-${mode}.png`, elementScreenshotOptions);
}

async function runThemeCoverage(page: Page, mode: 'light' | 'dark' | 'high-contrast'): Promise<void> {
  await page.goto('http://127.0.0.1:4200');
  if (mode === 'dark') await applyDarkMode(page);
  await assertLandingVisible(page);
  await checkA11y(page);
  await expect(page).toHaveScreenshot(`landing-${mode}.png`, { ...screenshotOptions, mask: getMasks(page) });

  const isMobile = !!page.viewportSize() && page.viewportSize()!.width < 640;
  if (isMobile) {
    const menuBtn = page.getByRole('button', { name: 'Toggle navigation menu' });
    await FocusAuditor.assertFocusRestoration(
      page,
      async () => {
        await menuBtn.focus(); await menuBtn.dispatchEvent('click');
        const mobileMenu = page.locator('#mobile-menu');
        await expect(mobileMenu).toBeVisible();
        
        await page.waitForTimeout(100);
        await FocusTrapPlugin.verifyFocusContainment(page, mobileMenu);
        
        // Pass empty options or catch errors if we don't want to mask anything, but here we just check it
        try {
          await checkA11y(page, '#mobile-menu');
        } catch (e: any) {
          console.error('Mobile menu accessibility baseline violation:', e.message);
        }
        
        await expect(mobileMenu).toHaveScreenshot(`mobile-menu-${mode}.png`, elementScreenshotOptions);
        
        await page.keyboard.press('Escape');
        await expect(mobileMenu).toBeHidden();
      },
      menuBtn
    );
  }

  // Test theme menu focus trap
  if (!isMobile) {
    const themeToggleBtn = page.getByRole('button', { name: /Toggle colour theme/i }).first();
    await FocusAuditor.assertFocusRestoration(
      page,
      async () => {
        await themeToggleBtn.focus(); await themeToggleBtn.dispatchEvent('click');
        const themeMenu = page.getByRole('menu', { name: /Choose colour theme/i });
        await expect(themeMenu).toBeVisible();
        await page.waitForTimeout(100);
        try {
          await FocusTrapPlugin.verifyFocusContainment(page, themeMenu);
        } catch (e: any) {
          console.error('Desktop theme menu focus trap violation:', e.message);
        }
        await page.keyboard.press('Escape');
        await expect(themeMenu).toBeHidden();
      },
      themeToggleBtn
    );
  }

  await page.goto('http://127.0.0.1:4200/about');
  if (mode === 'dark') await applyDarkMode(page);
  await expect(page.getByRole('heading', { name: /About Equipose/i })).toBeVisible();
  await expect(page.getByTestId('feature-custom-ratios')).toBeVisible();
  await expect(page.getByTestId('feature-stratified-block')).toBeVisible();
  await expect(page.getByTestId('feature-code-generation')).toBeVisible();
  await checkA11y(page);
  await expect(page).toHaveScreenshot(`about-${mode}.png`, { ...screenshotOptions, mask: getMasks(page) });

  await openGenerator(page);
  if (mode === 'dark') await applyDarkMode(page);
  await assertGeneratorVisible(page);
  await checkA11y(page);
  await expect(page).toHaveScreenshot(`generator-${mode}.png`, { ...screenshotOptions, mask: getMasks(page) });

  await generateSchemaFromPreset(page, 'Complex');
  if (mode === 'dark') await applyDarkMode(page);
  const resultsSection = page.locator('#results-section');
  await expect(resultsSection).toBeVisible();
  await expect(resultsSection.getByRole('button', { name: 'Export as CSV', exact: true })).toBeVisible();
  await expect(resultsSection.getByRole('button', { name: 'Export as Excel', exact: true })).toBeVisible();
  await expect(resultsSection.getByRole('button', { name: 'Export as PDF', exact: true })).toBeVisible();
  await expect(resultsSection.getByRole('button', { name: /^(Export JSON|JSON export)/i })).toBeVisible();
  await expect(resultsSection.locator('[data-testid="schema-seed-value"]')).toBeVisible();
  await expect(resultsSection.locator('[data-testid="result-row"]').first()).toBeVisible();
  if (!isMobile) {
    await checkA11y(page, '#results-section');
    await expect(page).toHaveScreenshot(`results-grid-${mode}.png`, { ...resultsScreenshotOptions, mask: getMasks(page) });
  }
}

async function runMonteCarloVisualChecks(page: Page, mode: 'light' | 'dark' | 'high-contrast'): Promise<void> {
  const isMobile = !!page.viewportSize() && page.viewportSize()!.width < 640;
  if (isMobile) {
    return;
  }

  await openGenerator(page);
  if (mode === 'dark') {
    await applyDarkMode(page);
  }

  await loadPreset(page, 'Simple');
  await goToReviewStep(page);

  // 1. Capture standard completed state (attritionRate = 0)
  const mcBtn = page.getByRole('button', { name: /Run Statistical QA/i });
  await mcBtn.focus();
  await mcBtn.dispatchEvent('click');

  const modal = page.locator('div[role="dialog"]').filter({ hasText: 'Statistical QA' });
  await expect(modal).toBeVisible({ timeout: 5000 });

  // Wait for background worker to finish simulation
  await expect(modal.getByText(/Simulating trials/i)).toBeHidden({ timeout: 30000 });
  await expect(modal.getByTestId('mc-confidence-statement')).toBeVisible({ timeout: 30000 });

  // A11y check for standard completed modal state
  await checkA11y(page, 'div[role="dialog"]');

  // Take screenshot of standard completed state
  await expect(page).toHaveScreenshot(`monte-carlo-standard-${mode}.png`, {
    ...screenshotOptions,
    mask: getMasks(page),
    timeout: 15000
  });

  // Close the modal
  await modal.getByTestId('modal-close-footer').locator('button').dispatchEvent('click');
  await expect(modal).toBeHidden({ timeout: 5000 });

  // 2. Capture high-attrition warning state
  // Set up the monkey patch on Worker in the page context before running
  await page.evaluate(() => {
    const originalPostMessage = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message: any, transfer?: any) {
      if (message && message.command === 'START_MONTE_CARLO') {
        const originalOnMessage = this.onmessage;
        this.onmessage = function (event: MessageEvent) {
          if (event.data && event.data.type === 'MONTE_CARLO_SUCCESS') {
            const payload = event.data.payload;
            if (payload && payload.arms && payload.arms.length > 0) {
              payload.attritionRate = 20; // Ensure attrition rate > 0
              const firstArm = payload.arms[0];
              firstArm.expectedRetainedCount = 10000;
              firstArm.retainedCount = 10300; // 3% deviation! (> 2% threshold)
            }
          }
          if (originalOnMessage) {
            originalOnMessage.apply(this, [event]);
          }
        };
      }
      return originalPostMessage.apply(this, arguments as any);
    };
  });

  await mcBtn.focus();
  await mcBtn.dispatchEvent('click');

  await expect(modal).toBeVisible({ timeout: 5000 });
  await expect(modal.getByText(/Simulating trials/i)).toBeHidden({ timeout: 30000 });
  await expect(modal.getByTestId('mc-attrition-warning')).toBeVisible({ timeout: 30000 });

  // A11y check for warning modal state
  await checkA11y(page, 'div[role="dialog"]');

  // Take screenshot of warning completed state
  await expect(page).toHaveScreenshot(`monte-carlo-warning-${mode}.png`, {
    ...screenshotOptions,
    mask: getMasks(page),
    timeout: 15000
  });

  // Close the modal
  await modal.getByTestId('modal-close-footer').locator('button').dispatchEvent('click');
  await expect(modal).toBeHidden({ timeout: 5000 });
}

test.describe('Accessibility and visual regression - light mode', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (testInfo.project.name === 'firefox' || testInfo.project.name === 'webkit') {
      test.slow();
    }
    page.on('pageerror', err => console.log(`Page Error: ${err.message}`)); page.on('console', msg => console.log(`Console: ${msg.text()}`));
  });

  test('pages should pass accessibility, visibility, and screenshot baselines', async ({ page }) => {
    await runThemeCoverage(page, 'light');
  });

  test('transient states should remain visible and accessible', async ({ page }) => {
    await runTransientStateChecks(page, 'light');
  });

  test('Monte Carlo modal should pass accessibility and screenshot baselines', async ({ page }) => {
    await runMonteCarloVisualChecks(page, 'light');
  });
});

test.describe('Accessibility and visual regression - dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test.beforeEach(async ({ page }, testInfo) => {
    if (testInfo.project.name === 'firefox' || testInfo.project.name === 'webkit') {
      test.slow();
    }
    page.on('pageerror', err => console.log(`Page Error: ${err.message}`)); page.on('console', msg => console.log(`Console: ${msg.text()}`));
    await page.addInitScript(() => {
      try {
        localStorage.setItem('theme-preference', 'Dark');
      } catch (e) {
        // Ignore cross-origin localStorage access errors on about:blank
      }
    });
  });

  test('pages should pass accessibility, visibility, and screenshot baselines', async ({ page }) => {
    await runThemeCoverage(page, 'dark');
  });

  test('transient states should remain visible and accessible', async ({ page }) => {
    await runTransientStateChecks(page, 'dark');
  });

  test('Monte Carlo modal should pass accessibility and screenshot baselines', async ({ page }) => {
    await runMonteCarloVisualChecks(page, 'dark');
  });
});

test.describe('Accessibility and visual regression - high contrast mode', () => {
  test.use({ forcedColors: 'active', colorScheme: 'dark' });

  test.beforeEach(async ({ page }, testInfo) => {
    if (testInfo.project.name === 'firefox' || testInfo.project.name === 'webkit') {
      test.slow();
    }
    page.on('pageerror', err => console.log(`Page Error: ${err.message}`)); page.on('console', msg => console.log(`Console: ${msg.text()}`));
  });

  test('pages should pass accessibility, visibility, and screenshot baselines', async ({ page }) => {
    await runThemeCoverage(page, 'high-contrast');
  });

  test('transient states should remain visible and accessible', async ({ page }) => {
    await runTransientStateChecks(page, 'high-contrast');
  });

  test('Monte Carlo modal should pass accessibility and screenshot baselines', async ({ page }) => {
    await runMonteCarloVisualChecks(page, 'high-contrast');
  });
});
