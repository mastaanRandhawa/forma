/**
 * progressMetrics — the deep-dive content behind the dashboard's three ring
 * stats (readiness · 7-day volume · consistency). Every figure is derived from
 * real logged sessions and check-ins, never a hard-coded series, so the popup
 * on the dashboard and the Progress screen tell the same story.
 */
import type { CompletedSession, FormaData, Profile } from "./localStore";
import { latestCheckin } from "./localStore";
import { readinessFromCheckin } from "../api/localDashboard";
import {
  adherence,
  consistencyDays,
  currentStreak,
  exerciseVolume,
  longestStreak,
  sessionsInLastDays,
  volumeInLastDays,
  weeklyVolumeSeries,
} from "./fitness";

export interface MetricDetail {
  eyebrow: string;
  title: string;
  value: string;
  unit: string;
  chart: number[];
  color: string;
  mode: "curve" | "bars";
  factors: { label: string; value: string; fraction: number }[];
  recommendation: string;
  to: string;
}

const PINK = "var(--accent-pink)";
const CYAN = "var(--accent-cyan)";
const LIME = "var(--accent-lime)";

const kOr = (n: number, units: string) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k ${units}` : `${Math.round(n)} ${units}`;

/** Detail objects keyed by ring id. A key is only present when there's real
 *  data behind it — the caller falls back to a plain link otherwise. */
export function buildMetricDetails(
  sessions: CompletedSession[],
  data: FormaData,
  profile: Profile,
): Record<string, MetricDetail> {
  const out: Record<string, MetricDetail> = {};
  const units = profile.units;

  // ── readiness ────────────────────────────────────────────────────────────
  const last = latestCheckin(data);
  if (last) {
    const readiness = readinessFromCheckin(data) ?? 0;
    const series = [...data.checkins]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)
      .map((c) => readinessFromCheckin({ ...data, checkins: [c] }) ?? 0);
    out.readiness = {
      eyebrow: `check-in · ${last.date}`,
      title: "readiness",
      value: String(readiness),
      unit:
        readiness >= 66
          ? "cleared to train hard"
          : readiness >= 40
          ? "train, but keep top sets honest"
          : "prioritise recovery today",
      chart: series.length >= 2 ? series : [readiness, readiness],
      color: PINK,
      mode: "curve",
      factors: [
        { label: "sleep", value: `${last.sleepH}h`, fraction: Math.min(1, last.sleepH / 8) },
        { label: "sleep quality", value: `${last.sleepQuality}/5`, fraction: last.sleepQuality / 5 },
        { label: "fatigue", value: `${last.fatigue}/5`, fraction: (5 - last.fatigue) / 4 },
        { label: "soreness", value: `${last.soreness}/5`, fraction: (5 - last.soreness) / 4 },
      ],
      recommendation:
        readiness >= 66
          ? "Sleep and recovery markers look strong. Full-intensity training is cleared."
          : readiness >= 40
          ? "Recovery is middling — train as planned but cap your top sets around RPE 8."
          : "Your check-in points to under-recovery. Keep today light or take a rest day.",
      to: "/progress#recovery",
    };
  }

  // ── 7-day volume ─────────────────────────────────────────────────────────
  if (sessions.length) {
    const last7 = volumeInLastDays(sessions, 7);
    const prev7 = volumeInLastDays(sessions, 14) - last7;
    const weekly = weeklyVolumeSeries(sessions, 8);
    const delta = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : null;

    const byEx = new Map<string, number>();
    for (const s of sessionsInLastDays(sessions, 7))
      for (const e of s.exercises) byEx.set(e.name, (byEx.get(e.name) ?? 0) + exerciseVolume(e));
    const top = [...byEx.entries()]
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    const topMax = top[0]?.[1] || 1;

    out.volume = {
      eyebrow: "last 7 days",
      title: "training volume",
      value: last7 >= 1000 ? `${(last7 / 1000).toFixed(1)}k` : String(Math.round(last7)),
      unit: `${units} lifted${delta != null ? ` · ${delta >= 0 ? "+" : ""}${delta}% vs prior week` : ""}`,
      chart: weekly.some((v) => v > 0) ? weekly : [0, last7],
      color: CYAN,
      mode: "bars",
      factors: top.length
        ? top.map(([name, v]) => ({
            label: name.toLowerCase(),
            value: kOr(v, units),
            fraction: v / topMax,
          }))
        : [{ label: "no working sets in the last 7 days", value: "—", fraction: 0 }],
      recommendation:
        delta != null && delta < -15
          ? "Volume dropped sharply this week. If it wasn't a planned deload, add a set or two back next session."
          : delta != null && delta > 25
          ? "Big jump in volume — watch recovery over the next few days and don't stack another spike on top."
          : "Volume is tracking steadily. Keep nudging load or reps up a little each session.",
      to: "/progress",
    };
  }

  // ── consistency (dashboard's third ring, replacing the camera-only form score) ─
  if (sessions.length) {
    const days = consistencyDays(sessions, 91);
    const active = days.filter((c) => c > 0).length;
    const adh = profile.daysPerWeek ? adherence(sessions, profile.daysPerWeek, 13) : null;
    const weeklyCounts: number[] = [];
    for (let w = 12; w >= 0; w--)
      weeklyCounts.push(days.slice(days.length - (w + 1) * 7, days.length - w * 7).reduce((a, b) => a + b, 0));
    const thisWeek = new Set(sessionsInLastDays(sessions, 7).map((s) => s.finishedAt.slice(0, 10))).size;
    const target = profile.daysPerWeek ?? 3;
    const cur = currentStreak(sessions);
    const best = longestStreak(sessions);

    out.consistency = {
      eyebrow: "last 13 weeks",
      title: "consistency",
      value: adh != null ? `${Math.round(adh * 100)}%` : String(active),
      unit: adh != null ? "of your training target" : "active days",
      chart: weeklyCounts,
      color: LIME,
      mode: "bars",
      factors: [
        {
          label: "this week",
          value: `${thisWeek} / ${target} sessions`,
          fraction: Math.min(1, thisWeek / Math.max(1, target)),
        },
        { label: "active days · 13 wk", value: String(active), fraction: Math.min(1, active / 91) },
        { label: "current streak", value: `${cur} day${cur === 1 ? "" : "s"}`, fraction: Math.min(1, cur / 14) },
        { label: "longest streak", value: `${best} day${best === 1 ? "" : "s"}`, fraction: Math.min(1, best / 30) },
      ],
      recommendation:
        thisWeek >= target
          ? "You've already hit this week's target — anything more is a bonus. Protect your recovery."
          : `${target - thisWeek} more session${target - thisWeek > 1 ? "s" : ""} this week keeps you on plan.`,
      to: "/progress#consistency",
    };
  }

  return out;
}
