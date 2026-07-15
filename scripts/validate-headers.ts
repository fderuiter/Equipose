import { parseArgs } from 'node:util';

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
  const response = await fetch(fullUrl, { method: 'HEAD' });
  
  if (!response.ok && path !== '/dummy-hashed.js') {
    // We might not know a real hashed asset name, wait, how can we check a hashed asset?
    // We can fetch the index.html, parse a script tag, and check that script.
  }

  const cacheControl = response.headers.get('cache-control');
  if (cacheControl !== expectedCacheControl) {
    console.error(`❌ Mismatch on ${path}: expected "${expectedCacheControl}", got "${cacheControl}"`);
    return false;
  }
  console.log(`✅ ${path} headers match.`);
  return true;
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
  allPass = await checkHeaders('/', 'no-cache, no-store, must-revalidate') && allPass;
  
  // 2. index.html
  allPass = await checkHeaders('/index.html', 'no-cache, no-store, must-revalidate') && allPass;
  
  // 3. sw.js
  allPass = await checkHeaders('/sw.js', 'no-cache, no-store, must-revalidate') && allPass;

  // 4. Hashed asset
  // Fetch /index.html and extract a script src
  const response = await fetch(`${baseUrl}/index.html`);
  const html = await response.text();
  const scriptMatch = html.match(/<script[^>]+src="([^"]+\.js)"/);
  if (scriptMatch && scriptMatch[1]) {
    const scriptSrc = scriptMatch[1];
    const scriptPath = scriptSrc.startsWith('/') ? scriptSrc : `/${scriptSrc}`;
    allPass = await checkHeaders(scriptPath, 'public, max-age=31536000, immutable') && allPass;
  } else {
    console.error('❌ Could not find a .js asset in index.html to check.');
    allPass = false;
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
