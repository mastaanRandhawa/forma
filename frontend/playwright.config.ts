import { defineConfig, devices } from "@playwright/test";

// Ports are configurable so a run doesn't collide with a dev server you're using:
//   E2E_WEB_PORT (default 5178) — Vite;  E2E_API_PORT (default 4000) — the API.
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 5178);
const API_PORT = Number(process.env.E2E_API_PORT ?? 4000);
// the no-backend build, for specs that exercise local mode
const OFFLINE_PORT = Number(process.env.E2E_OFFLINE_PORT ?? WEB_PORT + 1);
const WEB_URL = `http://localhost:${WEB_PORT}`;
const API_URL = `http://localhost:${API_PORT}/api/v1`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // serial by default — avoids race on shared test user
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: WEB_URL,
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
    {
      // phone-sized layout checks: only tests tagged @mobile
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      dependencies: ["setup"],
      grep: /@mobile/,
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
          url: `${API_URL}/health`,
          env: { PORT: String(API_PORT) },
          reuseExistingServer: true,
          timeout: 60_000,
        },
        {
          command: `npx vite --port ${WEB_PORT} --strictPort`,
          url: WEB_URL,
          env: { VITE_API_URL: API_URL },
          reuseExistingServer: true,
          timeout: 60_000,
        },
        {
          command: `npx vite --mode offline --port ${OFFLINE_PORT} --strictPort`,
          url: `http://localhost:${OFFLINE_PORT}`,
          reuseExistingServer: true,
          timeout: 60_000,
        },
      ]
    : undefined,
});
