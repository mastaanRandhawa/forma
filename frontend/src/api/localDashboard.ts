/**
 * Builds a `Dashboard`-shaped object from the user's real local data, so the
 * dashboard's child cards (which read the DashboardContext) show logged history
 * rather than demo values. Nothing here is invented: fields with no real source
 * (readiness without a check-in) are left at a sentinel the UI treats as "no data".
 */
import type * as T from "./types";
import type { FormaData } from "../lib/localStore";
import { latestCheckin } from "../lib/localStore";
import { currentStreak, volumeInLastDays, sessionsInLastDays } from "../lib/fitness";
import { todayPlan, upcomingPlans } from "../lib/program";

/** 0–100 readiness from a manual check-in, or null when we have no signal. */
export function readinessFromCheckin(d: FormaData): number | null {
  const c = latestCheckin(d);
  if (!c) return null;
  // sleep 0–8h → 0–40, quality/fatigue/soreness 1–5 → 0–20 each (inverted for fatigue/soreness)
  const sleep = Math.max(0, Math.min(1, c.sleepH / 8)) * 40;
  const quality = ((c.sleepQuality - 1) / 4) * 20;
  const fatigue = ((5 - c.fatigue) / 4) * 20;
  const soreness = ((5 - c.soreness) / 4) * 20;
  return Math.round(sleep + quality + fatigue + soreness);
}

export function buildLocalDashboard(d: FormaData): T.Dashboard {
  const h = new Date().getHours();
  const plan = todayPlan(d.profile);
  const next = upcomingPlans(1)[0];
  const target = d.profile.daysPerWeek ?? 4;
  const done = new Set(
    sessionsInLastDays(d.sessions, 7).map((s) => s.finishedAt.slice(0, 10)),
  ).size;
  const readiness = readinessFromCheckin(d);
  const streak = currentStreak(d.sessions);

  return {
    greeting: h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening",
    user: { name: d.profile.name ?? "there" },
    trainerName: "Kai",
    trainerMessage:
      d.sessions.length === 0
        ? "Start your first session whenever you're ready — I'll have more to say once there's some training to look at."
        : `You've logged ${d.sessions.length} session${d.sessions.length > 1 ? "s" : ""}. Today is ${plan.name.toLowerCase()} — aim to match or beat your last working sets.`,
    todayWorkout: {
      name: plan.name,
      durationMin: d.profile.sessionMin ?? 45,
      exercises: plan.exercises.length,
      muscles: plan.focus,
    },
    upcomingWorkout: {
      name: next.plan.name,
      durationMin: d.profile.sessionMin ?? 45,
      exercises: next.plan.exercises.length,
      muscles: next.plan.focus,
    },
    activeSessionId: d.active?.id ?? null,
    weeklyRing: { done, target },
    weeklyVolumeKg: volumeInLastDays(d.sessions, 7),
    readiness: readiness ?? -1,
    streakDays: streak,
    recentPRs: [],
    goals: [],
    notificationsUnread: 0,
    insights: [],
  };
}
