import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { RandomizationEngineFacade } from './randomization-engine.facade';
import { RandomizationConfig, RandomizationResult } from '../core/models/randomization.model';
import { StudyPresets } from '../core/presets/study-presets';
import { generateRandomizationSchema } from './core/randomization-algorithm';
import { vi } from 'vitest';
import { ToastService } from '../../core/services/toast.service';

/** Flush all pending microtasks so async signals settle. */
const flushMicrotasks = async () => await new Promise(r => setTimeout(r, 0));

const mockConfig: RandomizationConfig = StudyPresets.extend(StudyPresets.Standard, {
  protocolId: 'PARITY-TEST',
  studyName: 'Parity Study',
  phase: 'Phase III',
  arms: [
    { id: 'A', name: 'Active', ratio: 1 },
    { id: 'B', name: 'Placebo', ratio: 1 }
  ],
  sites: ['Site A', 'Site B'],
  strata: [
    { id: 'age', name: 'Age Group', levels: ['Adult', 'Elderly'] }
  ],
  blockSizes: [4],
  stratumCaps: [
    { levelIds: { age: 'Adult' }, cap: 8 },
    { levelIds: { age: 'Elderly' }, cap: 8 }
  ],
  seed: 'parity_seed_123',
  subjectIdMask: '{SITE}-{SEQ:3}'
});

/**
 * Simulated Worker that executes the actual algorithm logic.
 */
class RealLogicWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;

  postMessage(data: any) {
    if (data.command === 'START_GENERATION') {
      try {
        const result = generateRandomizationSchema(data.payload);
        // Simulate async worker delay
        setTimeout(() => {
          this.onmessage?.({
            data: {
              id: data.id,
              type: 'GENERATION_SUCCESS',
              payload: result
            }
          } as MessageEvent);
        }, 0);
      } catch (error: any) {
        setTimeout(() => {
          this.onmessage?.({
            data: {
              id: data.id,
              type: 'GENERATION_ERROR',
              payload: { error: { error: error.message } }
            }
          } as MessageEvent);
        }, 0);
      }
    }
  }
}

describe('RandomizationEngine Parity (Worker vs Fallback)', () => {
  let workerFacade: RandomizationEngineFacade;
  let fallbackFacade: RandomizationEngineFacade;
  let realWorker: RealLogicWorker;

  beforeEach(() => {
    vi.spyOn(crypto.subtle, 'digest').mockImplementation(async (_algo, data) => {
        // Simple deterministic mock hash for testing purposes
        return new Uint8Array(32).fill(data.byteLength % 256).buffer;
    });

    realWorker = new RealLogicWorker();
    vi.stubGlobal('Worker', function() { return realWorker; });

    // We can't use two different TestBed configurations in the same beforeEach
    // Instead, we will manually instantiate the facades or use resetTestingModule

    const mockToastService = {
      showSuccess: vi.fn(),
      showError: vi.fn()
    };

    // Setup Worker Facade
    TestBed.configureTestingModule({
      imports: [],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: ToastService, useValue: mockToastService }
      ]
    });
    workerFacade = TestBed.inject(RandomizationEngineFacade);
    (workerFacade as any).initWorker();

    // Reset and setup Fallback Facade
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
        imports: [],
        providers: [
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: ToastService, useValue: mockToastService }
        ]
    });
    fallbackFacade = TestBed.inject(RandomizationEngineFacade);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should produce identical results for a standard stratified block configuration', async () => {
    // Generate via worker
    workerFacade.generateSchema(mockConfig);

    // Generate via fallback
    fallbackFacade.generateSchema(mockConfig);

    // Wait for both to finish
    while (workerFacade.isGenerating() || fallbackFacade.isGenerating()) {
      await flushMicrotasks();
      await new Promise(r => setTimeout(r, 10));
    }

    const workerResult = workerFacade.results();
    const fallbackResult = fallbackFacade.results();

    expect(workerResult).not.toBeNull();
    expect(fallbackResult).not.toBeNull();

    // Verify metadata (excluding generatedAt which might differ by milliseconds if not mocked)
    expect(workerResult?.metadata.seed).toBe(fallbackResult?.metadata.seed);
    expect(workerResult?.metadata.protocolId).toBe(fallbackResult?.metadata.protocolId);

    // Verify schema length and content
    expect(workerResult?.schema.length).toBe(fallbackResult?.schema.length);
    expect(workerResult?.schema).toEqual(fallbackResult?.schema);

    // Verify audit hash parity
    expect(workerResult?.metadata.auditHash).toBe(fallbackResult?.metadata.auditHash);
  });

  it('should produce identical results for Minimization method', async () => {
    const minimizationConfig = StudyPresets.extend(StudyPresets.Minimization, {
      ...mockConfig,
      randomizationMethod: 'MINIMIZATION',
      blockSizes: [], // Minimization doesn't use block sizes
      stratumCaps: []
    });

    workerFacade.generateSchema(minimizationConfig);
    fallbackFacade.generateSchema(minimizationConfig);

    while (workerFacade.isGenerating() || fallbackFacade.isGenerating()) {
      await flushMicrotasks();
      await new Promise(r => setTimeout(r, 10));
    }

    expect(workerFacade.results()?.schema).toEqual(fallbackFacade.results()?.schema);
    expect(workerFacade.results()?.metadata.auditHash).toBe(fallbackFacade.results()?.metadata.auditHash);
  });

  it('should produce identical results for Marginal Only strategy', async () => {
    const marginalConfig: RandomizationConfig = {
      ...mockConfig,
      capStrategy: 'MARGINAL_ONLY',
      strata: [
        {
          id: 'age',
          name: 'Age',
          levels: ['Adult', 'Elderly'],
          levelDetails: [
            { name: 'Adult', marginalCap: 5 },
            { name: 'Elderly', marginalCap: 5 }
          ]
        }
      ]
    };

    workerFacade.generateSchema(marginalConfig);
    fallbackFacade.generateSchema(marginalConfig);

    while (workerFacade.isGenerating() || fallbackFacade.isGenerating()) {
      await flushMicrotasks();
      await new Promise(r => setTimeout(r, 10));
    }

    expect(workerFacade.results()?.schema).toEqual(fallbackFacade.results()?.schema);
  });

  it('should both fail with identical error messages for invalid configurations', async () => {
    const invalidConfig = { ...mockConfig, blockSizes: [3] }; // 3 is not multiple of 2

    workerFacade.generateSchema(invalidConfig);
    fallbackFacade.generateSchema(invalidConfig);

    while (workerFacade.isGenerating() || fallbackFacade.isGenerating()) {
      await flushMicrotasks();
      await new Promise(r => setTimeout(r, 10));
    }

    expect(workerFacade.error()).toBe(fallbackFacade.error());
    expect(workerFacade.error()).toContain('is not a multiple of total ratio');
  });
});
