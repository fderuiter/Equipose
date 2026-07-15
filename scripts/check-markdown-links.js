const { globSync } = require('glob');
const { spawnSync } = require('child_process');

const files = globSync('**/*.md', { ignore: 'node_modules/**' });

if (files.length === 0) {
  console.log('No markdown files found.');
  process.exit(0);
}

// Run markdown-link-check with the config file in quiet mode
const args = ['-c', 'markdown-link-check.json', '-q', ...files];
const result = spawnSync('npx', ['markdown-link-check', ...args], { stdio: 'inherit', shell: true });

if (result.error) {
  console.error('Failed to start markdown-link-check:', result.error);
  process.exit(1);
}

if (result.status !== 0) {
  console.error('\n[!] Markdown link check failed. Please fix the broken internal links above.');
  process.exit(result.status || 1);
}

console.log('\n[✓] Markdown link check passed successfully.');
