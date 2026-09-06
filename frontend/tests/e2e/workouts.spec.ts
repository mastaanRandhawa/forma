/**
 * Workouts: list, template creation, builder, active session flows.
 */
import { test, expect } from "@playwright/test";
import { loginViaAPI, API } from "./helpers";

test.beforeEach(async ({ page }) => {
  await loginViaAPI(page);
});

// ── positive flows ────────────────────────────────────────────────────────────

test("workouts page renders", async ({ page }) => {
  await page.goto("/workouts");
  await expect(page.locator("main")).toBeVisible();
});

test("workout builder page loads at /workouts/builder", async ({ page }) => {
  await page.goto("/workouts/builder");
  await expect(page).toHaveURL(/\/workouts\/builder/);
  await expect(page.locator("main")).toBeVisible();
});

test("API: workouts list returns array", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/workouts`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);
});

test("API: workouts templates list returns array", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/workouts?template=true`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);
});

test("API: create a workout template and delete it", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const headers = { Authorization: `Bearer ${at}` };

  // create
  const create = await page.request.post(`${API}/workouts`, {
    headers,
    data: {
      name: "Playwright Test Workout",
      isTemplate: true,
      exercises: [],
    },
  });
  expect(create.status()).toBe(201);
  const workout = await create.json();
  expect(workout.id).toBeTruthy();
  expect(workout.name).toBe("Playwright Test Workout");

  // verify it appears in list
  const list = await page.request.get(`${API}/workouts`, { headers });
  const all = await list.json();
  const found = (all as { id: string }[]).find((w) => w.id === workout.id);
  expect(found).toBeTruthy();

  // delete
  const del = await page.request.delete(`${API}/workouts/${workout.id}`, { headers });
  expect(del.status()).toBe(204);

  // verify gone
  const after = await page.request.get(`${API}/workouts/${workout.id}`, { headers });
  expect(after.status()).toBe(404);
});

test("API: create workout with invalid body returns 400", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.post(`${API}/workouts`, {
    headers: { Authorization: `Bearer ${at}` },
    data: { name: "" }, // empty name
  });
  expect(res.status()).toBe(400);
});

test("API: get non-existent workout returns 404", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/workouts/does-not-exist-xyz`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(404);
});

test("API: start a session and abandon it", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const headers = { Authorization: `Bearer ${at}` };

  // start a quick-start session (no workoutId)
  const start = await page.request.post(`${API}/sessions`, {
    headers,
    data: { name: "Playwright quick session" },
  });
  expect(start.status()).toBe(201);
  const session = await start.json();
  const sessionId: string = session.id;
  expect(sessionId).toBeTruthy();

  // abandon it so we don't leave an in-progress session
  const abandon = await page.request.post(`${API}/sessions/${sessionId}/abandon`, { headers });
  expect(abandon.status()).toBe(200);
  const done = await abandon.json();
  expect(done.status).toBe("abandoned");
});

test("API: sessions list returns array", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/sessions`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  expect(Array.isArray(await res.json())).toBe(true);
});

// ── negative / edge cases ────────────────────────────────────────────────────

test("API: workouts requires auth", async ({ request }) => {
  const res = await request.get(`${API}/workouts`);
  expect(res.status()).toBe(401);
});

test("API: sessions requires auth", async ({ request }) => {
  const res = await request.get(`${API}/sessions`);
  expect(res.status()).toBe(401);
});

test("API: delete non-existent workout is idempotent (204 or 404)", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.delete(`${API}/workouts/totally-fake-id-that-never-existed`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  // API may return 204 (idempotent) or 404 — both are acceptable
  expect([204, 404]).toContain(res.status());
});

test("active workout route loads", async ({ page }) => {
  await page.goto("/workouts/active");
  // either shows active workout UI or redirects back to /workouts
  const url = page.url();
  expect(url).toMatch(/\/(workouts|dashboard)/);
  await expect(page.locator("main, body")).toBeVisible();
});

test("workout builder with invalid id redirects gracefully", async ({ page }) => {
  await page.goto("/workouts/builder/nonexistent-id-xyz");
  await expect(page.locator("main")).toBeVisible();
});
