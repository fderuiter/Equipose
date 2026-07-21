import { ChangeDetectionStrategy, Component, inject, effect, signal, viewChild, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLinkDirective } from '@core/router/router-link.directive';
import { SignalRouter } from '@core/router/signal-router.service';
import { ConfigFormComponent } from './config-form.component';
import { ZeroStateComponent } from './zero-state.component';
import { SkeletonGridComponent } from './skeleton-grid.component';
import { ResultsGridComponent } from '../../schema-management/components/results-grid.component';
import { CodeGeneratorModalComponent } from '../../schema-management/components/code-generator-modal.component';
import { SchemaAnalyticsDashboardComponent } from '../../schema-management/components/schema-analytics-dashboard.component';
import { BalanceVerificationComponent } from '../../schema-management/components/balance-verification.component';
import { MonteCarloModalComponent } from '../../randomization-engine/components/monte-carlo-modal.component';
import { RandomizationEngineFacade } from '../../randomization-engine/randomization-engine.facade';
import { ViewportService } from '@core/services/viewport.service';
import { SeoService } from '@core/services/seo.service';
import { DomainThemeService } from 'src/app/domain/core/theme/domain-theme.service';
import { ButtonComponent } from '@core/components/ui/button.component';

type ResultsTab = 'grid' | 'balance';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-generator',
  imports: [
    RouterLinkDirective,
    ConfigFormComponent,
    ZeroStateComponent,
    SkeletonGridComponent,
    ResultsGridComponent,
    CodeGeneratorModalComponent,
    SchemaAnalyticsDashboardComponent,
    BalanceVerificationComponent,
    MonteCarloModalComponent,
    ButtonComponent,
  ],
  template: `
    <div class="space-y-8" data-testid="generator-page">
      <!-- Intro -->
      <div [class]="domainTheme.layout().cardClasses">
        <div class="flex items-start justify-between gap-4 mb-3">
          <h2 class="text-lg font-semibold text-main" data-testid="generator-heading">Build Your RTSM Randomization Schema</h2>
          <a routerLink="/about"
             class="shrink-0 text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
             aria-label="Learn more about Equipose">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How does this work?
          </a>
        </div>
        <p class="text-muted text-sm leading-relaxed">
          Configure your clinical trial parameters below to produce a statistically sound, reproducible, and balanced treatment allocation schema.
          Each schema is uniquely seeded, deterministic, and can be exported to R, Python, SAS, or Stata for inclusion in your Statistical Analysis Plan.
        </p>
        <!-- Property badges -->
        <div class="mt-4 flex flex-wrap gap-2" aria-label="Schema properties">
          @for (badge of introBadges; track badge) {
            <span class="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-700">
              {{ badge }}
            </span>
          }
        </div>
      </div>

      <!-- Configuration Form -->
      <div id="wizard-start">
        <app-config-form #configForm [isSimulationMode]="isSimulationMode()" (promoteToStudy)="handlePromoteToStudy()"></app-config-form>
      </div>

      <!-- ── Integrated Grid Status Bar ────────────────────────────── -->
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        class="bg-surface border border-border-subtle rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
        data-testid="grid-status-bar"
      >
        <div class="flex items-center gap-3">
          <h3 class="text-sm font-semibold text-main m-0">Simulation Status:</h3>
          @if (state.isGenerating()) {
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800" data-testid="status-generating">
              <svg class="animate-[spin_1s_linear_infinite] h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating
            </span>
          } @else if (state.results()) {
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800" data-testid="status-complete">
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Complete
            </span>
          } @else {
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:border-slate-700" data-testid="status-ready">
              Ready
            </span>
          }
        </div>
        
        @if (state.results() && !state.isGenerating()) {
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted">Audit Hash:</span>
            <span class="font-mono text-xs bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded border border-gray-200 dark:border-slate-700 text-main" [title]="state.results()?.metadata?.auditHash" data-testid="audit-hash-value">
              {{ truncatedAuditHash }}
            </span>
            <app-button
              variant="bare"
              (onClick)="copyAuditHash()"
              customClass="shrink-0 p-1.5 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700"
              ariaLabel="Copy audit hash to clipboard"
              data-testid="copy-hash-btn">
              @if (hashCopied()) {
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              }
            </app-button>
          </div>
        }
      </div>

      <!-- ── Deterministic Results State Machine ───────────────────── -->
      <!--
        Exactly ONE of these three states is visible at any given time:
          1. isGenerating  → Skeleton Grid (pulsing placeholder)
          2. has results   → Populated Results section
          3. fallback      → Zero-State welcome screen
      -->

      @if (state.isGenerating()) {

        <!-- State 1: Generating – Skeleton Grid -->
        <div id="skeleton-section">
          <app-skeleton-grid></app-skeleton-grid>
        </div>

      } @else if (state.results()) {

        <!-- State 2: Results available -->
        <div id="results-section" class="space-y-4">

          <!-- ── Tab Navigation ──────────────────────────────────────── -->
          <div class="flex gap-1 border-b border-border-subtle">
            <app-button variant="bare"
              (onClick)="activeTab.set('grid')"
              [customClass]="'px-5 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-focus-offset ' + (activeTab() === 'grid' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-surface' : 'border-transparent text-muted hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500')"
              ariaLabel="Schema Grid tab"
            >
              Schema Grid
            </app-button>
            <app-button variant="bare"
              (onClick)="activeTab.set('balance')"
              [customClass]="'px-5 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-focus-offset ' + (activeTab() === 'balance' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-surface' : 'border-transparent text-muted hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500')"
              ariaLabel="Balance Verification tab"
            >
              Balance Verification
            </app-button>
          </div>

          <!-- ── Schema Grid tab ─────────────────────────────────────── -->
          @if (activeTab() === 'grid') {
            <div class="space-y-6">
              <!-- Schema Analytics Dashboard -->
              <app-schema-analytics-dashboard></app-schema-analytics-dashboard>

              <!-- Results Grid -->
              <app-results-grid></app-results-grid>
            </div>
          }

          <!-- ── Balance Verification tab ────────────────────────────── -->
          @if (activeTab() === 'balance') {
            <app-balance-verification></app-balance-verification>
          }

        </div>

      } @else {

        <!-- State 3: Zero-State – initial load / no results yet -->
        <app-zero-state (loadPreset)="onLoadPreset()"></app-zero-state>

      }

      <!-- Code Generator Modal -->
      @if (state.showCodeGenerator() && state.config()) {
        <app-code-generator-modal></app-code-generator-modal>
      }

      <!-- Monte Carlo Validation Modal -->
      <app-monte-carlo-modal></app-monte-carlo-modal>
    </div>
  `
})
export class GeneratorComponent implements OnInit {
  public state = inject(RandomizationEngineFacade);
  public readonly viewport = inject(ViewportService);
  public readonly domainTheme = inject(DomainThemeService);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(SignalRouter);

  readonly introBadges = ['Stratified', 'Reproducible', 'Seeded', 'Deterministic', 'Multi-site'];

  /** Active results tab – 'grid' (default) or 'balance'. */
  readonly activeTab = signal<ResultsTab>('grid');

  readonly isSimulationMode = signal(false);
  readonly hashCopied = signal(false);

  /** Middle-truncated display value for the audit hash banner. */
  get truncatedAuditHash(): string {
    const hash = this.state.results()?.metadata?.auditHash ?? '';
    return hash.length > 24 ? `${hash.substring(0, 12)}...${hash.substring(hash.length - 12)}` : hash;
  }

  /** Copies the audit hash to the clipboard and briefly shows a ✓ icon. */
  copyAuditHash(): void {
    const hash = this.state.results()?.metadata?.auditHash;
    if (!hash) return;
    navigator.clipboard.writeText(hash).then(() => {
      this.hashCopied.set(true);
      setTimeout(() => this.hashCopied.set(false), 2000);
    }).catch(() => {
      // Clipboard write failed
    });
  }

  /** Reference to the embedded config form so we can drive preset loading. */
  private readonly configForm = viewChild<ConfigFormComponent>('configForm');

  private static readonly SCROLL_DELAY_MS = 100;

  ngOnInit(): void {
    if (this.router.queryParams()['mode'] === 'simulation') {
      this.isSimulationMode.set(true);
    }
  }

  constructor() {
    inject(SeoService).setPage({
      title: 'Randomization Generator | Equipose',
      description: 'Generate a statistically sound, reproducible RTSM stratified block randomization schema for your clinical trial. Export to R, Python, SAS, or Stata.',
      canonicalPath: '/generator',
    });

    let simulationInitialized = false;
    effect(() => {
      const form = this.configForm();
      const isSim = this.isSimulationMode();
      
      if (isSim && form && !simulationInitialized) {
        simulationInitialized = true;
        // Schedule it slightly after current change detection
        setTimeout(() => {
          form.loadPreset('standard');
          form.metadataGroup.patchValue({
            protocolId: 'Simulation',
            subjectIdMask: 'SIM-{SITE}-{STRATUM}-{SEQ:3}'
          });
          form.regulatoryGroup.patchValue({ isAcknowledged: true });
          form.onSubmit();
        }, 0);
      }
    });

    // Scroll to the skeleton as soon as generation starts, giving the user
    // immediate tactile feedback that work has begun.
    effect(() => {
      if (this.state.isGenerating()) {
        setTimeout(() => {
          this.document.getElementById('skeleton-section')?.scrollIntoView({ behavior: 'smooth' });
        }, GeneratorComponent.SCROLL_DELAY_MS);
      }
    });

    // Scroll to results once generation is complete.
    effect(() => {
      if (this.state.results() && !this.state.isGenerating()) {
        setTimeout(() => {
          this.document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
        }, GeneratorComponent.SCROLL_DELAY_MS);
      }
    });
  }

  handlePromoteToStudy(): void {
    this.isSimulationMode.set(false);
    
    // Clear the mode query param
    const currentParams = { ...this.router.queryParams() };
    delete currentParams['mode'];
    this.router.navigate(this.router.path(), currentParams);
    
    const form = this.configForm();
    if (form) {
      // Clear the "Simulation" placeholders to force the user to enter real administrative data
      form.metadataGroup.patchValue({
        protocolId: '',
        subjectIdMask: '{SITE}-{STRATUM}-{SEQ:3}'
      });
      form.regulatoryGroup.patchValue({ isAcknowledged: false });
      
      // Scroll back up to the form
      this.document.getElementById('wizard-start')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * The preset type loaded when the user clicks the Zero-State CTA.
   * Using a named constant guards against typos and makes the intent clear.
   */
  private static readonly ONBOARDING_PRESET = 'standard' as const;

  /**
   * Called when the Zero-State CTA is clicked.
   * Hydrates the config form with the standard Phase II trial preset so new
   * users can explore the application without manual data entry.
   */
  onLoadPreset(): void {
    this.configForm()?.loadPreset(GeneratorComponent.ONBOARDING_PRESET);
  }
}
