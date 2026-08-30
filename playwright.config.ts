import { defineConfig } from '@playwright/test'

/**
 * Responsive suite only. Unit tests stay in vitest (`npm test`); this drives a
 * real browser because layout overflow cannot be detected without real layout.
 */
export default defineConfig({
  testDir: './tests/responsive',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: process.env.RESPONSIVE_BASE_URL ?? 'http://localhost:3000',
    trace: 'off',
  },
  webServer: process.env.RESPONSIVE_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
