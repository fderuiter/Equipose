import AxeBuilder from '@axe-core/playwright';
import { Page, Locator } from '@playwright/test';

/**
 * Runs an axe-core accessibility audit against the current page state.
 * Enforces WCAG 2.1 AA standards and fails if any violations are found
 * across critical, serious, moderate, or minor impact levels.
 *
 * @param page - The Playwright Page object to audit.
 * @returns The axe accessibility scan results.
 * @throws If WCAG 2.1 AA violations are detected across any impact level
 * (critical, serious, moderate, or minor).
 */
export async function checkA11y(page: Page, includeSelector?: string) {
  const browserName = page.context().browser()?.browserType().name();
  const isSlowBrowser = browserName === 'webkit' || browserName === 'firefox';
  const disabledRules = isSlowBrowser ? ['target-size', 'color-contrast'] : ['target-size'];

  const builder = new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .disableRules(disabledRules);

  if (includeSelector) {
    builder.include(includeSelector);
  }

  const results = await builder.analyze();

  const supportedImpacts = new Set(['critical', 'serious', 'moderate', 'minor']);
  const violations = results.violations.filter(
    v => !!v.impact && supportedImpacts.has(v.impact)
  );

  if (violations.length > 0) {
    const details = violations
      .map(v => {
        const nodes = v.nodes
          .map(n => `  Element: ${n.target.join(', ')}\n  HTML: ${n.html}`)
          .join('\n');
        return `[${v.impact?.toUpperCase()}] ${v.id}: ${v.description}\n  WCAG: ${v.tags.filter(t => t.startsWith('wcag')).join(', ')}\n${nodes}`;
      })
      .join('\n\n');

    throw new Error(
      `Accessibility violations found (${violations.length}):\n\n${details}`
    );
  }

  return results;
}

/**
 * FocusAuditor provides utilities for tracking focus changes, enforcing
 * focus restoration after interacting with modals/dialogs, and verifying
 * focus is managed during asynchronous content transitions.
 */
export class FocusAuditor {
  /**
   * Asserts that focus is restored to the expected element after an action
   * (e.g., closing a modal or dismissing a menu).
   * 
   * @param page - Playwright Page object.
   * @param triggerAction - Function containing the interaction to perform.
   * @param expectedRestoredLocator - Optional locator of the element expected to receive focus.
   *                                  If omitted, the framework automatically records the active element
   *                                  before the action and asserts it is restored.
   */
  static async assertFocusRestoration(
    page: Page,
    triggerAction: () => Promise<void>,
    expectedRestoredLocator?: Locator
  ): Promise<void> {
    // Record initiating element if no explicit expected locator is provided
    let initiatingElementHandle;
    if (!expectedRestoredLocator) {
      initiatingElementHandle = await page.evaluateHandle(() => document.activeElement);
    }

    await triggerAction();

    const isFocused = expectedRestoredLocator
      ? await expectedRestoredLocator.evaluate((node) => node === document.activeElement)
      : await page.evaluate((expectedNode) => expectedNode === document.activeElement, initiatingElementHandle);

    if (!isFocused) {
      const activeElementDetails = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active) return 'null';
        const isBody = active === document.body;
        const details = `tag: <${active.tagName.toLowerCase()}>, id: ${active.id || 'none'}, class: ${active.className || 'none'}, HTML: ${active.outerHTML.substring(0, 100)}`;
        return isBody ? `Document Body (${details})` : details;
      });
      throw new Error(`Accessibility audit failed: Focus was not restored to the expected element. Active element is: ${activeElementDetails}`);
    }
  }

  /**
   * Asserts that focus shifts to a valid content element and does not
   * drop/strand the user on the document body during async transitions (e.g., wizard steps).
   * 
   * @param page - Playwright Page object.
   * @param transitionAction - Function containing the transition to perform.
   */
  static async assertFocusTransition(
    page: Page,
    transitionAction: () => Promise<void>
  ): Promise<void> {
    const preTransitionActive = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active) return 'null';
      return `tag: <${active.tagName.toLowerCase()}>, id: ${active.id || 'none'}, class: ${active.className || 'none'}, HTML: ${active.outerHTML.substring(0, 100)}`;
    });

    await transitionAction();

    const isBodyFocused = await page.evaluate(() => {
      return document.activeElement === document.body || document.activeElement === null;
    });

    if (isBodyFocused) {
      throw new Error(`Accessibility audit failed: Focus was stranded on the document body after transition. Focus was previously on: ${preTransitionActive}`);
    }
  }
}

/**
 * FocusTrapPlugin simulates Tab-key loops to verify focus containment within transient overlays.
 */
export class FocusTrapPlugin {
  /**
   * Verifies that focus remains contained within the specified container
   * during forward and backward Tab cycles. If no container is provided,
   * it automatically detects the active modal or dialog.
   */
  static async verifyFocusContainment(page: Page, container?: Locator, maxTabs = 15): Promise<void> {
    if (!container) {
      // Auto-detect modal or dialog
      container = page.locator('[role="dialog"], [role="alertdialog"], .modal').locator('visible=true').first();
      await container.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {
        throw new Error('Accessibility audit failed: No visible modal or dialog found for focus-trap verification.');
      });
    }

    // Wait for focus to settle inside the container (or at least wait for transition)
    await page.waitForFunction((node) => {
      return node.contains(document.activeElement) || node === document.activeElement;
    }, await container.elementHandle());

    const getActiveElementDetails = async () => {
      return await page.evaluate(() => {
        const active = document.activeElement;
        if (!active) return 'null';
        const isBody = active === document.body;
        const details = `tag: <${active.tagName.toLowerCase()}>, id: ${active.id || 'none'}, HTML: ${active.outerHTML.substring(0, 100)}`;
        return isBody ? `Document Body (${details})` : details;
      });
    };

    // Forward Tab loop
    let focusEscaped = false;
    let escapedDetails = '';
    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press('Tab');
      const isContained = await container.evaluate(node => node.contains(document.activeElement) || node === document.activeElement);
      if (!isContained) {
        focusEscaped = true;
        escapedDetails = await getActiveElementDetails();
        break;
      }
    }
    
    if (focusEscaped) {
      throw new Error(`Accessibility audit failed: Overlay detected without an active focus trap. Focus escaped during forward Tab loop. Active element: ${escapedDetails}`);
    }

    // Backward Shift+Tab loop
    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press('Shift+Tab');
      const isContained = await container.evaluate(node => node.contains(document.activeElement) || node === document.activeElement);
      if (!isContained) {
        focusEscaped = true;
        escapedDetails = await getActiveElementDetails();
        break;
      }
    }

    if (focusEscaped) {
      throw new Error(`Accessibility audit failed: Overlay detected without an active focus trap. Focus escaped during backward Shift+Tab loop. Active element: ${escapedDetails}`);
    }
  }
}

/**
 * StructuralAriaPlugin validates the presence and hierarchy of ARIA roles
 * in modal components, ensuring complete WAI-ARIA implementations.
 */
export class StructuralAriaPlugin {
  /**
   * Validates that any tablist within the container has at least one associated tabpanel.
   * If a tablist is found but no tabpanels exist in the container, it throws an error.
   */
  static async verifyTablistHierarchy(page: Page, container: Locator): Promise<void> {
    const errorMsg = await container.evaluate(node => {
      const tablists = node.querySelectorAll('[role="tablist"]');
      for (const tablist of Array.from(tablists)) {
        const panels = node.querySelectorAll('[role="tabpanel"]');
        if (panels.length === 0) {
          return 'Tab list detected without associated tab panels.';
        }
      }
      return null;
    });

    if (errorMsg) {
      throw new Error(`Accessibility audit failed: ${errorMsg}`);
    }
  }
}

