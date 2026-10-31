/**
 * Workout session end to end: start from a template, log a set, finish and
 * save, then find it in history (server-side).
 */
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginViaAPI, API } from "./helpers";

test.beforeEach(async ({ page }) => {
  await loginViaAPI(page);
});

test("start a template, log a set, finish, and review it in history", async ({ page }) => {
  await page.goto("/workouts");
  await page.getByRole("tab", { name: "Templates" }).click();
  await page.getByRole("button", { name: "start Gym Fundamentals A", exact: true }).click();
  await expect(page).toHaveURL(/\/workouts\/active/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /gym fundamentals a/i }).first()).toBeVisible();

  await page.getByRole("button", { name: /^complete set 1$/ }).click();

  await page.getByRole("button", { name: "end workout" }).click();
  await page.getByRole("button", { name: "finish & save workout" }).click();
  await expect(page.getByText("workout complete", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  // the payoff: this week, what was worked, and a way to share it
  await expect(page.getByRole("region", { name: "this week" }).last()).toContainText(/this week/);
  await expect(page.getByText("muscles worked")).toBeVisible();
  await expect(page.getByRole("button", { name: "share this workout" })).toBeVisible();
  // the summary is a dialog-like overlay; it must not add hidden tab stops or other serious issues
  await page.waitForTimeout(600);
  const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).disableRules(["color-contrast"]).analyze();
  expect(scan.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);

  // saved on the server as a completed session
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const sessions = (await (
    await page.request.get(`${API}/sessions?status=completed&take=5`, { headers: { Authorization: `Bearer ${at}` } })
  ).json()) as { name: string; status: string }[];
  expect(sessions.some((s) => s.name === "Gym Fundamentals A" && s.status === "completed")).toBe(true);

  await page.getByRole("button", { name: "done", exact: true }).click();
  await expect(page).toHaveURL(/\/workouts$/);
  await page.getByRole("tab", { name: "History" }).click();
  await expect(page.getByRole("button", { name: /gym fundamentals a/i }).first()).toBeVisible();
});

test("starting a workout while one is open asks before replacing it", async ({ page }) => {
  await page.goto("/workouts");
  await page.getByRole("tab", { name: "Templates" }).click();
  await page.getByRole("button", { name: "start Express 20 — No Equipment", exact: true }).click();
  await expect(page).toHaveURL(/\/workouts\/active/, { timeout: 30_000 });

  await page.goto("/workouts");
  await page.getByRole("tab", { name: "Templates" }).click();
  await page.getByRole("button", { name: "start Gym Fundamentals B", exact: true }).click();
  const ask = page.getByRole("dialog", { name: "a workout is already in progress" });
  await expect(ask).toContainText("“Express 20 — No Equipment” is still open");
  await expect(page).toHaveURL(/\/workouts$/);

  await ask.getByRole("button", { name: "discard it and start the new one" }).click();
  await expect(page).toHaveURL(/\/workouts\/active/, { timeout: 30_000 });
  const active = await page.evaluate(() => JSON.parse(localStorage.getItem("forma.data.v1") ?? "{}").active?.name);
  expect(active).toBe("Gym Fundamentals B");

  await page.getByRole("button", { name: "end workout" }).click();
  await page.getByRole("button", { name: "discard without saving" }).click();
});
