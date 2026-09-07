/**
 * Dashboard: widgets, data loading, empty/error states.
 */
import { test, expect } from "@playwright/test";
import { loginViaAPI, API } from "./helpers";

test.beforeEach(async ({ page }) => {
  await loginViaAPI(page);
  await page.goto("/dashboard");
});

test("dashboard page renders without errors", async ({ page }) => {
  await expect(page.locator("main")).toBeVisible();
  // no JS crash — page should not show a generic error
  const bodyText = await page.locator("body").textContent();
  expect(bodyText).not.toMatch(/something went wrong|unexpected error/i);
});

test("dashboard greeting is visible", async ({ page }) => {
  // heading or greeting element — broad check
  await expect(page.locator("h1, h2, [data-testid='greeting']").first()).toBeVisible({ timeout: 8_000 });
});

test("at least one metric/stat widget is visible", async ({ page }) => {
  // rings, stat cards, or activity sections
  await expect(
    page.locator("section, [class*='ring'], [class*='stat'], [class*='card']").first(),
  ).toBeVisible({ timeout: 8_000 });
});

test("page title is set correctly", async ({ page }) => {
  const title = await page.title();
  expect(title).toMatch(/forma/i);
});

test("API: dashboard endpoint returns data for authed user", async ({ page, context }) => {
  // get the stored access token from localStorage
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/dashboard`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toBeTruthy();
});

test("API: dashboard returns 401 without token", async ({ request }) => {
  const res = await request.get(`${API}/dashboard`);
  expect(res.status()).toBe(401);
});

test("dashboard does not crash on rapid refresh", async ({ page }) => {
  await page.reload();
  await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
  await expect(page.locator("main")).toBeVisible();
});
