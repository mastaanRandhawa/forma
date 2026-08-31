/**
 * fitness — pure derivations over logged sessions.
 *
 * Every number the Progress and Dashboard screens show about training should
 * come from one of these functions applied to real `CompletedSession[]`, never
 * from a hard-coded series. Formulas match the backend audit (§L):
 *   volume       = Σ weight × reps over completed working sets
 *   estimated 1RM = Epley: weight × (1 + reps / 30)
 *   PR           = beats the previous best weight, e1RM, or set volume
 */
import type { CompletedSession, LoggedExercise, LoggedSet } from "./localStore";

export const epley1RM = (weight: number, reps: number): number =>
  reps <= 0 ? 0 : Math.round(weight * (1 + reps / 30));

export const setVolume = (s: LoggedSet): number =>
  s.done && !s.warmup && s.weight && s.reps ? s.weight * s.reps : 0;

export const exerciseVolume = (e: LoggedExercise): number =>
  e.sets.reduce((sum, s) => sum + setVolume(s), 0);

export const sessionVolume = (exercises: LoggedExercise[]): number =>
  exercises.reduce((sum, e) => sum + exerciseVolume(e), 0);

const startOfDay = (iso: string) => {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d;
};
const dayKey = (iso: string) => startOfDay(iso).toISOString().slice(0, 10);

// ── streaks ─────────────────────────────────────────────────────────────────
/** Consecutive days up to today (or yesterday) with a logged session. */
export function currentStreak(sessions: CompletedSession[]): number {
  if (!sessions.length) return 0;
  const days = new Set(sessions.map((s) => dayKey(s.finishedAt)));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  // allow the streak to still count if today hasn't been trained yet
  if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function longestStreak(sessions: CompletedSession[]): number {
  if (!sessions.length) return 0;
  const days = [...new Set(sessions.map((s) => dayKey(s.finishedAt)))].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    prev.setDate(prev.getDate() + 1);
    if (prev.toISOString().slice(0, 10) === days[i]) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}

// ── counts / volume windows ─────────────────────────────────────────────────
export function workoutsThisMonth(sessions: CompletedSession[], ref = new Date()): number {
  return sessions.filter((s) => {
    const d = new Date(s.finishedAt);
    return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
  }).length;
}

export function sessionsInLastDays(sessions: CompletedSession[], days: number): CompletedSession[] {
  const cutoff = Date.now() - days * 864e5;
  return sessions.filter((s) => Date.parse(s.finishedAt) >= cutoff);
}

export function volumeInLastDays(sessions: CompletedSession[], days: number): number {
  return sessionsInLastDays(sessions, days).reduce((sum, s) => sum + s.volume, 0);
}

/** Per-week total volume for the last `weeks` calendar weeks, oldest → newest. */
export function weeklyVolumeSeries(sessions: CompletedSession[], weeks = 8): number[] {
  const out = new Array(weeks).fill(0);
  const now = startOfDay(new Date().toISOString()).getTime();
  for (const s of sessions) {
    const weeksAgo = Math.floor((now - startOfDay(s.finishedAt).getTime()) / (7 * 864e5));
    if (weeksAgo >= 0 && weeksAgo < weeks) out[weeks - 1 - weeksAgo] += s.volume;
  }
  return out;
}

export function avgWeeklyVolume(sessions: CompletedSession[], weeks = 8): number {
  const series = weeklyVolumeSeries(sessions, weeks).filter((v) => v > 0);
  return series.length ? Math.round(series.reduce((a, b) => a + b, 0) / series.length) : 0;
}

/** Daily training count for the last `days` days, oldest → newest. Real, not random. */
export function consistencyDays(sessions: CompletedSession[], days = 91): number[] {
  const counts = new Array(days).fill(0);
  const today0 = startOfDay(new Date().toISOString()).getTime();
  for (const s of sessions) {
    const daysAgo = Math.round((today0 - startOfDay(s.finishedAt).getTime()) / 864e5);
    if (daysAgo >= 0 && daysAgo < days) counts[days - 1 - daysAgo] += 1;
  }
  return counts;
}

/** Adherence = trained days ÷ expected training days over the window. */
export function adherence(sessions: CompletedSession[], daysPerWeek: number, weeks = 13): number | null {
  if (!daysPerWeek) return null;
  const trained = new Set(
    sessionsInLastDays(sessions, weeks * 7).map((s) => dayKey(s.finishedAt)),
  ).size;
  const expected = daysPerWeek * weeks;
  return expected ? Math.min(1, trained / expected) : null;
}

// ── personal records ────────────────────────────────────────────────────────
export interface ExerciseBest {
  maxWeight: number;
  max1RM: number;
  maxSetVolume: number;
}

export function bestByExercise(sessions: CompletedSession[]): Map<string, ExerciseBest> {
  const map = new Map<string, ExerciseBest>();
  // oldest first so "previous best" is well-defined
  const ordered = [...sessions].sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));
  for (const s of ordered) {
    for (const e of s.exercises) {
      for (const set of e.sets) {
        if (!set.done || set.warmup || !set.weight || !set.reps) continue;
        const cur = map.get(e.name) ?? { maxWeight: 0, max1RM: 0, maxSetVolume: 0 };
        map.set(e.name, {
          maxWeight: Math.max(cur.maxWeight, set.weight),
          max1RM: Math.max(cur.max1RM, epley1RM(set.weight, set.reps)),
          maxSetVolume: Math.max(cur.maxSetVolume, set.weight * set.reps),
        });
      }
    }
  }
  return map;
}

/** PRs set in `session`, given everything logged before it. */
export function detectPRs(session: { exercises: LoggedExercise[] }, priorSessions: CompletedSession[]): string[] {
  const prior = bestByExercise(priorSessions);
  const prs: string[] = [];
  for (const e of session.exercises) {
    let bestWeight = 0;
    let best1RM = 0;
    let bestSet: LoggedSet | null = null;
    for (const set of e.sets) {
      if (!set.done || !set.weight || !set.reps) continue;
      const oneRm = epley1RM(set.weight, set.reps);
      if (set.weight > bestWeight) bestWeight = set.weight;
      if (oneRm > best1RM) {
        best1RM = oneRm;
        bestSet = set;
      }
    }
    if (!bestSet) continue;
    const was = prior.get(e.name);
    if (!was || best1RM > was.max1RM || bestWeight > was.maxWeight) {
      prs.push(`${e.name} — ${bestSet.weight}×${bestSet.reps}`);
    }
  }
  return prs;
}

export interface PRRow {
  exercise: string;
  detail: string;
  date: string;
  e1rm: number;
}

/** Best set per exercise across all history, for the Progress PR list. */
export function allTimePRs(sessions: CompletedSession[]): PRRow[] {
  const rows = new Map<string, PRRow & { _1rm: number }>();
  for (const s of sessions) {
    for (const e of s.exercises) {
      for (const set of e.sets) {
        if (!set.done || set.warmup || !set.weight || !set.reps) continue;
        const oneRm = epley1RM(set.weight, set.reps);
        const cur = rows.get(e.name);
        if (!cur || oneRm > cur._1rm) {
          rows.set(e.name, {
            exercise: e.name,
            detail: `${set.weight}×${set.reps}`,
            date: s.finishedAt.slice(0, 10),
            e1rm: oneRm,
            _1rm: oneRm,
          });
        }
      }
    }
  }
  return [...rows.values()].sort((a, b) => b.e1rm - a.e1rm).map(({ _1rm, ...r }) => r);
}

/** Estimated-1RM point per session for one exercise, oldest → newest. */
export function strengthSeriesFor(sessions: CompletedSession[], exercise: string): { date: string; e1rm: number }[] {
  return [...sessions]
    .sort((a, b) => a.finishedAt.localeCompare(b.finishedAt))
    .map((s) => {
      const e = s.exercises.find((x) => x.name === exercise);
      if (!e) return null;
      let best = 0;
      for (const set of e.sets) {
        if (set.done && set.weight && set.reps) best = Math.max(best, epley1RM(set.weight, set.reps));
      }
      return best ? { date: s.finishedAt.slice(0, 10), e1rm: best } : null;
    })
    .filter((x): x is { date: string; e1rm: number } => x !== null);
}

/** The completed working sets of an exercise the last time it was trained. */
export function lastPerformance(
  sessions: CompletedSession[],
  exercise: string,
): { date: string; sets: { weight: number; reps: number }[] } | null {
  const ordered = [...sessions].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
  for (const s of ordered) {
    const e = s.exercises.find((x) => x.name === exercise);
    if (!e) continue;
    const sets = e.sets
      .filter((set) => set.done && set.weight != null && set.reps != null && !set.warmup)
      .map((set) => ({ weight: set.weight as number, reps: set.reps as number }));
    if (sets.length) return { date: s.finishedAt.slice(0, 10), sets };
  }
  return null;
}

/** A one-line "last time" summary, e.g. "175 × 8" (top set) or null. */
export function lastTopSet(
  sessions: CompletedSession[],
  exercise: string,
): { weight: number; reps: number } | null {
  const last = lastPerformance(sessions, exercise);
  if (!last) return null;
  return [...last.sets].sort((a, b) => b.weight * b.reps - a.weight * a.reps)[0] ?? null;
}

/** Exercise names that appear in logged history, most recent first. */
export function loggedExerciseNames(sessions: CompletedSession[]): string[] {
  const seen: string[] = [];
  for (const s of sessions) {
    for (const e of s.exercises) {
      if (e.sets.some((set) => set.done) && !seen.includes(e.name)) seen.push(e.name);
    }
  }
  return seen;
}
