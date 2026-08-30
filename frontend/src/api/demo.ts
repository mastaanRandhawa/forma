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
  storeItems,
  streakData,
  suggestedPrompts,
  trainerMessage,
  todayWorkout,
  upcomingWorkouts,
  wallet,
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

export function demoWallet(): T.WalletSummary {
  return {
    balance: wallet.balance,
    earnedThisWeek: wallet.earnedThisWeek,
    recent: wallet.recent.map((r, i) => ({
      id: `wtx-${i}`,
      type: "earn",
      amount: r.amount,
      label: r.label,
      createdAt: daysAgo(i + 1),
    })),
  };
}

export function demoStoreItems(): T.StoreItem[] {
  return storeItems.map((s) => ({
    id: s.id,
    category: s.category,
    name: s.name,
    detail: s.detail,
    price: s.price,
    swatch: s.swatch ?? null,
    isDefault: s.price === 0,
    style: s.style ?? null,
    owned: s.owned ?? s.price === 0,
    equipped: s.equipped ?? false,
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

export function demoBalance(): T.MuscleBalance {
  return {
    mostTrained: rankedMuscles.slice(0, 3).map((m) => ({
      key: m.name.toLowerCase(), name: m.name, region: "upper", load: m.pct,
    })),
    undertrained: rankedMuscles.slice(-3).map((m) => ({
      key: m.name.toLowerCase(), name: m.name, region: "lower", load: m.pct,
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

export function demoProgressOverview(): T.ProgressOverview {
  return {
    summary:
      "Over the last 8 weeks you've added 12% to your bench press, trained 4 days a week without a missed session, and your squat form score climbed from 64 to 81.",
    sessions: 31,
    totalVolumeKg: 402_000,
    personalRecords: 7,
  };
}

export function demoReadiness(): T.ReadinessBreakdown {
  return {
    score: 78,
    recommendation: "Cleared to train hard. Keep an eye on the top-set RPE.",
    factors: [
      { label: "sleep", value: "7h 18m · good", fraction: 0.82 },
      { label: "hrv", value: "68 ms · +6 vs avg", fraction: 0.74 },
      { label: "resting hr", value: "52 bpm · steady", fraction: 0.66 },
      { label: "prior-day strain", value: "moderate", fraction: 0.48 },
    ],
  };
}

export function demoNotifications(): T.NotificationList {
  return {
    unreadCount: 2,
    items: [
      {
        id: "n1", type: "pr", title: "New bench PR", body: "195 lb × 3 — up 2.5 kg.",
        deepLink: "/progress", readAt: null, createdAt: daysAgo(0),
      },
      {
        id: "n2", type: "check_in", title: "Kai checked in", body: "How's the left shoulder feeling today?",
        deepLink: "/trainer", readAt: null, createdAt: daysAgo(1),
      },
      {
        id: "n3", type: "milestone", title: "14-day streak", body: "Longest streak yet. Keep it going.",
        deepLink: null, readAt: daysAgo(1), createdAt: daysAgo(2),
      },
    ],
  };
}
