# Utility Workflows

This directory contains essential utility scripts for logic verification and fixture generation.

## Prerequisites

Before running the utility workflows, ensure your environment meets the following requirements:

### Node.js
- **Node.js**: Requires Node.js v20+ (v22 recommended).
- **pnpm**: Make sure `pnpm` is installed to manage Node dependencies.
- **Dependencies**: Run `pnpm install` in the project root to install all required Node.js packages (including `tsx` for TypeScript execution).

### Python & R (Optional for local testing, required for CI)
- **Python**: Requires Python 3.11+ with `numpy` and `pandas` available.
- **R**: Requires `Rscript` installed for R logic validation.
*(Note: If Python or R are missing locally, the script gracefully degrades but will fail during CI runs.)*

## Running the Scripts

### Logic Verification
The logic verification script is a Vitest test suite that directly runs the core TypeScript logic and verifies cross-platform generated scripts in Node.js subprocesses. It replaces the legacy automated browser-UI script.

To execute the verification flow, run:
```bash
npm run verify:logic
```
This single command runs all core correctness and cross-platform logic checks.

### Golden Fixture Generation
To update the "golden" reference JSON files used as baselines for testing, run:
```bash
npm run fixtures:generate
```
This relies on TypeScript execution tools defined in the project configuration to execute directly without a pre-compilation step.
