import { describe, expect, it, vi } from 'vitest';

// Mock the imported _headers file to avoid Vitest loading issues
vi.mock('../dist/app/browser/_headers', () => ({
  default: `
# Global headers
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
`
}));

import worker from './worker';

describe('Edge Router (src/worker.ts)', () => {
  it('should fallback to index.html for non-file requests (SPA paths)', async () => {
    const mockIndexHtmlResponse = new Response('<html>index</html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });

    const env = {
      ASSETS: {
        fetch: vi.fn().mockImplementation((req: Request | string) => {
          const urlStr = typeof req === 'string' ? req : req.url;
          if (urlStr.includes('/index.html')) {
            return Promise.resolve(mockIndexHtmlResponse);
          }
          return Promise.resolve(new Response('Not Found', { status: 404 }));
        }),
      },
    };

    const request = new Request('https://example.com/some/spa/route');
    const response = await worker.fetch(request, env as any);

    expect(response.status).toBe(200);
    const bodyText = await response.text();
    expect(bodyText).toBe('<html>index</html>');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('should return a 404 Not Found for missing static assets ending in .js or .css', async () => {
    const env = {
      ASSETS: {
        fetch: vi.fn().mockResolvedValue(new Response('Not Found', { status: 404 })),
      },
    };

    const requestJs = new Request('https://example.com/missing-chunk.js');
    const responseJs = await worker.fetch(requestJs, env as any);
    expect(responseJs.status).toBe(404);

    const requestCss = new Request('https://example.com/missing-styles.css');
    const responseCss = await worker.fetch(requestCss, env as any);
    expect(responseCss.status).toBe(404);
  });

  it('should return 404 if a static asset fetch accidentally redirects/falls back to HTML (e.g. index.html with 200)', async () => {
    // This simulates Cloudflare incorrectly serving HTML fallbacks for missing chunks
    const env = {
      ASSETS: {
        fetch: vi.fn().mockResolvedValue(
          new Response('<html>index</html>', {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          })
        ),
      },
    };

    const requestJs = new Request('https://example.com/missing-chunk.js');
    const responseJs = await worker.fetch(requestJs, env as any);
    expect(responseJs.status).toBe(404);
  });
});
