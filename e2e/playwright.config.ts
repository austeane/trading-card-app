import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for E2E tests.
 * Uses port 5174 to avoid conflicts with other dev servers.
 */

const E2E_PORT = 5174

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run serially to avoid overwhelming SST dev
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid race conditions with SST dev
  reporter: 'html',
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run dev server before starting tests */
  webServer: {
    command: `pnpm --filter=client exec vite --port ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: true,
    cwd: '..',
    timeout: 60000,
  },
})
