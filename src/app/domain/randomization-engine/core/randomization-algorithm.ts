import { MT19937Internal } from './mt19937';
import { DeterminismProvider } from './determinism.provider';
import { UnifiedValidationAuthority, ValidationFailure } from '../../core/validation/unified-validator';
import {
  TreatmentArm,
  RandomizationConfig,
  GeneratedSchema,
  RandomizationResult,
  BlockRule
} from '../../core/models/randomization.model';
import { generateSubjectId } from './subject-id-engine';
import { generateMinimization } from './minimization-algorithm';
import { SubjectRegistry } from './subject-registry';
import { simplifyRatios } from '../../shared/statistical/ratio-simplification';
import { fisherYatesShuffle } from '../../shared/statistical/fisher-yates';

// ---------------------------------------------------------------------------
// Crypto seed helper (shared with the Web Worker)
// ---------------------------------------------------------------------------

export class SimulationValidationError extends Error {
  constructor(public failures: ValidationFailure[]) {
    const message = failures.map(f => `[${f.code}] ${f.message}`).join(', ');
    super(`Simulation validation failed: ${message}`);
    this.name = 'SimulationValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function generateCryptoSeed(): string {
  const array = new Uint32Array(4);
  crypto.getRandomValues(array);
  return Array.from(array, n => n.toString(16).padStart(8, '0')).join('');
}

// ---------------------------------------------------------------------------
// Shared block-generation helpers
// ---------------------------------------------------------------------------

function buildBlock(arms: TreatmentArm[], blockSize: number, totalRatio: number, rng: () => number): TreatmentArm[] {
  const block: TreatmentArm[] = [];
  const multiplier = blockSize / totalRatio;
  for (const arm of arms) {
    for (let i = 0; i < arm.ratio * multiplier; i++) {
      block.push(arm);
    }
  }
  return fisherYatesShuffle(block, rng);
}

// ---------------------------------------------------------------------------
// Hierarchical Block Strategy helpers
// ---------------------------------------------------------------------------

/**
 * Tracks per-stratum block-selection state used by the hierarchical strategy
 * engine to enforce FIXED_SEQUENCE ordering and RANDOM_POOL size limits.
 */
interface BlockState {
  /** Next index for FIXED_SEQUENCE mode (cycles back to 0 when exhausted). */
  sequenceIndex: number;
  /** How many times each block size has been used (for RANDOM_POOL limits). */
  usageCounts: Map<number, number>;
}

/**
 * Resolves which BlockRule applies for a given (site, stratumCode) pair using
 * the priority order:
 *  1. stratumBlockOverrides[stratumCode]
 *  2. siteBlockOverrides[site]
 *  3. globalBlockStrategy
 *  4. Fallback: RANDOM_POOL built from the flat `blockSizes` array.
 */
function resolveBlockRule(config: RandomizationConfig, site: string, stratumCode: string): BlockRule {
  if (config.stratumBlockOverrides?.[stratumCode]) {
    return config.stratumBlockOverrides[stratumCode];
  }
  if (config.siteBlockOverrides?.[site]) {
    return config.siteBlockOverrides[site];
  }
  if (config.globalBlockStrategy) {
    return config.globalBlockStrategy;
  }
  return { selectionType: 'RANDOM_POOL', sizes: config.blockSizes };
}

/**
 * Selects the next block size according to the resolved rule, updating the
 * provided state object in place.
 *
 * - FIXED_SEQUENCE: returns `rule.sizes[state.sequenceIndex % rule.sizes.length]`
 *   and advances the index.
 * - RANDOM_POOL: filters out exhausted sizes (those that have hit their limit),
 *   then uses the PRNG to pick from the remaining pool. Falls back to the full
 *   sizes array if every size has been exhausted.
 */
function selectBlockSize(rule: BlockRule, state: BlockState, rng: () => number): number {
  if (rule.selectionType === 'FIXED_SEQUENCE') {
    const size = rule.sizes[state.sequenceIndex % rule.sizes.length];
    state.sequenceIndex++;
    return size;
  }

  // RANDOM_POOL: respect optional per-size limits
  let available = rule.sizes;
  if (rule.limits) {
    const filtered = rule.sizes.filter(size => {
      const limit = rule.limits![String(size)];
      if (limit === undefined) return true;
      return (state.usageCounts.get(size) ?? 0) < limit;
    });
    if (filtered.length > 0) available = filtered;
    // If all sizes are exhausted, fall back to the full pool (soft-cap behaviour).
  }

  const idx = Math.floor(rng() * available.length);
  const size = available[idx];
  state.usageCounts.set(size, (state.usageCounts.get(size) ?? 0) + 1);
  return size;
}

/** Returns a fresh, zeroed BlockState. */
function newBlockState(): BlockState {
  return { sequenceIndex: 0, usageCounts: new Map() };
}

// ---------------------------------------------------------------------------
// Standard (MANUAL_MATRIX / PROPORTIONAL) generation path
// ---------------------------------------------------------------------------

function generateStandard(
  resolvedConfig: RandomizationConfig,
  rng: () => number,
  strataCombinations: Record<string, string>[],
  totalRatio: number,
  schema: GeneratedSchema[],
  usedSubjectIds: Set<string>,
  registry: SubjectRegistry
): void {
  const stateMap = new Map<string, { blockNumber: number; blockState: any; rule: any }>();
  const siteSubjectCounts = new Map<string, number>();

  for (const site of resolvedConfig.sites) {
    for (const stratum of strataCombinations) {
      const stratumCode = registry.getStratumCode(stratum);
      stateMap.set(`${site}|${stratumCode}`, {
        blockNumber: 1,
        blockState: newBlockState(),
        rule: resolveBlockRule(resolvedConfig, site, stratumCode)
      });
    }
  }

  let addedInPass = true;
  while (addedInPass) {
    addedInPass = false;
    for (const stratum of strataCombinations) {
      if (!registry.canAddSubject(stratum)) continue;
      for (const site of resolvedConfig.sites) {
        if (!registry.canAddSubject(stratum)) break;

        const stratumCode = registry.getStratumCode(stratum);
        const state = stateMap.get(`${site}|${stratumCode}`)!;

        const blockSize = selectBlockSize(state.rule, state.blockState, rng);
        const block = buildBlock(resolvedConfig.arms, blockSize, totalRatio, rng);

        for (const arm of block) {
          if (!registry.canAddSubject(stratum)) break;

          registry.registerSubject(stratum);
          siteSubjectCounts.set(site, (siteSubjectCounts.get(site) ?? 0) + 1);
          
          addedInPass = true;

          const subjectId = generateSubjectId(
            resolvedConfig.subjectIdMask,
            { site, stratumCode, sequence: siteSubjectCounts.get(site)! },
            usedSubjectIds,
            rng
          );

          schema.push({ subjectId, site, stratum, stratumCode, blockNumber: state.blockNumber, blockSize, treatmentArm: arm.name, treatmentArmId: arm.id });
        }
        state.blockNumber++;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// MARGINAL_ONLY generation path
// ---------------------------------------------------------------------------

/**
 * Generates subjects using marginal-cap enforcement.
 *
 * Instead of pre-defined intersection caps, each factor level carries a `marginalCap`
 * (from `factor.levelDetails[].marginalCap`). The engine maintains a running count
 * per level and rejects any combination whose levels would breach their caps.
 * Combinations are drawn at random until no valid combination remains.
 *
 * @throws {Error} When no finite marginal cap is defined (the pool would never shrink).
 */
function generateMarginalOnly(
  resolvedConfig: RandomizationConfig,
  rng: () => number,
  strataCombinations: Record<string, string>[],
  totalRatio: number,
  schema: GeneratedSchema[],
  usedSubjectIds: Set<string>,
  registry: SubjectRegistry
): void {
  for (const site of resolvedConfig.sites) {
    let siteSubjectCount = 0;
    let blockNumber = 0;

    // Per-stratum block-selection state (FIXED_SEQUENCE index / RANDOM_POOL usage counts).
    const siteBlockStates = new Map<string, BlockState>();

    // Active pool of valid stratum combinations (those that haven't hit any marginal cap).
    let activePool = [...strataCombinations];
    let poolNeedsFilter = true;

    while (activePool.length > 0) {
      // Randomly select a combination from the active pool.
      const poolIdx = Math.floor(rng() * activePool.length);
      const stratum = activePool[poolIdx];

      // Resolve block rule and pick a block size using the hierarchical strategy.
      const stratumCode = registry.getStratumCode(stratum);
      const rule = resolveBlockRule(resolvedConfig, site, stratumCode);
      if (!siteBlockStates.has(stratumCode)) {
        siteBlockStates.set(stratumCode, newBlockState());
      }
      const blockSize = selectBlockSize(rule, siteBlockStates.get(stratumCode)!, rng);
      const block = buildBlock(resolvedConfig.arms, blockSize, totalRatio, rng);
      // Increment per generated block so downstream grouping/sorting (which uses
      // site|stratumCode|blockNumber) remains meaningful in MARGINAL_ONLY mode.
      blockNumber++;

      for (const arm of block) {
        if (!registry.canAddSubject(stratum)) break;

        siteSubjectCount++;
        registry.registerSubject(stratum);

        const subjectId = generateSubjectId(
          resolvedConfig.subjectIdMask,
          { site, stratumCode, sequence: siteSubjectCount },
          usedSubjectIds,
          rng
        );

        schema.push({
          subjectId, site, stratum, stratumCode,
          blockNumber,
          blockSize,
          treatmentArm: arm.name,
          treatmentArmId: arm.id
        });

        poolNeedsFilter = true;
      }

      // Remove combinations from the pool that would now breach a marginal cap.
      if (poolNeedsFilter) {
        activePool = activePool.filter(combo => registry.canAddSubject(combo));
        poolNeedsFilter = false;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Pure TypeScript randomization algorithm with no Angular dependencies.
 * This function is safe to import in Web Workers and SSR contexts.
 *
 * @throws {Error} When a block size is not a multiple of the total arm ratio.
 */
export function generateRandomizationSchema(config: RandomizationConfig): RandomizationResult {
  const resolvedConfig = config.seed
    ? config
    : { ...config, seed: generateCryptoSeed() };

  const mt = new MT19937Internal(MT19937Internal.get31BitSeed(resolvedConfig.seed));
  const rng = () => mt.random();

  // Generate all strata combinations
  let strataCombinations: Record<string, string>[] = [{}];
  for (const factor of resolvedConfig.strata) {
    const newCombinations: Record<string, string>[] = [];
    for (const combo of strataCombinations) {
      for (const level of factor.levels) {
        newCombinations.push({ ...combo, [factor.id]: level });
      }
    }
    strataCombinations = newCombinations;
  }

  const validationErrors = UnifiedValidationAuthority.validate(resolvedConfig);
  if (validationErrors.length > 0) {
    throw new SimulationValidationError(validationErrors);
  }

  // 2. Simplify ratios and calculate total ratio sum
  const simplifiedArms = simplifyRatios(resolvedConfig.arms);
  const totalRatio = simplifiedArms.reduce((sum, arm) => sum + arm.ratio, 0);

  // Apply simplified arms for internal generation logic
  const internalConfig = { ...resolvedConfig, arms: simplifiedArms };

  // 5. Early validation for MARGINAL_ONLY cap strategy
  if (resolvedConfig.capStrategy === 'MARGINAL_ONLY') {
    const hasFullyCappedFactor = resolvedConfig.strata.some(factor => {
      const levelMap = new Map<string, number | undefined>();
      if (factor.levelDetails) {
        for (const detail of factor.levelDetails) {
          levelMap.set(detail.name, detail.marginalCap);
        }
      }
      return factor.levels.length > 0 && factor.levels.every(lvl => {
        const cap = levelMap.get(lvl);
        return Number.isFinite(cap) && (cap as number) >= 0;
      });
    });

    if (!hasFullyCappedFactor) {
      throw new Error(
        'MARGINAL_ONLY randomization requires at least one stratification factor with a finite ' +
        'marginalCap on every one of its levels to guarantee termination.'
      );
    }
  }

  const registry = new SubjectRegistry(internalConfig);

  const schema: GeneratedSchema[] = [];
  /** Tracks all assigned subject IDs to prevent duplicates (relevant for {RND:n} tokens). */
  const usedSubjectIds = new Set<string>();

  if (internalConfig.randomizationMethod === 'MINIMIZATION') {
    schema.push(...generateMinimization(internalConfig, rng, registry));
  } else if (internalConfig.capStrategy === 'MARGINAL_ONLY') {
    generateMarginalOnly(internalConfig, rng, strataCombinations, totalRatio, schema, usedSubjectIds, registry);
  } else {
    // Both 'MANUAL_MATRIX' (default) and 'PROPORTIONAL' use intersection caps.
    generateStandard(internalConfig, rng, strataCombinations, totalRatio, schema, usedSubjectIds, registry);
  }

  return {
    metadata: {
      protocolId: resolvedConfig.protocolId,
      studyName: resolvedConfig.studyName,
      phase: resolvedConfig.phase,
      seed: resolvedConfig.seed,
      generatedAt: DeterminismProvider.getNow(resolvedConfig.protocolId).toISOString(),
      strata: resolvedConfig.strata,
      config: resolvedConfig,
      auditHash: '' // populated asynchronously by the facade after generation
    },
    schema
  };
}
