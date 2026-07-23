import { createStepper } from '../../../core/utils/stepper.util';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLinkDirective } from '../../../core/router/router-link.directive';
import { TextInputComponent } from '../../../core/components/ui/text-input.component';
import { GeneratedSchema, RandomizationResult } from '../../core/models/randomization.model';
import { generateRandomizationSchema } from '../../randomization-engine/core/randomization-algorithm';
import { SeoService } from '../../../core/services/seo.service';
import { ThemeService, ArmColorTokens } from '../../../core/services/theme.service';

// ---------------------------------------------------------------------------
// Data model for the diff engine
// ---------------------------------------------------------------------------

export interface RowDiscrepancy {
  rowIndex: number;
  subjectId: string;
  field: string;
  expected: string | number;
  actual: string | number;
}

export type VerificationStatus = 'idle' | 'pass' | 'fail' | 'error';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-schema-verification',
  standalone: true,
  imports: [RouterLinkDirective, TextInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8">

      <!-- Header -->
      <div [class]="domainTheme.layout().cardClasses">
        <div class="flex items-center gap-3 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none"
               viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 class="text-lg font-semibold text-main">Verify RTSM Schema Reproducibility</h1>
        </div>
        <p class="text-muted text-sm leading-relaxed">
          Upload a previously exported Randomization Result JSON file. Use the
          <strong class="text-gray-800 dark:text-slate-200">JSON</strong> export button on the
          <a routerLink="/generator" class="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800 dark:hover:text-indigo-300">Generator</a>
          page to obtain this file, and make sure the results are
          <strong class="text-gray-800 dark:text-slate-200">unblinded before exporting</strong> -
          blinded exports redact <code class="text-xs bg-subtle rounded px-1">treatmentArmId</code>
          and will cause verification to fail. The system will silently re-run
          the core algorithm using the embedded seed and configuration, then perform a strict row-by-row
          comparison to produce a formal Pass/Fail verification report.
        </p>
      </div>

      <!-- Upload Zone -->
      <div [class]="domainTheme.layout().cardClasses">
        <h3 class="text-sm font-semibold text-main mb-4">Upload RTSM Schema File</h3>

        <label
          for="schema-file-input"
          class="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors"
          [class]="isDragging()
            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
            : 'border-border-strong bg-base/30 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave()"
          (drop)="onDrop($event)"
          data-testid="upload-zone"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-disabled mb-2" fill="none"
               viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p class="text-sm text-muted">
            <span class="font-medium text-indigo-600 dark:text-indigo-400">Click to upload</span>
            &nbsp;or drag and drop
          </p>
          <p class="text-xs text-disabled mt-1">JSON files only</p>

          <app-text-input
            inputId="schema-file-input"
            type="file"
            accept="application/json,.json"
            customClass="hidden"
            (change)="onFileSelected($event)"
            data-testid="file-input"
          ></app-text-input>
        </label>

        @if (fileName()) {
          <p class="mt-3 text-sm text-muted">
            <span class="font-medium">Selected:</span> {{ fileName() }}
          </p>
        }

        @if (status() === 'error') {
          <div class="mt-4 p-4 rounded-lg {{ domainTheme.getSemanticColor('error').bgLightClass }} {{ domainTheme.getSemanticColor('error').borderClass }}"
               data-testid="error-banner">
            <div class="flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 {{ domainTheme.getSemanticColor('error').textClass }} flex-shrink-0 mt-0.5" fill="none"
                   viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p class="text-sm {{ domainTheme.getSemanticColor('error').textClass }}" data-testid="error-message">{{ errorMessage() }}</p>
            </div>
          </div>
        }
      </div>

      <!-- Pass Report -->
      @if (status() === 'pass') {
        <div class="rounded-xl p-6 {{ domainTheme.getSemanticColor('success').bgLightClass }} {{ domainTheme.getSemanticColor('success').borderClass }}"
             data-testid="pass-report">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 h-12 w-12 rounded-full {{ domainTheme.getSemanticColor('success').bgLightClass }} flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 {{ domainTheme.getSemanticColor('success').textLightClass }}"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-bold {{ domainTheme.getSemanticColor('success').textClass }}">RTSM Reproducibility Verified</h3>
              <p class="mt-1 text-sm {{ domainTheme.getSemanticColor('success').textClass }}">
                The provided PRNG seed perfectly reconstructs the uploaded RTSM schema with 100% mathematical
                accuracy across all <strong>{{ uploadedSchema().length }}</strong> subjects.
              </p>
            </div>
          </div>
        </div>
      }

      <!-- Fail Report -->
      @if (status() === 'fail') {
        <div class="space-y-4" data-testid="fail-report">
          <div class="rounded-xl p-6 {{ domainTheme.getSemanticColor('error').bgLightClass }} {{ domainTheme.getSemanticColor('error').borderClass }}">
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 h-12 w-12 rounded-full {{ domainTheme.getSemanticColor('error').bgLightClass }} flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 {{ domainTheme.getSemanticColor('error').textLightClass }}"
                     fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold {{ domainTheme.getSemanticColor('error').textClass }}">RTSM Reproducibility Failed</h3>
                <p class="mt-1 text-sm {{ domainTheme.getSemanticColor('error').textClass }}">
                  {{ discrepancies().length }} discrepancy(ies) were found between the uploaded RTSM schema
                  and the freshly generated schema. Review the mismatch log below.
                </p>
              </div>
            </div>
          </div>

          <!-- Discrepancy Table -->
          <div class="{{ domainTheme.layout().cardBase }} {{ domainTheme.layout().borderRadius }} overflow-hidden"
               data-testid="discrepancy-table">
            <div class="px-6 py-4 border-b border-border-subtle">
              <h4 class="text-sm font-semibold text-main">RTSM Audit Mismatch Log</h4>
            </div>
            <div class="overflow-x-auto max-h-96 overflow-y-auto">
              <table class="min-w-full text-sm">
                <thead class="bg-subtle/50 text-xs font-semibold text-muted uppercase tracking-wider sticky top-0">
                  <tr>
                    <th class="px-6 py-3 text-left">Row</th>
                    <th class="px-6 py-3 text-left">Subject ID</th>
                    <th class="px-6 py-3 text-left">Field</th>
                    <th class="px-6 py-3 text-left">Expected (Uploaded)</th>
                    <th class="px-6 py-3 text-left">Actual (Generated)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-slate-700">
                  @for (d of discrepancies(); track d.rowIndex + '_' + d.field) {
                    <tr class="hover:bg-hover/30" data-testid="discrepancy-row">
                      <td class="px-6 py-3 tabular-nums text-gray-700 dark:text-slate-300">{{ d.rowIndex + 1 }}</td>
                      <td class="px-6 py-3 font-mono text-gray-700 dark:text-slate-300">{{ d.subjectId }}</td>
                      <td class="px-6 py-3 text-muted">{{ d.field }}</td>
                      <td class="px-6 py-3 {{ domainTheme.getSemanticColor('success').textClass }}">{{ d.expected }}</td>
                      <td class="px-6 py-3 {{ domainTheme.getSemanticColor('error').textClass }}">{{ d.actual }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class SchemaVerificationComponent {
  readonly stepper = createStepper(3);

  // ── UI state signals ──────────────────────────────────────────────────────

  readonly isDragging = signal(false);
  readonly fileName = signal<string | null>(null);
  readonly status = signal<VerificationStatus>('idle');
  readonly errorMessage = signal<string | null>(null);
  readonly discrepancies = signal<RowDiscrepancy[]>([]);
  readonly uploadedSchema = signal<GeneratedSchema[]>([]);

  public readonly domainTheme = inject(ThemeService);

  constructor() {
    inject(SeoService).setPage({
      title: 'Verify RTSM Schema Reproducibility',
      description: 'Upload a previously exported Equipose JSON schema to verify its reproducibility. The tool re-runs the algorithm and performs a strict row-by-row comparison.',
      canonicalPath: '/verify',
    });
  }

  // ── Drag-and-drop handlers ───────────────────────────────────────────────

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(): void {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.processFile(file);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.processFile(file);
    }
  }

  // ── Core processing pipeline ─────────────────────────────────────────────

  private processFile(file: File): void {
    this.stepper.goTo(0);
    this.fileName.set(file.name);
    this.status.set('idle');
    this.errorMessage.set(null);
    this.discrepancies.set([]);
    this.uploadedSchema.set([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = e.target?.result as string;
        const parsed: unknown = JSON.parse(raw);
        this.verify(parsed);
      } catch {
        this.setError('Failed to parse file: the selected file is not valid JSON.');
      }
    };
    reader.onerror = () => {
      this.setError('Failed to read file. Please try again.');
    };
    reader.readAsText(file);
  }

  /**
   * Validates the parsed JSON structure, re-runs the algorithm, and diffs.
   */
  verify(parsed: unknown): void {
    this.stepper.goTo(1);
    // ── 1. Schema validation ───────────────────────────────────────────────
    if (!this.isValidResult(parsed)) {
      this.setError('Invalid file structure: Missing RandomizationConfig metadata or schema array.');
      return;
    }

    const result = parsed as RandomizationResult;
    const baseline = result.schema;
    const config = result.metadata.config;

    this.uploadedSchema.set(baseline);

    // ── 2. Isolated execution ──────────────────────────────────────────────
    let freshResult: RandomizationResult;
    try {
      freshResult = generateRandomizationSchema(config);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error during schema generation.';
      this.setError(`Algorithm execution failed: ${msg}`);
      return;
    }

    const fresh = freshResult.schema;

    // ── 3. Strict diff ────────────────────────────────────────────────────
    const diffs = this.diff(baseline, fresh);

    if (diffs.length === 0) {
      this.status.set('pass');
    } else {
      this.discrepancies.set(diffs);
      this.status.set('fail');
    this.stepper.goTo(2);
    }
  }

  // ── Diffing algorithm ─────────────────────────────────────────────────────

  /**
   * Performs a granular row-by-row structural diff between the baseline
   * (uploaded) schema and the freshly generated schema.
   */
  diff(baseline: GeneratedSchema[], fresh: GeneratedSchema[]): RowDiscrepancy[] {
    const discrepancies: RowDiscrepancy[] = [];

    // Length check first
    if (baseline.length !== fresh.length) {
      discrepancies.push({
        rowIndex: -1,
        subjectId: 'N/A',
        field: 'Row Count',
        expected: baseline.length,
        actual: fresh.length
      });
      return discrepancies;
    }

    // Deep equality iteration on critical fields
    const fields = ['subjectId', 'treatmentArmId', 'blockNumber', 'stratumCode'] as const;

    for (let i = 0; i < baseline.length; i++) {
      const b = baseline[i];
      const f = fresh[i];

      for (const field of fields) {
        if (b[field] !== f[field]) {
          discrepancies.push({
            rowIndex: i,
            subjectId: b.subjectId,
            field,
            expected: b[field],
            actual: f[field]
          });
        }
      }
    }

    return discrepancies;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private isValidResult(value: unknown): value is RandomizationResult {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    if (typeof v['metadata'] !== 'object' || v['metadata'] === null) return false;
    const meta = v['metadata'] as Record<string, unknown>;
    if (typeof meta['config'] !== 'object' || meta['config'] === null) return false;
    if (!Array.isArray(v['schema'])) return false;
    return true;
  }

  private setError(message: string): void {
    this.errorMessage.set(message);
    this.status.set('error');
  }
}
