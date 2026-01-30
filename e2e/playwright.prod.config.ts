import { defineConfig, devices } from '@playwright/test'

/**
 * Production test configuration for running E2E tests against the live site.
 *
 * Usage: npx playwright test --config=playwright.prod.config.ts
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 120000,
  use: {
    baseURL: 'https://www.austinwallace.ca/trading-cards',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
