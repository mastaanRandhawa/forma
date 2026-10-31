/**
 * Data export: the CSV export reaches the user's own sets (it was once shadowed
 * by the JSON export route), and the Account button downloads it.
 */
import { test, expect } from "@playwright/test";
import { loginViaAPI, API } from "./helpers";

test.beforeEach(async ({ page }) => {
  await loginViaAPI(page);
});

test("API: GET /me/export.csv includes a logged set, quoted safely", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const headers = { Authorization: `Bearer ${at}` };
  const name = `CSV "export" check ${Date.now()}`;

  const lib = await page.request.get(`${API}/library/exercises?take=1`, { headers });
  const exerciseId: string = (await lib.json()).items[0].id;

  const start = await page.request.post(`${API}/sessions`, { headers, data: { name } });
  expect(start.status()).toBe(201);
  const sessionId: string = (await start.json()).id;

  const perf = await page.request.post(`${API}/sessions/${sessionId}/performances`, {
    headers,
    data: { exerciseId, order: 0 },
  });
  const perfId: string = (await perf.json()).id;
  const set = await page.request.put(`${API}/sessions/${sessionId}/performances/${perfId}/sets/1`, {
    headers,
    data: { weightKg: 60, reps: 5, completed: true },
  });
  expect(set.ok()).toBe(true);

  // abandoned sessions are still exported, and this keeps the demo user's history clean
  await page.request.post(`${API}/sessions/${sessionId}/abandon`, { headers });

  const res = await page.request.get(`${API}/me/export.csv`, { headers });
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  const csv = await res.text();
  expect(csv).toContain("## workouts");
  expect(csv).toContain("## nutrition");
  const row = csv.split("\n").find((line) => line.includes("check " + name.split(" ").pop()));
  expect(row).toBeDefined();
  expect(row).toContain(`"CSV ""export"" check`);
  expect(row).toMatch(/,1,60,5,,0,70$/);
});

test("API: GET /me/export still returns the JSON export", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/me/export`, { headers: { Authorization: `Bearer ${at}` } });
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/json");
  expect(Array.isArray((await res.json()).sessions)).toBe(true);
});

test("API: /me/export.csv requires auth", async ({ request }) => {
  const res = await request.get(`${API}/me/export.csv`);
  expect(res.status()).toBe(401);
});

test("account page downloads the CSV export", async ({ page }) => {
  await page.goto("/settings/account");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /export data \(csv\)/i }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^forma-export-\d{4}-\d{2}-\d{2}\.csv$/);
  await expect(page.getByText(/export failed/i)).toHaveCount(0);
});
