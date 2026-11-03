import { type Page, expect } from "@playwright/test";

// match playwright.config.ts: E2E_WEB_PORT / E2E_API_PORT override the defaults
export const BASE = `http://localhost:${process.env.E2E_WEB_PORT ?? 5178}`;
export const API = `http://localhost:${process.env.E2E_API_PORT ?? 4000}/api/v1`;
/** The no-backend build, for specs that exercise local mode. */
export const OFFLINE_BASE = `http://localhost:${process.env.E2E_OFFLINE_PORT ?? Number(process.env.E2E_WEB_PORT ?? 5178) + 1}`;

export const TEST_USER = {
  email: "alex@forma.app",
  password: "forma1234",
};

/** Log in via the UI and wait for the dashboard. */
export async function loginUI(page: Page) {
  await page.goto("/login");
  await page.getByLabel("email").fill(TEST_USER.email);
  // Use CSS selector to avoid matching the "Show password" toggle button
  await page.locator('input[type="password"]').fill(TEST_USER.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
}

/** Log in via API: inject tokens into localStorage once, then navigate to dashboard. */
export async function loginViaAPI(page: Page) {
  const res = await page.request.post(`${API}/auth/login`, {
    data: { email: TEST_USER.email, password: TEST_USER.password, rememberMe: true },
  });
  const body = await res.json();
  const accessToken: string = body.accessToken;
  const refreshToken: string = body.refreshToken;

  // Load the page shell first so localStorage is available, then inject tokens
  await page.goto("/login");
  await page.evaluate(
    ({ at, rt }) => {
      try {
        localStorage.setItem("forma.access", at);
        localStorage.setItem("forma.refresh", rt);
      } catch {
        /* private mode */
      }
    },
    { at: accessToken, rt: refreshToken },
  );
  await page.goto("/dashboard");
  // main, not nav: the phone layout keeps the nav behind a menu button
  await page.waitForSelector("main", { timeout: 10_000 });
}

/** Clear auth tokens and navigate to login page. */
export async function logout(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem("forma.access");
    localStorage.removeItem("forma.refresh");
  });
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
}
