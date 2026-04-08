import { RandomizationConfig, RandomizationResult } from '../../core/models/randomization.model';

/** Discriminated union of commands sent from the main thread to the worker. */
export type WorkerCommandType = 'START_GENERATION' | 'START_MONTE_CARLO';

/** Discriminated union of responses sent from the worker to the main thread. */
export type WorkerResponseType =
  | 'GENERATION_SUCCESS'
  | 'GENERATION_ERROR'
  | 'PROGRESS_UPDATE'
  | 'MONTE_CARLO_PROGRESS'
  | 'MONTE_CARLO_SUCCESS';

export interface WorkerCommand<T = unknown> {
  /** Unique correlation identifier so callers can match responses to requests. */
  id: string;
  command: WorkerCommandType;
  payload: T;
}

export interface WorkerResponse<T = unknown> {
  /** Mirrors the request `id` so the caller can route the response correctly. */
  id: string;
  type: WorkerResponseType;
  payload: T;
}

/** Strongly-typed command for starting schema generation. */
export type GenerationCommand = WorkerCommand<RandomizationConfig>;

/** Strongly-typed success response containing the generated result. */
export type GenerationSuccessResponse = WorkerResponse<RandomizationResult>;

/** Strongly-typed error response containing the error payload. */
export type GenerationErrorResponse = WorkerResponse<{ error: { error: string } }>;

/** Strongly-typed command for starting a Monte Carlo simulation. */
export type MonteCarloCommand = WorkerCommand<RandomizationConfig>;

/** Progress update payload streamed from the worker during Monte Carlo simulation. */
export interface MonteCarloProgressPayload {
  iterationsCompleted: number;
  totalIterations: number;
}

/** Aggregated result for a single treatment arm across all Monte Carlo iterations. */
export interface MonteCarloArmResult {
  armId: string;
  armName: string;
  ratio: number;
  expectedCount: number;
  actualCount: number;
}

/** Final payload sent from the worker when Monte Carlo simulation completes. */
export interface MonteCarloSuccessPayload {
  totalIterations: number;
  totalSubjectsSimulated: number;
  arms: MonteCarloArmResult[];
}

/** Strongly-typed progress response for Monte Carlo simulation. */
export type MonteCarloProgressResponse = WorkerResponse<MonteCarloProgressPayload>;

/** Strongly-typed success response for Monte Carlo simulation. */
export type MonteCarloSuccessResponse = WorkerResponse<MonteCarloSuccessPayload>;
