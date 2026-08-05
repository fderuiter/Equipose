import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const swPath = resolve(repoRoot, 'dist/app/browser/sw.js');

describe('Service Worker Route Whitelisting for /index.html', () => {
  it('should generate the service worker at build time', () => {
    const swExists = existsSync(swPath);
    expect(swExists).toBe(true);
  });

  if (existsSync(swPath)) {
    const swContent = readFileSync(swPath, 'utf-8');

    it('should have index.html in the VALID_ROUTES_REGEX array strictly targeting /index.html', () => {
      // Find the VALID_ROUTES_REGEX array in sw.js
      const regexMatch = swContent.match(/const VALID_ROUTES_REGEX = (\[[\s\S]*?\]);/);
      expect(regexMatch).toBeTruthy();

      const validRoutesRegex = JSON.parse(regexMatch![1]);
      
      // Verify that the exact regex is present in the whitelisted regexes
      expect(validRoutesRegex).toContain('^/index\\.html$');

      // Test route matching using the whitelisted regexes
      const hasMatch = (pathname: string) => {
        return validRoutesRegex.some((regexStr: string) => new RegExp(regexStr).test(pathname)); // nosem
      };

      // /index.html must match
      expect(hasMatch('/index.html')).toBe(true);

      // Other routes should match
      expect(hasMatch('/')).toBe(true);
      expect(hasMatch('/about')).toBe(true);
      expect(hasMatch('/generator')).toBe(true);

      // Broader invalid dynamic paths must NOT match index.html regex
      // A strict index.html regex shouldn't match arbitrary paths containing index.html like /abc/index.html
      const exactIndexRegex = new RegExp('^/index\\.html$');
      expect(exactIndexRegex.test('/abc/index.html')).toBe(false);
      expect(exactIndexRegex.test('/index.html/')).toBe(false);
      expect(exactIndexRegex.test('/index.htmla')).toBe(false);
    });

    it('should not duplicate /index.html in the ASSETS_TO_CACHE array', () => {
      const assetsMatch = swContent.match(/const ASSETS_TO_CACHE = (\[[\s\S]*?\]);/);
      expect(assetsMatch).toBeTruthy();

      const assetsToCache = JSON.parse(assetsMatch![1]);

      // Check that '/' is present
      expect(assetsToCache).toContain('/');
      // Check that '/index.html' is NOT present
      expect(assetsToCache).not.toContain('/index.html');
    });
  }
});
