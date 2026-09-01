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
import type { TemplateExercise } from "./workoutTemplates";

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
  /** warmup sets don't count toward working volume or PRs */
  warmup?: boolean;
}

export interface LoggedExercise {
  name: string;
  target: string;
  sets: LoggedSet[];
  /** permanently dropped from today's session */
  skipped: boolean;
  /** temporarily moved later in the queue ("machine busy" / "do later") */
  deferred?: boolean;
  deferReason?: string | null;
  /** original planned name, when the user swapped this exercise today */
  substitutedFrom?: string | null;
  /** exercises sharing a group value are trained back-to-back as a superset */
  supersetGroup?: number | null;
  /** backend ExercisePerformance id, when the session was started via the API */
  apiPerfId?: string;
  exerciseId?: string;
  /** "last time 60×8 → today 62.5×8" hint from the prescription engine (§2.1) */
  prescription?: { weightKg: number | null; reps: number | null; rpe: number | null; note: string } | null;
}

/**
 * A user-owned reusable workout template (local build). API build stores these
 * server-side as `Workout { isTemplate: true }`; `lib/templates.ts` bridges the
 * two so screens don't branch on `API_ENABLED`.
 */
export interface LocalTemplate {
  id: string;
  name: string;
  description: string;
  targetMuscles: string[];
  exercises: TemplateExercise[];
  createdAt: string;
  lastPerformedAt: string | null;
  timesCompleted: number;
  /** preset id / session id this was copied from, if any */
  sourceId?: string;
}

export interface ActiveSession {
  id: string;
  name: string;
  startedAt: string;
  /** backend WorkoutSession id, when started via the API */
  apiId?: string;
  /** local template id this session was started from, for stat tracking */
  templateId?: string;
  exercises: LoggedExercise[];
  /** index into `exercises` of the exercise currently in focus */
  cursor: number;
  /**
   * today's running sequence — indices into `exercises`, reordered as the user
   * defers / jumps around. The saved template/workout is never mutated; this is
   * session-only. Always a permutation of every exercise index.
   */
  order: number[];
  /** epoch ms the rest timer ends, or null */
  restEndsAt: number | null;
  /** paused (phone locked, interruption) — elapsed time excludes paused spans */
  paused?: boolean;
  /** epoch ms the current pause began */
  pausedAt?: number | null;
  /** accumulated paused milliseconds across the session */
  pausedMs?: number;
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
  /** user-built / saved-copy workout templates (local build) */
  localTemplates: LocalTemplate[];
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
  localTemplates: [],
  checkins: [],
  quickLogs: [],
  meals: [],
  nutritionTargets: null,
};

/** Backfill session-queue / pause fields on sessions saved by an older build. */
function normalizeActive(a: ActiveSession): ActiveSession {
  const next = { ...a };
  if (!Array.isArray(next.order) || next.order.length !== next.exercises.length) {
    const seen = new Set<number>();
    const order = (Array.isArray(next.order) ? next.order : []).filter(
      (i) => Number.isInteger(i) && i >= 0 && i < next.exercises.length && !seen.has(i) && seen.add(i),
    );
    next.exercises.forEach((_, i) => {
      if (!seen.has(i)) order.push(i);
    });
    next.order = order;
  }
  if (typeof next.cursor !== "number" || next.cursor < 0 || next.cursor >= next.exercises.length) {
    next.cursor = next.order[0] ?? 0;
  }
  if (typeof next.pausedMs !== "number") next.pausedMs = 0;
  if (typeof next.paused !== "boolean") next.paused = false;
  return next;
}

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
        localTemplates: parsed.localTemplates ?? [],
        checkins: parsed.checkins ?? [],
        quickLogs: parsed.quickLogs ?? [],
        meals: parsed.meals ?? [],
        nutritionTargets: parsed.nutritionTargets ?? null,
        active: parsed.active ? normalizeActive(parsed.active) : null,
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
  supersetGroup?: number | null;
}

/** Blank sets seeded from a target like "4 × 6–8" → 4 sets (1–8, else 3). */
function seedSets(target: string, reps: number | null = null): LoggedSet[] {
  const n = Number(target.match(/^\s*(\d+)/)?.[1]);
  const count = Number.isFinite(n) && n >= 1 && n <= 8 ? n : 3;
  return Array.from({ length: count }, () => ({ weight: null, reps, rpe: null, done: false }));
}

export function startSession(
  name: string,
  plan: StartExercise[],
  meta?: { apiId?: string; startedAt?: string; templateId?: string },
): ActiveSession {
  const session: ActiveSession = {
    id: meta?.apiId ?? uid(),
    apiId: meta?.apiId,
    templateId: meta?.templateId,
    name,
    startedAt: meta?.startedAt ?? new Date().toISOString(),
    cursor: 0,
    order: plan.map((_, i) => i),
    restEndsAt: null,
    paused: false,
    pausedAt: null,
    pausedMs: 0,
    exercises: plan.map((p) => ({
      name: p.name,
      target: p.target,
      exerciseId: p.exerciseId,
      apiPerfId: p.apiPerfId,
      prescription: p.prescription ?? null,
      skipped: false,
      deferred: false,
      deferReason: null,
      substitutedFrom: null,
      supersetGroup: p.supersetGroup ?? null,
      sets: p.sets ?? seedSets(p.target),
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
  const localTemplates = d.active.templateId
    ? d.localTemplates.map((t) =>
        t.id === d.active!.templateId
          ? { ...t, lastPerformedAt: finishedAt, timesCompleted: t.timesCompleted + 1 }
          : t,
      )
    : d.localTemplates;
  write({ ...d, active: null, sessions: [completed, ...d.sessions], localTemplates });
  return completed;
}

// ── workout templates (local build) ─────────────────────────────────────────
export interface TemplateDraft {
  name: string;
  description?: string;
  targetMuscles?: string[];
  exercises: TemplateExercise[];
  sourceId?: string;
}

export function saveLocalTemplate(draft: TemplateDraft): LocalTemplate {
  const tpl: LocalTemplate = {
    id: uid(),
    name: draft.name,
    description: draft.description ?? "",
    targetMuscles: draft.targetMuscles ?? [],
    exercises: draft.exercises,
    createdAt: new Date().toISOString(),
    lastPerformedAt: null,
    timesCompleted: 0,
    sourceId: draft.sourceId,
  };
  mutate((d) => ({ ...d, localTemplates: [tpl, ...d.localTemplates] }));
  return tpl;
}

export function updateLocalTemplate(id: string, patch: Partial<TemplateDraft>): void {
  mutate((d) => ({
    ...d,
    localTemplates: d.localTemplates.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  }));
}

export function deleteLocalTemplate(id: string): void {
  mutate((d) => ({ ...d, localTemplates: d.localTemplates.filter((t) => t.id !== id) }));
}

export function duplicateLocalTemplate(id: string): LocalTemplate | null {
  const src = read().localTemplates.find((t) => t.id === id);
  if (!src) return null;
  return saveLocalTemplate({
    name: `${src.name} copy`,
    description: src.description,
    targetMuscles: src.targetMuscles,
    exercises: src.exercises,
    sourceId: src.id,
  });
}

export function getLocalTemplate(id: string, d: FormaData = read()): LocalTemplate | null {
  return d.localTemplates.find((t) => t.id === id) ?? null;
}

/** Rebuild a `StartExercise[]` from a past session — the "repeat workout" path. */
export function repeatFromCompleted(session: CompletedSession): StartExercise[] {
  return session.exercises
    .filter((e) => !e.skipped)
    .map((e) => {
      const working = e.sets.filter((s) => !s.warmup);
      const top = [...working]
        .filter((s) => s.weight != null && s.reps != null)
        .sort((a, b) => (b.weight ?? 0) * (b.reps ?? 0) - (a.weight ?? 0) * (a.reps ?? 0))[0];
      const base = working.length ? working : e.sets;
      return {
        name: e.name,
        target: e.target || `${base.length} × ${top?.reps ?? 8}`,
        exerciseId: e.exerciseId,
        supersetGroup: e.supersetGroup ?? null,
        prescription: top
          ? { weightKg: null, reps: top.reps ?? null, rpe: null, note: "match or beat last time" }
          : null,
        sets: base.map((s) => ({
          weight: s.weight ?? null,
          reps: s.reps ?? null,
          rpe: null,
          done: false,
        })),
      };
    });
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
