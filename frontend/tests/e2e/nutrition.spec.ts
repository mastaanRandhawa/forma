/**
 * Nutrition & food logging: page renders, API CRUD, search, favorites.
 */
import { test, expect } from "@playwright/test";
import { loginViaAPI, API } from "./helpers";

test.beforeEach(async ({ page }) => {
  await loginViaAPI(page);
});

// ── UI flows ──────────────────────────────────────────────────────────────────

test("nutrition page renders", async ({ page }) => {
  await page.goto("/nutrition");
  await expect(page).toHaveURL(/\/nutrition/);
  await expect(page.locator("main")).toBeVisible();
});

test("nutrition page shows macro/calorie information", async ({ page }) => {
  await page.goto("/nutrition");
  // broad check — calorie or macro labels should appear
  await expect(
    page.getByText(/calorie|protein|carb|fat/i).first(),
  ).toBeVisible({ timeout: 10_000 });
});

// ── API: food search ──────────────────────────────────────────────────────────

test("API: food search returns results for 'chicken'", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/food/search?q=chicken`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  // response may wrap items in .items or be an array
  const items = body.items ?? body;
  expect(Array.isArray(items) ? items.length : Object.keys(body).length).toBeGreaterThan(0);
});

test("API: food search with empty query returns 400 or empty", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/food/search?q=`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect([200, 400]).toContain(res.status());
});

// ── API: food log CRUD ────────────────────────────────────────────────────────

test("API: get today's food log", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/food/log`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toHaveProperty("date");
});

test("API: log a food item via quick-add and delete it", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const headers = { Authorization: `Bearer ${at}` };

  // Use quickAdd which needs no external food lookup
  const logRes = await page.request.post(`${API}/food/log`, {
    headers,
    data: {
      quickAdd: { name: "Playwright test food", calories: 300, protein: 25, carbs: 10, fat: 8 },
      mealType: "lunch",
    },
  });
  expect(logRes.status()).toBe(201);
  const logBody = await logRes.json();
  const entryId: string | undefined = logBody.entry?.id;
  expect(entryId).toBeTruthy();

  if (entryId) {
    const del = await page.request.delete(`${API}/food/log/${entryId}`, { headers });
    expect([200, 204]).toContain(del.status());
  }
});

test("API: log food with missing required fields returns 400", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.post(`${API}/food/log`, {
    headers: { Authorization: `Bearer ${at}` },
    data: { meal: "breakfast" }, // missing source / sourceId
  });
  expect(res.status()).toBe(400);
});

// ── API: nutrition goal ───────────────────────────────────────────────────────

test("API: get nutrition goal", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/food/goal`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect([200]).toContain(res.status());
  // may be null (no goal set yet) or an object
});

test("API: set nutrition goal", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  // Fields: dailyCalories, proteinGrams, carbGrams, fatGrams, fiberGrams
  const res = await page.request.put(`${API}/food/goal`, {
    headers: { Authorization: `Bearer ${at}` },
    data: { dailyCalories: 2000, proteinGrams: 150, carbGrams: 200, fatGrams: 70 },
  });
  expect([200, 201]).toContain(res.status());
  const body = await res.json();
  expect(body.dailyCalories).toBe(2000);
});

// ── API: favorites ────────────────────────────────────────────────────────────

test("API: list food favorites", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/food/favorites`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  expect(Array.isArray(await res.json())).toBe(true);
});

// ── auth guards ───────────────────────────────────────────────────────────────

test("API: food endpoints require auth", async ({ request }) => {
  for (const path of ["/food/log", "/food/search?q=chicken", "/food/favorites"]) {
    const res = await request.get(`${API}${path}`);
    expect(res.status()).toBe(401);
  }
});
