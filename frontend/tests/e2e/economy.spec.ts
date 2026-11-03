/**
 * The coin economy against the real API: the server decides what's owed, the
 * store spends through it, and the client's rule table matches the server's.
 *
 * Runs on a fresh account per test, so purchases never leak into other specs or
 * into a later run against the same database. The server's own payout rules
 * (caps, backdated workouts, streak maths) are in backend/src/modules/economy.test.ts.
 */
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { API } from "./helpers";
import { customizationItems } from "../../src/lib/data";
import {
  ACHIEVEMENT_COINS,
  BUNDLES,
  BUNDLE_DISCOUNT,
  CHALLENGES,
  CHECKIN_COINS,
  CONSUMABLES,
  dealsFor,
  DEALS,
  EARN_CAPS,
  FOOD_REWARD,
  FREEZE_MIN_STREAK,
  PR_REWARD,
  PROTEIN_COINS,
  REROLLS_PER_WEEK,
  STREAK_MILESTONES,
  STREAK_REPAIR,
  VISIT_REWARD,
  WEEK_TARGET_REWARD,
  WELCOME_COINS,
  WORKOUT_REWARD,
} from "../../src/lib/economyConfig";

async function newAccount(page: Page, target = 3) {
  const reg = await page.request.post(`${API}/auth/register`, {
    data: { email: `coin+${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`, password: "Coin-economy-1" },
  });
  expect(reg.status()).toBe(201);
  const body = await reg.json();
  await page.request.post(`${API}/auth/verify-email`, { data: { token: body.devVerificationToken } });
  const headers = { Authorization: `Bearer ${body.accessToken}` };
  await page.request.post(`${API}/me/onboarding`, { headers, data: { trainingFrequencyTarget: target } });
  // the store is otherwise locked until a first PR
  await page.request.put(`${API}/me/progression`, { headers, data: { gatingEnabled: false } });
  await page.goto("/login");
  await page.evaluate(
    ({ at, rt }) => {
      localStorage.clear();
      localStorage.setItem("forma.access", at);
      localStorage.setItem("forma.refresh", rt);
    },
    { at: body.accessToken as string, rt: body.refreshToken as string },
  );
  return headers;
}

async function fund(page: Page, headers: Record<string, string>, amount: number) {
  const res = await page.request.post(`${API}/store/wallet/earn`, { headers, data: { amount, label: "test funds" } });
  expect(res.status()).toBe(200);
}

const snapshot = async (page: Page, headers: Record<string, string>) =>
  (await (await page.request.get(`${API}/economy`, { headers })).json()) as {
    balance: number;
    inventory: Record<string, number>;
    deals: { itemId: string; price: number }[];
    challenges: { id: string }[];
    recent: { label: string; amount: number; type: string }[];
    week: string;
  };

const balanceShown = (page: Page) => page.getByTestId("store-balance");

test.describe.configure({ timeout: 90_000 });

// ── the rule table ──────────────────────────────────────────────────────────
test("the client's rules match the server's", async ({ page }) => {
  const headers = await newAccount(page);
  const server = await (await page.request.get(`${API}/economy/catalog`, { headers })).json();

  // every priced thing costs the same on both sides
  for (const [id, entry] of Object.entries(server.cosmetics as Record<string, { slot: string | null; price: number }>)) {
    const item = customizationItems.find((i) => i.id === id);
    if (!item) {
      // retired themes are kept server-side so old rows validate
      expect(entry.price, id).toBe(0);
      continue;
    }
    expect(item.price, id).toBe(entry.price);
    expect(item.slot === "program" ? null : item.slot, id).toBe(entry.slot);
  }
  for (const item of customizationItems) {
    expect(server.cosmetics[item.id], item.id).toBeDefined();
  }
  expect(Object.keys(server.consumables).sort()).toEqual(CONSUMABLES.map((c) => c.id).sort());
  for (const c of CONSUMABLES) {
    expect(server.consumables[c.id].price, c.id).toBe(c.price);
    expect(server.consumables[c.id].maxHold, c.id).toBe(c.maxHold);
  }
  for (const b of BUNDLES) expect(server.bundles[b.id].items, b.id).toEqual(b.items);
  expect(server.bundleDiscount).toBe(BUNDLE_DISCOUNT);

  // and every earn rule pays the same
  expect(server.earnCaps).toEqual(EARN_CAPS);
  expect(server.workout).toEqual(WORKOUT_REWARD);
  expect(server.pr).toEqual(PR_REWARD);
  expect(server.visit).toEqual(VISIT_REWARD);
  expect(server.checkin).toBe(CHECKIN_COINS);
  expect(server.food).toEqual(FOOD_REWARD);
  expect(server.protein).toBe(PROTEIN_COINS);
  expect(server.weekTarget).toEqual(WEEK_TARGET_REWARD);
  expect(server.welcome).toBe(WELCOME_COINS);
  expect(server.streakMilestones).toEqual(STREAK_MILESTONES);
  expect(server.achievements).toEqual(ACHIEVEMENT_COINS);
  expect(server.repair).toEqual(STREAK_REPAIR);
  expect(server.freezeMinStreak).toBe(FREEZE_MIN_STREAK);
  expect(server.rerollsPerWeek).toBe(REROLLS_PER_WEEK);
  expect(server.deals).toEqual(DEALS);
  expect(server.challenges).toEqual(CHALLENGES.map(({ id, target, reward }) => ({ id, target, reward })));

  // the weekly rotation lands on the same items
  const { deals, week } = await snapshot(page, headers);
  expect(deals).toEqual(dealsFor(week));
});

// ── earning ─────────────────────────────────────────────────────────────────
test("a request can't name its own reward", async ({ page }) => {
  const headers = await newAccount(page);
  const before = (await snapshot(page, headers)).balance;
  const res = await page.request.post(`${API}/economy/settle`, {
    headers,
    data: { amount: 100000, rewards: [{ amount: 100000 }], kind: "achievement", key: "free" },
  });
  expect(res.status()).toBe(200);
  // the daily visit is all that's owed, however the request is dressed up
  expect((await snapshot(page, headers)).balance).toBe(before + VISIT_REWARD.coins);
});

test("opening the app pays the daily visit once, on the server, and it shows", async ({ page }) => {
  const headers = await newAccount(page);
  await page.goto("/store");
  await expect(balanceShown(page)).toHaveText(String(WELCOME_COINS + VISIT_REWARD.coins), { timeout: 15_000 });
  await page.reload();
  await page.waitForTimeout(2500);
  await expect(balanceShown(page)).toHaveText(String(WELCOME_COINS + VISIT_REWARD.coins));
  const { recent, balance } = await snapshot(page, headers);
  expect(balance).toBe(WELCOME_COINS + VISIT_REWARD.coins);
  expect(recent.filter((t) => t.label === "Daily check-in")).toHaveLength(1);
  await expect(page.getByTestId("ledger")).toContainText("welcome to forma", { ignoreCase: true });
});

test("a recovery check-in pays through the server", async ({ page }) => {
  const headers = await newAccount(page);
  await page.goto("/dashboard");
  await page.request.post(`${API}/progress/checkin`, { headers, data: { sleepH: 8, sleepQuality: 4, fatigue: 2, soreness: 2 } });
  await page.goto("/store");
  await expect(page.locator('[data-earn="checkin"]')).toContainText("1 / 1 today", { timeout: 15_000 });
});

test("a workout finished in seconds pays nothing and says why", async ({ page }) => {
  test.setTimeout(120_000);
  const headers = await newAccount(page);
  await page.goto("/workouts");
  await page.getByRole("tab", { name: "Templates" }).click();
  await page.getByRole("button", { name: "start Gym Fundamentals A", exact: true }).click();
  await expect(page).toHaveURL(/\/workouts\/active/, { timeout: 30_000 });
  await page.getByLabel(/^weight \(/).fill("40");
  await page.getByRole("button", { name: /^complete set 1$/ }).click();
  await expect(page.getByRole("button", { name: "ready" })).toBeVisible();
  await page.getByRole("button", { name: "end workout" }).click();
  await page.getByRole("button", { name: "finish & save workout" }).click();
  await expect(page.getByText("workout complete", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("workout-no-coins")).toBeVisible();

  const { recent } = await snapshot(page, headers);
  expect(recent.some((t) => t.label === "Workout complete")).toBe(false);
});

test("abandoning a workout pays nothing", async ({ page }) => {
  test.setTimeout(120_000);
  const headers = await newAccount(page);
  await page.goto("/workouts");
  await page.getByRole("tab", { name: "Templates" }).click();
  await page.getByRole("button", { name: "start Gym Fundamentals A", exact: true }).click();
  await expect(page).toHaveURL(/\/workouts\/active/, { timeout: 30_000 });
  await page.getByRole("button", { name: "end workout" }).click();
  await page.getByRole("button", { name: "discard without saving" }).click();
  const { recent } = await snapshot(page, headers);
  expect(recent.some((t) => t.label === "Workout complete")).toBe(false);
});

// ── buying ──────────────────────────────────────────────────────────────────
test("buying a cosmetic goes through the server and sticks", async ({ page }) => {
  const headers = await newAccount(page);
  await fund(page, headers, 1000);
  await page.goto("/store");
  await expect(balanceShown(page)).toHaveText(/1,1\d\d/, { timeout: 15_000 });

  await page.getByRole("tab", { name: "font" }).click();
  await page.getByRole("button", { name: "buy Monospace" }).click();
  await expect(page.locator('[data-item="fn-mono"]').getByText("equipped").first()).toBeVisible();

  const after = await snapshot(page, headers);
  const spend = after.recent.find((t) => t.type === "spend");
  expect(spend?.amount).toBe(after.deals.find((d) => d.itemId === "fn-mono")?.price ?? 80);
  await expect(balanceShown(page)).toHaveText(after.balance.toLocaleString());

  await page.reload();
  await page.getByRole("tab", { name: "font" }).click();
  await expect(page.locator('[data-item="fn-mono"]').getByText("equipped").first()).toBeVisible();
});

test("can't buy what you can't afford", async ({ page }) => {
  const headers = await newAccount(page);
  await page.goto("/store");
  await page.getByRole("tab", { name: "programs" }).click();
  await expect(page.getByRole("button", { name: "buy Powerbuilding" }).first()).toBeDisabled();
  const res = await page.request.post(`${API}/economy/buy`, { headers, data: { itemId: "pl-powerbuilding" } });
  expect(res.status()).toBe(400);
});

test("a streak freeze lands in the kit and the hold limit is enforced", async ({ page }) => {
  const headers = await newAccount(page);
  await fund(page, headers, 1000);
  await page.goto("/store");
  await page.getByRole("tab", { name: "boosts" }).click();
  const buyFreeze = page.getByRole("button", { name: "buy Streak Freeze" });

  await buyFreeze.click();
  await expect(page.locator('[data-kit="streak freezes"]')).toHaveText("1");
  await buyFreeze.click();
  await expect(page.locator('[data-kit="streak freezes"]')).toHaveText("2");
  await expect(buyFreeze).toBeDisabled();
  await expect(buyFreeze).toHaveText("kit full");

  const { inventory } = await snapshot(page, headers);
  expect(inventory["cs-freeze"]).toBe(2);
  const third = await page.request.post(`${API}/economy/buy`, { headers, data: { itemId: "cs-freeze" } });
  expect(third.status()).toBe(409);

  await page.goto("/dashboard");
  await expect(page.getByTestId("streak-freezes")).toContainText("2 streak freezes");
});

test("a bundle grants everything in it", async ({ page }) => {
  const headers = await newAccount(page);
  await fund(page, headers, 2000);
  await page.goto("/store");
  await page.getByRole("tab", { name: "bundles" }).click();
  await page.getByRole("button", { name: "buy Neon Pack" }).click();
  await expect(page.locator('[data-bundle="bn-neon"]').getByText("owned", { exact: true })).toBeVisible();
  const state = await (await page.request.get(`${API}/customization`, { headers })).json();
  for (const id of ["fx-scanlines", "t-terminal", "fn-mono", "rs-arcade"]) expect(state.owned).toContain(id);
});

test("a premium plan stays locked until it's bought, and then you can start it", async ({ page }) => {
  const headers = await newAccount(page);
  await fund(page, headers, 3000);
  await page.goto("/workouts");
  await page.getByRole("tab", { name: "Templates" }).click();
  const card = page.getByRole("article", { name: "Arm Specialization — 4 days" });
  await expect(card.getByTestId("plan-locked")).toBeVisible();
  // its days aren't handed out for free in the single-workout list
  await expect(page.getByRole("article", { name: "Arms First · Biceps Priority" })).toHaveCount(0);

  await page.getByRole("button", { name: "view plan: Arm Specialization — 4 days" }).click();
  await expect(page.getByRole("button", { name: "start Biceps Priority" })).toHaveCount(0);
  await page.getByRole("button", { name: /^unlock for/ }).click();
  await expect(page.getByRole("button", { name: "start Biceps Priority" })).toBeVisible({ timeout: 15_000 });

  const state = await (await page.request.get(`${API}/customization`, { headers })).json();
  expect(state.owned).toContain("pl-arms");
});

// ── using things ────────────────────────────────────────────────────────────
test("a challenge reroll swaps the challenge and spends the item", async ({ page }) => {
  const headers = await newAccount(page);
  await fund(page, headers, 500);
  await page.request.post(`${API}/economy/buy`, { headers, data: { itemId: "cs-reroll" } });
  await page.goto("/store");
  const { challenges } = await snapshot(page, headers);
  const first = page.locator(`[data-challenge="${challenges[0].id}"]`);
  await first.getByRole("button", { name: /^reroll/ }).click();
  await expect(first).toHaveCount(0);
  await expect(page.getByTestId("challenges").locator("[data-challenge]")).toHaveCount(3);
  await expect(page.locator('[data-kit="challenge rerolls"]')).toHaveText("0");
  expect((await snapshot(page, headers)).inventory["cs-reroll"]).toBe(0);
});

test("a Kai review reads like a report and lands in the chat", async ({ page }) => {
  const headers = await newAccount(page);
  await fund(page, headers, 500);
  await page.request.post(`${API}/economy/buy`, { headers, data: { itemId: "cs-review" } });
  await page.goto("/store");
  await page.getByRole("button", { name: "use a kai review" }).click();
  const review = page.getByTestId("kai-review");
  await expect(review).toContainText("consistency");
  await expect(review).toContainText("next step");
  await expect(page.locator('[data-kit="kai reviews"]')).toHaveText("0");

  await page.goto("/trainer");
  await expect(page.getByText(/28-day review/).first()).toBeVisible({ timeout: 15_000 });
});

// ── items do what they say ──────────────────────────────────────────────────
test("a chat skin, title and badge really change the app", async ({ page }) => {
  const headers = await newAccount(page);
  await fund(page, headers, 2000);
  for (const itemId of ["t-terminal", "ti-earlybird", "bd-bolt"]) {
    const res = await page.request.post(`${API}/economy/buy`, { headers, data: { itemId } });
    expect(res.status(), itemId).toBe(201);
  }
  await page.goto("/trainer");
  await expect(page.locator('[data-chat-skin="t-terminal"]')).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByTestId("profile-title")).toContainText("Early Bird");
  await expect(page.getByTestId("profile-badge")).toBeVisible();
});

// ── sign-out ────────────────────────────────────────────────────────────────
test("signing out clears this browser's copy of the wallet", async ({ page }) => {
  const headers = await newAccount(page);
  await fund(page, headers, 900);
  await page.goto("/store");
  await expect(balanceShown(page)).toHaveText(/1,0\d\d/, { timeout: 15_000 });
  await page.goto("/settings/account");
  await page.getByRole("button", { name: /^sign out$/i }).first().click();
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  const wallet = await page.evaluate(() => JSON.parse(localStorage.getItem("forma.wallet.v2") ?? "{}"));
  expect(wallet.balance ?? 0).toBe(0);
  expect(wallet.ledger ?? []).toEqual([]);
});

// ── the page itself ─────────────────────────────────────────────────────────
test("the store has no serious accessibility issues", async ({ page }) => {
  await newAccount(page);
  await page.goto("/store");
  await expect(page.getByTestId("kit")).toBeVisible();
  await page.waitForTimeout(600);
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .disableRules(["color-contrast"])
    .analyze();
  expect(scan.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
});

test("the store fits a phone @mobile", async ({ page }) => {
  await newAccount(page);
  await page.goto("/store");
  await expect(page.getByTestId("kit")).toBeVisible();
  const { width } = page.viewportSize()!;
  const widest = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, window.innerWidth));
  expect(widest).toBeLessThanOrEqual(width + 1);
});
