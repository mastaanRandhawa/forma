import { API_ENABLED } from "../api/hooks";
import { api } from "../api/client";
import type { EconomyEvent, EconomyReward, SessionEconomy } from "../api/types";
import { applyLocalFreezes, applyServerEconomy, announceRewards, challengeKey, completedChallenges } from "./economy";
import {
  ACHIEVEMENT_COINS,
  CHECKIN_COINS,
  FOOD_REWARD,
  PR_REWARD,
  PROTEIN_COINS,
  STREAK_MILESTONES,
  VISIT_REWARD,
  weekTargetCoins,
  WEEK_TARGET_REWARD,
  WELCOME_COINS,
  workoutCoins,
  type EarnKind,
} from "./economyConfig";
import { currentStreak, improvedLifts, sessionsPerGroup, trainedDays } from "./fitness";
import { fromKg } from "./lifecycle";
import { loadData, type CompletedSession, type FormaData } from "./localStore";
import { deriveTargets, sumMeals } from "./nutrition";
import { localDayOf, todayKey, weekKey } from "./streak";
import { walletStore } from "./wallet";

export { todayKey, weekKey };

/**
 * Reward engine — every way a coin enters the wallet.
 *
 * With a backend the server pays: `settleEconomy()` asks it to work out what's
 * owed, and a finished workout comes back with its rewards. Without one the same
 * rules run here against localStore. Either way the amounts and caps are in
 * lib/economyConfig, and docs/COIN_ECONOMY.md explains them.
 */

// ── the earn catalogue (shown on the store "earn" panel) ────────────────────
export type EarnWay = {
  id: string;
  label: string;
  detail: string;
  coins: string; // display string, e.g. "+40" or "+15–90"
  cadence: "per workout" | "daily" | "weekly" | "one time" | "ongoing";
  icon: "dumbbell" | "flame" | "target" | "trophy" | "calendar" | "sparkles" | "sunrise" | "medal" | "apple" | "heart";
  /** the rule whose caps this row reports */
  cap?: EarnKind;
};

export const EARN_WAYS: EarnWay[] = [
  { id: "workout", label: "Finish a workout", detail: "At least 3 working sets and 5 minutes. More working sets pay more", coins: "+36–60", cadence: "per workout", icon: "dumbbell", cap: "workout" },
  { id: "pr", label: "Set a personal record", detail: "Beat your best on a lift you've logged before, up to 3 a workout", coins: "+25 each", cadence: "per workout", icon: "medal", cap: "pr" },
  { id: "week", label: "Hit your weekly target", detail: "Reach your training days for the week. A bigger target pays more", coins: "+50–125", cadence: "weekly", icon: "calendar", cap: "week" },
  { id: "challenge", label: "Finish a challenge", detail: "Three new ones every Monday", coins: "+40–70", cadence: "weekly", icon: "target", cap: "challenge" },
  { id: "streak", label: "Build a streak", detail: "Milestones at 3 / 7 / 14 / 30 / 60 / 100 trained days, each paid once. Rest days in your plan don't break it", coins: "+10–300", cadence: "ongoing", icon: "flame" },
  { id: "achievement", label: "Unlock an achievement", detail: "One-off payouts for long-run milestones", coins: "+25–400", cadence: "one time", icon: "trophy" },
  { id: "checkin", label: "Recovery check-in", detail: "Log how you slept and feel", coins: "+10", cadence: "daily", icon: "heart", cap: "checkin" },
  { id: "food", label: "Log your food", detail: "Log 2 or more items in a day", coins: "+10", cadence: "daily", icon: "apple", cap: "food" },
  { id: "protein", label: "Reach your protein target", detail: "Hit your daily protein goal", coins: "+10", cadence: "daily", icon: "sparkles", cap: "protein" },
  { id: "visit", label: "Open Forma", detail: "Your first visit of the day", coins: "+5", cadence: "daily", icon: "sunrise", cap: "visit" },
];

type MuscleOf = Parameters<typeof sessionsPerGroup>[1];

// ── settling ────────────────────────────────────────────────────────────────
let inFlight = false;
let again = false;

/**
 * Pay whatever is owed right now. Safe to call as often as you like: on app open,
 * after a check-in or food log. Repeats pay nothing.
 */
export function settleEconomy(muscleOf: MuscleOf | null = null): void {
  if (!API_ENABLED) {
    settleLocal(loadData(), muscleOf);
    return;
  }
  if (inFlight) {
    again = true;
    return;
  }
  inFlight = true;
  api.economy
    .settle(-new Date().getTimezoneOffset())
    .then((res) => {
      applyServerEconomy(res.economy);
      announceRewards(res.rewards, res.events);
    })
    .catch(() => {})
    .finally(() => {
      inFlight = false;
      if (again) {
        again = false;
        settleEconomy(muscleOf);
      }
    });
}

const pay = (kind: EarnKind, key: string, amount: number, label: string) =>
  walletStore.earn(amount, label, { kind, key });

function settleLocal(d: FormaData, muscleOf: MuscleOf | null) {
  applyLocalFreezes(d);

  const day = todayKey();
  const week = weekKey();
  const isToday = (at: string) => localDayOf(at) === day;

  if (d.profile.onboardedAt) pay("welcome", "welcome", WELCOME_COINS, "Welcome to Forma");
  pay("visit", `daily:${day}`, VISIT_REWARD.coins, "Daily check-in");

  if (d.checkins.some((c) => isToday(c.createdAt))) pay("checkin", `checkin:${day}`, CHECKIN_COINS, "Recovery check-in");

  const meals = d.meals.filter((m) => isToday(m.at));
  if (meals.length >= FOOD_REWARD.minItems) pay("food", `food:${day}`, FOOD_REWARD.coins, "Food logged");
  const protein = d.nutritionTargets?.protein ?? deriveTargets(d.profile)?.protein;
  if (protein && sumMeals(meals).protein >= protein) pay("protein", `protein:${day}`, PROTEIN_COINS, "Protein target");

  // only workouts that qualified for coins count, so empty sessions can't reach it
  const target = d.profile.daysPerWeek;
  if (target && walletStore.capUsage("workout").week >= Math.max(target, WEEK_TARGET_REWARD.minTarget)) {
    pay("week", `week:${week}`, weekTargetCoins(target), "Weekly training target");
  }

  for (const c of completedChallenges(d, muscleOf)) {
    pay("challenge", challengeKey(c.id), c.reward, `Challenge · ${c.title}`);
  }

  const streak = currentStreak(d.sessions, d.profile);
  for (const [days, coins] of Object.entries(STREAK_MILESTONES)) {
    if (streak >= Number(days)) pay("streak", `streak:${days}`, coins, `${days}-day streak`);
  }

  settleAchievements(d);
}

// ── achievements (the server evaluates these in API mode) ───────────────────
const ACHIEVEMENT_TITLES: Record<string, string> = {
  "first-session": "Day one", "first-pr": "On the board", "first-superset": "Two at once",
  "session-60min": "Hour of work", "session-90min": "Marathon session", "session-early": "Early bird",
  "sessions-10": "Getting started", "sessions-25": "Quarter century", "sessions-50": "Fifty sessions",
  "sessions-100": "Century club", "sessions-250": "Dedicated",
  "volume-10k": "10,000 kg moved", "volume-50k": "50,000 kg moved", "volume-100k": "100,000 kg moved",
  "volume-500k": "500,000 kg moved", "volume-1m": "One million kilos",
  "prs-5": "Record setter", "prs-10": "PR machine", "prs-25": "Always improving", "prs-50": "Living legend",
  "pr-bench": "Bench PR", "pr-squat": "Squat PR", "pr-deadlift": "Deadlift PR", "pr-ohp": "Overhead PR", "pr-row": "Row PR",
  "active-days-30": "30 active days", "active-days-100": "100 active days",
  "food-log-30": "Tracking everything", "checkin-14": "Check-in streak",
};
const LIFTS: Record<string, RegExp> = {
  "pr-bench": /bench/i,
  "pr-squat": /squat/i,
  "pr-deadlift": /deadlift/i,
  "pr-ohp": /overhead press|shoulder press|military press/i,
  "pr-row": /barbell row|bent.over.*row/i,
};

function settleAchievements(d: FormaData) {
  const worked = d.sessions
    .filter((s) => s.exercises.some((e) => e.sets.some((x) => x.done && !x.warmup)))
    .sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));
  const prLifts = worked.flatMap((s) =>
    improvedLifts(s, worked.filter((p) => p.finishedAt < s.finishedAt)),
  );
  const volumeKg = worked.reduce((n, s) => n + (s.units === "kg" ? s.volume : fromKg(s.volume, "kg")), 0);
  const count = (key: string, base: string) => Number(key.slice(base.length).replace("k", "000").replace("m", "000000"));

  const reached = (key: string): boolean => {
    if (key in LIFTS) return prLifts.some((name) => LIFTS[key].test(name));
    if (key.startsWith("sessions-")) return worked.length >= count(key, "sessions-");
    if (key.startsWith("volume-")) return volumeKg >= count(key, "volume-");
    if (key.startsWith("prs-")) return prLifts.length >= count(key, "prs-");
    if (key.startsWith("active-days-")) return trainedDays(worked).size >= count(key, "active-days-");
    switch (key) {
      case "first-session": return worked.length > 0;
      case "first-pr": return prLifts.length > 0;
      case "first-superset": return worked.some((s) => s.exercises.some((e) => e.supersetGroup != null));
      case "session-60min": return worked.some((s) => s.durationSec >= 3600);
      case "session-90min": return worked.some((s) => s.durationSec >= 5400);
      case "session-early": return worked.some((s) => new Date(s.startedAt).getHours() < 7);
      case "food-log-30": return new Set(d.meals.map((m) => localDayOf(m.at))).size >= 30;
      case "checkin-14": return d.checkins.length >= 14;
      default: return false;
    }
  };

  for (const [key, coins] of Object.entries(ACHIEVEMENT_COINS)) {
    if (ACHIEVEMENT_TITLES[key] && reached(key)) {
      pay("achievement", `ach:${key}`, coins, `Achievement · ${ACHIEVEMENT_TITLES[key]}`);
    }
  }
}

// ── workouts ────────────────────────────────────────────────────────────────
/** What a finished workout paid, for the summary screen. */
export interface WorkoutPayout {
  coins: number;
  rewards: EconomyReward[];
  skipped: SessionEconomy["skipped"];
  events: EconomyEvent[];
}

const NO_PAYOUT: WorkoutPayout = { coins: 0, rewards: [], skipped: null, events: [] };

/** API mode: the server already paid; mirror what it says and tell the user. */
export function applySessionEconomy(economy: SessionEconomy | null | undefined): WorkoutPayout {
  if (!economy) return NO_PAYOUT;
  applyServerEconomy(economy.snapshot);
  announceRewards(economy.rewards, economy.events);
  return {
    coins: economy.rewards.reduce((n, r) => n + r.amount, 0),
    rewards: economy.rewards,
    skipped: economy.skipped,
    events: economy.events,
  };
}

/**
 * No-backend build: pay a finished workout and anything else it made due. Call it
 * after the session has been saved. A lift's first log is a baseline, not a PR.
 */
export function grantWorkoutRewards(input: {
  session: CompletedSession;
  /** every session before this one */
  prior: CompletedSession[];
  muscleOf: MuscleOf | null;
}): WorkoutPayout {
  const { session, prior, muscleOf } = input;
  const before = walletStore.snapshot().ledger[0]?.id;
  const workingSets = session.exercises.reduce(
    (n, e) => n + e.sets.filter((s) => s.done && !s.warmup && (s.reps ?? 0) > 0).length,
    0,
  );
  const coins = workoutCoins(workingSets, session.durationSec);
  const skipped: SessionEconomy["skipped"] =
    coins != null ? null : workingSets < 3 ? "too_few_sets" : "too_short";

  if (coins != null) {
    pay("workout", `workout:${session.id}`, coins, "Workout complete");
    for (const name of [...new Set(improvedLifts(session, prior))].slice(0, PR_REWARD.perWorkout)) {
      pay("pr", `pr:${session.id}:${name}`, PR_REWARD.coins, `PR · ${name}`);
    }
  }
  settleLocal(loadData(), muscleOf);

  // everything added to the ledger since the top entry we saw on the way in
  const ledger = walletStore.snapshot().ledger;
  const end = ledger.findIndex((e) => e.id === before);
  const paid = (end < 0 ? ledger : ledger.slice(0, end)).filter((e) => e.type === "earn");
  return {
    coins: paid.reduce((n, e) => n + e.amount, 0),
    rewards: paid.map((e) => ({ amount: e.amount, label: e.label, kind: e.kind ?? "bonus" })).reverse(),
    skipped,
    events: [],
  };
}
