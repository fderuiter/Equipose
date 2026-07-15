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
  
  // Skip the service worker itself, source maps, and license text
  if (relativePath === '/sw.js' || relativePath.endsWith('.map') || relativePath === '/3rdpartylicenses.txt') continue;
  
  assetsToCache.push(relativePath);
  
  const content = fs.readFileSync(file);
  hash.update(content);
}

const cacheVersion = hash.digest('hex');
const cacheName = `app-cache-v${cacheVersion}`;

const swCode = `
const CACHE_NAME = '${cacheName}';
const ASSETS_TO_CACHE = ${JSON.stringify(assetsToCache, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of ASSETS_TO_CACHE) {
        try {
          const response = await fetch(asset);
          
          if (!response.ok) {
            throw new Error(`HTTP error ${response.status} for ${asset}`);
          }
          
          const contentType = response.headers.get('content-type') || '';
          
          // Reject static assets (JS/CSS) served with text/html MIME-type
          if ((asset.endsWith('.js') || asset.endsWith('.css')) && contentType.includes('text/html')) {
            throw new Error(`Invalid MIME type ${contentType} for ${asset}`);
          }
          
          await cache.put(asset, response);
        } catch (error) {
          const isCritical = asset.endsWith('.html') || asset.endsWith('.js') || asset.endsWith('.css');
          if (isCritical) {
            throw error; // Fail installation safely
          } else {
            console.warn(`Non-critical asset failed to cache: ${asset}`, error);
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

      // If it's a navigation request, serve index.html for SPA routing
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html').then((indexHtml) => {
          return indexHtml || fetch(event.request);
        });
      }

      return fetch(event.request);
    }).catch(() => {
      // Offline fallback
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
      return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    })
  );
});
`;

fs.writeFileSync(path.join(buildDir, 'sw.js'), swCode);
console.log(`Generated sw.js with ${assetsToCache.length} assets. Cache version: ${cacheVersion}`);
