import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeProportionalCaps, validateProportionalPercentages } from './largest-remainder';
import { StratificationFactor } from 'src/app/domain/core/models/randomization.model';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const gender: StratificationFactor = { id: 'gender', name: 'Gender', levels: ['Male', 'Female'] };
const diabetes: StratificationFactor = { id: 'diabetes', name: 'Diabetes', levels: ['Diabetic', 'Non-Diabetic'] };

// ---------------------------------------------------------------------------
// validateProportionalPercentages
// ---------------------------------------------------------------------------

describe('validateProportionalPercentages', () => {
  it('returns empty object when all factors sum to 100', () => {
    const result = validateProportionalPercentages(
      [gender],
      { gender: { Male: 60, Female: 40 } }
    );
    expect(result).toEqual({});
  });

  it('returns factorId = true when percentages do not sum to 100', () => {
    const result = validateProportionalPercentages(
      [gender],
      { gender: { Male: 50, Female: 40 } } // sums to 90
    );
    expect(result['gender']).toBe(true);
  });

  it('treats missing levels as 0', () => {
    const result = validateProportionalPercentages(
      [gender],
      { gender: { Male: 100 } } // Female missing → 0, total = 100
    );
    expect(result).toEqual({});
  });

  it('validates multiple factors independently', () => {
    const result = validateProportionalPercentages(
      [gender, diabetes],
      {
        gender: { Male: 60, Female: 40 },   // valid
        diabetes: { Diabetic: 50, 'Non-Diabetic': 40 } // invalid (90)
      }
    );
    expect(result['gender']).toBeUndefined();
    expect(result['diabetes']).toBe(true);
  });

  it('accepts floating-point sums within tolerance (0.001)', () => {
    const result = validateProportionalPercentages(
      [gender],
      { gender: { Male: 33.333, Female: 66.667 } } // sums to 100.000
    );
    expect(result).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// computeProportionalCaps – basic behaviour
// ---------------------------------------------------------------------------

describe('computeProportionalCaps – basic behaviour', () => {
  it('returns one cap per intersection', () => {
    const caps = computeProportionalCaps(
      [gender],
      100,
      { gender: { Male: 60, Female: 40 } }
    );
    expect(caps.length).toBe(2);
  });

  it('sum of all caps equals the global cap (no strata)', () => {
    const caps = computeProportionalCaps([], 100, {});
    const total = caps.reduce((s, c) => s + c.cap, 0);
    expect(total).toBe(100);
  });

  it('sum of caps equals the global cap for a single factor', () => {
    const caps = computeProportionalCaps(
      [gender],
      100,
      { gender: { Male: 60, Female: 40 } }
    );
    const total = caps.reduce((s, c) => s + c.cap, 0);
    expect(total).toBe(100);
  });

  it('assigns the correct floor caps when percentages yield clean integers', () => {
    const caps = computeProportionalCaps(
      [gender],
      100,
      { gender: { Male: 60, Female: 40 } }
    );
    const maleCap = caps.find(c => Object.values(c.levelIds || {}).includes('Male'))!.cap;
    const femaleCap = caps.find(c => Object.values(c.levelIds || {}).includes('Female'))!.cap;
    expect(maleCap).toBe(60);
    expect(femaleCap).toBe(40);
  });

  it('sum of caps equals global cap for two factors (Cartesian product)', () => {
    const caps = computeProportionalCaps(
      [gender, diabetes],
      100,
      {
        gender: { Male: 60, Female: 40 },
        diabetes: { Diabetic: 30, 'Non-Diabetic': 70 }
      }
    );
    expect(caps.length).toBe(4); // 2 × 2
    const total = caps.reduce((s, c) => s + c.cap, 0);
    expect(total).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// computeProportionalCaps – Largest Remainder Method
// ---------------------------------------------------------------------------

describe('computeProportionalCaps – Largest Remainder Method', () => {
  it('still sums to global cap even with unequal three-level split', () => {
    // 1/3 each: theoretical = 33.333..., floors sum = 99, one remainder seat awarded
    const age: StratificationFactor = {
      id: 'age', name: 'Age', levels: ['Young', 'Middle', 'Old']
    };
    const caps = computeProportionalCaps(
      [age],
      100,
      { age: { Young: 33.333, Middle: 33.333, Old: 33.334 } }
    );
    const total = caps.reduce((s, c) => s + c.cap, 0);
    expect(total).toBe(100);
  });

  it('issue example: 60% Male, 30% Diabetic, global cap 100 → intersection ≈ 18', () => {
    // Male+Diabetic = 0.60 × 0.30 × 100 = 18.0 (exact)
    const caps = computeProportionalCaps(
      [gender, diabetes],
      100,
      {
        gender: { Male: 60, Female: 40 },
        diabetes: { Diabetic: 30, 'Non-Diabetic': 70 }
      }
    );
    const maleDiabeticCap = caps.find(
      c => Object.values(c.levelIds || {}).includes('Male') && Object.values(c.levelIds || {}).includes('Diabetic')
    )!.cap;
    expect(maleDiabeticCap).toBe(18);
  });

  it('never produces a negative cap', () => {
    const caps = computeProportionalCaps(
      [gender, diabetes],
      10,
      {
        gender: { Male: 60, Female: 40 },
        diabetes: { Diabetic: 30, 'Non-Diabetic': 70 }
      }
    );
    caps.forEach(c => expect(c.cap).toBeGreaterThanOrEqual(0));
  });

  it('sums to global cap when the cap is small (1)', () => {
    const caps = computeProportionalCaps(
      [gender],
      1,
      { gender: { Male: 60, Female: 40 } }
    );
    const total = caps.reduce((s, c) => s + c.cap, 0);
    expect(total).toBe(1);
  });

  it('sums to global cap for a large trial (10 000 subjects)', () => {
    const age: StratificationFactor = {
      id: 'age', name: 'Age', levels: ['Young', 'Middle', 'Old']
    };
    const caps = computeProportionalCaps(
      [age, gender],
      10000,
      {
        age: { Young: 33.333, Middle: 33.333, Old: 33.334 },
        gender: { Male: 60, Female: 40 }
      }
    );
    const total = caps.reduce((s, c) => s + c.cap, 0);
    expect(total).toBe(10000);
  });
});

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('computeProportionalCaps – property tests', () => {
  const strataArbitrary = fc.array(
    fc.record({
      id: fc.uuid(),
      name: fc.string(),
      levels: fc.uniqueArray(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 })
    }),
    { minLength: 0, maxLength: 3 }
  );

  it('maintains invariants across configurations', () => {
    fc.assert(
      fc.property(
        strataArbitrary,
        fc.oneof(fc.integer({ min: 0, max: 10000 }), fc.constant(1.5)),
        // Generate an array of "random" weight arrays, one per possible factor
        fc.array(fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 5, maxLength: 5 }), { minLength: 3, maxLength: 3 }),
        (strata, globalCap, weightsPool) => {
          // Generate valid percentages that sum to 100 for each factor using weightsPool
          const percentages: Record<string, Record<string, number>> = Object.create(null);
          strata.forEach((factor, fIdx) => {
            const factorPercentages: Record<string, number> = Object.create(null);
            const weights = weightsPool[fIdx];
            const sum = factor.levels.reduce((s, _, lIdx) => s + weights[lIdx], 0);

            let currentSum = 0;
            factor.levels.forEach((level, lIdx) => {
              if (lIdx === factor.levels.length - 1) {
                factorPercentages[level] = 100 - currentSum;
              } else {
                const pct = sum === 0 ? Math.floor(100 / factor.levels.length) : Math.floor((weights[lIdx] / sum) * 100);
                factorPercentages[level] = pct;
                currentSum += pct;
              }
            });
            percentages[factor.id] = factorPercentages;
          });

          const caps = computeProportionalCaps(strata, globalCap, percentages);

          // Invariant 1: Sum of caps equals globalCap (precondition: globalCap is integer, percentages sum to 100)
          const total = caps.reduce((s, c) => s + c.cap, 0);
          expect(total).toBe(Math.floor(globalCap));

          // Invariant 2: All caps are non-negative
          caps.forEach(c => expect(c.cap).toBeGreaterThanOrEqual(0));

          // Invariant 3: Exhaustive coverage (Cartesian product size)
          const expectedCount = strata.reduce((prod, f) => prod * f.levels.length, 1);
          expect(caps.length).toBe(expectedCount);

          // Invariant 4: If globalCap is 0, all caps must be 0
          if (globalCap === 0) {
            caps.forEach(c => expect(c.cap).toBe(0));
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
