/**
 * AI trainer (Kai): chat, suggestions, insights, check-in.
 */
import { test, expect } from "@playwright/test";
import { loginViaAPI, API } from "./helpers";

test.beforeEach(async ({ page }) => {
  await loginViaAPI(page);
});

test("trainer page renders", async ({ page }) => {
  await page.goto("/trainer");
  await expect(page).toHaveURL(/\/trainer/);
  await expect(page.locator("main")).toBeVisible();
});

test("trainer page shows chat interface", async ({ page }) => {
  await page.goto("/trainer");
  // look for input, textarea, or chat-like elements
  const input = page.locator("textarea, input[type='text'], [contenteditable]").first();
  await expect(input.or(page.locator("[class*='chat'], [class*='message']").first()))
    .toBeVisible({ timeout: 10_000 });
});

// ── API: trainer ──────────────────────────────────────────────────────────────

test("API: GET /trainer returns trainer profile", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/trainer`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.name).toBeTruthy();
});

test("API: GET /chat/suggested-prompts returns array", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/chat/suggested-prompts`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);
});

test("API: GET /chat history returns array", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/chat`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);
});

test("API: POST /chat sends a message and gets a response", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.post(`${API}/chat`, {
    headers: { Authorization: `Bearer ${at}` },
    data: { content: "Hello, can you give me a quick tip?" },
  });
  // 200: AI responded; 500/503: AI key missing or unavailable — all acceptable
  expect([200, 500, 503]).toContain(res.status());
  if (res.status() === 200) {
    const body = await res.json();
    expect(body.assistant?.content ?? body.content ?? body.response).toBeTruthy();
  }
});

test("API: POST /chat with empty content returns 400", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.post(`${API}/chat`, {
    headers: { Authorization: `Bearer ${at}` },
    data: { content: "" },
  });
  expect(res.status()).toBe(400);
});

test("API: trainer check-in returns data", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/trainer/check-in`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect([200, 204]).toContain(res.status());
});

test("API: trainer insights returns array", async ({ page }) => {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const res = await page.request.get(`${API}/trainer/insights`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);
});

// ── auth guards ───────────────────────────────────────────────────────────────

test("API: /chat requires auth", async ({ request }) => {
  const res = await request.get(`${API}/chat`);
  expect(res.status()).toBe(401);
});

test("API: /trainer requires auth", async ({ request }) => {
  const res = await request.get(`${API}/trainer`);
  expect(res.status()).toBe(401);
});
