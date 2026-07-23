import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

const mdPath = path.resolve('docs/explanation/SAS_Stata_Exception_Report.md');
const mdContent = fs.readFileSync(mdPath, 'utf8');

const htmlContent = marked.parse(mdContent);

const destDir = path.resolve('src/app/features/exception-report');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const componentHtml = `
<div class="bg-base py-16 sm:py-20 exception-report-container">
  <div class="mx-auto max-w-4xl px-6 lg:px-8">
    ${htmlContent}
  </div>
</div>
`;

const componentTs = `import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from '@angular/core';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-exception-report',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './exception-report.component.html',
  styles: [\`
    .exception-report-container h1 { font-size: 2.25rem; font-weight: 700; margin-bottom: 1.5rem; color: var(--text-main); }
    .exception-report-container h2 { font-size: 1.75rem; font-weight: 600; margin-top: 2rem; margin-bottom: 1rem; color: var(--text-main); border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.5rem; }
    .exception-report-container h3 { font-size: 1.25rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.75rem; color: var(--text-main); }
    .exception-report-container p { margin-bottom: 1.25rem; line-height: 1.75; color: var(--text-muted); }
    .exception-report-container ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1.25rem; color: var(--text-muted); }
    .exception-report-container ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1.25rem; color: var(--text-muted); }
    .exception-report-container li { margin-bottom: 0.5rem; }
    .exception-report-container a { color: #4f46e5; text-decoration: underline; text-underline-offset: 4px; }
    .exception-report-container a:hover { color: #4338ca; }
    .exception-report-container pre { background-color: var(--bg-surface); border: 1px solid var(--border-base); padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin-bottom: 1.25rem; }
    .exception-report-container code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; background-color: var(--bg-hover); border: 1px solid var(--border-base); padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-size: 0.875em; color: var(--text-main); }
    .exception-report-container pre code { background-color: transparent; border: none; padding: 0; color: inherit; }
    .exception-report-container blockquote { border-left: 4px solid var(--border-strong); padding-left: 1rem; font-style: italic; color: var(--text-muted); margin-bottom: 1.25rem; background-color: var(--bg-subtle); padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .exception-report-container table { width: 100%; border-collapse: collapse; margin-bottom: 1.25rem; font-size: 0.875rem; }
    .exception-report-container th, .exception-report-container td { border: 1px solid var(--border-base); padding: 0.75rem; text-align: left; }
    .exception-report-container th { background-color: var(--bg-subtle); font-weight: 600; color: var(--text-main); }
    .exception-report-container tr:nth-child(even) { background-color: var(--bg-surface); }
    .dark .exception-report-container a { color: #818cf8; }
    .dark .exception-report-container a:hover { color: #6366f1; }
  \`]
})
export class ExceptionReportComponent {
  constructor() {
    inject(SeoService).setPage({
      title: 'SAS & Stata Exception Report',
      description: 'Summary description of statistical exception validation and precision parity.',
      canonicalPath: '/exception-report'
    });
  }
}
`;

fs.writeFileSync(path.join(destDir, 'exception-report.component.html'), componentHtml, 'utf8');
fs.writeFileSync(path.join(destDir, 'exception-report.component.ts'), componentTs, 'utf8');

console.log('Successfully generated Exception Report component.');
