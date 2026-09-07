/**
 * Settings: navigation, profile update, appearance, notifications.
 */
import { test, expect } from "@playwright/test";
import { loginViaAPI, API } from "./helpers";

test.beforeEach(async ({ page }) => {
  await loginViaAPI(page);
});

// ── UI navigation ─────────────────────────────────────────────────────────────

test("settings overview renders", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.locator("main")).toBeVisible();
});

test("settings/training renders", async ({ page }) => {
  await page.goto("/settings/training");
  await expect(page.locator("main")).toBeVisible();
});

test("settings/appearance renders", async ({ page }) => {
  await page.goto("/settings/appearance");
  await expect(page.locator("main")).toBeVisible();
});

test("settings/account renders", async ({ page }) => {
  await page.goto("/settings/account");
  await expect(page.locator("main")).toBeVisible();
});

test("settings/notifications renders", async ({ page }) => {
  await page.goto("/settings/notifications");
  await expect(page.locator("main")).toBeVisible();
});

test("settings/privacy renders", async ({ page }) => {
  await page.goto("/settings/privacy");
  await expect(page.locator("main")).toBeVisible();
});

test("settings/connections renders", async ({ page }) => {
  await page.goto("/settings/connections");
  await expect(page.locator("main")).toBeVisible();
});

test("settings/customization renders", async ({ page }) => {
  await page.goto("/settings/customization");
  await expect(page.locator("main")).toBeVisible();
});

// ── API: /me endpoints ────────────────────────────────────────────────────────

test("API: GET /me returns user profile", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/me`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.email).toBe("alex@forma.app");
  expect(body.name).toBeTruthy();
});

test("API: GET /me/settings returns settings bundle", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/me/settings`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toHaveProperty("appearance");
  expect(body).toHaveProperty("progression");
});

test("API: PUT /me/settings updates appearance", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.put(`${API}/me/settings`, {
    headers: { Authorization: `Bearer ${at}` },
    data: { appearance: { reduceMotion: false } },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.appearance).toBeDefined();
});

test("API: PATCH /me updates profile name", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.patch(`${API}/me`, {
    headers: { Authorization: `Bearer ${at}` },
    data: { name: "Alex" }, // keep same name so no side effect
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.name).toBe("Alex");
});

test("API: GET /me/sessions returns active sessions", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/me/sessions`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);
  expect(body.length).toBeGreaterThan(0);
});

test("API: GET /notifications/preferences returns preferences", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/notifications/preferences`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toBeTruthy();
});

test("API: GET /me/equipment returns equipment list", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/me/equipment`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);
});

// ── auth guards ───────────────────────────────────────────────────────────────

test("API: /me requires auth", async ({ request }) => {
  const res = await request.get(`${API}/me`);
  expect(res.status()).toBe(401);
});

test("API: PUT /me/settings requires auth", async ({ request }) => {
  const res = await request.put(`${API}/me/settings`, {
    data: { appearance: { reduceMotion: true } },
  });
  expect(res.status()).toBe(401);
});

test("API: password change requires auth", async ({ request }) => {
  const res = await request.put(`${API}/me/password`, {
    data: { currentPassword: "old", newPassword: "New1234!" },
  });
  expect(res.status()).toBe(401);
});
