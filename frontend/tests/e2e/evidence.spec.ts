/**
 * QA evidence capture — runs only when E2E_EVIDENCE_DIR is set. Saves
 * screenshots of key screens and an app-wide axe scan (report-only: findings
 * are recorded, not asserted) for the QA report.
 */
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loginViaAPI } from "./helpers";

const DIR = process.env.E2E_EVIDENCE_DIR;
test.skip(!DIR, "set E2E_EVIDENCE_DIR to capture QA evidence");

const shot = async (page: Page, name: string) => {
  await page.waitForTimeout(700); // entrance animations
  await page.screenshot({ path: path.join(DIR!, `${name}.png`) });
};

test.beforeEach(async ({ page }) => {
  mkdirSync(DIR!, { recursive: true });
  await loginViaAPI(page);
});

test("evidence: workout screens", async ({ page }, info) => {
  const tag = info.project.name === "mobile" ? "mobile" : "desktop";
  await page.goto("/workouts");
  await shot(page, `${tag}-01-workouts-today`);
  await page.getByRole("tab", { name: "Templates" }).click();
  await expect(page.getByRole("heading", { name: "training plans" })).toBeVisible();
  await shot(page, `${tag}-02-template-library`);
  await page.getByRole("heading", { name: "training plans" }).scrollIntoViewIfNeeded();
  await shot(page, `${tag}-03-training-plans`);
  await page.getByRole("button", { name: "view plan: Push / Pull / Legs — 6 days" }).click();
  await shot(page, `${tag}-04-plan-details`);
  await page.getByRole("button", { name: "details: Push B" }).click();
  await shot(page, `${tag}-05-template-details`);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  await page.goto("/workouts/builder?from=upper-b");
  await page.getByRole("button", { name: /^edit Incline Dumbbell Press/ }).click();
  await shot(page, `${tag}-06-builder-editing`);
  await page.goto("/workouts");
  await page.getByRole("button", { name: "create workout" }).first().click();
  await page.getByRole("button", { name: "save workout" }).click();
  await shot(page, `${tag}-07-builder-validation`);
});

test("evidence: workout finish screen", async ({ page }) => {
  await page.goto("/workouts");
  await page.getByRole("tab", { name: "Templates" }).click();
  await page.getByRole("button", { name: "start Gym Fundamentals A", exact: true }).click();
  await expect(page).toHaveURL(/\/workouts\/active/, { timeout: 30_000 });
  await shot(page, "desktop-08-active-workout");
  await page.getByLabel(/^weight \(/).fill("40");
  await page.getByRole("button", { name: /^complete set 1$/ }).click();
  await shot(page, "desktop-09-rest-next-up");
  await page.getByRole("button", { name: "end workout" }).click();
  await page.getByRole("button", { name: "finish & save workout" }).click();
  await expect(page.getByText("muscles worked")).toBeVisible({ timeout: 30_000 });
  await shot(page, "desktop-10-finish-screen");
});

test("@mobile evidence: phone layouts", async ({ page }) => {
  await page.goto("/workouts");
  await page.getByRole("tab", { name: "Templates" }).click();
  await shot(page, "mobile-08-template-library");
  await page.goto("/workouts/builder?from=push-hypertrophy");
  await page.getByRole("button", { name: /^edit Barbell Bench Press/ }).click();
  await shot(page, "mobile-09-builder-editing");
});

test("evidence: app-wide axe scan (report only)", async ({ page }) => {
  test.setTimeout(240_000); // ten routes, each settled and scanned
  const routes = ["/dashboard", "/workouts", "/trainer", "/progress", "/nutrition", "/exercise-library", "/settings", "/store", "/goals", "/body"];
  const out: Record<string, { id: string; impact: string | null | undefined; nodes: number; help: string }[]> = {};
  for (const r of routes) {
    await page.goto(r);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    out[r] = res.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help }));
  }
  writeFileSync(path.join(DIR!, "axe-app-wide.json"), JSON.stringify(out, null, 2));
});
