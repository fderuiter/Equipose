import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');

function run() {
  const statValPath = path.join(repoRoot, 'src/app/domain/randomization-engine/core/statistical-validation.spec.ts');
  const precisionPath = path.join(repoRoot, 'src/app/core/constants/precision.config.ts');
  const reportPath = path.join(repoRoot, 'docs/explanation/SAS_Stata_Exception_Report.md');

  // 1. Extract Validation Vector
  const statValContent = fs.readFileSync(statValPath, 'utf-8');
  const goldenVectorMatch = statValContent.match(/const\s+GOLDEN_VECTOR\s*=\s*(\[[^\]]+\]);/);
  if (!goldenVectorMatch) {
    console.error('ERROR: Could not locate GOLDEN_VECTOR in statistical-validation.spec.ts');
    process.exit(1);
  }
  const validationVector = goldenVectorMatch[1];

  // 2. Extract Precision Parity
  const precisionContent = fs.readFileSync(precisionPath, 'utf-8');
  const precisionMatch = precisionContent.match(/export\s+const\s+PRECISION_SCALE\s*=\s*(\d+);/);
  if (!precisionMatch) {
    console.error('ERROR: Could not locate PRECISION_SCALE in precision.config.ts');
    process.exit(1);
  }
  const precisionParity = precisionMatch[1];

  // 3. Read and modify the Exception Report
  let reportContent = fs.readFileSync(reportPath, 'utf-8');

  // Replace Alea with MT19937
  reportContent = reportContent.replace(/\bAlea\b/g, 'MT19937');

  // Inject the configuration constants section if not present
  const constantsSection = `\n### 4.5 Configuration Constants\n\n- **Validation Vector:** \`${validationVector}\`\n- **Precision Parity:** \`${precisionParity}\`\n`;

  if (reportContent.includes('### 4.5 Configuration Constants')) {
    reportContent = reportContent.replace(/### 4\.5 Configuration Constants[\s\S]*?(?=\n---|\n##)/, constantsSection.trim() + '\n\n');
  } else {
    // Insert after 4.4
    const section4_4 = 'tagged `[REQ-21CFR11-001]` through `[REQ-21CFR11-004]`.';
    if (reportContent.includes(section4_4)) {
      reportContent = reportContent.replace(section4_4, section4_4 + '\n' + constantsSection);
    } else {
      console.error('ERROR: Could not find injection point for Configuration Constants');
      process.exit(1);
    }
  }

  fs.writeFileSync(reportPath, reportContent, 'utf-8');
  console.log('[generate-exception-report] Successfully generated SAS/Stata Exception Report manifest with dynamic constants.');
}

run();
