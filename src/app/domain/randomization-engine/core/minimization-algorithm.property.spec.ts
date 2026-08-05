import * as fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { generateMinimization } from './minimization-algorithm';
import { SubjectRegistry } from './subject-registry';
import { MT19937Internal } from './mt19937';
import { StratificationFactor, TreatmentArm } from '../../core/models/randomization.model';

// ─────────────────────────────────────────────────────────────────────────────
// Arbitraries
// ─────────────────────────────────────────────────────────────────────────────

const armsArbitrary = fc.array(
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 5 }),
    name: fc.string({ minLength: 1, maxLength: 10 }),
    ratio: fc.integer({ min: 1, max: 5 })
  }),
  { minLength: 2, maxLength: 4 }
);

const strataArbitrary = fc.uniqueArray(
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 5 }),
    name: fc.string({ minLength: 1, maxLength: 10 }),
    levels: fc.uniqueArray(fc.string({ minLength: 1, maxLength: 5 }), { minLength: 1, maxLength: 3 })
  }).chain(factor => {
    return fc.record({
      id: fc.constant(factor.id),
      name: fc.constant(factor.name),
      levels: fc.constant(factor.levels),
      levelDetails: fc.array(
        fc.record({
          name: fc.constantFrom(...factor.levels),
          expectedProbability: fc.float({ min: Math.fround(0.1), max: Math.fround(0.9), noNaN: true, noDefaultInfinity: true })
        }),
        { minLength: factor.levels.length, maxLength: factor.levels.length }
      ).map(details => {
        // Ensure name is unique in levelDetails
        const uniqueDetails = [];
        const seen = new Set();
        for (const d of details) {
          if (!seen.has(d.name)) {
            uniqueDetails.push(d);
            seen.add(d.name);
          }
        }
        // If we lost some, add them back
        for (const lvl of factor.levels) {
          if (!seen.has(lvl)) {
            uniqueDetails.push({ name: lvl, expectedProbability: 0.5 });
          }
        }
        return uniqueDetails;
      })
    });
  }),
  { minLength: 0, maxLength: 3, selector: factor => factor.id }
);

const minimizationConfigArbitrary = (arms: TreatmentArm[], strata: StratificationFactor[]) => {
  return fc.record({
    protocolId: fc.constant('PROP-MIN-001'),
    studyName: fc.constant('Prop Minimization Test'),
    phase: fc.constant('Phase II'),
    arms: fc.constant(arms),
    sites: fc.uniqueArray(fc.string({ minLength: 1, maxLength: 5 }), { minLength: 1, maxLength: 3 }),
    strata: fc.constant(strata),
    blockSizes: fc.constant([] as number[]), // Not used for minimization but often required by types
    stratumCaps: fc.constant([] as any[]),
    seed: fc.string(),
    subjectIdMask: fc.constant('{SITE}-{SEQ:3}'),
    randomizationMethod: fc.constant('MINIMIZATION' as const),
    minimizationConfig: fc.record({
      p: fc.float({ min: Math.fround(0.5), max: Math.fround(1.0), noNaN: true, noDefaultInfinity: true }),
      totalSampleSize: fc.integer({ min: 10, max: 100 })
    })
  });
};

const fullMinimizationConfigArbitrary = fc.tuple(armsArbitrary, strataArbitrary).chain(([arms, strata]) => {
  return minimizationConfigArbitrary(arms, strata);
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('generateMinimization - Property Tests', () => {
  it('always generates exactly totalSampleSize subjects when caps are not an issue', () => {
    fc.assert(
      fc.property(fullMinimizationConfigArbitrary, baseConfig => {
        // Use MARGINAL_ONLY with no caps to ensure unlimited capacity
        const config = {
          ...baseConfig,
          capStrategy: 'MARGINAL_ONLY' as const,
          strata: baseConfig.strata.map(f => ({
            ...f,
            levelDetails: f.levels.map(l => ({ name: l, marginalCap: undefined }))
          }))
        };
        const mt = new MT19937Internal(MT19937Internal.get31BitSeed(config.seed));
        const rng = () => mt.random();
        const registry = new SubjectRegistry(config as any);
        const schema = generateMinimization(config as any, rng, registry);

        expect(schema.length).toBe(config.minimizationConfig!.totalSampleSize);
      }),
      { numRuns: 50 }
    );
  });

  it('produces deterministic results given the same seed and config', () => {
    fc.assert(
      fc.property(fullMinimizationConfigArbitrary, config => {
        const mt1 = new MT19937Internal(MT19937Internal.get31BitSeed(config.seed));
        const schema1 = generateMinimization(config, () => mt1.random(), new SubjectRegistry(config as any));

        const mt2 = new MT19937Internal(MT19937Internal.get31BitSeed(config.seed));
        const schema2 = generateMinimization(config as any, () => mt2.random(), new SubjectRegistry(config as any));

        expect(schema1.map(r => r.treatmentArmId)).toEqual(schema2.map(r => r.treatmentArmId));
        expect(schema1.map(r => r.subjectId)).toEqual(schema2.map(r => r.subjectId));
      }),
      { numRuns: 30 }
    );
  });

  it('all subjects have a treatment arm from the configured arms', () => {
    fc.assert(
      fc.property(fullMinimizationConfigArbitrary, config => {
        const mt = new MT19937Internal(MT19937Internal.get31BitSeed(config.seed));
        const schema = generateMinimization(config as any, () => mt.random(), new SubjectRegistry(config as any));
        const armIds = new Set(config.arms.map(a => a.id));

        for (const row of schema) {
          expect(armIds.has(row.treatmentArmId)).toBe(true);
        }
      })
    );
  });

  it('maintains subject ID uniqueness', () => {
    fc.assert(
      fc.property(fullMinimizationConfigArbitrary, config => {
        const mt = new MT19937Internal(MT19937Internal.get31BitSeed(config.seed));
        const schema = generateMinimization(config as any, () => mt.random(), new SubjectRegistry(config as any));
        const ids = schema.map(r => r.subjectId);
        const uniqueIds = new Set(ids);

        expect(uniqueIds.size).toBe(ids.length);
      })
    );
  });

  it('respects marginal caps when capStrategy is MARGINAL_ONLY', () => {
    const marginalArb = fullMinimizationConfigArbitrary.map(config => {
      const newStrata = config.strata.map(f => ({
        ...f,
        levelDetails: f.levels.map(l => ({
          name: l,
          marginalCap: 5 // Small cap to ensure it's hit
        }))
      }));
      return {
        ...config,
        capStrategy: 'MARGINAL_ONLY' as const,
        strata: newStrata,
        minimizationConfig: {
          ...config.minimizationConfig!,
          totalSampleSize: 200 // Larger than sum of caps
        }
      };
    });

    fc.assert(
      fc.property(marginalArb, config => {
        const mt = new MT19937Internal(MT19937Internal.get31BitSeed(config.seed));
        const schema = generateMinimization(config as any, () => mt.random(), new SubjectRegistry(config as any));

        for (const factor of config.strata) {
          for (const level of factor.levels) {
            const count = schema.filter(r => r.stratum[factor.id] === level).length;
            expect(count).toBeLessThanOrEqual(5);
          }
        }
      })
    );
  });
});
