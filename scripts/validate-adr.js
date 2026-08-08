const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const adrDir = path.join(__dirname, '../docs/explanation/adr');

// Get all markdown files in docs/explanation/adr/
const allAdrFiles = globSync('**/*.md', { cwd: adrDir })
  .map(p => p.split(path.sep).join('/'))
  .filter(f => f !== 'template.md');

if (allAdrFiles.length === 0) {
  console.log('\n[✓] No ADR files found to validate.');
  process.exit(0);
}

let hasErrors = false;

for (const adrFile of allAdrFiles) {
  const filePath = path.join(adrDir, adrFile);
  const content = fs.readFileSync(filePath, 'utf8');

  console.log(`\nValidating ADR: docs/explanation/adr/${adrFile}`);

  // Find the 'Strategic Alignment' section
  const lines = content.split('\n');
  let inSection = false;
  const sectionLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.match(/^##\s+Strategic\s+Alignment/i)) {
      inSection = true;
      continue;
    }
    if (inSection) {
      // End the section if we encounter another Level 1 or Level 2 heading
      if (line.match(/^##?\s+[^#]/)) {
        break;
      }
      sectionLines.push(lines[i]);
    }
  }

  if (!inSection) {
    console.error(`  [✗] Missing mandatory "Strategic Alignment" section header (## Strategic Alignment)`);
    hasErrors = true;
    continue;
  }

  const sectionText = sectionLines.join('\n').trim();

  if (!sectionText) {
    console.error(`  [✗] "Strategic Alignment" section is empty`);
    hasErrors = true;
    continue;
  }

  // Check for common placeholders overall
  const placeholderRegex = /\[TODO|\[Insert|<!--/i;
  if (placeholderRegex.test(sectionText)) {
    console.error(`  [✗] "Strategic Alignment" section contains template placeholders (e.g. "[TODO", "[Insert", "<!--")`);
    hasErrors = true;
    continue;
  }

  // Parse out the subheadings and content under them to check completeness
  let currentSubheading = null;
  const subheadingContents = {};

  for (const line of sectionLines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('###')) {
      currentSubheading = trimmed.replace(/^###\s*/, '').trim().toLowerCase();
      subheadingContents[currentSubheading] = [];
    } else if (currentSubheading) {
      subheadingContents[currentSubheading].push(trimmed);
    }
  }

  // Check for Zero-Trust and Regulatory/Compliance topics
  const subheadingKeys = Object.keys(subheadingContents);
  const zeroTrustKey = subheadingKeys.find(key => key.includes('zero-trust') || key.includes('zero trust'));
  const complianceKey = subheadingKeys.find(key => key.includes('compliance') || key.includes('regulatory') || key.includes('parity'));

  if (!zeroTrustKey) {
    console.error(`  [✗] Missing "Zero-Trust Security" subsection or heading (### Zero-Trust Security)`);
    hasErrors = true;
    continue;
  }

  if (!complianceKey) {
    console.error(`  [✗] Missing "Regulatory Compliance" subsection or heading (### Regulatory Compliance)`);
    hasErrors = true;
    continue;
  }

  // Verify that these specific sub-sections are not empty or filled with placeholders
  const zeroTrustContent = subheadingContents[zeroTrustKey].join('\n').trim();
  const complianceContent = subheadingContents[complianceKey].join('\n').trim();

  if (!zeroTrustContent) {
    console.error(`  [✗] "Zero-Trust Security" section content is empty`);
    hasErrors = true;
    continue;
  }

  if (!complianceContent) {
    console.error(`  [✗] "Regulatory Compliance" section content is empty`);
    hasErrors = true;
    continue;
  }

  // Check for other placeholders like empty text fields or generic boilerplate inside
  if (zeroTrustContent.length < 20) {
    console.error(`  [✗] "Zero-Trust Security" content is too short or incomplete (must be at least 20 characters)`);
    hasErrors = true;
    continue;
  }

  if (complianceContent.length < 20) {
    console.error(`  [✗] "Regulatory Compliance" content is too short or incomplete (must be at least 20 characters)`);
    hasErrors = true;
    continue;
  }

  console.log(`  [✓] "Strategic Alignment" section is complete and valid.`);
}

if (hasErrors) {
  console.error('\n[!] Automated ADR validation failed. Please address the errors listed above.');
  process.exit(1);
} else {
  console.log('\n[✓] All ADRs passed automated validation!');
  process.exit(0);
}
