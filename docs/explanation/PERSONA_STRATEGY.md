# Standardized Persona Framework and Validation Strategy

To establish a reliable, traceable, and secure data-handling baseline across all user views and exports, Equipose implements a centralized programmatic persona and validation authority. This strategic framework defines the profiles, rules, permissions, and traceability required to prevent accidental data exposure or invalid operations during clinical trial schema design.

---

## 1. Strategic User Profiles

Our zero-trust, client-side security architecture supports three distinct user personas, each mapped to specific operations and data-handling rules.

### A. Biostatistician
* **Role & Responsibility:** Verifies the mathematical, statistical, and random-allocation correctness of generated trial schemas.
* **Access Level:** **Full Allocation Visibility (Unblinded).** Biostatisticians bypass standard blinding masks to inspect raw treatment allocations, verify block balance structures, analyze stratification distributions, and generate validation reports.
* **Traceability Tag:** `@persona:Biostatistician`

### B. Trial Manager
* **Role & Responsibility:** Configures randomization criteria and exports study schemas for RTSM/IRT integration under clinical trial protocol constraints.
* **Access Level:** **Secure Blinded Baseline.** In order to preserve the blinding of the active trial:
  1. Treatment arm allocations are automatically replaced with secure masked markers (`*** BLINDED ***`) in both the UI and structural exports, unless manually unblinded under authorized supervision.
  2. All structural schema exports (CSV, XLSX, PDF, JSON) are programmatically disabled when a **Draft Simulation** mode is active (such as when the `protocolId` is set to `'Simulation'` or `'Draft'`).
* **Traceability Tag:** `@persona:TrialManager`

### C. Compliance Officer / Auditor
* **Role & Responsibility:** Audits application logic, ensures data-handling rules are strictly followed, and verifies compliance with regulatory guidelines (such as 21 CFR Part 11, ICH E9, and ICH E6).
* **Access Level:** **System Verification & Integrity. ** Compliance officers run automated traceability matrix checks during release builds. The build pipeline verifies that 100% of the strategic persona requirements are mapped to verified automated unit/integration test cases.
* **Traceability Tag:** `@persona:ComplianceOfficer`

---

## 2. Programmatic Authority & Centralized Policy Rules

Rather than enforcing data exposure and export safety rules using ad-hoc, component-level checks, Equipose centralizes all logic within the client-side `PersonaValidationService`.

```
                        ┌───────────────────────────────┐
                        │   PersonaValidationService    │
                        │ (Central Authority - Signals) │
                        └───────────────┬───────────────┘
                                        │
                ┌───────────────────────┼───────────────────────┐
                ▼                       ▼                       ▼
      ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
      │   Results Grid   │    │  Export Service  │    │ PDF Layout Engine│
      │   (UI Display)   │    │  (CSV / XLSX)    │    │   (PDF Export)   │
      └──────────────────┘    └──────────────────┘    └──────────────────┘
```

### Centralized Rules Engine
1. **Unblinded Visibility Control:** `canBypassBlinding` is evaluated to determine if a persona is authorized to view unblinded allocations without manual toggles.
2. **Export Restrictor Policy:** `canExportSchema(protocolId)` determines if structural exports are blocked based on active simulation/draft mode.
3. **Data Blinding Masking Rule:** `getMaskedTreatment(treatmentArm, isUnblinded)` decides if a treatment arm must be redacted (`*** BLINDED ***`) or remains raw.

---

## 3. Compliance & Traceability Verification

To ensure that persona-level requirements never regress or suffer from developer configuration overrides:
1. **Code Annotations:** Developers annotate test cases and core files with `@persona:Biostatistician`, `@persona:TrialManager`, or `@persona:ComplianceOfficer` tags.
2. **Automated RTM Scanning:** During build execution, `scripts/generate-rtm.mjs` scans all test files for persona annotations.
3. **Traceability Index Alignment:** The build process automatically verifies that:
   * No persona defined in the strategic profile index is missing a test case.
   * No undocumented or typo-ridden `@persona` tags exist in the workspace.
4. **Failsafe Build Pipeline:** If any tag is missing or misaligned, the build script exits with a non-zero code, failing the CI/CD pipeline immediately.
