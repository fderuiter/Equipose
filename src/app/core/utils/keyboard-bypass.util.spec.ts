import { describe, it, expect } from 'vitest';
import { isNativeFormField, isScrollBypassElement } from './keyboard-bypass.util';

describe('keyboard-bypass utilities', () => {
  describe('isNativeFormField', () => {
    it('should return true for native input element', () => {
      const input = document.createElement('input');
      expect(isNativeFormField(input)).toBe(true);
    });

    it('should return true for native textarea element', () => {
      const textarea = document.createElement('textarea');
      expect(isNativeFormField(textarea)).toBe(true);
    });

    it('should return true for native select element', () => {
      const select = document.createElement('select');
      expect(isNativeFormField(select)).toBe(true);
    });

    it('should return false for button element', () => {
      const button = document.createElement('button');
      expect(isNativeFormField(button)).toBe(false);
    });

    it('should return false for a div element', () => {
      const div = document.createElement('div');
      expect(isNativeFormField(div)).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(isNativeFormField(null)).toBe(false);
      expect(isNativeFormField(undefined as any)).toBe(false);
    });
  });

  describe('isScrollBypassElement', () => {
    it('should return true for native select element', () => {
      const select = document.createElement('select');
      expect(isScrollBypassElement(select)).toBe(true);
    });

    it('should return true for native input element of type range', () => {
      const range = document.createElement('input');
      range.type = 'range';
      expect(isScrollBypassElement(range)).toBe(true);
    });

    it('should return false for standard text input', () => {
      const textInput = document.createElement('input');
      textInput.type = 'text';
      expect(isScrollBypassElement(textInput)).toBe(false);
    });

    it('should return false for checkbox input', () => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      expect(isScrollBypassElement(checkbox)).toBe(false);
    });

    it('should return false for native textarea element', () => {
      const textarea = document.createElement('textarea');
      expect(isScrollBypassElement(textarea)).toBe(false);
    });

    it('should return false for button, div, or null', () => {
      const button = document.createElement('button');
      const div = document.createElement('div');
      expect(isScrollBypassElement(button)).toBe(false);
      expect(isScrollBypassElement(div)).toBe(false);
      expect(isScrollBypassElement(null)).toBe(false);
    });
  });
});
