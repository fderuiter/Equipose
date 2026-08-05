const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const buildDir = path.join(__dirname, '..', 'dist', 'app', 'browser');

function getFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, filesList);
    } else {
      filesList.push(filePath);
    }
  }
  return filesList;
}

const allFiles = getFiles(buildDir);
const assetsToCache = [];
let hash = crypto.createHash('md5');

for (const file of allFiles) {
  const relativePath = file.substring(buildDir.length).replace(/\\/g, '/');
  
  // Skip the service worker itself, source maps, license text, and Cloudflare config files
  if (relativePath === '/sw.js' || relativePath.endsWith('.map') || relativePath === '/3rdpartylicenses.txt' || relativePath === '/_headers' || relativePath === '/_redirects') continue;
  
  if (relativePath === '/index.html') {
    assetsToCache.push('/');
  } else {
    assetsToCache.push(relativePath);
  }
  
  const content = fs.readFileSync(file);
  hash.update(content);
}

const appRoutesPath = path.join(__dirname, '..', 'src', 'app', 'app.routes.ts');
const routesContent = fs.readFileSync(appRoutesPath, 'utf8');
const routeRegex = /path:\s*['"]([^'"]*)['"]/g;
let match;
const validRoutes = [];

while ((match = routeRegex.exec(routesContent)) !== null) {
  const routePath = match[1];
  // Filter out wildcard routes
  if (routePath.includes('**')) continue;
  validRoutes.push(routePath);
}


// Prepare Regex strings for the Service Worker
const swRegexes = validRoutes.map(routePath => {
  if (routePath === '') return '^/?$';
  return '^/' + routePath.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '/?$';
});

// Append regular expression strictly matching /index.html for direct access offline whitelisting
swRegexes.push('^/index\\.html$');

const cacheVersion = hash.digest('hex');
const cacheName = `app-cache-v${cacheVersion}`;

const swCode = `
const CACHE_NAME = '${cacheName}';
const ASSETS_TO_CACHE = ${JSON.stringify(assetsToCache, null, 2)};
const VALID_ROUTES_REGEX = ${JSON.stringify(swRegexes, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of ASSETS_TO_CACHE) {
        try {
          const response = await fetch(asset);
          
          if (!response.ok) {
            throw new Error(\`HTTP error \${response.status} for \${asset}\`);
          }
          
          const contentType = response.headers.get('content-type') || '';
          
          // Reject static assets (JS/CSS) served with text/html MIME-type
          if ((asset.endsWith('.js') || asset.endsWith('.css')) && contentType.includes('text/html')) {
            throw new Error(\`Invalid MIME type \${contentType} for \${asset}\`);
          }
          
          await cache.put(asset, response);
        } catch (error) {
          const isCritical = asset.endsWith('.html') || asset.endsWith('.js') || asset.endsWith('.css');
          if (isCritical) {
            throw error; // Fail installation safely
          } else {
            console.warn(\`Non-critical asset failed to cache: \${asset}\`, error);
          }
        }
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // If it's a navigation request, serve index.html for SPA routing (only if valid route)
      if (event.request.mode === 'navigate') {
        const url = new URL(event.request.url);
        const path = url.pathname;
        const isValidRoute = VALID_ROUTES_REGEX.some(regex => new RegExp(regex).test(path));
        
        if (isValidRoute) {
          return caches.match('/').then((indexHtml) => {
            return indexHtml || fetch(event.request);
          });
        }
        
        // Let it fall through to network if not a valid route (for 404s)
        return fetch(event.request);
      }

      return fetch(event.request);
    }).catch(() => {
      // Offline fallback
      if (event.request.mode === 'navigate') {
        const url = new URL(event.request.url);
        const path = url.pathname;
        const isValidRoute = VALID_ROUTES_REGEX.some(regex => new RegExp(regex).test(path));
        
        if (isValidRoute) {
          return caches.match('/');
        }
      }
      return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    })
  );
});
`;

fs.writeFileSync(path.join(buildDir, 'sw.js'), swCode);
console.log(`Generated sw.js with ${assetsToCache.length} assets. Cache version: ${cacheVersion}`);

// Generate CSP for _headers
const indexHtmlPath = path.join(buildDir, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  
  // Extract all inline scripts
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script\b[^>]*>/gi;
  const hashes = [];
  
  let scriptMatch;
  while ((scriptMatch = scriptRegex.exec(indexHtml)) !== null) {
    const scriptContent = scriptMatch[1];
    // Only hash if there is actually content (ignore `<script src="..."></script>`)
    if (scriptContent.trim().length > 0) {
      const hashValue = crypto.createHash('sha256').update(scriptContent).digest('base64');
      hashes.push(`'sha256-${hashValue}'`);
    }
  }

  // Extract inline event handlers (e.g. onload) used by Angular for CSS deferred loading
  const onloadRegex = /onload="([^"]+)"/gi;
  let onloadMatch;
  while ((onloadMatch = onloadRegex.exec(indexHtml)) !== null) {
    const onloadContent = onloadMatch[1];
    if (onloadContent.trim().length > 0) {
      const hashValue = crypto.createHash('sha256').update(onloadContent).digest('base64');
      hashes.push(`'sha256-${hashValue}'`);
    }
  }
  
  // Update the _headers file
  const headersPath = path.join(buildDir, '_headers');
  if (fs.existsSync(headersPath)) {
    let headersContent = fs.readFileSync(headersPath, 'utf8');
    const hashesStr = hashes.length > 0 ? hashes.join(' ') : '';
    headersContent = headersContent.replace(/CSP_HASHES/g, hashesStr);
    fs.writeFileSync(headersPath, headersContent);
    console.log(`Updated _headers with CSP hashes: ${hashesStr || '(none)'}`);
  } else {
    console.warn('_headers file not found in build directory. CSP could not be updated.');
  }
}
