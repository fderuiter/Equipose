const fs = require('fs');
const path = require('path');

const domain = 'https://equipose.org';
const buildDir = path.join(__dirname, '..', 'dist', 'app', 'browser');
const sitemapPath = path.join(buildDir, 'sitemap.xml');
const appRoutesPath = path.join(__dirname, '..', 'src', 'app', 'app.routes.ts');

function generateSitemap() {
  const routesContent = fs.readFileSync(appRoutesPath, 'utf8');
  const routeRegex = /path:\s*['"]([^'"]*)['"]/g;
  let match;
  const validRoutes = [];

  while ((match = routeRegex.exec(routesContent)) !== null) {
    const routePath = match[1];
    // Filter out wildcard and dynamic routes
    if (routePath.includes('**') || routePath.includes(':')) continue;
    validRoutes.push(routePath);
  }

  const currentDate = new Date().toISOString().split('T')[0];

  let sitemapXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  sitemapXml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const route of validRoutes) {
    const url = route === '' ? domain + '/' : `${domain}/${route}`;
    // Approximate priority
    let priority = '0.5';
    if (route === '') priority = '1.0';
    else if (route === 'generator') priority = '0.9';
    else if (route === 'verify') priority = '0.6';

    sitemapXml += '  <url>\n';
    sitemapXml += `    <loc>${url}</loc>\n`;
    sitemapXml += `    <lastmod>${currentDate}</lastmod>\n`;
    sitemapXml += '    <changefreq>monthly</changefreq>\n';
    sitemapXml += `    <priority>${priority}</priority>\n`;
    sitemapXml += '  </url>\n';
  }

  sitemapXml += '</urlset>';

  fs.writeFileSync(sitemapPath, sitemapXml);
  console.log(`Generated sitemap.xml with ${validRoutes.length} routes.`);
}

generateSitemap();
