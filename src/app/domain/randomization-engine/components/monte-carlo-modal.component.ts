import { ChangeDetectionStrategy, Component, computed, inject, effect, ElementRef, ViewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RandomizationEngineFacade } from '../randomization-engine.facade';
import { ThemeService } from '../../../core/services/theme.service';
import type { MonteCarloArmResult } from '../worker/worker-protocol';
import { KeyboardScrollDirective } from '../../../core/directives/keyboard-scroll.directive';
import { FocusManagerDirective } from '../../../core/directives/focus-manager.directive';
import { ButtonComponent } from '../../../core/components/ui/button.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-monte-carlo-modal',
  standalone: true,
  imports: [DecimalPipe, KeyboardScrollDirective, FocusManagerDirective, ButtonComponent],
  template: `
    <dialog #modalDialog appFocusManager tabindex="-1" (cancel)="onCancel($event)" class="p-0 m-auto bg-transparent backdrop:bg-black/50 border-none open:flex open:flex-col rounded-xl overflow-hidden shadow-xl w-full max-w-4xl max-h-[90vh]">
      <div class="relative flex flex-col align-bottom bg-overlay backdrop-blur-md rounded-xl text-left overflow-hidden transform transition-all w-full h-full border border-border-subtle" role="dialog" aria-modal="true" aria-labelledby="mc-modal-title">

      <!-- Header -->
      <div class="bg-overlay/80 px-6 pt-5 pb-4 flex-none">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-3">
                <div class="flex-shrink-0 w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-main" id="mc-modal-title">
                    Statistical QA - Monte Carlo Validation
                  </h3>
                  <p class="text-xs text-muted mt-0.5">
                    10,000 independent trial simulations using cryptographically random seeds
                  </p>
                </div>
              </div>
              @if (!facade.isMonteCarloRunning()) {
                <app-button
                  type="button"
                  variant="bare"
                  (onClick)="closeModal()"
                  customClass="text-disabled hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                  ariaLabel="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </app-button>
              }
            </div>
          </div>

      <!-- Body -->
      <div class="px-6 pb-6 space-y-6 overflow-y-auto flex-1">

        <!-- Seed disclaimer banner -->
            <div class="{{ domainTheme.getSemanticColor('warning').bgLightClass }} {{ domainTheme.getSemanticColor('warning').borderClass }} rounded-lg p-3 flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 {{ domainTheme.getSemanticColor('warning').textClass }} dark:{{ domainTheme.getSemanticColor('warning').textClass }} flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-xs {{ domainTheme.getSemanticColor('warning').textClass }} dark:{{ domainTheme.getSemanticColor('warning').textClass }}" data-testid="seed-disclaimer-banner">
                <strong>Note:</strong> Your specific PRNG seed has been stripped for this simulation. Each of the 10,000 iterations uses a unique, cryptographically random seed to prove the general fairness of the algorithm independent of any specific seed value.
              </p>
            </div>

        <!-- Progress state -->
        @if (facade.isMonteCarloRunning()) {
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-700 dark:text-slate-300">Simulating trials…</span>
              <span class="text-sm font-semibold text-indigo-600 dark:text-indigo-400" data-testid="mc-progress-percentage">{{ facade.monteCarloProgress() }}%</span>
            </div>
            <progress
              class="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden border border-border-strong dark:border-slate-600 [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:bg-indigo-600 dark:[&::-webkit-progress-value]:bg-indigo-500 [&::-moz-progress-bar]:bg-indigo-600 dark:[&::-moz-progress-bar]:bg-indigo-500 transition-all duration-300 ease-out"
              [value]="facade.monteCarloProgress()"
              max="100"
              data-testid="mc-progress-bar"
            >
              {{ facade.monteCarloProgress() }}%
            </progress>
                <p class="text-xs text-muted text-center" data-testid="mc-progress-iterations-text">
                  {{ progressIterations() | number }} / 10,000 iterations completed - running off the main UI thread via Web Worker
                </p>
              </div>
            }

            <!-- Error state -->
            @if (facade.monteCarloError(); as errorMsg) {
              <div #errorAlert tabindex="-1" class="outline-none {{ domainTheme.getSemanticColor('error').bgLightClass }} {{ domainTheme.getSemanticColor('error').borderClass }} rounded-lg p-6 flex flex-col items-center justify-center text-center gap-4 min-h-[200px]" data-testid="mc-error-state">
                <div class="w-12 h-12 rounded-full {{ domainTheme.getSemanticColor('error').bgLightClass }} flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 {{ domainTheme.getSemanticColor('error').textClass }}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h4 class="text-lg font-semibold {{ domainTheme.getSemanticColor('error').textClass }} mb-2">Simulation Failed</h4>
                  <p class="text-sm {{ domainTheme.getSemanticColor('error').textClass }}">{{ errorMsg }}</p>
                </div>
              </div>
            }

            <!-- Results state -->
            @if (facade.monteCarloResults(); as results) {
              <h4 #resultsHeader tabindex="-1" class="sr-only outline-none">Simulation Results</h4>
              <!-- Summary stats -->
              <div [class]="summaryGridClass(results.attritionRate)">
                <div class="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 text-center">
                  <p class="text-2xl font-bold text-main" data-testid="simulations-run-value">{{ results.totalIterations | number }}</p>
                  <p class="text-xs text-muted mt-1">Simulations Run</p>
                </div>
                <div class="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 text-center">
                  <p class="text-2xl font-bold text-main">{{ results.totalSubjectsSimulated | number }}</p>
                  <p class="text-xs text-muted mt-1">Total Subjects Simulated</p>
                </div>
                @if (results.attritionRate > 0) {
                  <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center border border-purple-100 dark:border-purple-800/40">
                    <p class="text-2xl font-bold text-purple-800 dark:text-purple-200" data-testid="retained-subjects-value">{{ results.totalRetainedSubjects | number }}</p>
                    <p class="text-xs text-purple-700 dark:text-purple-300 mt-1">Retained Subjects ({{ results.attritionRate }}% dropout)</p>
                  </div>
                }
                <div [class]="deviationCardClass(results.attritionRate)">
                  <p class="text-2xl font-bold" [class]="maxDeviationClass()" data-testid="max-deviation-value">{{ maxDeviation() | number:'1.4-4' }}%</p>
                  <p class="text-xs text-muted mt-1">Max Arm Deviation</p>
                </div>
              </div>

              <!-- Bar chart -->
              <div>
                <h4 class="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Treatment Arm Distribution</h4>
                <div class="space-y-3" data-testid="mc-chart">
                  @for (arm of results.arms; track arm.armId) {
                    <div class="space-y-1">
                      <div class="flex justify-between items-center">
                        <span class="text-xs font-medium text-gray-600 dark:text-slate-300">{{ arm.armName }} ({{ arm.armId }})</span>
                        <span class="text-xs text-muted">Deviation: <span [class]="deviationClass(arm)" class="font-semibold">{{ deviation(arm) | number:'1.4-4' }}%</span></span>
                      </div>
                      <!-- Expected bar -->
                      <div class="flex items-center gap-2">
                        <span class="text-xs w-20 text-right text-muted">Expected</span>
                        <div class="flex-1 bg-subtle rounded-full h-4 overflow-hidden border border-border-strong dark:border-slate-600">
                          <div
                            class="bg-indigo-300 dark:bg-indigo-600/60 h-full rounded-full transition-all duration-500 border-r border-indigo-400 dark:border-indigo-400"
                            [style.width.%]="barWidth(arm.expectedCount, results.totalSubjectsSimulated)"
                          ></div>
                        </div>
                        <span class="text-xs w-20 text-muted tabular-nums">{{ arm.expectedCount | number }}</span>
                      </div>
                      <!-- Actual bar -->
                      <div class="flex items-center gap-2">
                        <span class="text-xs w-20 text-right text-muted">Actual</span>
                        <div class="flex-1 bg-subtle rounded-full h-4 overflow-hidden border border-border-strong dark:border-slate-600">
                          <div
                            class="bg-indigo-600 dark:bg-indigo-400 h-full rounded-full transition-all duration-500 border-r border-indigo-700 dark:border-indigo-200"
                            [style.width.%]="barWidth(arm.actualCount, results.totalSubjectsSimulated)"
                          ></div>
                        </div>
                        <span class="text-xs w-20 text-muted tabular-nums">{{ arm.actualCount | number }}</span>
                      </div>
                      <!-- Post-attrition bar (only when attrition > 0) -->
                      @if (results.attritionRate > 0) {
                        <div class="flex items-center gap-2">
                          <span class="text-xs w-20 text-right text-purple-700 dark:text-purple-300">Retained</span>
                          <div class="flex-1 bg-subtle rounded-full h-4 overflow-hidden border border-border-strong dark:border-slate-600">
                            <div
                              class="bg-purple-500 dark:bg-purple-400 h-full rounded-full transition-all duration-500 border-r border-purple-700 dark:border-purple-200"
                              [style.width.%]="barWidth(arm.retainedCount, results.totalRetainedSubjects)"
                              data-testid="mc-retained-bar"
                            ></div>
                          </div>
                          <span class="text-xs w-20 text-purple-700 dark:text-purple-200 tabular-nums">{{ arm.retainedCount | number }}</span>
                        </div>
                      }
                    </div>
                  }
                </div>
                <!-- Legend -->
                <div class="flex flex-wrap gap-4 mt-3">
                  <div class="flex items-center gap-1.5">
                    <div class="w-3 h-3 rounded-full bg-indigo-300 dark:bg-indigo-600/60"></div>
                    <span class="text-xs text-muted">Target (Expected)</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <div class="w-3 h-3 rounded-full bg-indigo-600 dark:bg-indigo-400"></div>
                    <span class="text-xs text-muted">Actual (Simulated)</span>
                  </div>
                  @if (results.attritionRate > 0) {
                    <div class="flex items-center gap-1.5">
                      <div class="w-3 h-3 rounded-full bg-purple-500 dark:bg-purple-400"></div>
                      <span class="text-xs text-purple-700 dark:text-purple-300">Post-Attrition (Retained)</span>
                    </div>
                  }
                </div>
              </div>

          <!-- Per-arm detail table -->
          <div class="overflow-x-auto rounded-lg border border-border-base" tabindex="0" appKeyboardScroll aria-label="Per-Arm Detail Table">
            <table class="min-w-full text-xs divide-y divide-gray-200 dark:divide-slate-700">
              <thead class="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  <th scope="col" class="px-4 py-2 text-left font-semibold text-gray-600 dark:text-slate-300">Arm</th>
                  <th scope="col" class="px-4 py-2 text-right font-semibold text-gray-600 dark:text-slate-300">Ratio</th>
                  <th scope="col" class="px-4 py-2 text-right font-semibold text-gray-600 dark:text-slate-300">Expected</th>
                  <th scope="col" class="px-4 py-2 text-right font-semibold text-gray-600 dark:text-slate-300">Actual</th>
                  @if (results.attritionRate > 0) {
                    <th scope="col" class="px-4 py-2 text-right font-semibold text-purple-700 dark:text-purple-300">Retained</th>
                  }
                  <th scope="col" class="px-4 py-2 text-right font-semibold text-gray-600 dark:text-slate-300">Deviation</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-slate-700/50 bg-surface">
                @for (arm of results.arms; track arm.armId) {
                  <tr>
                    <th scope="row" class="px-4 py-2 font-medium text-main text-left">{{ arm.armName }} <span class="text-muted">({{ arm.armId }})</span></th>
                    <td class="px-4 py-2 text-right text-gray-600 dark:text-slate-300">{{ arm.ratio }}</td>
                    <td class="px-4 py-2 text-right tabular-nums text-gray-600 dark:text-slate-300">{{ arm.expectedCount | number }}</td>
                    <td class="px-4 py-2 text-right tabular-nums text-gray-600 dark:text-slate-300">{{ arm.actualCount | number }}</td>
                    @if (results.attritionRate > 0) {
                      <td class="px-4 py-2 text-right tabular-nums text-purple-700 dark:text-purple-200">{{ arm.retainedCount | number }}</td>
                    }
                    <td class="px-4 py-2 text-right tabular-nums font-semibold" [class]="deviationClass(arm)">{{ deviation(arm) | number:'1.4-4' }}%</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

              <!-- High imbalance warning (shown only with attrition and significant deviation) -->
              @if (results.attritionRate > 0 && maxRetainedDeviation() > ATTRITION_WARNING_THRESHOLD_PCT) {
                <div role="alert" tabindex="-1" #warningBanner class="{{ domainTheme.getSemanticColor('error').bgLightClass }} {{ domainTheme.getSemanticColor('error').borderClass }} rounded-lg p-4 flex items-start gap-3 outline-none" data-testid="mc-attrition-warning">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 {{ domainTheme.getSemanticColor('error').textClass }} flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p class="text-sm {{ domainTheme.getSemanticColor('error').textClass }} leading-relaxed" data-testid="mc-attrition-warning-text">
                    <strong>High post-attrition imbalance detected.</strong>
                    Under a {{ results.attritionRate }}% dropout rate, the maximum retained-arm deviation exceeds {{ ATTRITION_WARNING_THRESHOLD_PCT }}% ({{ maxRetainedDeviation() | number:'1.4-4' }}%).
                    Consider utilizing smaller block sizes or minimization to counter chronological bias under high attrition.
                  </p>
                </div>
              }

              <!-- Clinical confidence banner -->
              <div #completionAlert tabindex="-1" class="outline-none {{ domainTheme.getSemanticColor('success').bgLightClass }} {{ domainTheme.getSemanticColor('success').borderClass }} rounded-lg p-4 flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 {{ domainTheme.getSemanticColor('success').textClass }} flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="text-sm {{ domainTheme.getSemanticColor('success').textClass }} leading-relaxed" data-testid="mc-confidence-statement">
                  <strong>Algorithm mathematically verified.</strong>
                  After {{ results.totalIterations | number }} independent trial simulations, actual treatment assignment deviates from target theoretical ratios by less than <strong>{{ preAttritionMaxDeviation() | number:'1.4-4' }}%</strong>, confirming true uniform distribution and absence of block bias.
                  @if (results.attritionRate > 0) {
                    Post-attrition balance ({{ results.attritionRate }}% dropout) shows a maximum retained-arm deviation of <strong>{{ maxRetainedDeviation() | number:'1.4-4' }}%</strong>.
                  }
                </p>
              </div>
        }

      </div>

      <!-- Footer -->
      @if (!facade.isMonteCarloRunning()) {
        <div class="bg-gray-50/80 dark:bg-slate-900/50 px-6 py-3 flex justify-end border-t border-border-subtle flex-none">
          <app-button
            type="button"
            variant="secondary"
            (onClick)="closeModal()"
            customClass="inline-flex justify-center rounded-lg shadow-sm px-4 py-2 text-sm font-medium"
            data-testid="modal-close-footer"
          >
            Close
          </app-button>
        </div>
      }

      </div>
    </dialog>
  `
})
export class MonteCarloModalComponent {
  readonly facade = inject(RandomizationEngineFacade);
  protected readonly domainTheme = inject(ThemeService);
  @ViewChild('modalDialog') modalDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('resultsHeader') resultsHeader?: ElementRef<HTMLElement>;
  @ViewChild('warningBanner') warningBanner?: ElementRef<HTMLElement>;
  @ViewChild('completionAlert') completionAlert?: ElementRef<HTMLElement>;
  @ViewChild('errorAlert') errorAlert?: ElementRef<HTMLElement>;

  constructor() {
    effect(() => {
      const isRunning = this.facade.isMonteCarloRunning();
      const results = this.facade.monteCarloResults();
      const error = this.facade.monteCarloError();

      if (isRunning || results || error) {
        if (this.modalDialog?.nativeElement && !this.modalDialog.nativeElement.open) {
          this.modalDialog.nativeElement.showModal();
        }
      } else {
        if (this.modalDialog?.nativeElement && this.modalDialog.nativeElement.open) {
          this.modalDialog.nativeElement.close();
        }
      }
    });

    effect(() => {
      const results = this.facade.monteCarloResults();
      const error = this.facade.monteCarloError();
      if (results || error) {
        setTimeout(() => {
          if (error && this.errorAlert?.nativeElement) {
            this.errorAlert.nativeElement.focus();
          } else if (this.completionAlert?.nativeElement) {
            this.completionAlert.nativeElement.focus();
          } else if (this.warningBanner?.nativeElement) {
            this.warningBanner.nativeElement.focus();
          } else if (this.resultsHeader?.nativeElement) {
            this.resultsHeader.nativeElement.focus();
          }
        }, 50);
      }
    });
  }

  closeModal(): void {
    this.facade.closeMonteCarloModal();
    if (this.modalDialog?.nativeElement) {
      this.modalDialog.nativeElement.close();
    }
  }

  onCancel(event: Event): void {
    // Synchronize application state when closed via Escape key
    event.preventDefault();
    if (this.facade.isMonteCarloRunning()) {
      this.facade.cancelMonteCarlo();
    }
    this.closeModal();
  }

  /** Threshold (in %) above which the post-attrition imbalance warning banner is shown. */
  protected readonly ATTRITION_WARNING_THRESHOLD_PCT = 2;

  readonly progressIterations = computed(() =>
    Math.round((this.facade.monteCarloProgress() / 100) * 10_000)
  );

  /** Returns the Tailwind grid class for the summary card row based on active card count. */
  summaryGridClass(attritionRate: number): string {
    return attritionRate > 0
      ? 'grid grid-cols-2 sm:grid-cols-4 gap-4'
      : 'grid grid-cols-2 sm:grid-cols-3 gap-4';
  }

  deviationCardClass(attritionRate: number): string {
    const base = 'bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 text-center';
    return attritionRate === 0 ? `${base} col-span-2 sm:col-span-1` : base;
  }

  barWidth(count: number, total: number): number {
    if (total === 0) return 0;
    return (count / total) * 100;
  }

  deviation(arm: MonteCarloArmResult): number {
    if (arm.expectedCount === 0) return 0;
    return Math.abs((arm.actualCount - arm.expectedCount) / arm.expectedCount) * 100;
  }

  retainedDeviation(arm: MonteCarloArmResult): number {
    if (arm.expectedRetainedCount === 0) return 0;
    return Math.abs((arm.retainedCount - arm.expectedRetainedCount) / arm.expectedRetainedCount) * 100;
  }

  deviationClass(arm: MonteCarloArmResult): string {
    const d = this.deviation(arm);
    if (d < 0.1) return this.domainTheme.getSemanticColor('success').textClass;
    if (d < 1) return this.domainTheme.getSemanticColor('warning').textClass;
    return this.domainTheme.getSemanticColor('error').textClass;
  }

  preAttritionMaxDeviation(): number {
    const results = this.facade.monteCarloResults();
    if (!results) return 0;
    return results.arms.reduce((max, arm) => Math.max(max, this.deviation(arm)), 0);
  }

  maxDeviation(): number {
    const results = this.facade.monteCarloResults();
    if (!results) return 0;
    return results.attritionRate > 0
      ? results.arms.reduce((max, arm) => Math.max(max, this.retainedDeviation(arm)), 0)
      : this.preAttritionMaxDeviation();
  }

  maxRetainedDeviation(): number {
    const results = this.facade.monteCarloResults();
    if (!results) return 0;
    return results.arms.reduce((max, arm) => Math.max(max, this.retainedDeviation(arm)), 0);
  }

  maxDeviationClass(): string {
    const d = this.maxDeviation();
    if (d < 0.1) return `${this.domainTheme.getSemanticColor('success').textClass} text-2xl font-bold`;
    if (d < 1) return `${this.domainTheme.getSemanticColor('warning').textClass} text-2xl font-bold`;
    return `${this.domainTheme.getSemanticColor('error').textClass} text-2xl font-bold`;
  }
}
