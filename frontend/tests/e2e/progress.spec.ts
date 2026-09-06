/**
 * Progress, metrics, records, body map API.
 */
import { test, expect } from "@playwright/test";
import { loginViaAPI, API } from "./helpers";

test.beforeEach(async ({ page }) => {
  await loginViaAPI(page);
});

// ── UI ────────────────────────────────────────────────────────────────────────

test("progress page loads without errors", async ({ page }) => {
  await page.goto("/progress");
  await expect(page.locator("main")).toBeVisible();
});

test("body map page loads without errors", async ({ page }) => {
  await page.goto("/body");
  await expect(page.locator("main")).toBeVisible();
});

test("records page loads without errors", async ({ page }) => {
  await page.goto("/records");
  await expect(page.locator("main")).toBeVisible();
});

// ── API: progress metrics ─────────────────────────────────────────────────────

test("API: progress overview returns data", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/progress/overview`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toBeTruthy();
});

test("API: progress readiness returns data", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/progress/readiness`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
});

test("API: progress metrics returns array", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/progress/metrics`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  expect(Array.isArray(await res.json())).toBe(true);
});

test("API: personal records returns array", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/progress/personal-records`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  expect(Array.isArray(await res.json())).toBe(true);
});

test("API: consistency report returns data", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/progress/consistency`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
});

test("API: body muscle map returns data", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/body/muscle-map`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toBeTruthy();
});

test("API: body balance returns data", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/body/balance`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
});

test("API: progress add bodyweight metric and verify", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const headers = { Authorization: `Bearer ${at}` };

  // Valid metricType values: bodyweight, measurement, form_score_aggregate,
  // volume_aggregate, readiness, sleep, hrv, resting_hr, steps, protein, calories
  const create = await page.request.post(`${API}/progress/metrics`, {
    headers,
    data: { metricType: "bodyweight", value: 82.0, unit: "kg" },
  });
  expect(create.status()).toBe(201);
  const body = await create.json();
  expect(body.value).toBe(82.0);
});

test("API: progress add metric with invalid type returns 400", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.post(`${API}/progress/metrics`, {
    headers: { Authorization: `Bearer ${at}` },
    data: { metricType: "invalid_type_xyz", value: 50, unit: "kg" },
  });
  expect(res.status()).toBe(400);
});

// ── auth guards ───────────────────────────────────────────────────────────────

test("API: progress endpoints require auth", async ({ request }) => {
  for (const path of ["/progress/overview", "/progress/metrics", "/body/muscle-map"]) {
    const res = await request.get(`${API}${path}`);
    expect(res.status()).toBe(401);
  }
});
