/**
 * Shared Keyboard Navigation Utilities
 * Helps identify if focused elements are interactive native form controls
 * that should bypass custom keyboard/scroll event overrides.
 */

export function isNativeFormField(element: EventTarget | null): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  const tagName = element.tagName.toUpperCase();
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
}

export function isScrollBypassElement(element: EventTarget | null): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  const tagName = element.tagName.toUpperCase();
  if (tagName === 'SELECT') {
    return true;
  }
  if (tagName === 'INPUT' && element instanceof HTMLInputElement) {
    return element.type === 'range';
  }
  return false;
}
