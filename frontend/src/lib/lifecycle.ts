/**
 * Workout-lifecycle bridge (§6 of backend/BACKEND-REQUIREMENTS.md).
 *
 * When `VITE_API_URL` is set the session lives on the server: start seeds
 * prescribed targets, every set is written through as it's logged, and finish
 * returns the computed volume / PRs / trainer comment. localStore stays the
 * optimistic UI cache so the logger still feels instant and survives a reload.
 *
 * When the API is disabled every function here is a no-op and the pages fall
 * back to their existing localStore-only path.
 */
import { api } from "../api/client";
import { API_ENABLED } from "../api/hooks";
import { startSession, type ActiveSession, type CompletedSession, type StartExercise, type Units } from "./localStore";
import type { Workout, WorkoutSession } from "../api/types";

const LB_PER_KG = 2.2046226218;
export const toKg = (v: number, units: Units) => (units === "kg" ? v : Math.round((v / LB_PER_KG) * 100) / 100);
export const fromKg = (kg: number, units: Units) => (units === "kg" ? kg : Math.round(kg * LB_PER_KG * 10) / 10);

function repRange(min: number | null, max: number | null): string {
  if (min && max && min !== max) return `${min}–${max}`;
  return String(min ?? max ?? "");
}

/** Start an API-backed session from a real workout and mirror it into localStore. */
export async function startApiSessionFromWorkout(workout: Workout, units: Units): Promise<ActiveSession | null> {
  if (!API_ENABLED) return null;
  const session = await api.sessions.start({ workoutId: workout.id });
  const byOrder = new Map(session.performances.map((p) => [p.order, p]));

  const plan: StartExercise[] = workout.exercises.map((we) => {
    const perf = byOrder.get(we.order);
    const rxWeightKg = perf?.prescribedWeightKg ?? we.targetWeightKg ?? null;
    const rxWeight = rxWeightKg != null ? fromKg(rxWeightKg, units) : null;
    const rxReps = perf?.prescribedReps ?? we.targetRepsMax ?? null;
    const note = (perf?.prescriptionAudit?.output as { note?: string } | undefined)?.note ?? "";
    return {
      name: we.exercise.name,
      target: `${we.targetSets} × ${repRange(we.targetRepsMin, we.targetRepsMax)}`,
      exerciseId: we.exerciseId,
      apiPerfId: perf?.id,
      prescription: perf
        ? { weightKg: perf.prescribedWeightKg ?? null, reps: perf.prescribedReps ?? null, rpe: perf.prescribedRpe ?? null, note }
        : null,
      sets: Array.from({ length: Math.max(1, we.targetSets) }, () => ({
        weight: rxWeight,
        reps: rxReps,
        rpe: null,
        done: false,
      })),
    };
  });

  return startSession(workout.name, plan, { apiId: session.id, startedAt: session.startedAt });
}

/** Write one set through to the server. Best-effort — never blocks the UI. */
export async function syncSet(
  active: ActiveSession,
  exIndex: number,
  setIndex: number,
  units: Units,
): Promise<void> {
  if (!API_ENABLED || !active.apiId) return;
  const ex = active.exercises[exIndex];
  const set = ex?.sets[setIndex];
  if (!ex?.apiPerfId || !set) return;
  await api.sessions
    .logSet(active.apiId, ex.apiPerfId, setIndex + 1, {
      weightKg: set.weight == null ? null : toKg(set.weight, units),
      reps: set.reps,
      rpe: set.rpe,
      isWarmup: set.warmup ?? false,
      completed: set.done,
    })
    .catch(() => {});
}

/**
 * Create a server-side ExercisePerformance for an exercise added or substituted
 * in mid-session (the backend already exposes POST /sessions/:id/performances).
 * Resolves the backend exercise id from the library by name, attaches the new
 * `apiPerfId` to the local exercise, then flushes any sets already logged on it.
 * Best-effort: on any failure the exercise simply stays local-only.
 */
export async function syncNewPerformance(
  active: ActiveSession,
  exIndex: number,
  units: Units,
): Promise<void> {
  if (!API_ENABLED || !active.apiId) return;
  const ex = active.exercises[exIndex];
  if (!ex || ex.apiPerfId) return;
  try {
    let exerciseId = ex.exerciseId;
    if (!exerciseId) {
      const found = await api.library.exercises({ q: ex.name, take: 1 });
      exerciseId = found.items[0]?.id;
    }
    if (!exerciseId) return;
    const order = active.exercises.length + exIndex; // keep it after the planned rows
    const perf = await api.sessions.addPerformance(active.apiId, exerciseId, order);
    const { updateActive } = await import("./localStore");
    updateActive((s) => ({
      ...s,
      exercises: s.exercises.map((e, i) =>
        i === exIndex ? { ...e, apiPerfId: perf.id, exerciseId } : e,
      ),
    }));
    const fresh = (await import("./localStore")).loadData().active;
    if (fresh) for (let i = 0; i < (fresh.exercises[exIndex]?.sets.length ?? 0); i++) await syncSet(fresh, exIndex, i, units);
  } catch {
    /* stays local-only */
  }
}

export async function syncDeleteSet(
  active: ActiveSession,
  exIndex: number,
  setIndex: number,
): Promise<void> {
  if (!API_ENABLED || !active.apiId) return;
  const ex = active.exercises[exIndex];
  if (!ex?.apiPerfId) return;
  await api.sessions.deleteSet(active.apiId, ex.apiPerfId, setIndex + 1).catch(() => {});
}

/** Finish server-side; returns the computed session (volume, PRs, comment). */
export async function finishApiSession(active: ActiveSession, durationSeconds: number) {
  if (!API_ENABLED || !active.apiId) return null;
  return api.sessions.finish(active.apiId, { durationSeconds }).catch(() => null);
}

export async function abandonApiSession(active: ActiveSession): Promise<void> {
  if (!API_ENABLED || !active.apiId) return;
  await api.sessions.abandon(active.apiId).catch(() => {});
}

/**
 * Map an API `WorkoutSession` onto the local `CompletedSession` shape so the
 * existing `lib/fitness` derivations (Progress, Home) run unchanged over server
 * data. Weights are converted into the user's display unit.
 */
export function apiSessionToCompleted(s: WorkoutSession, units: Units): CompletedSession {
  return {
    id: s.id,
    apiId: s.id,
    name: s.name,
    startedAt: s.startedAt,
    finishedAt: s.endedAt ?? s.startedAt,
    durationSec: s.durationSeconds,
    exercises: (s.performances ?? []).map((p) => ({
      name: p.exercise?.name ?? "exercise",
      target: "",
      skipped: false,
      sets: (p.sets ?? []).map((set) => ({
        weight: set.weightKg == null ? null : fromKg(set.weightKg, units),
        reps: set.reps ?? null,
        rpe: set.rpe ?? null,
        done: !!set.completedAt,
      })),
    })),
    volume: units === "kg" ? Math.round(s.totalVolumeKg) : Math.round(s.totalVolumeKg * 2.2046226218),
    units,
    prs: (s.personalRecords ?? []).map((pr) => `${pr.exercise?.name ?? "lift"} — ${pr.recordType.replace(/_/g, " ")}`),
  };
}
