/**
 * Workout template library: browse, search, filter, inspect plans and
 * workouts, save copies without touching the originals.
 */
import { test, expect, type Page } from "@playwright/test";
import { loginViaAPI, API } from "./helpers";

async function openTemplates(page: Page) {
  await page.goto("/workouts");
  await page.getByRole("tab", { name: "Templates" }).click();
  await expect(page.getByRole("searchbox", { name: "search workouts and plans" })).toBeVisible();
}

const count = (page: Page) => page.locator("p[aria-live=polite]").filter({ hasText: /plans? ·/ });

async function deleteTemplatesNamed(page: Page, pattern: RegExp) {
  const at = await page.evaluate(() => localStorage.getItem("forma.access"));
  const headers = { Authorization: `Bearer ${at}` };
  const list = (await (await page.request.get(`${API}/workouts?template=true`, { headers })).json()) as {
    id: string;
    name: string;
  }[];
  for (const w of list.filter((x) => pattern.test(x.name))) await page.request.delete(`${API}/workouts/${w.id}`, { headers });
}

test.beforeEach(async ({ page }) => {
  await loginViaAPI(page);
});

test("library lists plans and single workouts with a live count", async ({ page }) => {
  await openTemplates(page);
  await expect(count(page)).toHaveText(/13 plans · 5\d workouts/);
  await expect(page.getByRole("heading", { name: "training plans" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "single workouts" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Push / Pull / Legs — 6 days" })).toBeVisible();
});

test("search narrows by exercise name and clears", async ({ page }) => {
  await openTemplates(page);
  await page.getByRole("searchbox", { name: "search workouts and plans" }).fill("pigeon stretch");
  await expect(page.getByRole("article", { name: "Mobility & Recovery Flow" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Push Day", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "clear search" }).click();
  await expect(page.getByRole("article", { name: "Push Day", exact: true })).toBeVisible();
});

test("goal, equipment and days filters combine; empty result offers a way out", async ({ page }) => {
  await openTemplates(page);
  await page.getByRole("group", { name: "goal" }).getByRole("button", { name: "mobility & recovery" }).click();
  await expect(page.getByRole("article", { name: "Mobility & Recovery Flow" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Push Day", exact: true })).toHaveCount(0);

  await page.getByRole("group", { name: "goal" }).getByRole("button", { name: "all goals" }).click();
  await page.getByLabel("equipment", { exact: true }).selectOption("none");
  await expect(page.getByRole("article", { name: "Express 20 — No Equipment" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Barbell", exact: true })).toHaveCount(0);

  // days / week narrows plans; single workouts step aside with a hint
  await page.getByLabel("equipment", { exact: true }).selectOption("any");
  await page.getByLabel("days / week", { exact: true }).selectOption("6");
  await expect(page.getByRole("article", { name: "Push / Pull / Legs — 6 days" })).toBeVisible();
  await expect(page.getByText("clear “days / week” to see single workouts.")).toBeVisible();

  await page.getByRole("searchbox", { name: "search workouts and plans" }).fill("zzzz-no-match");
  await expect(page.getByText("nothing matches")).toBeVisible();
  await page.getByRole("button", { name: "clear filters" }).first().click();
  await expect(count(page)).toHaveText(/13 plans/);
});

test("plan details show schedule, progression and every day", async ({ page }) => {
  await openTemplates(page);
  await page.getByRole("button", { name: "view plan: Upper / Lower — 4 days" }).click();
  const dialog = page.getByRole("dialog", { name: "Upper / Lower — 4 days" });
  await expect(dialog.getByText("Mon · Tue · Thu · Fri")).toBeVisible();
  await expect(dialog.getByText(/When every set reaches the top of the range/)).toBeVisible();
  await expect(dialog.getByRole("list", { name: "plan days" }).getByRole("listitem")).toHaveCount(4);

  await dialog.getByRole("button", { name: "details: Upper B" }).click();
  const day = page.getByRole("dialog", { name: "Upper Body B" });
  await expect(day.getByRole("heading", { name: "Upper Body B" })).toBeVisible();
  await expect(day.getByText("muscle building")).toBeVisible();
  await expect(day.getByText(/swap: lat pulldown/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Upper / Lower — 4 days" }).getByRole("list", { name: "plan days" })).toBeVisible();
});

test("template details show targets, rest, timed and per-side work", async ({ page }) => {
  await openTemplates(page);
  await page.getByRole("button", { name: "view details: Mobility & Recovery Flow" }).click();
  const dialog = page.getByRole("dialog", { name: "Mobility & Recovery Flow" });
  await expect(dialog.getByText("2 × 30–45 s / side").first()).toBeVisible();
  await expect(dialog.getByText("daily, or on rest days")).toBeVisible();
  await expect(dialog.getByText("the original stays unchanged — you edit your own copy.")).toBeVisible();
});

test("save a copy creates my own workout and leaves the original intact", async ({ page }) => {
  await deleteTemplatesNamed(page, /^Leg Day B \(my copy\)/);
  await openTemplates(page);
  await page.getByRole("button", { name: "save a copy: Leg Day B" }).click();
  await expect(page.getByRole("status").filter({ hasText: "saved “Leg Day B (my copy)” to my workouts" })).toBeVisible();
  const mine = page.getByRole("article", { name: "Leg Day B (my copy)" });
  await expect(mine).toBeVisible();
  // the system template is still there, unchanged
  await expect(page.getByRole("article", { name: "Leg Day B", exact: true })).toBeVisible();
  // it survives a reload (server-side)
  await page.reload();
  await page.getByRole("tab", { name: "Templates" }).click();
  await expect(page.getByRole("article", { name: "Leg Day B (my copy)" })).toBeVisible();
  await deleteTemplatesNamed(page, /^Leg Day B \(my copy\)/);
});

test("customize opens the builder on a copy", async ({ page }) => {
  await openTemplates(page);
  await page.getByRole("button", { name: "customize: Calisthenics A — Push & Legs" }).click();
  await expect(page).toHaveURL(/\/workouts\/builder\?from=calisthenics-a/);
  await expect(page.getByLabel("workout name")).toHaveValue("Calisthenics A — Push & Legs (my copy)");
  await expect(page.getByRole("list", { name: "exercises" }).getByRole("button", { name: /^edit Hollow Body Hold: 3 × 20–30 s/ })).toBeVisible();
});

test("save all days of a plan to my workouts", async ({ page }) => {
  await deleteTemplatesNamed(page, /^Gym Fundamentals · /);
  await openTemplates(page);
  await page.getByRole("button", { name: "view plan: Gym Fundamentals — 2 to 3 days" }).click();
  await page.getByRole("button", { name: "save all 2 days to my workouts" }).click();
  await expect(page.getByRole("status").filter({ hasText: /saved 2 workouts/ })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("article", { name: "Gym Fundamentals · Fundamentals A" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Gym Fundamentals · Fundamentals B" })).toBeVisible();
  await deleteTemplatesNamed(page, /^Gym Fundamentals · /);
});

test.describe("exercise thumbnails", () => {
  test.describe("with motion allowed", () => {
    test.use({ reducedMotion: "no-preference" });
    test("hovering a workout card plays the movement (start ↔ peak frames)", async ({ page }) => {
      await openTemplates(page);
      const card = page.getByRole("button", { name: "view details: Leg Day B" });
      await expect(card.locator("img").first()).toBeVisible();
      await card.hover();
      const peak = card.locator('img[src$="-peak.webp"]').first();
      await expect(peak).toBeAttached();
      await expect.poll(async () => peak.evaluate((el) => (el as HTMLElement).style.opacity), { timeout: 4000 }).toBe("1");
    });
  });
  test.describe("with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });
    test("thumbnails stay on the still start frame", async ({ page }) => {
      await openTemplates(page);
      const card = page.getByRole("button", { name: "view details: Leg Day B" });
      await card.hover();
      await page.waitForTimeout(1200);
      await expect(card.locator('img[src$="-peak.webp"]')).toHaveCount(0);
    });
  });
});
