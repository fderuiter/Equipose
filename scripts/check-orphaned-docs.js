const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const docsDir = path.join(__dirname, '../docs');
const indexFile = path.join(docsDir, 'index.md');

// 1. Get all markdown files in docs/
const allDocFiles = globSync('**/*.md', { cwd: docsDir }).map(p => p.split(path.sep).join('/'));

// Remove index.md from the list of all files
const targetFiles = allDocFiles.filter(f => f !== 'index.md');

// 2. Parse index.md to extract all relative markdown links
const indexContent = fs.readFileSync(indexFile, 'utf8');

// Regex to find markdown links: [text](link)
const linkRegex = /\[[^\]]+\]\(([^)]+\.md)\)/g;
let match;
const referencedFiles = new Set();

while ((match = linkRegex.exec(indexContent)) !== null) {
  const link = match[1];
  referencedFiles.add(link);
}

// 3. Find orphaned files
const orphanedFiles = [];
for (const file of targetFiles) {
  if (!referencedFiles.has(file)) {
    orphanedFiles.push(file);
  }
}

if (orphanedFiles.length > 0) {
  console.error('\n[!] The following documentation files are orphaned (not referenced in docs/index.md):');
  for (const file of orphanedFiles) {
    console.error(`  - docs/${file}`);
  }
  console.error('\nPlease add a link to these files in docs/index.md to ensure they are discoverable.');
  process.exit(1);
}

console.log('\n[✓] All documentation files are referenced in the central index.');
