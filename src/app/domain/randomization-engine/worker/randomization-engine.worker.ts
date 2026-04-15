/// <reference lib="webworker" />

import { generateRandomizationSchema, generateCryptoSeed } from '../core/randomization-algorithm';
import type {
  GenerationCommand,
  MonteCarloProgressPayload,
  MonteCarloSuccessPayload,
  WorkerResponse
} from './worker-protocol';
import type { RandomizationConfig } from '../../core/models/randomization.model';

type IncomingCommand = GenerationCommand | { id: string; command: 'START_MONTE_CARLO'; payload: RandomizationConfig };

addEventListener('message', (event: MessageEvent<IncomingCommand>) => {
  const { id, command, payload } = event.data;

  if (command === 'START_GENERATION') {
    try {
      const result = generateRandomizationSchema(payload);
      const response: WorkerResponse = {
        id,
        type: 'GENERATION_SUCCESS',
        payload: result
      };
      postMessage(response);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Internal error during randomization';
      const response: WorkerResponse = {
        id,
        type: 'GENERATION_ERROR',
        payload: { error: { error: msg } }
      };
      postMessage(response);
    }
  } else if (command === 'START_MONTE_CARLO') {
    runMonteCarlo(id, payload);
  }
});

function runMonteCarlo(id: string, config: RandomizationConfig): void {
  const TOTAL_ITERATIONS = 10_000;
  const PROGRESS_INTERVAL = 500;

  // Initialise per-arm accumulators
  const armCounts: Record<string, number> = {};
  for (const arm of config.arms) {
    armCounts[arm.id] = 0;
  }

  let totalSubjects = 0;

  for (let i = 0; i < TOTAL_ITERATIONS; i++) {
    // Replace the user's seed with a cryptographically random one each iteration
    const iterationConfig = { ...config, seed: generateCryptoSeed() };

    try {
      const result = generateRandomizationSchema(iterationConfig);
      // Tally arm assignments in-memory; let the schema array go out of scope immediately
      for (const subject of result.schema) {
        armCounts[subject.treatmentArmId] = (armCounts[subject.treatmentArmId] ?? 0) + 1;
        totalSubjects++;
      }
    } catch {
      // Skip invalid iterations (e.g., edge-case config errors) without crashing the simulation
    }

    // Emit progress every PROGRESS_INTERVAL iterations
    if ((i + 1) % PROGRESS_INTERVAL === 0) {
      const progressPayload: MonteCarloProgressPayload = {
        iterationsCompleted: i + 1,
        totalIterations: TOTAL_ITERATIONS
      };
      const progressResponse: WorkerResponse<MonteCarloProgressPayload> = {
        id,
        type: 'MONTE_CARLO_PROGRESS',
        payload: progressPayload
      };
      postMessage(progressResponse);
    }
  }

  // Calculate expected counts based on pure ratio math
  const totalRatio = config.arms.reduce((sum, arm) => sum + arm.ratio, 0);
  const arms = config.arms.map(arm => ({
    armId: arm.id,
    armName: arm.name,
    ratio: arm.ratio,
    expectedCount: Math.round((arm.ratio / totalRatio) * totalSubjects),
    actualCount: armCounts[arm.id] ?? 0
  }));

  const successPayload: MonteCarloSuccessPayload = {
    totalIterations: TOTAL_ITERATIONS,
    totalSubjectsSimulated: totalSubjects,
    arms
  };

  const successResponse: WorkerResponse<MonteCarloSuccessPayload> = {
    id,
    type: 'MONTE_CARLO_SUCCESS',
    payload: successPayload
  };
  postMessage(successResponse);
}
