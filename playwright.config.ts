import { defineConfig, devices } from '@playwright/test';

// The regressions this project actually suffers are layout ones at specific viewports —
// text running under a button, the footer moving, content past the footer. So the matrix
// is viewports rather than browsers.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      // Pixel 8a, the device this is checked on
      name: 'mobile-portrait',
      use: { ...devices['Desktop Chrome'], viewport: { width: 412, height: 915 }, isMobile: false },
    },
    {
      name: 'mobile-landscape',
      use: { ...devices['Desktop Chrome'], viewport: { width: 915, height: 412 }, isMobile: false },
    },
  ],
  webServer: {
    command: 'npm run dev --workspace=packages/web',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
