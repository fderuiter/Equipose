import { parseArgs } from 'node:util';
import * as crypto from 'node:crypto';

const { values: { url } } = parseArgs({
  options: {
    url: {
      type: 'string',
      short: 'u',
    },
  },
});

if (!url) {
  console.error('Error: --url argument is required.');
  process.exit(1);
}

const baseUrl = url.replace(/\/$/, '');

async function checkHeaders(path: string, expectedCacheControl: string) {
  const fullUrl = `${baseUrl}${path}`;
  console.log(`Checking ${fullUrl}...`);
  const response = await fetch(fullUrl, { method: 'GET' });
  
  if (!response.ok && path !== '/dummy-hashed.js') {
    // We might not know a real hashed asset name, wait, how can we check a hashed asset?
    // We can fetch the index.html, parse a script tag, and check that script.
  }

  const cacheControl = response.headers.get('cache-control');
  if (cacheControl !== expectedCacheControl) {
    console.error(`❌ Mismatch on ${path}: expected "${expectedCacheControl}", got "${cacheControl}"`);
    return { ok: false, headers: response.headers };
  }
  console.log(`✅ ${path} headers match.`);
  return { ok: true, headers: response.headers };
}

async function checkMissingAsset(path: string) {
  const fullUrl = `${baseUrl}${path}`;
  console.log(`Checking missing asset ${fullUrl}...`);
  const response = await fetch(fullUrl, { method: 'GET' });
  
  if (response.status !== 404) {
    console.error(`❌ Routing mismatch on ${path}: expected 404, got ${response.status}`);
    return false;
  }
  console.log(`✅ ${path} returned 404.`);
  return true;
}

async function checkValidRoute(path: string) {
  const fullUrl = `${baseUrl}${path}`;
  console.log(`Checking valid route ${fullUrl}...`);
  const response = await fetch(fullUrl, { method: 'GET' });
  
  if (response.status !== 200) {
    console.error(`❌ Routing mismatch on ${path}: expected 200, got ${response.status}`);
    return false;
  }
  console.log(`✅ ${path} returned 200.`);
  return true;
}

async function main() {
  let allPass = true;
  
  // 1. Root
  const rootResult = await checkHeaders('/', 'no-cache, no-store, must-revalidate');
  allPass = rootResult.ok && allPass;
  
  // 2. index.html
  const indexResult = await checkHeaders('/index.html', 'no-cache, no-store, must-revalidate');
  allPass = indexResult.ok && allPass;
  
  // 3. sw.js
  const swResult = await checkHeaders('/sw.js', 'no-cache, no-store, must-revalidate');
  allPass = swResult.ok && allPass;

  // Validate CSP on root and index.html
  const checkCsp = (headers: Headers, path: string) => {
    const csp = headers.get('content-security-policy');
    if (!csp) {
      console.error(`❌ CSP header missing on ${path}`);
      return false;
    }
    if (csp.includes("'unsafe-eval'")) {
      console.error(`❌ CSP on ${path} contains 'unsafe-eval'`);
      return false;
    }
    if (!csp.includes("style-src 'self' 'unsafe-inline'") && !csp.match(/style-src[^;]+'unsafe-inline'/)) {
      console.error(`❌ CSP on ${path} is missing 'unsafe-inline' for style-src`);
      return false;
    }
    // Check if script-src contains at least one sha256 hash
    if (!csp.match(/script-src[^;]+'sha256-[^']+'/)) {
      console.error(`❌ CSP on ${path} is missing sha256 hashes for script-src`);
      return false;
    }
    console.log(`✅ ${path} CSP rules are valid.`);
    return true;
  };

  if (rootResult.ok) allPass = checkCsp(rootResult.headers, '/') && allPass;
  if (indexResult.ok) allPass = checkCsp(indexResult.headers, '/index.html') && allPass;

  // 4. Hashed asset
  // Fetch /index.html and extract a script src
  const response = await fetch(`${baseUrl}/index.html`);
  const html = await response.text();
  const scriptMatch = html.match(/<script[^>]+src="([^"]+\.js)"/);
  if (scriptMatch && scriptMatch[1]) {
    const scriptSrc = scriptMatch[1];
    const scriptPath = scriptSrc.startsWith('/') ? scriptSrc : `/${scriptSrc}`;
    const assetResult = await checkHeaders(scriptPath, 'public, max-age=31536000, immutable');
    allPass = assetResult.ok && allPass;
  } else {
    console.error('❌ Could not find a .js asset in index.html to check.');
    allPass = false;
  }

  // Also check if index.html inline scripts have matching hashes in CSP
  if (rootResult.ok && rootResult.headers.get('content-security-policy')) {
    const csp = rootResult.headers.get('content-security-policy') || '';
    const inlineScriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi;
    let match;
    while ((match = inlineScriptRegex.exec(html)) !== null) {
      const scriptContent = match[1];
      if (scriptContent.trim().length > 0) {
        const hashValue = crypto.createHash('sha256').update(scriptContent).digest('base64');
        if (!csp.includes(`'sha256-${hashValue}'`)) {
          console.error(`❌ CSP is missing hash 'sha256-${hashValue}' for an inline script.`);
          allPass = false;
        }
      }
    }
  }

  // 5. Valid client paths
  allPass = await checkValidRoute('/about') && allPass;
  allPass = await checkValidRoute('/generator') && allPass;
  allPass = await checkValidRoute('/verify') && allPass;

  // 6. Missing static assets
  allPass = await checkMissingAsset('/missing-chunk.js') && allPass;
  allPass = await checkMissingAsset('/styles/non-existent.css') && allPass;
  allPass = await checkMissingAsset('/media/not-here.png') && allPass;

  if (!allPass) {
    console.error('Validation failed.');
    process.exit(1);
  } else {
    console.log('All validations passed successfully.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
