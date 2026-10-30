import { useSyncExternalStore } from "react";
import { API_ENABLED } from "../api/hooks";
import { currentStreak, sessionsPerGroup } from "./fitness";
import { fromKg } from "./lifecycle";
import { useFormaData, type CompletedSession } from "./localStore";
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
 * idempotency key, and hand off to `walletStore.earn`. Weekly challenge progress
 * is measured from this week's sessions, so the store can show
 * "3 / 4 workouts · +180" without keeping a counter of its own.
 */

// ── day / week helpers ──────────────────────────────────────────────────────
export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
/** Local midnight on the Monday of `d`'s week, in ms. */
function weekStart(d = new Date()) {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); // Monday = 0
  return t.getTime();
}
export function weekKey(d = new Date()) {
  return `w${todayKey(new Date(weekStart(d)))}`;
}

// ── the earn catalogue (shown on the store "earn" panel) ────────────────────
export type EarnWay = {
  id: string;
  label: string;
  detail: string;
  coins: string; // display string, e.g. "+40" or "+15–90"
  cadence: "per session" | "daily" | "weekly" | "one time" | "ongoing";
  icon: "dumbbell" | "flame" | "target" | "trophy" | "calendar" | "sparkles" | "sunrise" | "medal";
  /** who pays it: this module, the server (API builds only), or nothing yet */
  payout: "client" | "server" | null;
};

export const EARN_WAYS: EarnWay[] = [
  { id: "workout", label: "Finish a workout", detail: "Base reward scales with volume and completion", coins: "+40–120", cadence: "per session", icon: "dumbbell", payout: "client" },
  // needs a form score, which the web app doesn't compute yet
  { id: "form", label: "Clean form session", detail: "Average form above 90% across the session", coins: "+25", cadence: "per session", icon: "sparkles", payout: null },
  { id: "pr", label: "Set a personal record", detail: "Any lift beats its previous best", coins: "+50 each", cadence: "per session", icon: "medal", payout: "client" },
  { id: "daily", label: "Daily check-in", detail: "Open Forma once a day", coins: "+15", cadence: "daily", icon: "sunrise", payout: "client" },
  { id: "streak", label: "Keep your streak", detail: "Milestone bonuses at 3 / 7 / 14 / 30 / 60 / 100 days", coins: "+30–400", cadence: "ongoing", icon: "flame", payout: "client" },
  // grantGoalReward has no caller yet; goal and weekly-target payouts wait on server-side rewards
  { id: "goal", label: "Hit a goal", detail: "Every daily or weekly goal you complete", coins: "+20–60", cadence: "ongoing", icon: "target", payout: null },
  { id: "week", label: "Weekly training target", detail: "Reach your planned sessions for the week", coins: "+90", cadence: "weekly", icon: "calendar", payout: null },
  { id: "achievement", label: "Unlock an achievement", detail: "One-off payouts for long-run milestones", coins: "+75–500", cadence: "one time", icon: "trophy", payout: "server" },
  { id: "challenge", label: "Complete a challenge", detail: "Rotating multi-step objectives in the store", coins: "+150–220", cadence: "weekly", icon: "target", payout: "client" },
];

/** The earn ways this build can actually pay out. */
export const LIVE_EARN_WAYS = EARN_WAYS.filter(
  (w) => w.payout === "client" || (w.payout === "server" && API_ENABLED),
);

// ── weekly challenges (measured from this week's sessions) ──────────────────
type MuscleOf = Parameters<typeof sessionsPerGroup>[1];

export type Challenge = {
  id: string;
  title: string;
  detail: string;
  target: number;
  reward: number;
  unit: string;
  expires: string;
  tone: "pink" | "cyan" | "lime" | "amber" | "violet";
  /** progress from the sessions finished since Monday 00:00 */
  measure: (week: CompletedSession[], muscleOf: MuscleOf | null) => number;
};

export const CHALLENGES: Challenge[] = [
  {
    id: "ch-consistency", title: "Show up", detail: "Complete 4 workouts this week", target: 4, reward: 180, unit: "workouts", expires: "resets monday", tone: "pink",
    measure: (week) => week.length,
  },
  {
    id: "ch-volume", title: "Move weight", detail: "Log 120,000 lb of total volume", target: 120000, reward: 220, unit: "lb", expires: "resets monday", tone: "cyan",
    measure: (week) => Math.round(week.reduce((n, s) => n + (s.units === "lb" ? s.volume : fromKg(s.volume, "lb")), 0)),
  },
  {
    id: "ch-early", title: "Early sets", detail: "Train before 9am twice", target: 2, reward: 150, unit: "sessions", expires: "resets monday", tone: "amber",
    measure: (week) => week.filter((s) => new Date(s.startedAt).getHours() < 9).length,
  },
  {
    id: "ch-explorer", title: "Mix it up", detail: "Train 5 different muscle groups", target: 5, reward: 160, unit: "groups", expires: "resets monday", tone: "violet",
    measure: (week, muscleOf) => (muscleOf ? sessionsPerGroup(week, muscleOf, 7).filter((g) => g.sessions > 0).length : 0),
  },
];

const sessionsThisWeek = (sessions: CompletedSession[]) => {
  const from = weekStart();
  return sessions.filter((s) => Date.parse(s.finishedAt) >= from);
};

/** Same key the wallet has used for challenge payouts since v1, so nothing pays twice. */
const challengeKey = (id: string) => `${id}:${weekKey()}`;

function payChallenge(c: Challenge) {
  return walletStore.earn(c.reward, `Challenge · ${c.title}`, { kind: "challenge", key: challengeKey(c.id) });
}

/** Pays every challenge this week's sessions have completed. Safe to repeat. */
export function settleChallenges(sessions: CompletedSession[], muscleOf: MuscleOf | null) {
  const week = sessionsThisWeek(sessions);
  for (const c of CHALLENGES) if (c.measure(week, muscleOf) >= c.target) payChallenge(c);
}

/** Store cards; `claim` pays a completed challenge the workout summary didn't settle. */
export function useChallenges(muscleOf: MuscleOf | null) {
  const { sessions } = useFormaData();
  useSyncExternalStore(walletStore.subscribe, walletStore.snapshot, walletStore.snapshot);
  const week = sessionsThisWeek(sessions);
  return CHALLENGES.map((c) => {
    const current = Math.min(c.target, c.measure(week, muscleOf));
    const done = current >= c.target;
    return {
      ...c,
      current,
      done,
      claimed: walletStore.hasGrant(challengeKey(c.id)),
      claim: () => done && payChallenge(c),
    };
  });
}

// ── grant helpers ───────────────────────────────────────────────────────────
const STREAK_MILESTONES: Record<number, number> = {
  3: 30, 7: 70, 14: 120, 30: 220, 60: 320, 100: 400,
};

/** Called from the workout summary, after the finished session has been saved. */
export function grantWorkoutRewards(input: {
  sessionId?: string;
  volume: number;
  prs: number;
  /** every saved session, including the one just finished */
  sessions: CompletedSession[];
  muscleOf: MuscleOf | null;
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
  const streakDays = currentStreak(input.sessions);
  if (STREAK_MILESTONES[streakDays]) {
    walletStore.earn(STREAK_MILESTONES[streakDays], `${streakDays}-day streak`, {
      kind: "streak",
      key: `streak:${streakDays}`,
    });
  }
  settleChallenges(input.sessions, input.muscleOf);
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
