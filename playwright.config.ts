import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests_e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined, // Force 1 worker in CI to prevent resource and port contention on the runners
  // In CI: emit both a blob (for shard merging) and a JSON (for RTM generation).
  reporter: process.env.CI ? [['blob'], ['line'], ['json', { outputFile: 'playwright-results.json' }]] : 'html',
  use: {
    trace: 'on-first-retry',
  },
  webServer: {
    command: process.env.CI ? 'npx wrangler dev --ip 127.0.0.1 --port 4200' : 'npm run start -- --host 127.0.0.1',
    url: 'http://127.0.0.1:4200',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
