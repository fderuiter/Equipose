const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TARGETS = [
  'src/app/core/utils',
  'src/app/core/components/ui'
];

const IGNORE_PATTERNS = [
  '**/*.spec.ts',
  '**/*.test.ts'
];

// Determine if we are running in CI or similar, but for now we just use a temp dir.
const REPORT_DIR = path.join(__dirname, '../reports/jscpd');
const REPORT_FILE = path.join(REPORT_DIR, 'jscpd-report.json');

// Thresholds (configurable via env vars)
const WARNING_THRESHOLD = parseFloat(process.env.DUPLICATION_WARNING_THRESHOLD || '1.0');
const FAILURE_THRESHOLD = parseFloat(process.env.DUPLICATION_FAILURE_THRESHOLD || '5.0');

function run() {
  console.log('Running standalone duplication check...');
  
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }

  const targetArgs = TARGETS.join(' ');
  const ignoreArgs = IGNORE_PATTERNS.join(',');
  
  // --silent is omitted because we want the console reporter output
  const cmd = `npx jscpd ${targetArgs} --min-lines 15 --reporters console,json --output ${REPORT_DIR} --ignore "${ignoreArgs}"`;
  
  try {
    execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  } catch (err) {
    // If jscpd finds clones it might exit with 1 by default? Or we can explicitly pass --threshold 100
    // Wait, earlier when jscpd found a duplicate, it exited with 0. 
    // It only exits with 1 if there's an error or if threshold is exceeded. 
    // Just catch it so the script can proceed to read the JSON and decide exit code itself.
  }

  if (!fs.existsSync(REPORT_FILE)) {
    console.error('❌ Error: jscpd JSON report not found.');
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'));
  const percentage = report.statistics?.total?.percentage || 0;

  console.log(`\n=== Duplication Analysis Result ===`);
  console.log(`Total duplication: ${percentage.toFixed(2)}%`);

  if (percentage >= FAILURE_THRESHOLD) {
    console.error(`❌ Failure: Duplication (${percentage.toFixed(2)}%) exceeds the failure threshold of ${FAILURE_THRESHOLD}%.`);
    process.exit(1);
  } else if (percentage >= WARNING_THRESHOLD) {
    console.warn(`⚠️ Warning: Duplication (${percentage.toFixed(2)}%) exceeds the warning threshold of ${WARNING_THRESHOLD}%.`);
    process.exit(0);
  } else {
    console.log(`✅ Success: Duplication (${percentage.toFixed(2)}%) is below the warning threshold.`);
    process.exit(0);
  }
}

run();
