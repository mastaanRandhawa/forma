/**
 * localStore — the app's real persistence layer for the no-backend build.
 *
 * Everything the user actually creates (their profile from onboarding, logged
 * workouts, recovery check-ins, quick logs) lives here in localStorage and is
 * read back through `useFormaData()`. Nothing here is demo data: an empty store
 * means the user genuinely has no data yet, and screens should say so.
 *
 * When `VITE_API_URL` is set a real backend would own this instead — this module
 * is the local stand-in, not a mock dataset.
 */
import { useSyncExternalStore } from "react";

const KEY = "forma.data.v1";

// ── types ───────────────────────────────────────────────────────────────────
export type Units = "lb" | "kg";
export type Experience = "beginner" | "intermediate" | "advanced";
export type Environment = "gym" | "home" | "both";

export interface Profile {
  name: string | null;
  goal: string | null;
  experience: Experience | null;
  daysPerWeek: number | null;
  sessionMin: number | null;
  units: Units;
  environment: Environment | null;
  equipment: string[];
  injuries: string;
  /** 0 = Sunday … 6 = Saturday */
  preferredDays: number[];
  bodyweight: number | null;
  onboardedAt: string | null;
}

export interface LoggedSet {
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  done: boolean;
}

export interface LoggedExercise {
  name: string;
  target: string;
  sets: LoggedSet[];
  skipped: boolean;
  /** backend ExercisePerformance id, when the session was started via the API */
  apiPerfId?: string;
  exerciseId?: string;
  /** "last time 60×8 → today 62.5×8" hint from the prescription engine (§2.1) */
  prescription?: { weightKg: number | null; reps: number | null; rpe: number | null; note: string } | null;
}

export interface ActiveSession {
  id: string;
  name: string;
  startedAt: string;
  /** backend WorkoutSession id, when started via the API */
  apiId?: string;
  exercises: LoggedExercise[];
  /** current exercise index */
  cursor: number;
  /** epoch ms the rest timer ends, or null */
  restEndsAt: number | null;
}

export interface CompletedSession {
  id: string;
  name: string;
  /** backend WorkoutSession id, when finished via the API */
  apiId?: string;
  startedAt: string;
  finishedAt: string;
  durationSec: number;
  exercises: LoggedExercise[];
  /** total working volume, in `units` */
  volume: number;
  units: Units;
  prs: string[];
}

export interface Checkin {
  /** YYYY-MM-DD */
  date: string;
  sleepH: number;
  sleepQuality: number; // 1–5
  fatigue: number; // 1–5
  soreness: number; // 1–5
  createdAt: string;
}

export interface QuickLog {
  id: string;
  type: "bodyweight" | "water";
  value: number;
  unit: string;
  at: string;
}

export interface MealEntry {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  label: string;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  at: string;
}

/** Manual override for the auto-derived daily nutrition targets. */
export interface NutritionTargets {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FormaData {
  profile: Profile;
  active: ActiveSession | null;
  sessions: CompletedSession[];
  checkins: Checkin[];
  quickLogs: QuickLog[];
  meals: MealEntry[];
  /** null → targets are derived from the training profile */
  nutritionTargets: NutritionTargets | null;
}

export const DEFAULT_PROFILE: Profile = {
  name: null,
  goal: null,
  experience: null,
  daysPerWeek: null,
  sessionMin: null,
  units: "lb",
  environment: null,
  equipment: [],
  injuries: "",
  preferredDays: [],
  bodyweight: null,
  onboardedAt: null,
};

const EMPTY: FormaData = {
  profile: DEFAULT_PROFILE,
  active: null,
  sessions: [],
  checkins: [],
  quickLogs: [],
  meals: [],
  nutritionTargets: null,
};

// ── storage ─────────────────────────────────────────────────────────────────
let cache: FormaData | null = null;
const listeners = new Set<() => void>();

function read(): FormaData {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FormaData>;
      cache = {
        ...EMPTY,
        ...parsed,
        profile: { ...DEFAULT_PROFILE, ...parsed.profile },
        sessions: parsed.sessions ?? [],
        checkins: parsed.checkins ?? [],
        quickLogs: parsed.quickLogs ?? [],
        meals: parsed.meals ?? [],
        nutritionTargets: parsed.nutritionTargets ?? null,
        active: parsed.active ?? null,
      };
      return cache;
    }
  } catch {
    /* private mode / corrupt — fall through to empty */
  }
  cache = EMPTY;
  return cache;
}

function write(next: FormaData) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode — keep the in-memory copy */
  }
  listeners.forEach((l) => l());
}

/** Cross-tab sync. */
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      cache = null;
      listeners.forEach((l) => l());
    }
  });
}

export function loadData(): FormaData {
  return read();
}

export function mutate(fn: (draft: FormaData) => FormaData): void {
  write(fn(read()));
}

export function useFormaData(): FormaData {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => EMPTY,
  );
}

// ── derived flags ───────────────────────────────────────────────────────────
/** Has the user produced any real data of their own? */
export function hasRealData(d: FormaData = read()): boolean {
  return (
    d.sessions.length > 0 ||
    d.checkins.length > 0 ||
    d.quickLogs.length > 0 ||
    d.meals.length > 0 ||
    Boolean(d.profile.onboardedAt)
  );
}

export function hasRecoveryData(d: FormaData = read()): boolean {
  return d.checkins.length > 0;
}

export function latestCheckin(d: FormaData = read()): Checkin | null {
  return d.checkins.length ? [...d.checkins].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] : null;
}

// ── mutations ───────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);

export function saveProfile(patch: Partial<Profile>): void {
  mutate((d) => ({
    ...d,
    profile: {
      ...d.profile,
      ...patch,
      onboardedAt: d.profile.onboardedAt ?? new Date().toISOString(),
    },
  }));
}

export interface StartExercise {
  name: string;
  target: string;
  exerciseId?: string;
  apiPerfId?: string;
  prescription?: LoggedExercise["prescription"];
  sets?: LoggedSet[];
}

export function startSession(
  name: string,
  plan: StartExercise[],
  meta?: { apiId?: string; startedAt?: string },
): ActiveSession {
  const session: ActiveSession = {
    id: meta?.apiId ?? uid(),
    apiId: meta?.apiId,
    name,
    startedAt: meta?.startedAt ?? new Date().toISOString(),
    cursor: 0,
    restEndsAt: null,
    exercises: plan.map((p) => ({
      name: p.name,
      target: p.target,
      exerciseId: p.exerciseId,
      apiPerfId: p.apiPerfId,
      prescription: p.prescription ?? null,
      skipped: false,
      sets: p.sets ?? [{ weight: null, reps: null, rpe: null, done: false }],
    })),
  };
  mutate((d) => ({ ...d, active: session }));
  return session;
}

export function updateActive(fn: (s: ActiveSession) => ActiveSession): void {
  mutate((d) => (d.active ? { ...d, active: fn(d.active) } : d));
}

export function abandonSession(): void {
  mutate((d) => ({ ...d, active: null }));
}

/** Finish the active session → a CompletedSession, clears `active`. */
export function finishSession(
  volume: number,
  units: Units,
  prs: string[],
  apiId?: string,
): CompletedSession | null {
  const d = read();
  if (!d.active) return null;
  const finishedAt = new Date().toISOString();
  const completed: CompletedSession = {
    id: d.active.id,
    apiId: apiId ?? d.active.apiId,
    name: d.active.name,
    startedAt: d.active.startedAt,
    finishedAt,
    durationSec: Math.max(
      0,
      Math.round((Date.parse(finishedAt) - Date.parse(d.active.startedAt)) / 1000),
    ),
    exercises: d.active.exercises.filter((e) => !e.skipped || e.sets.some((s) => s.done)),
    volume,
    units,
    prs,
  };
  write({ ...d, active: null, sessions: [completed, ...d.sessions] });
  return completed;
}

export function addCheckin(c: Omit<Checkin, "date" | "createdAt">): void {
  mutate((d) => {
    const entry: Checkin = { ...c, date: today(), createdAt: new Date().toISOString() };
    // one check-in per day — replace
    return { ...d, checkins: [entry, ...d.checkins.filter((x) => x.date !== entry.date)] };
  });
}

export function addQuickLog(type: QuickLog["type"], value: number, unit: string): void {
  mutate((d) => {
    const entry: QuickLog = { id: uid(), type, value, unit, at: new Date().toISOString() };
    const next = { ...d, quickLogs: [entry, ...d.quickLogs] };
    if (type === "bodyweight") next.profile = { ...d.profile, bodyweight: value };
    return next;
  });
}

/** Remove the most recent quick-log of a type logged today (an "undo" for tap-counters). */
export function removeLastQuickLog(type: QuickLog["type"]): void {
  mutate((d) => {
    const day = today();
    const idx = d.quickLogs.findIndex((q) => q.type === type && q.at.slice(0, 10) === day);
    if (idx < 0) return d;
    const next = [...d.quickLogs];
    next.splice(idx, 1);
    return { ...d, quickLogs: next };
  });
}

export function getSession(id: string, d: FormaData = read()): CompletedSession | null {
  return d.sessions.find((s) => s.id === id) ?? null;
}

// ── nutrition ───────────────────────────────────────────────────────────────
export function addMeal(entry: Omit<MealEntry, "id" | "date" | "at">): void {
  mutate((d) => {
    const meal: MealEntry = {
      ...entry,
      id: uid(),
      date: today(),
      at: new Date().toISOString(),
    };
    return { ...d, meals: [meal, ...d.meals] };
  });
}

export function removeMeal(id: string): void {
  mutate((d) => ({ ...d, meals: d.meals.filter((m) => m.id !== id) }));
}

export function saveNutritionTargets(t: NutritionTargets | null): void {
  mutate((d) => ({ ...d, nutritionTargets: t }));
}

/** Cups of water logged today (one QuickLog per cup). */
export function waterCupsToday(d: FormaData = read()): number {
  const day = today();
  return d.quickLogs.filter((q) => q.type === "water" && q.at.slice(0, 10) === day).length;
}
