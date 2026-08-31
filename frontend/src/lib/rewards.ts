import { useSyncExternalStore } from "react";
import { walletStore } from "./wallet";

/**
 * Reward engine — every way a coin enters the wallet.
 *
 * Rules split into three shapes:
 *  - one-time      (`key` fixed)            paid once, ever
 *  - periodic      (`key` = base + period)  paid once per day / week
 *  - repeatable    (no key)                 paid every time it fires
 *
 * Screens call the small `grant*` helpers; they resolve the amount, build the
 * idempotency key, and hand off to `walletStore.earn`. Challenges are tracked
 * here too (progress persisted) so the store can show "3 / 5 workouts · +120".
 */

// ── day / week helpers ──────────────────────────────────────────────────────
export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
export function weekKey(d = new Date()) {
  const t = new Date(d);
  const day = (t.getDay() + 6) % 7; // Monday = 0
  t.setDate(t.getDate() - day);
  return `w${todayKey(t)}`;
}

// ── the earn catalogue (shown on the store "earn" panel) ────────────────────
export type EarnWay = {
  id: string;
  label: string;
  detail: string;
  coins: string; // display string, e.g. "+40" or "+15–90"
  cadence: "per session" | "daily" | "weekly" | "one time" | "ongoing";
  icon: "dumbbell" | "flame" | "target" | "trophy" | "calendar" | "sparkles" | "sunrise" | "medal";
};

export const EARN_WAYS: EarnWay[] = [
  { id: "workout", label: "Finish a workout", detail: "Base reward scales with volume and completion", coins: "+40–120", cadence: "per session", icon: "dumbbell" },
  { id: "form", label: "Clean form session", detail: "Average form above 90% across the session", coins: "+25", cadence: "per session", icon: "sparkles" },
  { id: "pr", label: "Set a personal record", detail: "Any lift beats its previous best", coins: "+50 each", cadence: "per session", icon: "medal" },
  { id: "daily", label: "Daily check-in", detail: "Open Forma and log how you feel", coins: "+15", cadence: "daily", icon: "sunrise" },
  { id: "streak", label: "Keep your streak", detail: "Milestone bonuses at 3 / 7 / 14 / 30 / 60 / 100 days", coins: "+30–400", cadence: "ongoing", icon: "flame" },
  { id: "goal", label: "Hit a goal", detail: "Every daily or weekly goal you complete", coins: "+20–60", cadence: "ongoing", icon: "target" },
  { id: "week", label: "Weekly training target", detail: "Reach your planned sessions for the week", coins: "+90", cadence: "weekly", icon: "calendar" },
  { id: "achievement", label: "Unlock an achievement", detail: "One-off payouts for long-run milestones", coins: "+75–500", cadence: "one time", icon: "trophy" },
  { id: "challenge", label: "Complete a challenge", detail: "Rotating multi-step objectives in the store", coins: "+120–350", cadence: "weekly", icon: "target" },
];

// ── challenges (progress tracked + persisted) ───────────────────────────────
export type Challenge = {
  id: string;
  title: string;
  detail: string;
  target: number;
  reward: number;
  unit: string;
  /** seed progress so the demo looks lived-in */
  seed: number;
  expires: string;
  tone: "pink" | "cyan" | "lime" | "amber" | "violet";
};

export const CHALLENGES: Challenge[] = [
  { id: "ch-consistency", title: "Show up", detail: "Complete 4 workouts this week", target: 4, reward: 180, unit: "workouts", seed: 2, expires: "resets monday", tone: "pink" },
  { id: "ch-volume", title: "Move weight", detail: "Log 120,000 lb of total volume", target: 120000, reward: 220, unit: "lb", seed: 61000, expires: "resets monday", tone: "cyan" },
  { id: "ch-form", title: "Dial it in", detail: "3 sessions averaging 90%+ form", target: 3, reward: 200, unit: "sessions", seed: 1, expires: "resets monday", tone: "lime" },
  { id: "ch-early", title: "Early sets", detail: "Train before 9am twice", target: 2, reward: 150, unit: "sessions", seed: 0, expires: "resets monday", tone: "amber" },
  { id: "ch-explorer", title: "Mix it up", detail: "Train 5 different muscle groups", target: 5, reward: 160, unit: "groups", seed: 3, expires: "resets monday", tone: "violet" },
];

// ── challenge progress store (localStorage) ─────────────────────────────────
const CH_KEY = "forma.challenges.v1";
type ChState = Record<string, { progress: number; claimed: boolean; week: string }>;

function loadCh(): ChState {
  try {
    const raw = localStorage.getItem(CH_KEY);
    const parsed = raw ? (JSON.parse(raw) as ChState) : {};
    const wk = weekKey();
    // reset any entry from a previous week
    for (const id of Object.keys(parsed)) if (parsed[id].week !== wk) delete parsed[id];
    return parsed;
  } catch {
    return {};
  }
}
let chState: ChState = loadCh();
const chListeners = new Set<() => void>();
function chEmit() {
  try {
    localStorage.setItem(CH_KEY, JSON.stringify(chState));
  } catch {
    /* noop */
  }
  chListeners.forEach((l) => l());
}

export const challengeStore = {
  snapshot: () => chState,
  progressOf(c: Challenge) {
    const wk = weekKey();
    const entry = chState[c.id];
    const base = entry && entry.week === wk ? entry.progress : c.seed;
    return Math.min(c.target, base);
  },
  claimed(id: string) {
    return Boolean(chState[id]?.claimed && chState[id]?.week === weekKey());
  },
  /** advance a challenge; auto-pays + marks claimed when it crosses the target */
  advance(id: string, by: number) {
    const c = CHALLENGES.find((x) => x.id === id);
    if (!c) return;
    const wk = weekKey();
    const cur = chState[id]?.week === wk ? chState[id].progress : c.seed;
    const next = Math.min(c.target, cur + by);
    const wasClaimed = chState[id]?.claimed ?? false;
    chState[id] = { progress: next, claimed: wasClaimed, week: wk };
    if (next >= c.target && !wasClaimed) {
      chState[id].claimed = true;
      walletStore.earn(c.reward, `Challenge · ${c.title}`, { kind: "challenge", key: `${id}:${wk}` });
    }
    chEmit();
  },
  /** manual claim button for a challenge that's already at target */
  claim(id: string) {
    const c = CHALLENGES.find((x) => x.id === id);
    if (!c) return;
    const wk = weekKey();
    if (this.progressOf(c) < c.target || this.claimed(id)) return;
    chState[id] = { progress: c.target, claimed: true, week: wk };
    walletStore.earn(c.reward, `Challenge · ${c.title}`, { kind: "challenge", key: `${id}:${wk}` });
    chEmit();
  },
  subscribe(fn: () => void) {
    chListeners.add(fn);
    return () => chListeners.delete(fn);
  },
};

export function useChallenges() {
  useSyncExternalStore(challengeStore.subscribe, challengeStore.snapshot, challengeStore.snapshot);
  return CHALLENGES.map((c) => ({
    ...c,
    current: challengeStore.progressOf(c),
    done: challengeStore.progressOf(c) >= c.target,
    claimed: challengeStore.claimed(c.id),
  }));
}

// ── grant helpers ───────────────────────────────────────────────────────────
const STREAK_MILESTONES: Record<number, number> = {
  3: 30, 7: 70, 14: 120, 30: 220, 60: 320, 100: 400,
};

/** Called from the workout summary screen. */
export function grantWorkoutRewards(input: {
  sessionId?: string;
  volume: number;
  prs: number;
  avgForm?: number;
  streakDays?: number;
}) {
  const id = input.sessionId ?? `sess-${todayKey()}-${Math.round(input.volume)}`;
  // base: 40 + up to 80 more, scaled by volume (10k lb ≈ full bonus)
  const base = 40 + Math.min(80, Math.round(input.volume / 125));
  walletStore.earn(base, "Workout complete", { kind: "workout", key: `workout:${id}` });

  if (input.prs > 0) {
    walletStore.earn(input.prs * 50, `${input.prs} personal record${input.prs > 1 ? "s" : ""}`, {
      kind: "achievement",
      key: `workout-pr:${id}`,
    });
  }
  if ((input.avgForm ?? 0) >= 0.9) {
    walletStore.earn(25, "Clean form session", { kind: "workout", key: `workout-form:${id}` });
  }
  if (input.streakDays && STREAK_MILESTONES[input.streakDays]) {
    walletStore.earn(
      STREAK_MILESTONES[input.streakDays],
      `${input.streakDays}-day streak`,
      { kind: "streak", key: `streak:${input.streakDays}` },
    );
  }
  // feed the weekly challenges
  challengeStore.advance("ch-consistency", 1);
  challengeStore.advance("ch-volume", Math.round(input.volume));
  if ((input.avgForm ?? 0) >= 0.9) challengeStore.advance("ch-form", 1);
}

/** Daily check-in — safe to call on every app mount. */
export function grantDailyBonus() {
  return walletStore.earn(15, "Daily check-in", { kind: "daily", key: `daily:${todayKey()}` });
}

/** Goal completion — call with a stable goal id. */
export function grantGoalReward(goalId: string, label: string, amount = 30) {
  const key = `goal:${goalId}:${todayKey()}`;
  return walletStore.earn(amount, `Goal · ${label}`, { kind: "goal", key });
}

/** Achievement unlock — one-time per achievement key. */
export function grantAchievementReward(key: string, label: string, amount: number) {
  return walletStore.earn(amount, `Achievement · ${label}`, { kind: "achievement", key: `ach:${key}` });
}
