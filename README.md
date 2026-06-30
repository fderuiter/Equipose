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

## Architecture

This project follows a **Domain-Driven Design** structure with three bounded contexts:

1. **`randomization-engine`** - pure TypeScript algorithm, Web Worker, fallback-safe facade.
2. **`study-builder`** - reactive form, NgRx SignalStore, preset definitions.
3. **`schema-management`** - results grid, PDF/CSV export, code generation modal.

ESLint `no-restricted-imports` rules enforce that the `study-builder` UI can only
talk to the engine through the facade, never through internal service or worker files.

For the full architectural breakdown including Mermaid diagrams, see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Local Development

**Prerequisites:** Node.js v20 or newer.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/fderuiter/Clinical-Randomization-Generator.git
   cd Clinical-Randomization-Generator
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Run the development server:**
   ```bash
   pnpm start
   # or on port 3000:
   pnpm run dev
   ```
   Navigate to `http://localhost:4200/`. The application hot-reloads on file changes.

---

## Testing

### Unit tests (Vitest)

```bash
pnpm test -- --watch=false
```

Runs all 216 unit tests across 11 spec files using Vitest in a jsdom environment.

### End-to-end tests (Playwright)

```bash
# Terminal 1 - start the dev server
pnpm start

# Terminal 2 - run all e2e specs
pnpm exec playwright test
```

Playwright tests live in `tests_e2e/` and cover five areas:

| Spec file | What it tests |
|---|---|
| `navigation.spec.ts` | Landing page, header nav, About page, unknown-route redirect |
| `form-validation.spec.ts` | Preset loading, disabled-state buttons, block-size validator, arm/stratum management |
| `schema-generation.spec.ts` | Full end-to-end: configure → generate → blinding toggle |
| `results-operations.spec.ts` | Grid rendering, blinding, pagination, CSV & PDF downloads |
| `code-generator.spec.ts` | R / SAS / Python tab switching, code content, file downloads |

### Linting

```bash
ng lint
```

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

