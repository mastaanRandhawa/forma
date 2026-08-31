/**
 * session — the active-workout state machine, layered on top of the existing
 * `ActiveSession` in localStore. Nothing here owns state: every function is a
 * pure derivation over the session, or returns a new session for `updateActive`.
 *
 * The saved workout template is never touched. `session.order` is today's
 * running sequence; deferring / jumping / substituting only edits that and the
 * per-exercise flags (`deferred`, `skipped`, `substitutedFrom`).
 */
import type { ActiveSession, LoggedExercise, LoggedSet } from "./localStore";
import type { RepDbCatalogEntry } from "./repdb";

// ── phases ──────────────────────────────────────────────────────────────────
export type ExercisePhase = "done" | "active" | "deferred" | "skipped" | "pending";

export function isExerciseComplete(ex: LoggedExercise): boolean {
  const working = ex.sets.filter((s) => !s.warmup);
  return working.length > 0 && working.every((s) => s.done);
}

export function exercisePhase(
  ex: LoggedExercise,
  exIndex: number,
  session: ActiveSession,
): ExercisePhase {
  if (ex.skipped) return "skipped";
  if (isExerciseComplete(ex)) return "done";
  if (exIndex === session.cursor) return "active";
  if (ex.deferred) return "deferred";
  return "pending";
}

export interface QueueRow {
  ex: LoggedExercise;
  index: number;
  phase: ExercisePhase;
  /** position among trainable (non-skipped) exercises, 1-based */
  position: number;
}

/** Every exercise in today's running order, tagged with its phase. */
export function sessionQueue(session: ActiveSession): QueueRow[] {
  let position = 0;
  return session.order.map((index) => {
    const ex = session.exercises[index];
    const phase = exercisePhase(ex, index, session);
    if (phase !== "skipped") position += 1;
    return { ex, index, phase, position };
  });
}

export function currentExercise(session: ActiveSession): LoggedExercise | null {
  return session.exercises[session.cursor] ?? null;
}

/** exercises[] index of the first set not yet done on the current exercise. */
export function activeSetIndex(ex: LoggedExercise): number {
  const i = ex.sets.findIndex((s) => !s.done);
  return i === -1 ? ex.sets.length - 1 : i;
}

export interface SessionProgress {
  exercisesDone: number;
  exercisesTotal: number;
  setsDone: number;
  setsTotal: number;
  fraction: number;
}

export function sessionProgress(session: ActiveSession): SessionProgress {
  const live = session.exercises.filter((e) => !e.skipped);
  const exercisesTotal = live.length;
  const exercisesDone = live.filter(isExerciseComplete).length;
  let setsDone = 0;
  let setsTotal = 0;
  for (const e of live)
    for (const s of e.sets) {
      setsTotal += 1;
      if (s.done) setsDone += 1;
    }
  return {
    exercisesDone,
    exercisesTotal,
    setsDone,
    setsTotal,
    fraction: setsTotal ? setsDone / setsTotal : 0,
  };
}

// ── queue transitions (return a new session) ────────────────────────────────
function withOrder(session: ActiveSession, order: number[]): ActiveSession {
  return { ...session, order };
}

/** Next exercise in the queue that still needs work; -1 when the session is done. */
export function nextPendingIndex(session: ActiveSession, from = session.cursor): ActiveSession["cursor"] {
  const pos = session.order.indexOf(from);
  for (let step = 1; step <= session.order.length; step++) {
    const idx = session.order[(pos + step) % session.order.length];
    const ex = session.exercises[idx];
    if (!ex.skipped && !isExerciseComplete(ex)) return idx;
  }
  return -1;
}

/** Move focus to a specific exercise (jump ahead or back). */
export function focusExercise(session: ActiveSession, exIndex: number): ActiveSession {
  if (exIndex < 0 || exIndex >= session.exercises.length) return session;
  return { ...session, cursor: exIndex };
}

/** Advance to the next exercise that needs work after finishing one. */
export function advance(session: ActiveSession): ActiveSession {
  const next = nextPendingIndex(session);
  return next === -1 ? session : { ...session, cursor: next };
}

/** "Do later" / "machine busy" — move the exercise to the end of today's queue. */
export function deferExercise(
  session: ActiveSession,
  exIndex: number,
  reason: string | null = null,
): ActiveSession {
  const order = session.order.filter((i) => i !== exIndex);
  order.push(exIndex);
  let s = withOrder(
    {
      ...session,
      exercises: session.exercises.map((e, i) =>
        i === exIndex ? { ...e, deferred: true, deferReason: reason } : e,
      ),
    },
    order,
  );
  if (session.cursor === exIndex) {
    const next = nextPendingIndex(s, exIndex);
    s = { ...s, cursor: next === -1 ? exIndex : next };
  }
  return s;
}

/** Pull a deferred exercise back to right after the current one and focus it. */
export function resumeExercise(session: ActiveSession, exIndex: number): ActiveSession {
  const order = session.order.filter((i) => i !== exIndex);
  const at = order.indexOf(session.cursor);
  order.splice(at + 1, 0, exIndex);
  return {
    ...withOrder(session, order),
    cursor: exIndex,
    exercises: session.exercises.map((e, i) =>
      i === exIndex ? { ...e, deferred: false, deferReason: null } : e,
    ),
  };
}

export function setSkipped(session: ActiveSession, exIndex: number, skipped: boolean): ActiveSession {
  let s: ActiveSession = {
    ...session,
    exercises: session.exercises.map((e, i) =>
      i === exIndex ? { ...e, skipped, deferred: skipped ? false : e.deferred } : e,
    ),
  };
  if (skipped && session.cursor === exIndex) {
    const next = nextPendingIndex(s, exIndex);
    if (next !== -1) s = { ...s, cursor: next };
  }
  return s;
}

/** Swap the exercise in place, remembering the original name. */
export function substituteExercise(
  session: ActiveSession,
  exIndex: number,
  name: string,
  meta?: { exerciseId?: string; target?: string },
): ActiveSession {
  return {
    ...session,
    exercises: session.exercises.map((e, i) => {
      if (i !== exIndex) return e;
      return {
        ...e,
        substitutedFrom: e.substitutedFrom ?? e.name,
        name,
        exerciseId: meta?.exerciseId ?? e.exerciseId,
        apiPerfId: undefined, // server perf row no longer matches; log stays local
        target: meta?.target ?? e.target,
        deferred: false,
        deferReason: null,
        sets: e.sets.map((s) => ({ ...s, done: false })),
      };
    }),
  };
}

// ── set editing helpers ─────────────────────────────────────────────────────
export const STEP = { weight: 5, weightKg: 2.5, reps: 1 };

export function addWorkingSet(ex: LoggedExercise): LoggedExercise {
  const last = [...ex.sets].reverse().find((s) => !s.warmup) ?? ex.sets[ex.sets.length - 1];
  return {
    ...ex,
    sets: [
      ...ex.sets,
      { weight: last?.weight ?? null, reps: last?.reps ?? null, rpe: null, done: false },
    ],
  };
}

export function addWarmupSet(ex: LoggedExercise): LoggedExercise {
  const first = ex.sets.find((s) => !s.warmup);
  const w = first?.weight ? Math.round((first.weight * 0.5) / 5) * 5 : null;
  return {
    ...ex,
    sets: [{ weight: w, reps: first?.reps ?? 8, rpe: null, done: false, warmup: true }, ...ex.sets],
  };
}

// ── trainer cues ────────────────────────────────────────────────────────────
export type CueEvent =
  | "start"
  | "before-set"
  | "set-done"
  | "rest"
  | "rest-over"
  | "pr"
  | "deferred"
  | "resumed"
  | "substituted"
  | "exercise-done"
  | "almost-done"
  | "finish";

export interface CueContext {
  exerciseName?: string;
  setsLeftInExercise?: number;
  exercisesLeft?: number;
  totalExercises?: number;
  heavierThanLast?: boolean;
  lighterThanLast?: boolean;
  restSeconds?: number;
  prDetail?: string;
}

const pick = (arr: string[], seed = Date.now()) => arr[Math.floor(seed / 1000) % arr.length];

/** A short, contextual line for Kai. Deterministic-ish so it doesn't flicker. */
export function trainerCue(event: CueEvent, ctx: CueContext = {}): string {
  switch (event) {
    case "start":
      return ctx.totalExercises
        ? pick([
            `Ready? ${ctx.totalExercises} exercises today. Let's move.`,
            `${ctx.totalExercises} on the board. First up: ${ctx.exerciseName ?? "let's go"}.`,
          ])
        : "Let's get to work.";
    case "before-set":
      if (ctx.heavierThanLast) return "Heavier than last time — brace hard and own it.";
      if (ctx.lighterThanLast) return "Lighter today. Move it fast and clean.";
      return pick(["Match last time. Controlled reps.", "You know this one. Tight and steady."]);
    case "set-done":
      if ((ctx.setsLeftInExercise ?? 0) <= 0) return "That's the exercise done. Nice work.";
      if ((ctx.setsLeftInExercise ?? 0) === 1) return "One set left. Make it count.";
      return pick([
        `Good set. ${ctx.setsLeftInExercise} to go.`,
        `Logged. ${ctx.setsLeftInExercise} more.`,
      ]);
    case "rest":
      return ctx.restSeconds && ctx.restSeconds >= 120
        ? "Big set — take the full rest. Breathe."
        : "Good set. Recover for the next one.";
    case "rest-over":
      return pick(["Time. Chalk up.", "Rest's up — next set."]);
    case "pr":
      return ctx.prDetail ? `That's a new best — ${ctx.prDetail}. Huge.` : "New personal record. Huge.";
    case "deferred":
      return ctx.exerciseName
        ? `No problem — we'll come back to ${ctx.exerciseName}. Moving on.`
        : "No problem. We'll circle back to that one.";
    case "resumed":
      return ctx.exerciseName ? `Back to ${ctx.exerciseName}. Pick up where we left off.` : "Back to it.";
    case "substituted":
      return ctx.exerciseName ? `Swapped in ${ctx.exerciseName}. Same target, keep the intent.` : "Swapped. Keep the intent.";
    case "exercise-done":
      return (ctx.exercisesLeft ?? 0) > 0
        ? pick([`Done. ${ctx.exercisesLeft} exercise${ctx.exercisesLeft === 1 ? "" : "s"} left.`, "Solid. Next one."])
        : "That's everything. Let's close it out.";
    case "almost-done":
      return "One exercise left. Finish strong.";
    case "finish":
      return pick(["Great session.", "That's the work. Well done.", "Strong session — recover well."]);
  }
}

// ── exercise substitution suggestions ──────────────────────────────────────
let catalogPromise: Promise<RepDbCatalogEntry[]> | null = null;
function catalog(): Promise<RepDbCatalogEntry[]> {
  catalogPromise ??= import("./repdb.catalog").then((m) => m.REPDB_CATALOG);
  return catalogPromise;
}

const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export interface SubstituteSuggestion {
  name: string;
  equipment: string;
  primary: string;
  reason: string;
}

/**
 * Alternatives that hit the same primary muscle and movement pattern.
 * `avoidEquipment` down-ranks anything needing gear the user says is unavailable.
 */
export async function suggestSubstitutes(
  name: string,
  opts: { avoidEquipment?: string[]; limit?: number } = {},
): Promise<SubstituteSuggestion[]> {
  const all = await catalog();
  const key = normName(name);
  const source =
    all.find((e) => normName(e.name) === key) ??
    all.find((e) => normName(e.name).includes(key) || key.includes(normName(e.name)));
  if (!source || !source.primary.length) return [];
  const target = source.primary[0];
  const avoid = new Set((opts.avoidEquipment ?? []).map((e) => e.toLowerCase()));

  return all
    .filter((e) => e.id !== source.id && e.primary.includes(target))
    .map((e) => {
      let score = 0;
      if (e.primary[0] === target) score += 3;
      if (e.mechanic && e.mechanic === source.mechanic) score += 2;
      if (e.equipment === source.equipment) score += 1;
      if (avoid.has(e.equipment.toLowerCase())) score -= 5;
      if (e.bodyweight) score += 0.5;
      return { e, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.limit ?? 5)
    .map(({ e }) => ({
      name: e.name,
      equipment: e.equipment,
      primary: e.primary[0] ?? target,
      reason:
        e.mechanic === source.mechanic && e.mechanic
          ? `same ${target.toLowerCase()} · ${e.mechanic}`
          : `same ${target.toLowerCase()}`,
    }));
}

export type { LoggedSet };
