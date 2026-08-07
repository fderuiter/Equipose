# Validation Traceability Matrix

> **Generated:** 2026-08-07T03:01:53.816Z  
> **Status:** Test results loaded  
> **Requirements covered:** 16 / 16  
> **Tagged test cases:** 39  

---

## Summary

| Metric | Value |
|---|---|
| Total regulatory requirements | 16 |
| Requirements with ≥1 test | 16 |
| Requirements with no test coverage | 0 |
| Total tagged test cases | 39 |

---

## Traceability Matrix

| Requirement ID | Description | Test File | Line | Test Name | Suite | Status |
|---|---|---|---|---|---|---|
| `REQ-21CFR11-001` | 21 CFR Part 11 – All electronic records must embed the application semantic version | [tests_e2e/audit-trail.spec.ts:160](tests_e2e/audit-trail.spec.ts#L160) | 160 | R script contains application semantic version | 21 CFR Part 11 – Audit Trail: generated code artifact provenance | ⬜ UNKNOWN |
| `REQ-21CFR11-001` | 21 CFR Part 11 – All electronic records must embed the application semantic version | [tests_e2e/audit-trail.spec.ts:189](tests_e2e/audit-trail.spec.ts#L189) | 189 | Python script contains application semantic version |  | ⬜ UNKNOWN |
| `REQ-21CFR11-001` | 21 CFR Part 11 – All electronic records must embed the application semantic version | [tests_e2e/audit-trail.spec.ts:218](tests_e2e/audit-trail.spec.ts#L218) | 218 | SAS script contains application semantic version |  | ⬜ UNKNOWN |
| `REQ-21CFR11-001` | 21 CFR Part 11 – All electronic records must embed the application semantic version | [tests_e2e/audit-trail.spec.ts:247](tests_e2e/audit-trail.spec.ts#L247) | 247 | Stata script contains application semantic version |  | ⬜ UNKNOWN |
| `REQ-21CFR11-002` | 21 CFR Part 11 – Electronic records must carry an ISO 8601 generation timestamp | [tests_e2e/audit-trail.spec.ts:166](tests_e2e/audit-trail.spec.ts#L166) | 166 | R script contains a valid ISO 8601 generated-at timestamp |  | ⬜ UNKNOWN |
| `REQ-21CFR11-002` | 21 CFR Part 11 – Electronic records must carry an ISO 8601 generation timestamp | [tests_e2e/audit-trail.spec.ts:195](tests_e2e/audit-trail.spec.ts#L195) | 195 | Python script contains a valid ISO 8601 generated-at timestamp |  | ⬜ UNKNOWN |
| `REQ-21CFR11-002` | 21 CFR Part 11 – Electronic records must carry an ISO 8601 generation timestamp | [tests_e2e/audit-trail.spec.ts:224](tests_e2e/audit-trail.spec.ts#L224) | 224 | SAS script contains a valid ISO 8601 generated-at timestamp |  | ⬜ UNKNOWN |
| `REQ-21CFR11-002` | 21 CFR Part 11 – Electronic records must carry an ISO 8601 generation timestamp | [tests_e2e/audit-trail.spec.ts:253](tests_e2e/audit-trail.spec.ts#L253) | 253 | Stata script contains a valid ISO 8601 generated-at timestamp |  | ⬜ UNKNOWN |
| `REQ-21CFR11-003` | 21 CFR Part 11 – The unique protocol identifier must appear in every generated artifact | [tests_e2e/audit-trail.spec.ts:172](tests_e2e/audit-trail.spec.ts#L172) | 172 | R script contains the trial protocol identifier |  | ⬜ UNKNOWN |
| `REQ-21CFR11-003` | 21 CFR Part 11 – The unique protocol identifier must appear in every generated artifact | [tests_e2e/audit-trail.spec.ts:201](tests_e2e/audit-trail.spec.ts#L201) | 201 | Python script contains the trial protocol identifier |  | ⬜ UNKNOWN |
| `REQ-21CFR11-003` | 21 CFR Part 11 – The unique protocol identifier must appear in every generated artifact | [tests_e2e/audit-trail.spec.ts:230](tests_e2e/audit-trail.spec.ts#L230) | 230 | SAS script contains the trial protocol identifier |  | ⬜ UNKNOWN |
| `REQ-21CFR11-003` | 21 CFR Part 11 – The unique protocol identifier must appear in every generated artifact | [tests_e2e/audit-trail.spec.ts:259](tests_e2e/audit-trail.spec.ts#L259) | 259 | Stata script contains the trial protocol identifier |  | ⬜ UNKNOWN |
| `REQ-21CFR11-003` | 21 CFR Part 11 – The unique protocol identifier must appear in every generated artifact | [tests_e2e/audit-trail.spec.ts:436](tests_e2e/audit-trail.spec.ts#L436) | 436 | results header displays the protocol identifier |  | ⬜ UNKNOWN |
| `REQ-21CFR11-004` | 21 CFR Part 11 – Audit trail must record the exact PRNG seed used for schema generation | [tests_e2e/audit-trail.spec.ts:183](tests_e2e/audit-trail.spec.ts#L183) | 183 | R script contains the PRNG seed initialisation statement |  | ⬜ UNKNOWN |
| `REQ-21CFR11-004` | 21 CFR Part 11 – Audit trail must record the exact PRNG seed used for schema generation | [tests_e2e/audit-trail.spec.ts:212](tests_e2e/audit-trail.spec.ts#L212) | 212 | Python script contains the PRNG seed initialisation statement |  | ⬜ UNKNOWN |
| `REQ-21CFR11-004` | 21 CFR Part 11 – Audit trail must record the exact PRNG seed used for schema generation | [tests_e2e/audit-trail.spec.ts:241](tests_e2e/audit-trail.spec.ts#L241) | 241 | SAS script contains the PRNG seed initialisation statement |  | ⬜ UNKNOWN |
| `REQ-21CFR11-004` | 21 CFR Part 11 – Audit trail must record the exact PRNG seed used for schema generation | [tests_e2e/audit-trail.spec.ts:270](tests_e2e/audit-trail.spec.ts#L270) | 270 | Stata script contains the PRNG seed initialisation statement |  | ⬜ UNKNOWN |
| `REQ-21CFR11-004` | 21 CFR Part 11 – Audit trail must record the exact PRNG seed used for schema generation | [tests_e2e/audit-trail.spec.ts:428](tests_e2e/audit-trail.spec.ts#L428) | 428 | results header displays the randomization seed used for the schema | 21 CFR Part 11 – Audit Trail: results grid metadata stamping | ⬜ UNKNOWN |
| `REQ-21CFR11-005` | 21 CFR Part 11 – PDF/XLSX exports must embed a SHA-256 audit hash for integrity verification | [src/app/domain/schema-management/services/export.service.spec.ts:145](src/app/domain/schema-management/services/export.service.spec.ts#L145) | 145 | should embed SHA-256 audit hash in the exported XLSX file | ExportService > exportXlsx | ✅ PASS |
| `REQ-21CFR11-006` | 21 CFR Part 11 – PDF audit artifact must embed version, timestamp, protocol ID and PRNG seed | [tests_e2e/audit-trail.spec.ts:393](tests_e2e/audit-trail.spec.ts#L393) | 393 | PDF export contains the application semantic version | 21 CFR Part 11 – Audit Trail: PDF export provenance | ⬜ UNKNOWN |
| `REQ-21CFR11-006` | 21 CFR Part 11 – PDF audit artifact must embed version, timestamp, protocol ID and PRNG seed | [tests_e2e/audit-trail.spec.ts:399](tests_e2e/audit-trail.spec.ts#L399) | 399 | PDF export contains a valid ISO 8601 generated-at timestamp |  | ⬜ UNKNOWN |
| `REQ-21CFR11-006` | 21 CFR Part 11 – PDF audit artifact must embed version, timestamp, protocol ID and PRNG seed | [tests_e2e/audit-trail.spec.ts:405](tests_e2e/audit-trail.spec.ts#L405) | 405 | PDF export contains the trial protocol identifier |  | ⬜ UNKNOWN |
| `REQ-21CFR11-006` | 21 CFR Part 11 – PDF audit artifact must embed version, timestamp, protocol ID and PRNG seed | [tests_e2e/audit-trail.spec.ts:411](tests_e2e/audit-trail.spec.ts#L411) | 411 | PDF export contains the PRNG seed value |  | ⬜ UNKNOWN |
| `REQ-EXPORT-001` | CSV/XLSX export filename must contain an 8-digit date component for per-generation traceability | [tests_e2e/audit-trail.spec.ts:444](tests_e2e/audit-trail.spec.ts#L444) | 444 | CSV download filename contains a date component for traceability |  | ⬜ UNKNOWN |
| `REQ-EXPORT-002` | PDF export must trigger a file download containing a properly named randomization artifact | [tests_e2e/audit-trail.spec.ts:420](tests_e2e/audit-trail.spec.ts#L420) | 420 | PDF export filename matches the expected pattern |  | ⬜ UNKNOWN |
| `REQ-EXPORT-002` | PDF export must trigger a file download containing a properly named randomization artifact | [tests_e2e/results-operations.spec.ts:120](tests_e2e/results-operations.spec.ts#L120) | 120 | should trigger a PDF download when the PDF button is clicked |  | ⬜ UNKNOWN |
| `REQ-EXPORT-003` | Excel export must produce a two-sheet workbook (Schema + Audit & Configuration) | [src/app/domain/schema-management/services/export.service.spec.ts:117](src/app/domain/schema-management/services/export.service.spec.ts#L117) | 117 | should render multi-tab structures and trigger file saves | ExportService > exportXlsx | ✅ PASS |
| `REQ-ICH-E6-001` | GCP – Subject IDs must be unique and fully traceable to site and block (ICH E6 §4.9) | [src/app/domain/randomization-engine/core/randomization-algorithm.spec.ts:657](src/app/domain/randomization-engine/core/randomization-algorithm.spec.ts#L657) | 657 | {RND:n} produces no duplicate subject IDs across the schema | generateRandomizationSchema – new token syntax | ✅ PASS |
| `REQ-ICH-E6-002` | Site information must be captured and present in all exported records (ICH E6 §4.1) | [src/app/domain/schema-management/services/export.service.spec.ts:169](src/app/domain/schema-management/services/export.service.spec.ts#L169) | 169 | should include site information in exported CSV records | ExportService > exportCsv | ✅ PASS |
| `REQ-ICH-E9-001` | Randomization algorithm must be deterministic and reproducible from a fixed PRNG seed (ICH E9 §2.3) | [scripts/cross-env/verify_python_schema.py:2](scripts/cross-env/verify_python_schema.py#L2) | 2 | Execute scripts/cross-env/verify_python_schema.py | Standalone Script | ✅ PASS |
| `REQ-ICH-E9-001` | Randomization algorithm must be deterministic and reproducible from a fixed PRNG seed (ICH E9 §2.3) | [src/app/domain/randomization-engine/core/statistical-validation.spec.ts:144](src/app/domain/randomization-engine/core/statistical-validation.spec.ts#L144) | 144 | 1:1 ratio converges to 50 % per arm across 200 Monte Carlo trials | ICH E9 – Law of Large Numbers: allocation ratio convergence | ✅ PASS |
| `REQ-ICH-E9-001` | Randomization algorithm must be deterministic and reproducible from a fixed PRNG seed (ICH E9 §2.3) | [tests_e2e/schema-generation.spec.ts:11](tests_e2e/schema-generation.spec.ts#L11) | 11 | should generate a schema and display results grid |  | ⬜ UNKNOWN |
| `REQ-ICH-E9-002` | Stratification factors must be applied correctly to the randomization schedule (ICH E9 §2.3.3) | [src/app/domain/randomization-engine/core/statistical-validation.spec.ts:277](src/app/domain/randomization-engine/core/statistical-validation.spec.ts#L277) | 277 | per-stratum caps are never exceeded across 100 random seeds | ICH E9 – Stratum Cap Enforcement: dynamic caps are never exceeded | ✅ PASS |
| `REQ-ICH-E9-003` | Block randomization must respect declared block sizes and produce balanced allocations (ICH E9 §2.3.4) | [scripts/cross-env/verify_python_schema.py:3](scripts/cross-env/verify_python_schema.py#L3) | 3 | Execute scripts/cross-env/verify_python_schema.py | Standalone Script | ✅ PASS |
| `REQ-ICH-E9-003` | Block randomization must respect declared block sizes and produce balanced allocations (ICH E9 §2.3.4) | [src/app/domain/randomization-engine/core/statistical-validation.spec.ts:184](src/app/domain/randomization-engine/core/statistical-validation.spec.ts#L184) | 184 | every block has exactly the correct count of each arm for a 1:1 ratio with block size 4 | ICH E9 – Block Balance: strict intra-block arm balance | ✅ PASS |
| `REQ-SBOM-001` | A Software Bill of Materials (SBOM) must be generated for every production build | [.github/workflows/ci.yml:781](.github/workflows/ci.yml#L781) | 781 | Job: sbom | CI Workflow | ⬜ UNKNOWN |
| `REQ-ZERO-TRUST-001` | No subject or schema data may be transmitted to external servers (zero-trust architecture) | [tests_e2e/zero-trust.spec.ts:52](tests_e2e/zero-trust.spec.ts#L52) | 52 | schema generation produces zero outbound XHR/Fetch requests to external servers | Zero-Trust Architecture: no outbound network requests | ⬜ UNKNOWN |
| `REQ-ZERO-TRUST-001` | No subject or schema data may be transmitted to external servers (zero-trust architecture) | [tests_e2e/zero-trust.spec.ts:69](tests_e2e/zero-trust.spec.ts#L69) | 69 | CSV export produces zero outbound requests to external servers |  | ⬜ UNKNOWN |
| `REQ-ZERO-TRUST-001` | No subject or schema data may be transmitted to external servers (zero-trust architecture) | [tests_e2e/zero-trust.spec.ts:90](tests_e2e/zero-trust.spec.ts#L90) | 90 | PDF export produces zero outbound requests to external servers |  | ⬜ UNKNOWN |

---

## Regulatory References

| Tag Prefix | Regulatory Source |
|---|---|
| `REQ-ICH-E9` | ICH E9 – Statistical Principles for Clinical Trials |
| `REQ-ICH-E6` | ICH E6(R2) – Good Clinical Practice (GCP) |
| `REQ-21CFR11` | 21 CFR Part 11 – Electronic Records; Electronic Signatures |
| `REQ-ZERO-TRUST` | Equipose Zero-Trust Architecture Requirement |
| `REQ-SBOM` | Supply-Chain Security – Software Bill of Materials |
| `REQ-EXPORT` | Export Artifact Provenance Requirements |

---

## SAS & Stata Cross-Environment Note

Mathematical result validation for SAS and Stata is deferred to the end-user environment per the formal Exception Report. See `docs/explanation/SAS_Stata_Exception_Report.md`.

Static syntax validation of generated SAS scripts is automated in CI via the `sas_static_validation` job (`scripts/validate-sas-syntax.mjs`). See `docs/explanation/adr/0001-sas-static-validation-strategy.md` for the validation strategy ADR.

