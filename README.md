<div align="center">
  <h1>Equipose</h1>
  <p>Free, browser-based stratified block randomization tool for RTSM and IRT workflows - <a href="https://equipose.org">equipose.org</a></p>

  ![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular)
  ![NgRx Signals](https://img.shields.io/badge/NgRx_Signals-21-BA2BD2)
  ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?logo=tailwindcss)
  ![Vitest](https://img.shields.io/badge/Tested_with-Vitest-6E9F18?logo=vitest)
  ![Playwright](https://img.shields.io/badge/E2E-Playwright-2EAD33?logo=playwright)
</div>

## Overview

Equipose is a free, open-source web utility designed to help biostatisticians and clinical trial managers rapidly design, simulate, and export stratified block randomization schemas for RTSM, IRT, and IWRS clinical trials.

Built entirely as a client-side Angular application, it ensures that sensitive trial design parameters never leave the user's browser. It supports complex multi-strata designs, variable block sizes, and custom treatment ratios.

> [!NOTE]
> **Clinical Compliance & Scientific Validity**
>
> The schemas generated directly within the Web UI are cryptographically identical to the outputs of the generated R, Python, SAS, and Stata scripts. You can use either the Web UI or the downloaded scripts within your organisation's validated statistical environment for your source of truth.

---

## Key Features

* **Complex Ratios:** Define custom allocation ratios (e.g., 1:1, 2:1, 3:1:1) across multiple treatment arms.
* **Stratified Block Randomization:** Ensure treatment balance across multiple clinical sites and dynamic stratification factors (e.g., Age, Gender, Region).
* **Dynamic Stratum Caps:** Set specific maximum enrollment caps for unique stratum combinations.
* **Variable Block Sizes:** Randomise across multiple block sizes within the same study to resist unblinding.
* **Math Failsafes:** Built-in validation ensures block sizes are exact multiples of the total allocation ratio.
* **Code Generation:** Instantly export the exact randomization logic to **R**, **Python (pandas/numpy)**, or **SAS** scripts for integration into your Statistical Analysis Plan (SAP).
* **Reproducible:** Every schema carries a random seed that can be re-entered to reproduce the exact same allocation. The system guarantees 100% bit-for-bit sequence parity between the Web UI (TypeScript) and all target statistical software exports (Python, R, SAS, and Stata).
* **Zero-Trust Architecture:** 100% client-side execution. No data is stored on or transmitted to external servers.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Angular 21 (Standalone Components, Signals, `@for` Control Flow) |
| **State management** | NgRx SignalStore 21 |
| **Concurrency** | Web Workers (off-main-thread schema generation) |
| **Styling** | Tailwind CSS 4 |
| **PRNG** | Mersenne Twister (MT19937) |
| **PDF export** | `jspdf` + `jspdf-autotable` |
| **Unit testing** | Vitest 4 + Angular TestBed (jsdom environment) |
| **E2E testing** | Playwright 1.58 (Chromium, Firefox, WebKit) |
| **Linting** | ESLint 9 + `angular-eslint` + strict domain boundary rules |
| **Versioning** | `semantic-release` (Conventional Commits → GitHub Releases) |
| **Deployment** | Cloudflare Pages (static SPA) at [equipose.org](https://equipose.org) |

---

## Documentation

All project documentation, including architecture concepts, developer commands, compliance checklists, and testing protocols, is centralized in our [Documentation Hub](docs/index.md).

---

## Architecture

This project follows a **Domain-Driven Design** structure with three bounded contexts:

1. **`randomization-engine`** - pure TypeScript algorithm, Web Worker, fallback-safe facade.
2. **`study-builder`** - reactive form, NgRx SignalStore, preset definitions.
3. **`schema-management`** - results grid, PDF/CSV export, code generation modal.

ESLint `no-restricted-imports` rules enforce that the `study-builder` UI can only
talk to the engine through the facade, never through internal service or worker files.

For the full architectural breakdown including Mermaid diagrams, see
[docs/explanation/ARCHITECTURE_CONCEPTS.md](docs/explanation/ARCHITECTURE_CONCEPTS.md) and [docs/reference/ARCHITECTURE_REFERENCE.md](docs/reference/ARCHITECTURE_REFERENCE.md).

---

## Developer Commands & Environment Setup

Please refer to the [Developer Command Reference](docs/reference/COMMANDS.md) for full details on:
- Local environment setup and prerequisites (Node.js, Python, R)
- Local development commands
- Testing, linting, and verification commands
- Logic verification and golden fixture generation

---

## Deployment

### Cloudflare Pages (automatic)

Pushes to `main` automatically trigger the deployment workflow,
which builds the Angular app as a static Single Page Application (SPA) compatible with Cloudflare Pages
and deploys it at [https://equipose.org](https://equipose.org).

To enable this on a fork:
1. Connect the repository to your Cloudflare account.
2. Configure the build command as `pnpm run build` and output directory as `dist/app/browser`.

### Versioning

Releases are automated via `semantic-release`. Merging a `feat:` or `fix:` commit to
`main` automatically bumps `package.json`, updates `CHANGELOG.md`, and creates a
tagged GitHub Release. The new version is stamped into every generated CSV, PDF, and
code script via `src/environments/version.ts`.

---

## License

GNU Affero General Public License v3.0 - see [LICENSE](LICENSE) for details.
