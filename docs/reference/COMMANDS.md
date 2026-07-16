# Developer Command Reference

This page consolidates all CLI script utility instructions, environment requirements, and verification commands.

## Prerequisites

Before running the utility workflows, ensure your environment meets the following requirements:

### Node.js
- **Node.js**: Requires Node.js v20+ (v22 recommended).
- **pnpm**: Make sure `pnpm` is installed to manage Node dependencies.
- **Dependencies**: Run `pnpm install` in the project root to install all required Node.js packages (including `tsx` for TypeScript execution).

### Python & R (Optional for local testing, required for CI)
- **Python**: Requires Python 3.11+ with `numpy` and `pandas` available.
- **R**: Requires `Rscript` installed for R logic validation.
*(Note: If Python or R are missing locally, the cross-environment validation script gracefully degrades but will fail during CI runs.)*

---

## Commands

### Local Development
- `pnpm start` - Run the development server at `http://localhost:4200/`. The application hot-reloads on file changes.
- `pnpm run dev` - Run the development server on port 3000.

### Testing & Linting
- `pnpm test` - Runs all 216 unit tests across 11 spec files using Vitest in a jsdom environment.
- `pnpm exec playwright test` - Runs end-to-end tests (requires dev server to be running).
- `pnpm run lint` - Runs code linting, markdown link checking, and markdown syntax checking.
- `ng lint` - Runs Angular code linting.

### Logic Verification (Active Tests)
The logic verification script is a Vitest test suite that directly runs the core TypeScript logic and verifies cross-platform generated scripts in Node.js subprocesses.
- `pnpm run verify:logic` - Executes the ground-truth sequence verification. This single command runs all core correctness and cross-platform logic checks using deterministic golden fixtures.

### Golden Fixture Generation
- `pnpm run fixtures:generate` - Updates the "golden" reference JSON files used as baselines for testing. Relies on TypeScript execution tools (`tsx`).

*(Note: The legacy `verification.py` script has been deprecated and removed. Cross-platform parity testing is fully integrated into the Vitest runner.)*

### Deployment
- `pnpm run build` - Builds the Angular app as a static Single Page Application (SPA).
