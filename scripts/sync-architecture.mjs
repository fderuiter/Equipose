import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.join(__dirname, '..');
const archPath = path.join(repoRoot, 'docs', 'ARCHITECTURE_REFERENCE.md');
let archContent = fs.readFileSync(archPath, 'utf-8');

// --- 1. Replace Data Model Diagram ---
function generateDataModelDiagram() {
  const modelPath = path.join(repoRoot, 'src/app/domain/core/models/randomization.model.ts');
  const fileContent = fs.readFileSync(modelPath, 'utf-8');
  const source = ts.createSourceFile('randomization.model.ts', fileContent, ts.ScriptTarget.Latest, true);

  let classDiagram = 'classDiagram\n';

  ts.forEachChild(source, node => {
    if (ts.isInterfaceDeclaration(node)) {
      const name = node.name.text;
      classDiagram += `    class ${name} {\n`;
      node.members.forEach(member => {
        if (ts.isPropertySignature(member)) {
          const propName = member.name.text;
          let type = member.type ? fileContent.substring(member.type.pos, member.type.end).trim() : 'any';
          type = type.replace(/\s+/g, ' '); // flatten newlines for mermaid
          const optional = member.questionToken ? '?' : '';
          classDiagram += `        +${type.replace(/</g, '~').replace(/>/g, '~')} ${propName}${optional}\n`;
        }
      });
      classDiagram += `    }\n\n`;
    } else if (ts.isTypeAliasDeclaration(node)) {
      const name = node.name.text;
      classDiagram += `    class ${name} {\n        <<type>>\n`;
      if (node.type && ts.isUnionTypeNode(node.type)) {
        node.type.types.forEach(t => {
          if (ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal)) {
            classDiagram += `        ${t.literal.text}\n`;
          }
        });
      }
      classDiagram += `    }\n\n`;
    }
  });
  return classDiagram.trim();
}

const dataModelDiagram = generateDataModelDiagram();
archContent = archContent.replace(
  /## 11\. Data Model[\s\S]*?```mermaid\nclassDiagram[\s\S]*?```/m,
  `## 11. Data Model\n\nAll  live in a single file: \`domain/core/models/randomization.model.ts\`.\nThis is the **shared kernel** - every other module imports from here; nothing\nre-declares these types.\n\n\`\`\`mermaid\n${dataModelDiagram}\n\`\`\``
);


// --- 2. Replace ESLint Boundaries Diagram ---
function generateBoundaryDiagram() {
  const eslintConfigPath = path.join(repoRoot, 'eslint.config.js');
  const eslintConfig = require(eslintConfigPath);

  let graph = 'graph LR\n';
  graph += '    SB["domain/study-builder/**"]\n';
  graph += '    RE_FACADE["RandomizationEngineFacade ✅"]\n';
  graph += '    RE_MODELS["domain/core/models ✅"]\n';
  
  const blocks = [];
  
  eslintConfig.forEach(cfg => {
    if (cfg.rules && cfg.rules['no-restricted-imports']) {
      const rule = cfg.rules['no-restricted-imports'];
      if (Array.isArray(rule) && rule.length > 1 && rule[1].patterns) {
        rule[1].patterns.forEach(pattern => {
          pattern.group.forEach(g => {
            blocks.push({ source: cfg.files[0], target: g });
          });
        });
      }
    }
  });

  blocks.forEach((block, index) => {
    let sourceNode = '';
    if (block.source.includes('study-builder')) {
      sourceNode = 'SB';
    } else if (block.source.includes('randomization-engine/core')) {
      sourceNode = 'ALGO_FILE';
      if (!graph.includes('ALGO_FILE')) {
         graph += `    ALGO_FILE["randomization-engine/core/**"]\n`;
      }
    }

    const targetId = `TARGET_${index}`;
    graph += `    ${targetId}["${block.target} ❌"]\n`;
    graph += `    ${sourceNode} -. blocked .-> ${targetId}\n`;
  });

  graph += '\n    SB --> RE_FACADE\n    SB --> RE_MODELS\n';
  return graph.trim();
}

const boundaryDiagram = generateBoundaryDiagram();
archContent = archContent.replace(
  /## 14\. ESLint Architectural Boundaries[\s\S]*?```mermaid\ngraph LR[\s\S]*?```/m,
  `## 14. ESLint Architectural Boundaries\n\nBoundaries are enforced at lint time using \`no-restricted-imports\` patterns in\n\`eslint.config.js\`. Violations are build errors in CI.\n\n\`\`\`mermaid\n${boundaryDiagram}\n\`\`\``
);


// --- 3. Replace Code Generation Pipeline Diagram ---
function generatePipelineDiagram() {
  const servicePath = path.join(repoRoot, 'src/app/domain/schema-management/services/code-generator.service.ts');
  const fileContent = fs.readFileSync(servicePath, 'utf-8');
  const source = ts.createSourceFile('code-generator.service.ts', fileContent, ts.ScriptTarget.Latest, true);

  let strategies = [];
  function visit(node) {
    if (ts.isNewExpression(node) && node.expression.getText(source) === 'BaseOrchestrator') {
      if (node.arguments && node.arguments.length > 0) {
        strategies.push(node.arguments[0].getText(source));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);

  let graph = 'flowchart TD\n';
  graph += '    MODAL_BTN["User clicks \'Generate Code\'\\n→ selects R / SAS / Python / STATA"]\n';
  graph += '    FORM4["ConfigFormComponent.onGenerateCode(lang)"]\n';
  graph += '    FACADE4["facade.openCodeGenerator(config, lang)"]\n';
  graph += '    MODAL4["CodeGeneratorModalComponent\\nsetActiveTab(lang) → refreshCode()"]\n';
  graph += '    ENTRY["CodeGeneratorService.generate(language, config)\\n① pre-flight validation\\n② dispatch to language method"]\n\n';
  graph += '    MODAL_BTN --> FORM4 --> FACADE4 --> MODAL4 --> ENTRY\n\n';
  
  graph += '    ENTRY --> STRAT["InjectionToken<CodeGenerationStrategy[]>"]\n\n';

  strategies.forEach((strat, idx) => {
    const id = `STRAT_${idx}`;
    graph += `    STRAT --> ${id}["BaseOrchestrator(${strat})"]\n`;
    graph += `    ${id} --> DISP["<pre><code>{{ currentCode }}</code></pre>"]\n`;
  });

  graph += '\n    DISP --> DL["downloadCode()\\nBlob → <a download> click"]\n';
  graph += '    DISP --> CP["copyCode()\\nnavigator.clipboard.writeText()"]\n';
  
  graph += '\n    ENTRY -- "throws" --> ERR["CodeGenerationError subclass\\n→ errorState signal\\n→ error banner UI"]\n';
  graph += '    ERR --> CPE["copyErrorLog()\\nclipboard ← { errorName, message, context }"]\n';

  return graph.trim();
}

const pipelineDiagram = generatePipelineDiagram();
archContent = archContent.replace(
  /### 12\.4 Overall pipeline[\s\S]*?```mermaid\nflowchart TD[\s\S]*?```/m,
  `### 12.4 Overall pipeline\n\n\`\`\`mermaid\n${pipelineDiagram}\n\`\`\``
);


// --- 4. Purge legacy references ---
// Replace references to `randomization.service` and `seedrandom`
archContent = archContent.replace(/randomization\.service\.ts/g, 'RandomizationEngineFacade (or domain/core/models)');
archContent = archContent.replace(/randomization\.service\.spec\.ts/g, 'randomization-engine-facade.spec.ts');
archContent = archContent.replace(/randomization\.service/g, 'RandomizationEngineFacade');
archContent = archContent.replace(/seedrandom/g, 'MT19937 PRNG');

fs.writeFileSync(archPath, archContent, 'utf-8');
console.log('[sync-architecture] Updated docs/ARCHITECTURE_REFERENCE.md');
