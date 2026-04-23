# Comprehensive Bug Report: Pocock-Simon Minimization Implementation

This document details several critical issues discovered in the application's implementation of the Pocock-Simon minimization algorithm. Each issue is documented in a standard GitHub Issue format for tracking and remediation.

---

## Issue 1: Missing Script Generation for Minimization

**Description:**
The application fails to generate executable code for minimization in target statistical software (R, SAS, Python, STATA). Instead of generating the actual algorithmic loop logic required to perform minimization in the target environment, the application merely outputs a text block header summarizing the parameters.

**Location:**
`src/app/domain/schema-management/services/code-generator.service.ts`

**Code Snippet:**
```typescript
generate(language: 'R' | 'SAS' | 'Python' | 'STATA', config: RandomizationConfig): string {
  this.validateConfig(config);
  if (config.randomizationMethod === 'MINIMIZATION') {
    return this.generateMinimizationHeader(language, config);
  }
  // ...
```

**Impact:**
Users downloading the code for rigorous scientific use receive an inoperable script that only contains comments. This violates the core tenet of the application acting as a sandbox where the exported scripts act as the "Source of Truth."

**Proposed Solution:**
Implement full code generation templates for Minimization across all supported languages (R, Python, SAS, STATA). These templates must include the complete Pocock-Simon logic (imbalance score calculation, dynamic probability assignment) natively in the target language.

---

## Issue 2: Hardcoded 1:1 Treatment Arm Proportions (Ignores Ratios)

**Description:**
The minimization algorithm correctly calculates the imbalance score but fails to incorporate user-defined treatment arm ratios (e.g., 2:1 or 3:1:1) when breaking ties or allocating subjects to non-preferred arms. The random selection logic assumes a flat, uniform distribution across available arms.

**Location:**
`src/app/domain/randomization-engine/core/minimization-algorithm.ts`

**Code Snippet:**
```typescript
// Line 157
assignedArm = preferred[Math.floor(rng() * preferred.length)];

// Lines 160-163
if (r < p) {
  assignedArm = preferred[Math.floor(rng() * preferred.length)];
} else {
  assignedArm = nonPreferred[Math.floor(rng() * nonPreferred.length)];
}
```

**Impact:**
Critical scientific flaw. The application allows users to configure unequal allocation ratios (e.g., 2 active : 1 placebo), but the minimization engine will always drift towards a 1:1 allocation because the random tie-breaking mechanism does not weight the selection by `arm.ratio`.

**Proposed Solution:**
Refactor the random selection logic to perform a weighted random selection based on the `arm.ratio` values.
```typescript
function selectWeightedArm(arms: TreatmentArm[], rng: seedrandom.PRNG): TreatmentArm {
  const totalWeight = arms.reduce((sum, arm) => sum + arm.ratio, 0);
  let r = rng() * totalWeight;
  for (const arm of arms) {
    r -= arm.ratio;
    if (r <= 0) return arm;
  }
  return arms[arms.length - 1];
}
```
Replace the uniform `Math.floor(rng() * arr.length)` calls with this weighted logic.

---

## Issue 3: Irrelevant UI Component Shown (Enrollment Cap Strategy)

**Description:**
In the Study Builder Configuration Form, the "Enrollment Cap Strategy" section (Manual Matrix, Proportional, Marginal Only) is explicitly designed for Permuted Block Randomization. This entire section is completely irrelevant to the Pocock-Simon minimization method, yet it remains visible when Minimization is selected.

**Location:**
`src/app/domain/study-builder/components/config-form.component.html` (around lines 451+)

**Code Snippet:**
```html
<!-- Cap Strategy Section -->
<div class="space-y-4">
  <div>
    <span class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Enrollment Cap Strategy</span>
```

**Impact:**
UX Confusion. Users are presented with complex, irrelevant settings (like setting exact cell caps or block sequences) that have absolutely no effect on the minimization algorithm.

**Proposed Solution:**
Wrap the entire Cap Strategy section in an `@if` block to hide it when minimization is active:
```html
@if (randomizationMethod !== 'MINIMIZATION') {
  <!-- Cap Strategy Section -->
  <div class="space-y-4">
  ...
  </div>
}
```

---

## Issue 4: Template Type Safety Violations in Minimization Inputs

**Description:**
The Angular template for the Minimization configuration uses `$any()` to bypass strict template type checking when handling input events. This violates the project's strict memory/style guidelines which forbid the use of `$any()` in event bindings.

**Location:**
`src/app/domain/study-builder/components/config-form.component.html` (line 199)

**Code Snippet:**
```html
<input [id]="'levelDist' + getStrataId(stratumIndex) + '_' + level"
  type="number" inputmode="decimal" min="0" max="100"
  [value]="getMinimizationProbability(getStrataId($index), level)"
  (input)="setMinimizationProbability(getStrataId($index), level, +$any($event.target).value)"
  ...
```

**Impact:**
Code quality and maintainability issue. Bypassing type safety can lead to runtime errors if the DOM structure changes.

**Proposed Solution:**
Use a template reference variable to capture the element value directly, adhering to project guidelines.
```html
<input #probInput [id]="'levelDist' + getStrataId(stratumIndex) + '_' + level"
  type="number" inputmode="decimal" min="0" max="100"
  [value]="getMinimizationProbability(getStrataId($index), level)"
  (input)="setMinimizationProbability(getStrataId($index), level, +probInput.value)"
  ...
```

---

## Issue 5: Deterministic Site Subject Allocation

**Description:**
The minimization algorithm simulates multi-site enrollment by dividing the total sample size by the number of sites. It then iterates through each site sequentially, allocating exactly `Math.floor(totalSampleSize / sites.length)` subjects to each site.

**Location:**
`src/app/domain/randomization-engine/core/minimization-algorithm.ts` (line 91)

**Code Snippet:**
```typescript
const basePerSite = Math.floor(totalSampleSize / sites.length);
const remainder = totalSampleSize % sites.length;
// ...
for (let siteIdx = 0; siteIdx < sites.length; siteIdx++) {
  const site = sites[siteIdx];
  const siteN = basePerSite + (siteIdx < remainder ? 1 : 0);
  // ... loop i from 0 to siteN
```

**Impact:**
Scientific flaw. In the real world, subjects enroll at sites at different, unpredictable rates. By forcing an exact, even split across all sites and processing them sequentially (e.g., enrolling all 50 subjects at Site 1, then all 50 subjects at Site 2), the algorithm completely negates the purpose of minimization, which relies on the dynamic, chronological entry of subjects across the entire study footprint.

**Proposed Solution:**
Rather than pre-calculating an exact deterministic split per site, the algorithm should randomly assign a site to each simulated subject as they enter the trial, mimicking realistic stochastic enrollment.
```typescript
// For i from 0 to totalSampleSize
// Randomly select a site for this subject
const site = sites[Math.floor(rng() * sites.length)];
```