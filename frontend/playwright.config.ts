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
  // dev server is started separately; we just connect to it
  webServer: undefined,
});
