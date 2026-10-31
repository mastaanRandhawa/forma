/**
 * Custom workout builder: create from scratch, add / replace / reorder /
 * duplicate / remove exercises, validation, unsaved-changes protection, and
 * persistence of saved workouts.
 */
import { test, expect, type Page } from "@playwright/test";
import { loginViaAPI, API } from "./helpers";

const stamp = () => Date.now().toString(36);

async function token(page: Page) {
  return page.evaluate(() => localStorage.getItem("forma.access"));
}

async function deleteTemplatesNamed(page: Page, pattern: RegExp) {
  const headers = { Authorization: `Bearer ${await token(page)}` };
  const list = (await (await page.request.get(`${API}/workouts?template=true`, { headers })).json()) as {
    id: string;
    name: string;
  }[];
  for (const w of list.filter((x) => pattern.test(x.name))) await page.request.delete(`${API}/workouts/${w.id}`, { headers });
}

/** Open the builder the way a user does (in-app navigation, so the leave guard applies). */
async function openBuilder(page: Page) {
  await page.goto("/workouts");
  await page.getByRole("button", { name: "create workout" }).first().click();
  await expect(page).toHaveURL(/\/workouts\/builder$/);
  await expect(page.getByLabel("workout name")).toBeVisible();
}

async function addExercise(page: Page, search: string, name: string) {
  await page.getByRole("button", { name: /add exercise/ }).first().click();
  const picker = page.getByRole("dialog", { name: "add exercise" });
  await picker.getByRole("searchbox", { name: "search exercises" }).fill(search);
  await picker.getByRole("button", { name: `add ${name}`, exact: true }).click();
  await expect(page.getByRole("list", { name: "exercises" }).getByRole("button", { name: new RegExp(`^(edit|close) ${name}:`) })).toBeVisible();
}

const rows = (page: Page) =>
  page.getByRole("list", { name: "exercises" }).getByRole("button", { name: /^(edit|close) / });

test.beforeEach(async ({ page }) => {
  await loginViaAPI(page);
});

test("create from scratch: validation, smart defaults, reorder, edit, save, persists", async ({ page }) => {
  const name = `QA scratch ${stamp()}`;
  await openBuilder(page);

  // empty save explains what's missing
  await page.getByRole("button", { name: "save workout" }).click();
  await expect(page.getByText("give your workout a name")).toBeVisible();
  await expect(page.getByText("add at least one exercise")).toBeVisible();
  await expect(page.getByLabel("workout name")).toBeFocused();

  await page.getByLabel("workout name").fill(name);
  await addExercise(page, "back squat", "Barbell Back Squat");
  await addExercise(page, "lateral raise", "Dumbbell Lateral Raise");
  await addExercise(page, "romanian", "Romanian Deadlift");

  // defaults by movement type
  await expect(rows(page).nth(0)).toHaveAccessibleName(/Barbell Back Squat: 3 × 6–10, 120 seconds rest/);
  await expect(rows(page).nth(1)).toHaveAccessibleName(/Dumbbell Lateral Raise: 3 × 10–15, 60 seconds rest/);

  // reorder: Romanian Deadlift up one place
  await page.getByRole("button", { name: "move Romanian Deadlift up" }).click();
  await expect(rows(page).nth(1)).toHaveAccessibleName(/Romanian Deadlift/);

  // edit: 4 sets of lateral raises
  await page.getByRole("button", { name: /^edit Dumbbell Lateral Raise/ }).click();
  await page.getByRole("button", { name: "increase sets" }).click();
  await expect(page.getByRole("button", { name: /^close Dumbbell Lateral Raise: 4 × 10–15/ })).toBeVisible();

  // invalid range is caught inline
  await page.getByRole("textbox", { name: "reps from" }).fill("20");
  await page.getByRole("button", { name: "save workout" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "the lower reps can't be more than the upper" })).toBeVisible();
  await page.getByRole("textbox", { name: "reps from" }).fill("10");

  await page.getByRole("button", { name: "save workout" }).click();
  await expect(page).toHaveURL(/\/workouts$/, { timeout: 30_000 });
  await expect(page.getByRole("status").filter({ hasText: `saved “${name}”` })).toBeVisible();
  await expect(page.getByRole("article", { name })).toBeVisible();

  // persisted server-side, in order, with the edits
  await page.reload();
  await page.getByRole("tab", { name: "Templates" }).click();
  await page.getByRole("button", { name: `view details: ${name}` }).click();
  const details = page.getByRole("dialog", { name });
  const items = details.getByRole("list", { name: "exercises" }).getByRole("listitem");
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText(/squat/i);
  await expect(items.nth(1)).toContainText(/romanian deadlift/i);
  await expect(items.nth(2)).toContainText("4 × 10–15");

  await deleteTemplatesNamed(page, new RegExp(`^${name}$`));
});

test("replace with a suggested swap, duplicate, remove with undo, then discard", async ({ page }) => {
  await page.goto("/workouts");
  await page.getByRole("tab", { name: "Templates" }).click();
  await page.getByRole("button", { name: "customize: Gym Fundamentals A" }).click();
  await expect(page.getByLabel("workout name")).toHaveValue("Gym Fundamentals A (my copy)");

  // replace Leg Press with its listed alternative; sets / reps are kept
  await page.getByRole("button", { name: /^edit Leg Press/ }).click();
  await page.getByRole("button", { name: "replace" }).click();
  const picker = page.getByRole("dialog", { name: "replace exercise" });
  await expect(picker.getByText("suggested swaps")).toBeVisible();
  await picker.getByRole("button", { name: "swap to Goblet Squat" }).first().click();
  await expect(rows(page).nth(0)).toHaveAccessibleName(/Goblet Squat: 3 × 10–12/);

  // duplicate, then remove with undo
  const before = await rows(page).count();
  await page.getByRole("button", { name: "duplicate" }).click();
  await expect(rows(page)).toHaveCount(before + 1);
  await page.getByRole("button", { name: "remove" }).click();
  await expect(rows(page)).toHaveCount(before);
  await expect(page.getByRole("status").filter({ hasText: "removed goblet squat" })).toBeVisible();
  await page.getByRole("button", { name: "undo" }).click();
  await expect(rows(page)).toHaveCount(before + 1);

  // discard asks first
  await page.getByRole("button", { name: "discard changes" }).click();
  await page.getByRole("dialog", { name: "discard changes?" }).getByRole("button", { name: "discard" }).click();
  await expect(page).toHaveURL(/\/workouts$/);
});

test("leaving with unsaved changes asks first; discarding clears the draft", async ({ page }) => {
  await openBuilder(page);
  await addExercise(page, "plank", "Plank");

  await page.getByRole("link", { name: /home/i }).first().click();
  const guard = page.getByRole("dialog", { name: "leave without saving?" });
  await expect(guard).toBeVisible();
  await guard.getByRole("button", { name: "keep editing" }).click();
  await expect(page).toHaveURL(/\/workouts\/builder/);

  // leaving but keeping the draft restores it next time
  await page.getByRole("link", { name: /home/i }).first().click();
  await page.getByRole("dialog", { name: "leave without saving?" }).getByRole("button", { name: "leave — keep the draft" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/workouts");
  await page.getByRole("button", { name: "create workout" }).first().click();
  await expect(page.getByText("we restored your unsaved changes from earlier.")).toBeVisible();
  await expect(rows(page)).toHaveCount(1);

  // leaving and discarding does not
  await page.getByRole("link", { name: /home/i }).first().click();
  await page.getByRole("dialog", { name: "leave without saving?" }).getByRole("button", { name: "leave and discard changes" }).click();
  await page.goto("/workouts");
  await page.getByRole("button", { name: "create workout" }).first().click();
  await expect(page.getByText("no exercises yet")).toBeVisible();
});

test("edit and delete a saved workout", async ({ page }) => {
  const name = `QA edit ${stamp()}`;
  await openBuilder(page);
  await page.getByLabel("workout name").fill(name);
  await addExercise(page, "goblet", "Goblet Squat");
  await page.getByRole("button", { name: "save workout" }).click();
  await expect(page).toHaveURL(/\/workouts$/, { timeout: 30_000 });

  // edit: rename and add an exercise
  await page.getByRole("button", { name: `edit: ${name}` }).click();
  await expect(page.getByRole("heading", { name: "edit workout" })).toBeVisible();
  await page.getByLabel("workout name").fill(`${name} v2`);
  await addExercise(page, "push-up", "Push-Up");
  await page.getByRole("button", { name: "save changes" }).click();
  await expect(page.getByRole("status").filter({ hasText: `saved “${name} v2”` })).toBeVisible({ timeout: 30_000 });
  const card = page.getByRole("article", { name: `${name} v2` });
  await expect(card).toContainText("2 exercises");

  // delete through the "more" menu, with confirmation
  await page.getByRole("button", { name: `more actions: ${name} v2` }).click();
  await page.getByRole("menuitem", { name: "delete" }).click();
  await page.getByRole("dialog", { name: "delete template?" }).getByRole("button", { name: "delete" }).click();
  await expect(page.getByRole("status").filter({ hasText: `deleted “${name} v2”` })).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Templates" }).click();
  await expect(page.getByRole("article", { name: `${name} v2` })).toHaveCount(0);
});

test("warm-up option adds exactly one warm-up set before the working sets", async ({ page }) => {
  const name = `QA warmup ${stamp()}`;
  await openBuilder(page);
  await page.getByLabel("workout name").fill(name);
  await addExercise(page, "bench press", "Barbell Bench Press");
  await page.getByRole("button", { name: "more options: effort, warm-up, note" }).click();
  await page.getByLabel("add a warm-up set before the working sets").check();
  await page.getByRole("button", { name: "save & start" }).click();
  await expect(page).toHaveURL(/\/workouts\/active/, { timeout: 30_000 });
  const sets = await page.evaluate(() => JSON.parse(localStorage.getItem("forma.data.v1") ?? "{}").active?.exercises?.[0]?.sets ?? []);
  expect(sets.length).toBe(4);
  expect(sets.filter((s: { warmup?: boolean }) => s.warmup).length).toBe(1);
  expect(sets[0].warmup).toBe(true);

  // leave nothing in progress
  await page.getByRole("button", { name: "end workout" }).click();
  await page.getByRole("button", { name: "discard without saving" }).click();
  await deleteTemplatesNamed(page, new RegExp(`^${name}$`));
});

test("@mobile builder fits a phone screen and keeps its footer clear", async ({ page }) => {
  await page.goto("/workouts/builder?from=push-hypertrophy");
  await page.getByRole("button", { name: /^edit Barbell Bench Press/ }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.getByRole("button", { name: "cancel" })).toBeVisible();
  const width = page.viewportSize()!.width;
  for (const label of ["sets", "reps from", "reps to", "rest (sec)"]) {
    const box = await page.getByRole("textbox", { name: label }).boundingBox();
    expect(box, label).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  }
});
