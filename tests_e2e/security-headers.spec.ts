import { test, expect } from './fixtures';

const LOCAL_ORIGIN = 'http://127.0.0.1:4200';

test.describe('Content-Security-Policy Header Verification', () => {
  const targetPaths = ['/', '/about', '/generator', '/verify'];

  for (const path of targetPaths) {
    test(`verify Content-Security-Policy header on ${path}`, async ({ page }) => {
      const url = `${LOCAL_ORIGIN}${path}`;
      const response = await page.goto(url);
      expect(response).not.toBeNull();

      const headers = response!.headers();
      const cspHeader = headers['content-security-policy'];

      const isLocalDevServer = !process.env.CI;

      if (isLocalDevServer && !cspHeader) {
        // Local dev bypass
        console.warn(`Local standard development server detected on ${path} (no CSP header found). Bypassing header assertions.`);
        return;
      }

      // If we are in CI (or if the CSP header is present), we MUST enforce validation.
      if (process.env.CI) {
        expect(cspHeader, `Content-Security-Policy header must be present on ${path} in CI`).toBeDefined();
        expect(cspHeader, `Content-Security-Policy header must not be empty on ${path} in CI`).not.toBe('');
      } else {
        expect(cspHeader).toBeDefined();
        expect(cspHeader).not.toBe('');
      }

      // Verify the connect-src directive allows only 'self' and contains no references to Bugsnag or Cloudflare
      expect(cspHeader).not.toContain('bugsnag');
      expect(cspHeader).not.toContain('cloudflare');

      // Parse directives and verify exact configuration
      const directives = cspHeader!.split(';').map(d => d.trim()).filter(Boolean);
      const directiveMap: Record<string, string[]> = {};
      for (const directive of directives) {
        const parts = directive.split(/\s+/);
        const name = parts[0];
        const values = parts.slice(1);
        directiveMap[name] = values;
      }

      // Assert each directive configuration exactly
      expect(directiveMap['default-src']).toEqual(["'self'"]);
      expect(directiveMap['connect-src']).toEqual(["'self'"]);
      expect(directiveMap['img-src']).toEqual(["'self'", "data:", "blob:"]);
      expect(directiveMap['style-src']).toEqual(["'self'", "'unsafe-inline'"]);
      expect(directiveMap['font-src']).toEqual(["'self'", "data:"]);
      expect(directiveMap['frame-src']).toEqual(["'none'"]);
      expect(directiveMap['object-src']).toEqual(["'none'"]);
      expect(directiveMap['base-uri']).toEqual(["'self'"]);
      expect(directiveMap['form-action']).toEqual(["'self'"]);

      // Verify script-src has 'self', 'unsafe-hashes', and only valid sha256- hashes
      expect(directiveMap['script-src']).toContain("'self'");
      expect(directiveMap['script-src']).toContain("'unsafe-hashes'");
      
      const scriptSrcValues = directiveMap['script-src'];
      for (const val of scriptSrcValues) {
        if (val !== "'self'" && val !== "'unsafe-hashes'") {
          expect(val).toMatch(/^'sha256-[a-zA-Z0-9+/=]+'$/);
        }
      }
    });
  }
});
