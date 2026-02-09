import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests run in user-flow order (alphabetical by file):
 * phase1 Public → phase2 Auth → phase3 Dashboard → phase4 Drives →
 * phase5 Volunteers → phase6 Duties → phase7 Settings → phase8 Edge
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  // Start dev server automatically if baseURL is localhost (skip if PLAYWRIGHT_BASE_URL is set)
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
