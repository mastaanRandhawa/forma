/**
 * The coin economy in the no-backend build. Everything here runs on localStorage,
 * so each test seeds the browser directly instead of creating an account.
 *
 * `npm run test:e2e:stack` serves the offline build itself. To run this against
 * your own, start `npm run dev:offline -- --port 5179` and set E2E_OFFLINE_PORT.
 */
import { test, expect, type Page } from "@playwright/test";
import { OFFLINE_BASE } from "./helpers";
import { dealsFor } from "../../src/lib/economyConfig";
import { customizationItems } from "../../src/lib/data";
import { weekKey } from "../../src/lib/streak";

test.use({ baseURL: OFFLINE_BASE });

const DAY = 86_400_000;

const set = (done = true, weight = 100) => ({ weight, reps: 8, rpe: null, done });
const exercise = (name: string, sets = [set()]) => ({ name, target: "3 × 8", skipped: false, sets });

/** A finished session at midday, `daysAgo` days back. */
function session(daysAgo: number, name = "Barbell Bench Press") {
  const at = new Date(Date.now() - daysAgo * DAY);
  at.setHours(12, 0, 0, 0);
  return {
    id: `s-${daysAgo}-${name}`,
    name: "History",
    startedAt: new Date(at.getTime() - 3_600_000).toISOString(),
    finishedAt: at.toISOString(),
    durationSec: 3600,
    exercises: [exercise(name)],
    volume: 800,
    units: "lb",
    prs: [],
  };
}

function activeSession(minutesAgo: number, doneSets: number) {
  const started = new Date(Date.now() - minutesAgo * 60_000).toISOString();
  return {
    id: "active-1",
    name: "Test Workout",
    startedAt: started,
    cursor: 0,
    order: [0],
    restEndsAt: null,
    paused: false,
    pausedAt: null,
    pausedMs: 0,
    exercises: [
      {
        ...exercise("Barbell Bench Press", Array.from({ length: doneSets }, () => set())),
        deferred: false,
        deferReason: null,
        substitutedFrom: null,
        supersetGroup: null,
        prescription: null,
      },
    ],
  };
}

const PROFILE = {
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
  onboardedAt: new Date(Date.now() - 30 * DAY).toISOString(),
};

interface Seed {
  sessions?: unknown[];
  active?: unknown;
  coins?: number;
  inventory?: Record<string, number>;
}

/** Fill this browser's storage, then open the page. */
async function seed(page: Page, s: Seed = {}) {
  await page.goto("/login");
  await page.evaluate(
    ({ s, PROFILE }) => {
      localStorage.clear();
      localStorage.setItem(
        "forma.data.v1",
        JSON.stringify({
          profile: PROFILE,
          active: s.active ?? null,
          sessions: s.sessions ?? [],
          localTemplates: [],
          checkins: [],
          quickLogs: [],
          meals: [],
          nutritionTargets: null,
        }),
      );
      // welcome was paid long ago, so a test's balance is just what it was given
      localStorage.setItem(
        "forma.wallet.v2",
        JSON.stringify({ balance: s.coins ?? 0, lifetimeEarned: s.coins ?? 0, ledger: [], grants: { welcome: "2020-01-01" }, paid: {} }),
      );
      localStorage.setItem("forma.economy.v1", JSON.stringify({ inventory: s.inventory ?? {}, protections: [], challengeWeek: null, lastReview: null, server: null }));
    },
    { s, PROFILE },
  );
}

const store = <T,>(page: Page, key: string) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}"), key) as Promise<T>;
const wallet = (page: Page) =>
  store<{ balance: number; lifetimeEarned: number; ledger: { label: string; amount: number; type: string }[] }>(page, "forma.wallet.v2");
const economy = (page: Page) =>
  store<{ inventory: Record<string, number>; protections: { date: string; source: string }[] }>(page, "forma.economy.v1");
const customization = (page: Page) =>
  store<{ owned: string[]; equipped: Record<string, string> }>(page, "forma.customization.v1");

/** What this item costs right now, allowing for it being on deal this week. */
function priceNow(id: string) {
  const deal = dealsFor(weekKey()).find((d) => d.itemId === id);
  return deal?.price ?? customizationItems.find((i) => i.id === id)!.price;
}

const finishWorkout = async (page: Page) => {
  await page.goto("/workouts/active");
  await page.getByRole("button", { name: "end workout" }).click();
  await page.getByRole("button", { name: "finish & save workout" }).click();
  await expect(page.getByText("workout complete", { exact: true }).first()).toBeVisible({ timeout: 15_000 });
};

const streakCard = (page: Page) => page.locator(".metric-card", { hasText: "workout streak" }).locator(".metric-card__value");

// ── earning ─────────────────────────────────────────────────────────────────
test("opening the app pays the daily visit once", async ({ page }) => {
  await seed(page);
  await page.goto("/store");
  await expect(page.getByTestId("store-balance")).toHaveText("5", { timeout: 10_000 });
  await page.reload();
  await page.waitForTimeout(1800);
  await expect(page.getByTestId("store-balance")).toHaveText("5");
  expect((await wallet(page)).ledger.filter((e) => e.label === "Daily check-in")).toHaveLength(1);
});

test("a real workout pays by its working sets, and a first log isn't a PR", async ({ page }) => {
  await seed(page, { active: activeSession(40, 5), coins: 0 });
  await finishWorkout(page);
  await expect(page.getByTestId("workout-coins")).toBeVisible();
  const { ledger } = await wallet(page);
  expect(ledger.find((e) => e.label === "Workout complete")?.amount).toBe(40); // 30 + 2 × 5 sets
  expect(ledger.some((e) => e.label.startsWith("PR ·"))).toBe(false);
});

test("beating a lift you've logged before pays a PR", async ({ page }) => {
  await seed(page, {
    sessions: [session(9)],
    active: { ...activeSession(40, 0), exercises: [{ ...exercise("Barbell Bench Press", [set(true, 110), set(true, 110), set(true, 110)]) }] },
  });
  await finishWorkout(page);
  const { ledger } = await wallet(page);
  expect(ledger.find((e) => e.label === "PR · Barbell Bench Press")?.amount).toBe(25);
});

test("a workout that's too short pays nothing and says why", async ({ page }) => {
  await seed(page, { active: activeSession(0, 5) });
  await finishWorkout(page);
  await expect(page.getByTestId("workout-no-coins")).toContainText("5 minutes");
  expect((await wallet(page)).ledger.some((e) => e.label === "Workout complete")).toBe(false);
});

test("a workout with too few sets pays nothing and says why", async ({ page }) => {
  await seed(page, { active: activeSession(40, 2) });
  await finishWorkout(page);
  await expect(page.getByTestId("workout-no-coins")).toContainText("3 completed working sets");
  expect((await wallet(page)).ledger.some((e) => e.label === "Workout complete")).toBe(false);
});

test("abandoning a workout pays nothing", async ({ page }) => {
  await seed(page, { active: activeSession(40, 8) });
  await page.goto("/workouts/active");
  await page.getByRole("button", { name: "end workout" }).click();
  await page.getByRole("button", { name: "discard without saving" }).click();
  await expect(page).toHaveURL(/\/workouts/);
  expect((await wallet(page)).ledger.some((e) => e.label === "Workout complete")).toBe(false);
});

test("the third workout of the day pays nothing", async ({ page }) => {
  await seed(page);
  await page.goto("/store");
  await page.evaluate(() => {
    const w = JSON.parse(localStorage.getItem("forma.wallet.v2")!);
    w.paid = { workout: [new Date().toISOString(), new Date().toISOString()] };
    localStorage.setItem("forma.wallet.v2", JSON.stringify(w));
    const d = JSON.parse(localStorage.getItem("forma.data.v1")!);
    localStorage.setItem("forma.data.v1", JSON.stringify(d));
  });
  await page.evaluate((a) => {
    const d = JSON.parse(localStorage.getItem("forma.data.v1")!);
    d.active = a;
    localStorage.setItem("forma.data.v1", JSON.stringify(d));
  }, activeSession(40, 5));
  await finishWorkout(page);
  expect((await wallet(page)).ledger.some((e) => e.label === "Workout complete")).toBe(false);
});

test("three real days in a row pay the streak milestone once", async ({ page }) => {
  await seed(page, { sessions: [session(0), session(1), session(2)] });
  await page.goto("/store");
  await expect(page.getByTestId("ledger")).toContainText("3-day streak", { timeout: 10_000 });
  await page.reload();
  await page.waitForTimeout(1800);
  expect((await wallet(page)).ledger.filter((e) => e.label === "3-day streak")).toHaveLength(1);
});

test("an empty workout doesn't count toward a streak", async ({ page }) => {
  const empty = { ...session(1), id: "empty", exercises: [exercise("Barbell Bench Press", [set(false)])] };
  await seed(page, { sessions: [session(0), empty, session(2), session(3)] });
  await page.goto("/dashboard");
  await expect(streakCard(page)).toHaveText("1", { timeout: 10_000 });
});

// ── streak protection ───────────────────────────────────────────────────────
test("without a freeze, a missed day breaks the streak", async ({ page }) => {
  await seed(page, { sessions: [session(2), session(3), session(4)] });
  await page.goto("/dashboard");
  await expect(streakCard(page)).toHaveText("0", { timeout: 10_000 });
});

test("a held freeze really protects the streak, on every screen, and only fires once", async ({ page }) => {
  await seed(page, { sessions: [session(2), session(3), session(4)], inventory: { "cs-freeze": 2 } });
  await page.goto("/dashboard");
  // the dashboard reads the protected streak
  await expect(streakCard(page)).toHaveText("3", { timeout: 10_000 });

  const after = await economy(page);
  expect(after.inventory["cs-freeze"]).toBe(1);
  expect(after.protections).toHaveLength(1);
  expect(after.protections[0].source).toBe("freeze");

  // the toast says what happened, in place of a coin amount
  await page.goto("/store");
  await expect(page.locator('[data-kit="streak freezes"]')).toHaveText("1");
  await expect(page.getByTestId("kit")).toContainText("3-day streak");

  await page.reload();
  await page.waitForTimeout(1800);
  expect((await economy(page)).inventory["cs-freeze"]).toBe(1);
});

test("a freeze isn't wasted on a gap it can't cover", async ({ page }) => {
  await seed(page, { sessions: [session(4), session(5), session(6)], inventory: { "cs-freeze": 2 } });
  await page.goto("/store");
  await page.waitForTimeout(1800);
  expect((await economy(page)).inventory["cs-freeze"]).toBe(2);
});

test("a freeze isn't spent on a tiny streak", async ({ page }) => {
  await seed(page, { sessions: [session(2), session(3)], inventory: { "cs-freeze": 2 } });
  await page.goto("/store");
  await page.waitForTimeout(1800);
  expect((await economy(page)).inventory["cs-freeze"]).toBe(2);
});

test("a frozen day bridges the streak without adding to it", async ({ page }) => {
  await seed(page, { sessions: [session(2), session(3), session(4), session(5), session(6), session(7)], inventory: { "cs-freeze": 1 } });
  await page.goto("/store");
  await expect(page.getByTestId("kit")).toContainText("6-day streak", { timeout: 10_000 });
  // 6 trained plus a frozen day is still under the 7-day milestone
  expect((await wallet(page)).ledger.some((e) => e.label === "7-day streak")).toBe(false);
});

test("buying a freeze can rescue a streak that's already due one", async ({ page }) => {
  await seed(page, { sessions: [session(2), session(3), session(4)], coins: 300 });
  await page.goto("/store");
  await page.getByRole("tab", { name: "boosts" }).click();
  await page.getByRole("button", { name: "buy Streak Freeze" }).click();
  await expect(page.getByTestId("kit")).toContainText("3-day streak");
  expect((await economy(page)).protections).toHaveLength(1);
});

test("a streak repair restores a broken streak, once a week", async ({ page }) => {
  await seed(page, { sessions: [session(3), session(4), session(5), session(6)], coins: 1000 });
  await page.goto("/store");
  const banner = page.getByTestId("streak-repair");
  await expect(banner).toContainText("back to 4 days");
  await banner.getByRole("button", { name: "repair streak" }).click();
  await expect(banner).toHaveCount(0);
  await expect(page.getByTestId("kit")).toContainText("4-day streak");

  const w = await wallet(page);
  expect(w.ledger.find((e) => e.label === "Streak Repair")?.amount).toBe(450);
  expect((await economy(page)).protections.map((p) => p.source)).toEqual(["repair", "repair"]);
});

test("there's nothing to repair on a healthy streak", async ({ page }) => {
  await seed(page, { sessions: [session(0), session(1), session(2)], coins: 1000 });
  await page.goto("/store");
  await expect(page.getByTestId("kit")).toBeVisible();
  await expect(page.getByTestId("streak-repair")).toHaveCount(0);
});

// ── buying ──────────────────────────────────────────────────────────────────
test("consumables stop at the hold limit, and coins only go when something's bought", async ({ page }) => {
  await seed(page, { coins: 1000 });
  await page.goto("/store");
  await page.getByRole("tab", { name: "boosts" }).click();
  const buy = page.getByRole("button", { name: "buy Streak Freeze" });
  await buy.click();
  await expect(page.locator('[data-kit="streak freezes"]')).toHaveText("1");
  await buy.click();
  await expect(page.locator('[data-kit="streak freezes"]')).toHaveText("2");
  await expect(buy).toBeDisabled();
  await expect(buy).toHaveText("kit full");
  expect((await wallet(page)).ledger.filter((e) => e.type === "spend").reduce((n, e) => n + e.amount, 0)).toBe(300);
});

test("items you can't afford say how far off you are", async ({ page }) => {
  await seed(page, { coins: 100 });
  await page.goto("/store");
  await page.getByRole("tab", { name: "programs" }).click();
  const button = page.getByRole("button", { name: "buy Powerbuilding" }).last();
  await expect(button).toBeDisabled();
  await expect(button).toContainText("more");
});

test("this week's deals charge the discounted price", async ({ page }) => {
  await seed(page, { coins: 10000 });
  await page.goto("/store");
  const deal = dealsFor(weekKey())[0];
  const card = page.getByTestId("deals").locator(`[data-item="${deal.itemId}"]`);
  await expect(card).toContainText("25% off");
  await card.getByRole("button", { name: /^buy / }).click();
  await expect.poll(async () => (await wallet(page)).ledger.find((e) => e.type === "spend")?.amount).toBe(deal.price);
  expect(deal.price).toBeLessThan(deal.was);
});

test("a bundle grants everything and only charges for what's new", async ({ page }) => {
  await seed(page, { coins: 5000 });
  await page.goto("/store");
  await page.evaluate(() => {
    const c = JSON.parse(localStorage.getItem("forma.customization.v1") ?? '{"owned":[],"equipped":{}}');
    c.owned = [...c.owned, "fn-mono"];
    localStorage.setItem("forma.customization.v1", JSON.stringify(c));
  });
  await page.reload();
  await page.getByRole("tab", { name: "bundles" }).click();
  await page.getByRole("button", { name: "buy Neon Pack" }).click();
  await expect(page.locator('[data-bundle="bn-neon"]').getByText("owned", { exact: true })).toBeVisible();
  const { owned } = await customization(page);
  for (const id of ["fx-scanlines", "t-terminal", "fn-mono", "rs-arcade"]) expect(owned).toContain(id);
  const spend = (await wallet(page)).ledger.find((e) => e.type === "spend");
  expect(spend?.amount).toBe(675); // 25% off 600 + 120 + 180, without the font already owned
});

// ── items do what they say ──────────────────────────────────────────────────
test("a title and badge show next to your name", async ({ page }) => {
  await seed(page, { coins: 2000 });
  await page.goto("/store");
  await page.getByRole("tab", { name: "profile" }).click();
  await page.getByRole("button", { name: "buy “Early Bird”" }).click();
  await expect(page.locator('[data-item="ti-earlybird"]').getByText("equipped").first()).toBeVisible();
  await page.getByRole("button", { name: "buy Spark badge" }).click();
  await expect(page.locator('[data-item="bd-spark"]').getByText("equipped").first()).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByTestId("profile-title")).toContainText("Early Bird");
  await expect(page.getByTestId("profile-badge")).toBeVisible();
  await page.goto("/settings");
  await expect(page.getByTestId("profile-title")).toContainText("Early Bird");
});

test("a chat skin restyles the conversation", async ({ page }) => {
  await seed(page, { coins: 2000 });
  await page.goto("/trainer");
  await expect(page.locator('[data-chat-skin="t-default"]')).toBeVisible();
  await page.goto("/store");
  await page.getByRole("tab", { name: "chat", exact: true }).click();
  await page.getByRole("button", { name: "buy Terminal" }).click();
  await expect(page.locator('[data-item="t-terminal"]').getByText("equipped").first()).toBeVisible();

  await page.goto("/trainer");
  await page.getByPlaceholder(/^message /).fill("hello");
  await page.getByRole("button", { name: "send" }).click();
  const bubble = page.locator(".chat-bubble--user").first();
  await expect(bubble).toBeVisible();
  const family = await bubble.evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family).toMatch(/mono|consolas/i);
});

test("a persona changes how Kai talks, in chat and mid-workout", async ({ page }) => {
  await seed(page, { coins: 2000, active: activeSession(5, 0) });
  await page.goto("/store");
  await page.getByRole("tab", { name: "kai", exact: true }).click();
  await page.getByRole("button", { name: "buy Drill Sergeant" }).click();
  await expect(page.locator('[data-item="ps-drill"]').getByText("equipped").first()).toBeVisible();

  await page.goto("/trainer");
  await page.getByPlaceholder(/^message /).fill("hello");
  await page.getByRole("button", { name: "send" }).click();
  await expect(page.locator(".chat-bubble--kai").last()).toContainText("Listen up.", { timeout: 5000 });

  await page.goto("/workouts/active");
  await expect(page.getByText(/No excuses|You've done this before|Heavier\. Good|Clock's running/).first()).toBeVisible();
});

test("a rest sound plays its own notes, and the preview is free", async ({ page }) => {
  await seed(page, { coins: 500 });
  await page.goto("/store");
  await page.getByRole("tab", { name: "sounds" }).click();
  await page.evaluate(() => {
    const seen: number[] = [];
    (window as unknown as { __tones: number[] }).__tones = seen;
    const original = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function () {
      const osc = original.call(this);
      const set = osc.frequency.setValueAtTime.bind(osc.frequency);
      osc.frequency.setValueAtTime = (v: number, t: number) => {
        seen.push(v);
        return set(v, t);
      };
      return osc;
    };
  });
  await page.getByRole("button", { name: "preview Boxing bell" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __tones: number[] }).__tones)).toContain(1250);
  expect((await wallet(page)).ledger.some((e) => e.type === "spend")).toBe(false);

  await page.getByRole("button", { name: "buy Boxing bell" }).click();
  await expect(page.locator('[data-item="rs-bell"]').getByText("equipped").first()).toBeVisible();
  expect((await customization(page)).equipped.restSound).toBe("rs-bell");
});

test("a celebration has its own look, and the preview shows it", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await seed(page, { coins: 2000 });
  await page.goto("/store");
  await page.getByRole("tab", { name: "effects" }).click();
  await page.getByRole("button", { name: "preview Gold rain" }).click();
  await expect(page.locator('[data-celebration="cl-coins"]')).toBeAttached();
  await page.waitForTimeout(2600);
  await page.getByRole("button", { name: "buy Gold rain" }).click();
  await expect.poll(async () => (await customization(page)).equipped?.celebration).toBe("cl-coins");
});

test("a premium plan is locked until bought, then its days work", async ({ page }) => {
  await seed(page, { coins: 3000 });
  await page.goto("/workouts");
  await page.getByRole("tab", { name: "Templates" }).click();
  const card = page.getByRole("article", { name: "Powerbuilding — 4 days" });
  await expect(card.getByTestId("plan-locked")).toBeVisible();
  await expect(page.getByRole("article", { name: "Powerbuilding · Squat Day" })).toHaveCount(0);

  await page.getByRole("button", { name: "view plan: Powerbuilding — 4 days" }).click();
  await expect(page.getByRole("button", { name: "start Squat Day" })).toHaveCount(0);
  await page.getByRole("button", { name: /^unlock for/ }).click();
  await page.getByRole("button", { name: "start Squat Day" }).click();
  await expect(page).toHaveURL(/\/workouts\/active/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /powerbuilding · squat day/i }).first()).toBeVisible();
  expect((await wallet(page)).ledger.find((e) => e.type === "spend")?.amount).toBe(priceNow("pl-powerbuilding"));
});

test("a Kai review is a report on your own numbers, and can be reread", async ({ page }) => {
  await seed(page, { sessions: [session(1), session(3), session(30)], inventory: { "cs-review": 1 } });
  await page.goto("/store");
  await page.getByRole("button", { name: "use a kai review" }).click();
  const review = page.getByTestId("kai-review");
  await expect(review).toContainText("2 sessions in 28 days");
  await expect(review).toContainText("next step");
  expect((await economy(page)).inventory["cs-review"]).toBe(0);

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "read the last one" }).click();
  await expect(review).toContainText("2 sessions in 28 days");
});

test("a reroll swaps a challenge, and never brings it back that week", async ({ page }) => {
  await seed(page, { inventory: { "cs-reroll": 3 } });
  await page.goto("/store");
  const ids = () => page.getByTestId("challenges").locator("[data-challenge]").evaluateAll((els) => els.map((e) => e.getAttribute("data-challenge")));
  await expect(page.getByTestId("challenges").locator("[data-challenge]")).toHaveCount(3);
  const before = await ids();
  await page.getByTestId("challenges").locator(`[data-challenge="${before[0]}"]`).getByRole("button", { name: /^reroll/ }).click();
  await expect.poll(ids).not.toContain(before[0]);
  const second = await ids();
  await page.getByTestId("challenges").locator(`[data-challenge="${second[0]}"]`).getByRole("button", { name: /^reroll/ }).click();
  await expect.poll(ids).not.toContain(second[0]);
  expect(await ids()).not.toContain(before[0]);
  // two a week, even with one left in the kit
  expect((await economy(page)).inventory["cs-reroll"]).toBe(1);
  await expect(page.getByTestId("challenges").getByRole("button", { name: /^reroll/ })).toHaveCount(0);
});
