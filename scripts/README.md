# Utility Workflows

This directory contains essential utility scripts for logic verification and fixture generation.

## Prerequisites

Before running the utility workflows, ensure your environment meets the following requirements:

### Node.js
- **Node.js**: Requires Node.js v20+ (v22 recommended).
- **pnpm**: Make sure `pnpm` is installed to manage Node dependencies.
- **Dependencies**: Run `pnpm install` in the project root to install all required Node.js packages (including `tsx` for TypeScript execution).

### Python
- **Python**: Requires Python 3.11+.
- **Playwright for Python**: The verification script uses Playwright to automate browser interactions. Install the required Python packages:
  ```bash
  pip install playwright
  playwright install
  ```

## Running the Scripts

### Logic Verification
The logic verification script automates the UI to test the code generation logic and executes the output locally to validate data correctness.

1. Ensure the local Angular development server is running on `http://localhost:4200`:
   ```bash
   npm run start
   ```
2. In a separate terminal, execute the verification flow:
   ```bash
   npm run verify:logic
   ```
The script will output the results and session recordings to a local `./output` directory.

### Golden Fixture Generation
To update the "golden" reference JSON files used as baselines for testing, run:
```bash
npm run fixtures:generate
```
This relies on TypeScript execution tools defined in the project configuration to execute directly without a pre-compilation step.
