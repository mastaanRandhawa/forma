/**
 * Exercise images in the no-backend build. Image requests are stubbed, so these
 * pass whether or not `npm run images:sync` has run on this machine.
 *
 * `npm run test:e2e:stack` serves the offline build itself. To run this against
 * your own, start `npm run dev:offline -- --port 5179` and set E2E_OFFLINE_PORT.
 */
import { test, expect, type Page } from "@playwright/test";
import { OFFLINE_BASE } from "./helpers";

test.use({ baseURL: OFFLINE_BASE });

const OURS = "**/exercise-img/**";
const REPDB = "https://exercise-dataset.com/**";
// a 1×1 transparent PNG: the browser only needs something it can decode
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

async function seed(page: Page, exercises: string[] = []) {
  await page.goto("/login");
  await page.evaluate((names) => {
    localStorage.clear();
    const now = Date.now();
    localStorage.setItem(
      "forma.data.v1",
      JSON.stringify({
        profile: {
          name: "Sam",
          goal: "strength",
          experience: "intermediate",
          daysPerWeek: 3,
          sessionMin: 45,
          units: "lb",
          environment: "gym",
          equipment: [],
          injuries: "",
          preferredDays: [],
          bodyweight: 180,
          onboardedAt: new Date(now - 30 * 86_400_000).toISOString(),
        },
        active: names.length
          ? {
              id: "active-1",
              name: "Test Workout",
              startedAt: new Date(now - 60_000).toISOString(),
              cursor: 0,
              order: names.map((_, i) => i),
              restEndsAt: null,
              paused: false,
              pausedAt: null,
              pausedMs: 0,
              exercises: names.map((name) => ({
                name,
                target: "3 × 8",
                skipped: false,
                sets: [{ weight: 100, reps: 8, rpe: null, done: false }],
                deferred: false,
                deferReason: null,
                substitutedFrom: null,
                supersetGroup: null,
                prescription: null,
              })),
            }
          : null,
        sessions: [],
        localTemplates: [],
        checkins: [],
        quickLogs: [],
        meals: [],
        nutritionTargets: null,
      }),
    );
  }, exercises);
}

const servePixel = (page: Page, url: string) =>
  page.route(url, (route) => route.fulfill({ status: 200, contentType: "image/png", body: PIXEL }));

test("the library serves thumbs from our own files", async ({ page }) => {
  const remote: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("exercise-dataset.com")) remote.push(r.url());
  });
  await servePixel(page, OURS);
  await seed(page);
  await page.goto("/exercise-library");

  const thumb = page.getByRole("img", { name: "Ab Wheel Rollout", exact: true });
  await expect(thumb).toHaveAttribute("src", /\/exercise-img\/thumb\/ab-wheel-rollout-start\.webp$/);
  await expect(thumb).toHaveCSS("opacity", "1");
  await expect(thumb).toHaveCSS("object-fit", "contain");
  expect(remote).toEqual([]);
});

test("the exercise drawer uses the large images", async ({ page }) => {
  await servePixel(page, OURS);
  await seed(page);
  await page.goto("/exercise-library");
  await page.getByPlaceholder(/search by name/).fill("ab wheel rollout");
  await page.getByRole("button", { name: /ab wheel rollout/i }).first().click();

  await expect(page.getByRole("img", { name: /start position/ })).toHaveAttribute("src", /\/exercise-img\/full\//);
  await expect(page.getByRole("img", { name: /peak position/ })).toHaveAttribute("src", /\/exercise-img\/full\//);
});

test("a missing file falls back to RepDB's original", async ({ page }) => {
  await page.route(OURS, (route) => route.fulfill({ status: 404, body: "" }));
  await servePixel(page, REPDB);
  await seed(page);
  await page.goto("/exercise-library");

  const thumb = page.getByRole("img", { name: "Ab Wheel Rollout", exact: true });
  await expect(thumb).toHaveAttribute("src", /exercise-dataset\.com\/images\/flat\/ab-wheel-rollout-start\.webp$/);
  await expect(thumb).toHaveCSS("opacity", "1");
});

test("with no image anywhere, the row shows a dumbbell", async ({ page }) => {
  await page.route(OURS, (route) => route.abort());
  await page.route(REPDB, (route) => route.abort());
  await seed(page);
  await page.goto("/exercise-library");

  const row = page.getByRole("button", { name: /ab wheel rollout/i }).first();
  await expect(row.locator("svg.lucide-dumbbell")).toBeVisible();
  await expect(row.locator("img")).toHaveCount(0);
});

test("the workout screen shows the whole figure and fades between its frames", async ({ page }) => {
  await servePixel(page, OURS);
  await seed(page, ["Barbell Bench Press", "Lateral Raise"]);
  await page.goto("/workouts/active");

  const stage = page.locator(".exercise-stage").first();
  const start = stage.getByRole("img", { name: "Barbell Bench Press", exact: true });
  await expect(start).toHaveAttribute("src", /\/exercise-img\/full\/bench-press-start\.webp$/);
  await expect(start).toHaveCSS("object-fit", "contain");

  // the frames are transparent: while the peak shows, the start must be gone
  const peak = stage.locator('img[src$="bench-press-peak.webp"]');
  await expect(peak).toHaveCSS("opacity", "1", { timeout: 4_000 });
  await expect(start).toHaveCSS("opacity", "0");
  await expect(start).toHaveCSS("opacity", "1", { timeout: 4_000 });
  await expect(peak).toHaveCSS("opacity", "0");
});

test("moving to the next exercise swaps the picture", async ({ page }) => {
  await servePixel(page, OURS);
  await seed(page, ["Barbell Bench Press", "Lateral Raise"]);
  await page.goto("/workouts/active");
  await expect(page.locator(".exercise-stage img").first()).toHaveAttribute("src", /bench-press-start/);

  await page.getByRole("button", { name: /^complete set 1$/ }).click();
  await page.getByRole("button", { name: "ready" }).click();

  await expect(page.getByRole("heading", { name: "lateral raise" })).toBeVisible();
  await expect(page.locator(".exercise-stage img").first()).toHaveAttribute("src", /lateral-raise/);
});

test("reduced motion gets the still start frame", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await servePixel(page, OURS);
  await seed(page, ["Barbell Bench Press"]);
  await page.goto("/workouts/active");

  const start = page.getByRole("img", { name: "Barbell Bench Press", exact: true });
  await expect(start).toHaveCSS("opacity", "1");
  await page.waitForTimeout(1_200);
  await expect(page.locator('.exercise-stage img[src$="bench-press-peak.webp"]')).toHaveCount(0);
  await expect(start).toHaveCSS("opacity", "1");
});
