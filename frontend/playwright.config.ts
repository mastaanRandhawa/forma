import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // serial by default — avoids race on shared test user
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5178",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: "setup",
      testMatch: /global-setup\.spec\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testIgnore: /global-setup\.spec\.ts/,
    },
  ],
  // With E2E_START_STACK=1 (set by `npm run test:e2e:stack`) Playwright starts
  // the API and Vite itself; otherwise it connects to servers you already run.
  // Either way the API needs a migrated, seeded database.
  webServer: process.env.E2E_START_STACK
    ? [
        {
          command: "npx tsx src/index.ts",
          cwd: "../backend",
          url: "http://localhost:4000/api/v1/health",
          reuseExistingServer: true,
          timeout: 60_000,
        },
        {
          command: "npx vite --port 5178 --strictPort",
          url: "http://localhost:5178",
          env: { VITE_API_URL: "http://localhost:4000/api/v1" },
          reuseExistingServer: true,
          timeout: 60_000,
        },
      ]
    : undefined,
});
