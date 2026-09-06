/**
 * Exercise library: search, filter, detail, muscle groups.
 */
import { test, expect } from "@playwright/test";
import { loginViaAPI, API } from "./helpers";

test.beforeEach(async ({ page }) => {
  await loginViaAPI(page);
});

// ── UI ────────────────────────────────────────────────────────────────────────

test("exercise library page renders", async ({ page }) => {
  await page.goto("/exercise-library");
  await expect(page.locator("main")).toBeVisible();
});

test("exercise library shows at least one exercise", async ({ page }) => {
  await page.goto("/exercise-library");
  // wait for data to load
  await expect(
    page.locator("li, [class*='exercise'], [class*='card']").first(),
  ).toBeVisible({ timeout: 12_000 });
});

// ── API ───────────────────────────────────────────────────────────────────────

test("API: exercises list returns items and total", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/library/exercises`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body.items)).toBe(true);
  expect(body.items.length).toBeGreaterThan(0);
  expect(typeof body.total).toBe("number");
});

test("API: exercises search by query 'bench press'", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/library/exercises?q=bench+press`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.items.length).toBeGreaterThan(0);
  const names: string[] = body.items.map((e: { name: string }) => e.name.toLowerCase());
  expect(names.some((n) => n.includes("bench"))).toBe(true);
});

test("API: exercises filter by muscle group 'chest'", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/library/exercises?muscle=chest`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.items.length).toBeGreaterThan(0);
});

test("API: exercise detail by valid slug", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const headers = { Authorization: `Bearer ${at}` };
  // get first exercise slug
  const list = await page.request.get(`${API}/library/exercises?take=1`, { headers });
  const { items } = await list.json();
  const slug: string = items[0].slug;

  const detail = await page.request.get(`${API}/library/exercises/${slug}`, { headers });
  expect(detail.status()).toBe(200);
  const ex = await detail.json();
  expect(ex.slug).toBe(slug);
  expect(ex.name).toBeTruthy();
});

test("API: exercise detail with invalid slug returns 404", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/library/exercises/this-slug-does-not-exist`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(404);
});

test("API: muscle groups list is non-empty", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/library/muscle-groups`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);
  expect(body.length).toBeGreaterThan(0);
});

test("API: library requires auth", async ({ request }) => {
  const res = await request.get(`${API}/library/exercises`);
  expect(res.status()).toBe(401);
});

test("API: pagination with take and skip", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const headers = { Authorization: `Bearer ${at}` };
  const page1 = await (await page.request.get(`${API}/library/exercises?take=5&skip=0`, { headers })).json();
  const page2 = await (await page.request.get(`${API}/library/exercises?take=5&skip=5`, { headers })).json();
  expect(page1.items.length).toBe(5);
  // the two pages should have different exercises
  const ids1 = page1.items.map((e: { slug: string }) => e.slug);
  const ids2 = page2.items.map((e: { slug: string }) => e.slug);
  const overlap = ids1.filter((id: string) => ids2.includes(id));
  expect(overlap.length).toBe(0);
});
