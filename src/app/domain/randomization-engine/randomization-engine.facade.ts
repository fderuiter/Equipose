import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  RandomizationConfig,
  RandomizationResult
} from '../core/models/randomization.model';
import { AnnouncementService } from '../../core/services/announcement.service';
import { ToastService } from '../../core/services/toast.service';
import { computeAuditHash } from './core/crypto-hash';
import { generateRandomizationSchema, generateCryptoSeed } from './core/randomization-algorithm';
import { previewSubjectIdMask, validateSubjectIdMask } from './core/subject-id-engine';
import type {
  GenerationCommand,
  MonteCarloCommand,
  MonteCarloProgressPayload,
  MonteCarloSuccessPayload,
  WorkerResponse
} from './worker/worker-protocol';

@Injectable({ providedIn: 'root' })
export class RandomizationEngineFacade {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly toastService = inject(ToastService);
  private readonly announcementService = inject(AnnouncementService);

  private worker: Worker | null = null;
  private pendingCallbacks = new Map<
    string,
    { resolve: (r: RandomizationResult) => void | Promise<void>; reject: (e: unknown) => void }
  >();

  private pendingMonteCarloCallbacks = new Map<
    string,
    {
      onProgress: (p: MonteCarloProgressPayload) => void;
      onSuccess: (r: MonteCarloSuccessPayload) => void;
      onError: (e: unknown) => void;
    }
  >();

  // -------------------------------------------------------------------------
  // Public state signals (mirrors the former GeneratorStateService API)
  // -------------------------------------------------------------------------

  readonly config = signal<RandomizationConfig | null>(null);
  readonly results = signal<RandomizationResult | null>(null);
  readonly isGenerating = signal(false);
  readonly error = signal<string | null>(null);

  // UI state
  readonly showCodeGenerator = signal(false);
  readonly codeLanguage = signal<'R' | 'SAS' | 'Python' | 'STATA'>('R');

  // Monte Carlo state
  readonly isMonteCarloRunning = signal(false);
  readonly monteCarloProgress = signal(0);
  readonly monteCarloResults = signal<MonteCarloSuccessPayload | null>(null);
  readonly monteCarloError = signal<string | null>(null);
  
  constructor() {
    if (this.isBrowser) {
      this.initWorker();
    }
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  previewSubjectIdMask(mask: string): string {
    return previewSubjectIdMask(mask);
  }

  validateSubjectIdMask(mask: string): { valid: boolean; error?: string } {
    return validateSubjectIdMask(mask);
  }

  generateSchema(newConfig: RandomizationConfig): void {
    this.config.set(newConfig);
    this.isGenerating.set(true);
    this.error.set(null);
    this.results.set(null);

    if (this.worker) {
      this.dispatchToWorker(newConfig);
    } else {
      // SSR or Worker unavailable – fall back to synchronous in-thread pure function
      try {
        const res = generateRandomizationSchema(newConfig);
        // Hashing remains async
        computeAuditHash(res).then(hash => {
          const resultWithHash: RandomizationResult = {
            ...res,
            metadata: { ...res.metadata, auditHash: hash }
          };
          this.results.set(resultWithHash);
          this.isGenerating.set(false);
          this.toastService.showSuccess('Schema successfully generated!');
        });
      } catch (err: any) {
        const message = err.message ?? 'An error occurred during schema generation.';
        this.error.set(message);
        this.isGenerating.set(false);
        this.toastService.showError(message);
      }
    }
  }

  generateSchemaAsync(config: RandomizationConfig): Promise<RandomizationResult> {
    if (this.worker) {
      return new Promise((resolve, reject) => {
        const id = crypto.randomUUID();
        this.pendingCallbacks.set(id, {
          resolve: async result => {
            try {
              const hash = await computeAuditHash(result);
              const resultWithHash: RandomizationResult = {
                ...result,
                metadata: { ...result.metadata, auditHash: hash }
              };
              resolve(resultWithHash);
            } catch (err) {
              reject(err);
            }
          },
          reject: err => {
            const errPayload = err as { error?: { error?: string } };
            const message =
              errPayload?.error?.error ?? 'An error occurred during schema generation.';
            reject(new Error(message));
          }
        });
        const command: GenerationCommand = { id, command: 'START_GENERATION', payload: config };
        this.worker!.postMessage(command);
      });
    } else {
      try {
        const res = generateRandomizationSchema(config);
        return computeAuditHash(res).then(hash => ({
          ...res,
          metadata: { ...res.metadata, auditHash: hash }
        }));
      } catch (err: any) {
        return Promise.reject(new Error(err.message ?? 'An error occurred during schema generation.'));
      }
    }
  }

  clearResults(): void {
    this.results.set(null);
    this.error.set(null);
  }

  openCodeGenerator(config: RandomizationConfig, language: 'R' | 'SAS' | 'Python' | 'STATA'): void {
    let finalConfig = config;
    if (!config.seed) {
      const currentResults = this.results();
      if (currentResults && currentResults.metadata.seed) {
        finalConfig = { ...config, seed: currentResults.metadata.seed };
      } else {
        finalConfig = { ...config, seed: generateCryptoSeed() };
      }
    }
    this.config.set(finalConfig);
    this.codeLanguage.set(language);
    this.showCodeGenerator.set(true);
  }

  closeCodeGenerator(): void {
    this.showCodeGenerator.set(false);
  }

  runMonteCarlo(config: RandomizationConfig, attritionRate = 0): void {
    this.isMonteCarloRunning.set(true);
    this.monteCarloProgress.set(0);
    this.monteCarloResults.set(null);
    this.monteCarloError.set(null);

    if (!this.worker) {
      this.isMonteCarloRunning.set(false);
      this.closeMonteCarloModal();
      return;
    }

    const id = crypto.randomUUID();

    this.pendingMonteCarloCallbacks.set(id, {
      onProgress: (p: MonteCarloProgressPayload) => {
        const pct = Math.round((p.iterationsCompleted / p.totalIterations) * 100);
        this.monteCarloProgress.set(pct);
        if (pct > 0 && pct % 25 === 0) {
          this.announcementService.announce(`Simulation progress: ${pct}%`, 'polite');
        }
      },
      onSuccess: (r: MonteCarloSuccessPayload) => {
        this.monteCarloResults.set(r);
        this.isMonteCarloRunning.set(false);
        this.monteCarloProgress.set(100);
        this.announcementService.announce('Simulation complete. Results are available.', 'polite');
      },
      onError: (e: unknown) => {
        this.isMonteCarloRunning.set(false);
        const errPayload = e as { error?: { error?: string } };
        const errorMsg = errPayload?.error?.error || 'Worker encountered an unexpected error.';
        this.monteCarloError.set(errorMsg);
        this.toastService.showError(errorMsg);
        this.announcementService.announce(`Simulation failed: ${errorMsg}`, 'assertive');
      }
    });

    const command: MonteCarloCommand = { id, command: 'START_MONTE_CARLO', payload: { config, attritionRate } };
    this.worker.postMessage(command);
  }


  cancelMonteCarlo(): void {
    if (this.isMonteCarloRunning()) {
      this.isMonteCarloRunning.set(false);
      this.monteCarloProgress.set(0);
      this.monteCarloResults.set(null);
      this.monteCarloError.set(null);
      this.announcementService.announce('Simulation stopped by user.', 'polite');
      
      this.pendingMonteCarloCallbacks.clear();
      
      // To truly stop the computation and free resources, we terminate and recreate the worker.
      if (this.worker) {
        try {
          if (typeof this.worker.terminate === 'function') {
            this.worker.terminate();
          }
        } catch (e) {
          console.error('Error terminating worker during cancel:', e);
        }
        this.worker = null;
        this.initWorker();
      }
    }
  }

  closeMonteCarloModal(): void {
    if (this.isMonteCarloRunning()) {
      this.cancelMonteCarlo();
    }
    this.monteCarloResults.set(null);
    this.monteCarloProgress.set(0);
    this.isMonteCarloRunning.set(false);
    this.monteCarloError.set(null);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private initWorker(): void {
    try {
      this.worker = new Worker(
        new URL('./worker/randomization-engine.worker', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { id, type, payload } = event.data;

        // Route Monte Carlo messages
        if (type === 'MONTE_CARLO_PROGRESS') {
          const mc = this.pendingMonteCarloCallbacks.get(id);
          if (mc) mc.onProgress(payload as MonteCarloProgressPayload);
          return;
        }
        if (type === 'MONTE_CARLO_SUCCESS') {
          const mc = this.pendingMonteCarloCallbacks.get(id);
          if (mc) {
            this.pendingMonteCarloCallbacks.delete(id);
            mc.onSuccess(payload as MonteCarloSuccessPayload);
          }
          return;
        }

        // Route standard generation messages
        const callbacks = this.pendingCallbacks.get(id);
        if (!callbacks) return;
        this.pendingCallbacks.delete(id);

        if (type === 'GENERATION_SUCCESS') {
          callbacks.resolve(payload as RandomizationResult);
        } else {
          callbacks.reject(payload);
        }
      };

      this.worker.onerror = (err: ErrorEvent) => {
        console.error('Randomization worker error:', err);

        // Terminate and nullify the worker reference instantly
        if (this.worker) {
          try {
            if (typeof this.worker.terminate === 'function') {
              this.worker.terminate();
            }
          } catch (e) {
            console.error('Error terminating worker:', e);
          }
          this.worker = null;
        }

        // Reject all pending callbacks
        this.pendingCallbacks.forEach(cb =>
          cb.reject({ error: { error: 'Worker encountered an unexpected error.' } })
        );
        this.pendingCallbacks.clear();

        this.pendingMonteCarloCallbacks.forEach(mc =>
          mc.onError({ error: { error: 'Worker encountered an unexpected error.' } })
        );
        this.pendingMonteCarloCallbacks.clear();

        // Close Monte Carlo simulation modal if active
        if (this.isMonteCarloRunning()) {
          this.isMonteCarloRunning.set(false);
          this.closeMonteCarloModal();
        }
      };
    } catch {
      // Worker construction failed (e.g. in environments that block workers)
      this.worker = null;
    }
  }

  private dispatchToWorker(config: RandomizationConfig): void {
    const id = crypto.randomUUID();

    this.pendingCallbacks.set(id, {
      resolve: async result => {
        const hash = await computeAuditHash(result);
        const resultWithHash: RandomizationResult = {
          ...result,
          metadata: { ...result.metadata, auditHash: hash }
        };
        this.results.set(resultWithHash);
        this.isGenerating.set(false);
        this.toastService.showSuccess('Schema successfully generated!');
      },
      reject: err => {
        const errPayload = err as { error?: { error?: string } };
        const message =
          errPayload?.error?.error ?? 'An error occurred during schema generation.';
        this.error.set(message);
        this.isGenerating.set(false);
        this.toastService.showError(message);
      }
    });

    const command: GenerationCommand = { id, command: 'START_GENERATION', payload: config };
    this.worker!.postMessage(command);
  }
}
