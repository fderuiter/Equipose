# SAS & Stata Cross-Environment Exception Report

**Document ID:** EQUIPOSE-EXCEPT-001  
**Version:** 1.0  
**Date:** 2025-05-08  
**Status:** Approved  
**Classification:** Regulatory Validation Artefact

---

## 1. Executive Summary

Equipose generates validated SAS (`.sas`) and Stata (`.do`) randomization scripts
as part of its 21 CFR Part 11–compliant export artefact set. Full mathematical
result equivalence verification for these languages in CI/CD pipelines is not
feasible without access to licensed SAS software and a licensed Stata installation.

This document records the formal **Exception** granted for SAS and Stata
cross-environment mathematical validation, defines the compensating controls
that maintain regulatory compliance, and specifies the conditions under which
this exception may be re-evaluated.

---

## 2. Scope

| Item | In Scope | Out of Scope | CI Job |
|---|---|---|---|
| SAS syntax correctness (static analysis) | ✅ | | `sas_static_validation` |
| Stata syntax correctness (static analysis) | ✅ | | unit tests |
| Mathematical result equivalence — SAS | | ✅ (exception granted) | — |
| Mathematical result equivalence — Stata | | ✅ (exception granted) | — |
| R mathematical result equivalence | ✅ | | `cross_env_equivalence` |
| Python mathematical result equivalence | ✅ | | `cross_env_equivalence` |

---

## 3. Justification for Exception

### 3.1 SAS

SAS Institute software requires a paid commercial licence. Installation of a
licensed SAS runtime in GitHub Actions (or any CI environment) is not permitted
under SAS licensing terms without a specific CI/CD licence agreement. Therefore,
automated execution and assertion of SAS program output is not possible in the
public CI pipeline.

### 3.2 Stata

StataCorp Stata requires a paid commercial licence. Providing Stata executables
in CI violates StataCorp's redistribution policy. Automated execution is
therefore not feasible in the public repository's CI environment.

---

## 4. Compensating Controls

The following controls ensure that the SAS and Stata outputs are trustworthy
despite the absence of automated execution validation:

### 4.1 Static Syntax Validation (CI — Automated)

The `ci.yml` pipeline includes automated validation layers to ensure exported code is safe and syntactically correct:

**Layer 1 — Security scan (`security_scan` job):**
Checks for usage of `Math.random()` in the randomization engine.

**Layer 2 — Static syntax validation scripts:**
The automated static validator scripts, specifically `scripts/validate-sas-syntax.mjs` and `scripts/validate-stata-syntax.mjs`, run against exported code. **Crucially, these static validator scripts are restricted to verifying syntax compliance and structural block boundaries.** They do not perform or assert numerical or sequence-level execution checks.

For SAS, the validator verifies:
- All five required header comment fields are present (`Randomization Schema Generation in SAS`, `Protocol:`, `App Version:`, `Generated At:`, `PRNG Algorithm:`)
- The `Generated At:` value is a valid ISO 8601 timestamp
- A `%let seed = <number>;` statement is present
- Every `/*` block comment has a matching `*/` (no unclosed comments)
- Every `data <name>;` step is closed by `run;`
- Every `proc <name>` step is closed by `run;` or `quit;`
- Every `%macro` definition is closed by a matching `%mend`

For Stata, the validator verifies that base syntax requirements, delimiter usages, and block structures are correct and adhere to regulatory templates.

See `docs/explanation/adr/0001-sas-static-validation-strategy.md` for the full decision record explaining the choice of approach.

**Layer 3 — Unit tests (`CodeGeneratorService`):**
The generated SAS and Stata code is produced by the `CodeGeneratorService`, which is covered by **unit tests** that verify:
- Correct PRNG seed embedding (`%let seed = <N>;` / `set seed <N>`)
- Correct protocol ID embedding
- Correct ISO 8601 timestamp embedding
- Correct version string embedding

These unit tests are tagged `[REQ-21CFR11-001]` through `[REQ-21CFR11-004]` in the Validation Traceability Matrix (see `Validation_Traceability_Matrix.md`).

### 4.2 Execution Modes & Algorithm Parity

To bridge the gap between web UI configuration and local execution, Equipose formalizes the execution options into two distinct modes, matching the architecture reference definitions:

#### 1. STATIC Mode
* **Definition:** Hardcodes UI schemas (the subject-by-subject allocations) as literal values within the exported code.
* **Sequence Parity:** Guarantees **100% bit-for-bit sequence parity** with the Web UI by directly embedding the generated sequence into the script's data blocks.
* **Use Case:** This is the recommended and primary mechanism when an organization or clinical trial protocol requires a SAS or Stata script that will output the exact same randomization sequence as verified in the web UI.

#### 2. DYNAMIC Mode
* **Definition:** Transpiles runtime randomization logic (loops, sorting, and PRNG seeding) to execute natively inside SAS or Stata.
* **Sequence Parity:** **DYNAMIC SAS and Stata scripts do not support or provide native bit-for-bit PRNG sequence parity** with the Web UI. This limitation arises from environmental differences, platform floating-point precision differences, and language-specific sorting engines (such as SAS's `_rand_sort = rand('uniform')` and `PROC SORT`, and Stata's `runiform()` and `sort`).
* **Statistical Parity:** Fully guarantees statistical allocation balance, block constraints, and structural rules (same block sizes, same allocation ratios, and correct treatment arm caps are honored across environments).

Cross-environment equivalence for dynamic execution is validated in CI for R and Python against a shared fixture (`scripts/cross-env/`). However, because SAS and Stata in dynamic mode have mathematical limitations in sorting parity, the user must run the script in **STATIC Mode** if they require exact sequence-level matching, or execute manual validation for dynamic outputs.

### 4.3 Manual Validation Procedure (Periodic)

The SAS and Stata scripts generated by Equipose **must** be independently
executed and validated by the end-user organisation's biostatistics team before
use in a regulated clinical trial. The following manual validation steps are
recommended:

1. Generate a reference schema in Equipose using a known seed and configuration.
2. Export the SAS and Stata scripts.
3. Execute the scripts in the target licensed SAS/Stata environment.
4. Compare the output randomization list against the reference schema
   (Subject ID ↔ Treatment Arm) row-by-row.
5. Document the comparison result in a Validation Execution Record (VER).

### 4.4 Audit Trail Artefacts

Every generated SAS/Stata script embeds:
- Application version (`APP_VERSION`)
- ISO 8601 generation timestamp
- Protocol identifier
- PRNG seed

These fields are verified by the E2E audit-trail tests (`tests_e2e/audit-trail.spec.ts`),
tagged `[REQ-21CFR11-001]` through `[REQ-21CFR11-004]`.

### 4.5 Configuration Constants

- **Validation Vector:** `['A', 'B', 'B', 'A', 'B', 'A', 'A', 'B']`
- **Precision Parity:** `1000000000000`


---

## 5. Risk Assessment

| Risk | Likelihood | Impact | Residual Risk with Controls |
|---|---|---|---|
| SAS script produces incorrect allocations due to code generation bug | Low | High | **Low** — unit tests validate code generation logic |
| Stata script produces incorrect allocations due to code generation bug | Low | High | **Low** — unit tests validate code generation logic |
| End-user executes unvalidated SAS/Stata script without manual check | Medium | High | **Medium** — mitigated by documentation and disclaimer |

---

## 6. Exception Expiry Conditions

This exception will be re-evaluated if any of the following occur:

- SAS Institute releases a freely distributable, CI-compatible SAS runtime.
- A commercial SAS/Stata CI runner becomes available and is adopted by this project.
- A community-maintained open-source SAS or Stata interpreter achieves sufficient
  mathematical equivalence to the commercial versions for validated use.

---

## 7. Approval

| Role | Name | Signature | Date |
|---|---|---|---|
| Validation Author | Equipose Maintainer | *on file* | 2025-05-08 |
| QA Reviewer | *pending* | | |

---

## 8. References

- 21 CFR Part 11 – Electronic Records; Electronic Signatures (FDA, 2003)
- ICH E9 – Statistical Principles for Clinical Trials (1998)
- ICH E6(R2) – Good Clinical Practice (2016)
- GAMP 5 – Risk-Based Approach to Compliant GxP Computerised Systems (ISPE, 2008)
- Equipose `docs/reference/ARCHITECTURE_REFERENCE.md` §12 – Code Generation Service
- Equipose `docs/explanation/adr/0001-sas-static-validation-strategy.md` – SAS Validation Strategy ADR
- Equipose `scripts/validate-sas-syntax.mjs` – Static SAS Syntax Validator
- Equipose `Validation_Traceability_Matrix.md` – Requirements Traceability Matrix
