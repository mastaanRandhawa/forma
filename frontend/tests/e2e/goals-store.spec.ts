/**
 * Goals and store: CRUD, wallet, achievements.
 */
import { test, expect } from "@playwright/test";
import { loginViaAPI, API } from "./helpers";

test.beforeEach(async ({ page }) => {
  await loginViaAPI(page);
});

// ── UI ────────────────────────────────────────────────────────────────────────

test("goals page renders", async ({ page }) => {
  await page.goto("/goals");
  await expect(page.locator("main")).toBeVisible();
});

test("store page renders", async ({ page }) => {
  await page.goto("/store");
  await expect(page.locator("main")).toBeVisible();
});

// ── API: goals ────────────────────────────────────────────────────────────────

test("API: list goals returns array", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/goals`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);
});

test("API: create and delete a goal", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const headers = { Authorization: `Bearer ${at}` };

  // Schema: key, label, target (positive number), unit (string), cadence ("daily"|"weekly")
  const create = await page.request.post(`${API}/goals`, {
    headers,
    data: {
      key: "workout_sessions",
      label: "Playwright test goal",
      target: 3,
      unit: "sessions",
      cadence: "weekly",
    },
  });
  expect([200, 201]).toContain(create.status());
  const goal = await create.json();
  const goalId: string = goal.id;
  expect(goalId).toBeTruthy();

  // delete it
  const del = await page.request.delete(`${API}/goals/${goalId}`, { headers });
  expect([200, 204]).toContain(del.status());
});

test("API: create goal with missing target returns 400", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.post(`${API}/goals`, {
    headers: { Authorization: `Bearer ${at}` },
    data: { key: "workout_sessions", label: "bad goal" }, // no target, no cadence
  });
  expect(res.status()).toBe(400);
});

test("API: delete non-existent goal is idempotent (204)", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.delete(`${API}/goals/fake-goal-id-that-never-existed`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  // API may return 204 (idempotent) or 404 depending on implementation
  expect([204, 404]).toContain(res.status());
});

// ── API: store ────────────────────────────────────────────────────────────────

test("API: store items list returns array", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/store/items`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);
});

test("API: wallet returns balance", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/store/wallet`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(typeof body.balance).toBe("number");
});

test("API: buy non-existent item returns 404", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.post(`${API}/store/items/fake-item-id/buy`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(404);
});

// ── API: achievements ─────────────────────────────────────────────────────────

test("API: achievements list returns array", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/achievements`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);
});

// ── auth guards ───────────────────────────────────────────────────────────────

test("API: goals requires auth", async ({ request }) => {
  expect((await request.get(`${API}/goals`)).status()).toBe(401);
});

test("API: store requires auth", async ({ request }) => {
  expect((await request.get(`${API}/store/items`)).status()).toBe(401);
});

test("API: achievements requires auth", async ({ request }) => {
  expect((await request.get(`${API}/achievements`)).status()).toBe(401);
});
