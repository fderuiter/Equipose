// @ts-expect-error - headersText is generated dynamically at build time
import headersText from '../dist/app/browser/_headers';

export interface Env {
  ASSETS: {
    fetch: (request: Request | string) => Promise<Response>;
  };
}

interface HeaderRule {
  pattern: string;
  regExp: RegExp;
  headers: [string, string][];
}

let cachedRules: HeaderRule[] | null = null;

function patternToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regexStr = '^' + escaped.replace(/\*/g, '.*') + '$';
  // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
  return new RegExp(regexStr);
}

function parseHeadersFile(content: string): HeaderRule[] {
  const rules: HeaderRule[] = [];
  const lines = content.split(/\r?\n/);
  let currentRule: HeaderRule | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Check if the line is indented
    const isIndented = line.startsWith(' ') || line.startsWith('\t');

    if (!isIndented) {
      const pattern = trimmed;
      currentRule = {
        pattern,
        regExp: patternToRegExp(pattern),
        headers: []
      };
      rules.push(currentRule);
    } else if (currentRule) {
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex !== -1) {
        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();
        if (key && value) {
          currentRule.headers.push([key, value]);
        }
      }
    }
  }

  return rules;
}

async function getRules(request: Request, env: Env): Promise<HeaderRule[]> {
  if (cachedRules) {
    return cachedRules;
  }

  try {
    if (headersText) {
      cachedRules = parseHeadersFile(headersText);
      console.log(`Successfully parsed ${cachedRules.length} rules from imported _headers.`);
      return cachedRules;
    }
  } catch (err) {
    console.error('Failed to parse imported _headers:', err);
  }

  try {
    const headersUrl = new URL('/_headers', request.url);
    const response = await env.ASSETS.fetch(new Request(headersUrl.toString()));
    if (response.ok) {
      const text = await response.text();
      cachedRules = parseHeadersFile(text);
      console.log(`Successfully parsed ${cachedRules.length} rules from fetched _headers.`);
      return cachedRules;
    } else {
      console.error('Failed to fetch _headers: status', response.status);
    }
  } catch (err) {
    console.error('Failed to fetch/parse _headers:', err);
  }

  return [];
}

function isFileRequest(pathname: string): boolean {
  if (pathname === '/_headers' || pathname === '/_redirects') {
    return true;
  }
  const lastSegment = pathname.substring(pathname.lastIndexOf('/') + 1);
  return lastSegment.includes('.') && !lastSegment.endsWith('.');
}

function applyHeaders(pathname: string, response: Response, rules: HeaderRule[]): Response {
  const newHeaders = new Headers(response.headers);

  // Find all keys that will be set by matching rules
  const keysToOverride = new Set<string>();
  for (const rule of rules) {
    if (rule.regExp.test(pathname)) {
      for (const [key] of rule.headers) {
        keysToOverride.add(key.toLowerCase());
      }
    }
  }

  // Delete those keys from the response headers first to prevent duplication/appending
  for (const key of keysToOverride) {
    newHeaders.delete(key);
  }

  // Apply all matching rules in order
  for (const rule of rules) {
    if (rule.regExp.test(pathname)) {
      for (const [key, value] of rule.headers) {
        newHeaders.set(key, value);
      }
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Only intercept GET and HEAD requests
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return env.ASSETS.fetch(request);
    }

    const rules = await getRules(request, env);
    const isFile = isFileRequest(pathname);

    if (isFile) {
      // Fetch the file directly
      const assetResponse = await env.ASSETS.fetch(request);
      
      if (assetResponse.status === 404) {
        return new Response('Not Found', { status: 404 });
      }

      // Detect accidental HTML fallback (for misconfigured SPA routing fallback)
      const contentType = assetResponse.headers.get('content-type') || '';
      const isHtmlResponse = contentType.includes('text/html');
      const isHtmlRequest = pathname.endsWith('.html') || pathname.endsWith('.htm') || pathname === '/' || pathname === '';

      if (isHtmlResponse && !isHtmlRequest) {
        return new Response('Not Found', { status: 404 });
      }

      return applyHeaders(pathname, assetResponse, rules);
    } else {
      // SPA Fallback: Serve /index.html with the headers of /index.html
      const indexHtmlUrl = new URL('/index.html', request.url);
      const indexRequest = new Request(indexHtmlUrl.toString(), {
        headers: request.headers,
        method: request.method
      });
      const indexResponse = await env.ASSETS.fetch(indexRequest);

      if (indexResponse.status !== 200) {
        return new Response('SPA Fallback Error: index.html not found', { status: 500 });
      }

      return applyHeaders('/index.html', indexResponse, rules);
    }
  }
};
