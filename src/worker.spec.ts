import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker, { Env } from './worker';

// Mock the dynamically generated headers text so the test doesn't depend on build artifacts
vi.mock('../dist/app/browser/_headers', () => {
  return {
    default: `
# Dummy headers for testing
/*
  X-Test-Header: WorkerTest
`
  };
});

describe('Edge Worker Case Redirection', () => {
  let mockFetch: any;
  let env: Env;

  beforeEach(() => {
    mockFetch = vi.fn(async (request: Request | string) => {
      const urlStr = typeof request === 'string' ? request : request.url;
      const url = new URL(urlStr);
      // Mock different behavior based on file types
      if (url.pathname.endsWith('.PNG') || url.pathname.endsWith('.png')) {
        return new Response('Mock Image content', {
          status: 200,
          headers: { 'Content-Type': 'image/png' }
        });
      }
      return new Response('Mock Asset Response', {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    });

    env = {
      ASSETS: {
        fetch: mockFetch
      }
    };
  });

  it('should redirect capitalized SPA pages to their lowercase equivalents (301)', async () => {
    const request = new Request('https://example.com/ABOUT', { method: 'GET' });
    const response = await worker.fetch(request, env);

    expect(response.status).toBe(301);
    expect(response.headers.get('Location')).toBe('https://example.com/about');
  });

  it('should preserve and append existing query parameters during redirect', async () => {
    const request = new Request('https://example.com/Generator?ref=search&utm_source=test', { method: 'GET' });
    const response = await worker.fetch(request, env);

    expect(response.status).toBe(301);
    expect(response.headers.get('Location')).toBe('https://example.com/generator?ref=search&utm_source=test');
  });

  it('should handle trailing slash redirection while preserving query parameters', async () => {
    const request = new Request('https://example.com/Verify/?test=true', { method: 'GET' });
    const response = await worker.fetch(request, env);

    expect(response.status).toBe(301);
    expect(response.headers.get('Location')).toBe('https://example.com/verify/?test=true');
  });

  it('should bypass redirect for valid lowercase SPA pages and return 200 OK (SPA Fallback)', async () => {
    const request = new Request('https://example.com/about', { method: 'GET' });
    const response = await worker.fetch(request, env);

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalled();
  });

  it('should bypass redirect for truly non-existent paths (capitalized or not)', async () => {
    const request1 = new Request('https://example.com/Non-Existent-Route', { method: 'GET' });
    const response1 = await worker.fetch(request1, env);
    expect(response1.status).toBe(200);

    const request2 = new Request('https://example.com/non-existent-route', { method: 'GET' });
    const response2 = await worker.fetch(request2, env);
    expect(response2.status).toBe(200);
  });

  it('should bypass redirect for static assets and media files (even with uppercase)', async () => {
    const request = new Request('https://example.com/assets/LOGO.PNG', { method: 'GET' });
    const response = await worker.fetch(request, env);

    expect(response.status).toBe(200);
  });

  it('should only redirect GET and HEAD requests', async () => {
    const request = new Request('https://example.com/ABOUT', { method: 'POST' });
    const response = await worker.fetch(request, env);

    expect(response.status).toBe(200);
  });
});
