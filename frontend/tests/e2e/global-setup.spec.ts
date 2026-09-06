/**
 * Global setup: verifies the backend is reachable and the demo user can log in.
 * Runs first (dependencies: []) so all other specs can rely on the test user.
 */
import { test, expect } from "@playwright/test";
import { API, TEST_USER } from "./helpers";

test("backend is healthy", async ({ request }) => {
  const res = await request.get(`${API}/health`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
});

test("demo user can authenticate via API", async ({ request }) => {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: TEST_USER.email, password: TEST_USER.password, rememberMe: false },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.accessToken).toBeTruthy();
  expect(body.user.emailVerified).toBe(true);
  expect(body.user.onboardingCompletedAt).toBeTruthy();
});

test("app loads and redirects anonymous user to /login", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL(/\/login/, { timeout: 10_000 });
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});
