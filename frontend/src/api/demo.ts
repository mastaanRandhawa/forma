/**
 * Demo data — the app runs without a backend (e.g. the GitHub Pages build) by
 * serving these from the same hooks the API feeds. Shapes match `./types`
 * exactly, adapted from the original mock set in `../lib/data`.
 *
 * When `VITE_API_URL` is set the hooks call the real API instead and this file
 * is never touched.
 */
import type * as T from "./types";
import {
  achievements,
  chatThread,
  goals as mockGoals,
  insights as mockInsights,
  rankedMuscles,
  streakData,
  suggestedPrompts,
  trainerMessage,
  todayWorkout,
  upcomingWorkouts,
  weeklyRing,
} from "../lib/data";

const now = () => new Date().toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString();

export function demoDashboard(): T.Dashboard {
  const h = new Date().getHours();
  return {
    greeting: h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening",
    user: { name: "Alex" },
    trainerName: "Kai",
    trainerMessage,
    todayWorkout: {
      name: todayWorkout.name,
      durationMin: 45,
      exercises: todayWorkout.exercises,
      muscles: todayWorkout.muscles,
    },
    upcomingWorkout: {
      name: upcomingWorkouts[0].name,
      durationMin: 50,
      exercises: 5,
      muscles: upcomingWorkouts[0].muscles,
    },
    activeSessionId: null,
    weeklyRing,
    weeklyVolumeKg: 21860,
    readiness: 78,
    streakDays: streakData.days,
    recentPRs: [
      { lift: "Bench Press", recordType: "max_weight", value: 84, previousValue: 82 },
      { lift: "Back Squat", recordType: "max_1rm_estimate", value: 143, previousValue: 138 },
    ],
    goals: demoGoals().map(stripProgress),
    notificationsUnread: 2,
    insights: demoInsights(),
  };
}

function stripProgress(g: T.GoalWithProgress): T.Goal {
  const { current, completed, periodKey, ...rest } = g;
  return rest;
}

export function demoGoals(): T.GoalWithProgress[] {
  const tone = (t: string) => t as T.Goal["tone"];
  return mockGoals.map((g) => ({
    id: g.id,
    key: g.id,
    label: g.label,
    target: g.max,
    unit: g.unit,
    cadence: g.cadence,
    tone: tone(g.tone),
    active: true,
    current: g.value,
    completed: g.value >= g.max,
    periodKey: g.cadence === "daily" ? new Date().toISOString().slice(0, 10) : "2026-W35",
  }));
}

export function demoInsights(): T.CoachingInsight[] {
  return mockInsights.map((i) => ({
    id: i.id,
    category: (i.id === "sleep" ? "recovery" : "recovery") as T.InsightCategory,
    title: i.id === "sleep" ? "Sleep is trending up" : "Recovery dipped",
    body: i.text,
    actions: i.actions ?? [],
    dataRefs: null,
    sparkline: null,
    proactive: true,
    dismissedAt: null,
    createdAt: now(),
  }));
}

export function demoTrainer(): T.Trainer {
  return {
    id: "trainer-demo",
    name: "Kai",
    avatarId: "l-signature",
    voiceId: "v-marcus",
    equippedThemeId: "t-default",
    motivationLevel: 0.7,
    coachingDirectness: 0.7,
    formStrictness: 0.8,
    speakingFrequency: 0.5,
    coachingDetail: 0.8,
    humor: 0.3,
  };
}

export function demoChat(): T.ChatMessage[] {
  return chatThread.map((m, i) => ({
    id: `msg-${i}`,
    role: m.from === "trainer" ? "trainer" : "user",
    content: m.text,
    richContent: null,
    viaVoice: false,
    trainerSnapshot: null,
    appliedAt: null,
    createdAt: daysAgo(0),
  }));
}

export function demoSuggestedPrompts(): string[] {
  return suggestedPrompts;
}

export function demoMuscleMap(range: T.MuscleMap["range"] = "week"): T.MuscleMap {
  return {
    range,
    muscles: rankedMuscles.map((m) => ({
      key: m.name.toLowerCase(),
      name: m.name,
      region: ["Chest", "Shoulders", "Back"].includes(m.name) ? "upper" : "lower",
      score: m.pct / 100,
      role: "primary",
    })),
  };
}

export function demoAchievements(): T.AchievementProgress[] {
  return achievements.map((a) => ({
    key: a.id,
    title: a.title,
    detail: a.detail,
    icon: a.icon,
    targetValue: null,
    progress: a.unlocked ? 1 : 0.55,
    unlockedAt: a.unlocked ? daysAgo(3) : null,
  }));
}
