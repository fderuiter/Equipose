const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, '../dist/app/browser');
const INDEX_PATH = path.join(BUILD_DIR, 'index.html');
const BASE_URL = 'https://equipose.org';

const routes = [
  {
    path: '/about',
    title: 'About Equipose — RTSM & IRT Randomization Design',
    description: 'Learn about Equipose, the free open-source stratified block randomization tool for RTSM and IRT workflows. Built for biostatisticians, CROs, and clinical trial managers.',
    keywords: 'RTSM, IRT, IWRS, Randomization, Clinical Trials, RTSM design utility, IRT randomization tool',
  },
  {
    path: '/generator',
    title: 'Randomization Generator | Equipose',
    description: 'Generate a statistically sound, reproducible RTSM stratified block randomization schema for your clinical trial. Export to R, Python, SAS, or Stata.',
  },
  {
    path: '/verify',
    title: 'Verify RTSM Schema Reproducibility | Equipose',
    description: 'Upload a previously exported Equipose JSON schema to verify its reproducibility. The tool re-runs the algorithm and performs a strict row-by-row comparison.',
  }
];

function generateStaticFolders() {
  if (!fs.existsSync(INDEX_PATH)) {
    console.error(`Base index.html not found at ${INDEX_PATH}`);
    process.exit(1);
  }

  const baseHtml = fs.readFileSync(INDEX_PATH, 'utf8');

  for (const route of routes) {
    const routeDir = path.join(BUILD_DIR, route.path.replace(/^\//, ''));
    fs.mkdirSync(routeDir, { recursive: true });

    let html = baseHtml;
    
    // Replace title
    html = html.replace(/<title>.*?<\/title>/i, `<title>${route.title}</title>`);
    
    // Replace description
    html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${route.description}" />`);
    
    // Replace keywords
    if (route.keywords) {
      html = html.replace(/<meta\s+name="keywords"\s+content="[^"]*"\s*\/?>/i, `<meta name="keywords" content="${route.keywords}" />`);
    }

    // Replace og:title
    html = html.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${route.title}" />`);
    
    // Replace og:description
    html = html.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${route.description}" />`);
    
    // Replace og:url
    html = html.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${BASE_URL}${route.path}" />`);
    
    // Replace twitter:title
    html = html.replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${route.title}" />`);
    
    // Replace twitter:description
    html = html.replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${route.description}" />`);
    
    // Replace canonical URL
    html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${BASE_URL}${route.path}" />`);

    fs.writeFileSync(path.join(routeDir, 'index.html'), html);
    console.log(`Generated static folder for ${route.path}`);
  }
}

generateStaticFolders();
