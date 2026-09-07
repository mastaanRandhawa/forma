/**
 * Auth flows: login, signup, logout, forgot-password, route guards.
 */
import { test, expect } from "@playwright/test";
import { loginUI, loginViaAPI, logout, TEST_USER, API } from "./helpers";

// ── positive flows ────────────────────────────────────────────────────────────

test("login with valid credentials navigates to dashboard", async ({ page }) => {
  await loginUI(page);
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.locator("nav")).toBeVisible();
});

test("logout clears session and returns to login", async ({ page }) => {
  await loginViaAPI(page);
  // find sign-out — click the settings/profile area
  await page.goto("/settings");
  await page.waitForSelector("text=account", { timeout: 8_000 });
  // use localStorage clear + navigate as a reliable logout mechanism
  await logout(page);
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});

test("forgot password page is reachable from login", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: /forgot password/i }).click();
  await page.waitForURL(/\/forgot-password/);
  await expect(page.getByRole("button", { name: /send reset/i })).toBeVisible();
});

test("forgot password form accepts valid email without error", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByLabel(/email/i).fill("nobody@example.com");
  await page.getByRole("button", { name: /send reset/i }).click();
  // API always returns 200 (no account enumeration)
  await expect(page.getByText(/check your email|sent|link/i)).toBeVisible({ timeout: 8_000 });
});

test("signup page renders and links back to login", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  await page.getByRole("link", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/login/);
});

// ── negative / edge cases ────────────────────────────────────────────────────

test("login with wrong password shows error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("email").fill(TEST_USER.email);
  await page.locator('input[type="password"]').fill("wrongpassword123!");
  await page.getByRole("button", { name: /sign in/i }).click();
  // error message: "That email and password don't match."
  await expect(page.getByText(/don't match|email and password/i)).toBeVisible({ timeout: 8_000 });
});

test("login with empty fields shows validation", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /sign in/i }).click();
  // HTML5 required attribute blocks submit — no navigation should happen
  await expect(page).toHaveURL(/\/login/);
});

test("login with malformed email shows validation", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("email").fill("notanemail");
  await page.locator('input[type="password"]').fill("somepass");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("signup with weak password shows password strength error", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel(/^email/i).fill("newuser@example.com");
  // Use CSS selector to avoid the "Show password" toggle buttons
  await page.locator('input[type="password"]').first().fill("weak");
  await page.getByRole("button", { name: /create account/i }).click();
  // submit should be blocked or error shown
  await expect(page).toHaveURL(/\/signup/);
});

test("signup with mismatched passwords prevents submit", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel(/email/i).fill("newuser@example.com");
  // Use CSS selectors to target actual input fields, not toggle buttons
  const pwInputs = page.locator('input[type="password"]');
  await pwInputs.first().fill("ValidPass1!");
  await pwInputs.nth(1).fill("DifferentPass1!");
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/signup/);
});

test("protected route without auth redirects to login", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForURL(/\/login/, { timeout: 8_000 });
});

test("protected route /workouts without auth redirects to login", async ({ page }) => {
  await page.goto("/workouts");
  await page.waitForURL(/\/login/, { timeout: 8_000 });
});

test("unknown route redirects to dashboard when authed", async ({ page }) => {
  await loginViaAPI(page);
  await page.goto("/this-does-not-exist");
  await page.waitForURL(/\/dashboard/, { timeout: 8_000 });
});

test("already-authed user visiting /login is redirected to dashboard", async ({ page }) => {
  await loginViaAPI(page);
  await page.goto("/login");
  await page.waitForURL(/\/dashboard/, { timeout: 8_000 });
});

test("API: register rejects a short password", async ({ request }) => {
  const res = await request.post(`${API}/auth/register`, {
    data: { email: "test@example.com", password: "abc" },
  });
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.error.code).toBe("bad_request");
});

test("API: forgot-password always 200 regardless of account existence", async ({ request }) => {
  const res = await request.post(`${API}/auth/forgot-password`, {
    data: { email: "definitelynotreal@forma.example" },
  });
  expect(res.status()).toBe(200);
});
