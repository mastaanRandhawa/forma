/**
 * templates — dual-mode workout-template & session-start service.
 *
 * Screens call these and never branch on `API_ENABLED` themselves:
 *   • API build  → templates are server `Workout { isTemplate: true }` rows,
 *                  sessions are real `WorkoutSession`s with set write-through.
 *   • local build → templates live in `localStore.localTemplates`, sessions are
 *                  the localStorage `ActiveSession`.
 *
 * Exercise names are resolved to backend exercise ids the same way
 * `lib/lifecycle.ts` does it (`api.library.exercises({ q, take: 1 })`).
 */
import { api } from "../api/client";
import { API_ENABLED } from "../api/hooks";
import {
  loadData,
  updateActive,
  startSession,
  saveLocalTemplate,
  updateLocalTemplate,
  deleteLocalTemplate,
  duplicateLocalTemplate,
  getLocalTemplate,
  repeatFromCompleted,
  type CompletedSession,
  type LocalTemplate,
  type Units,
  type ActiveSession,
} from "./localStore";
import { startApiSessionFromWorkout, syncNewPerformance } from "./lifecycle";
import {
  templateToStartExercises,
  templateDurationMin,
  type TemplateExercise,
  type WorkoutTemplate,
} from "./workoutTemplates";
import type { Workout } from "../api/types";

// ── normalized row the UI renders ──────────────────────────────────────────
export interface TemplateRow {
  id: string;
  name: string;
  description: string;
  targetMuscles: string[];
  exerciseCount: number;
  durationMin: number;
  lastPerformed: string | null;
  timesCompleted: number;
  /** system presets can't be edited in place; user templates can */
  editable: boolean;
  origin: "local" | "api" | "preset";
  exercises: TemplateExercise[];
  _api?: Workout;
}

export interface TemplateDraftInput {
  name: string;
  description?: string;
  targetMuscles?: string[];
  exercises: TemplateExercise[];
  sourceId?: string;
}

const repRange = (min: number | null, max: number | null) =>
  min && max && min !== max ? `${min}–${max}` : String(min ?? max ?? "");

// ── conversions ───────────────────────────────────────────────────────────
function localToRow(t: LocalTemplate): TemplateRow {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    targetMuscles: t.targetMuscles,
    exerciseCount: t.exercises.length,
    durationMin: templateDurationMin(t.exercises),
    lastPerformed: t.lastPerformedAt,
    timesCompleted: t.timesCompleted,
    editable: true,
    origin: "local",
    exercises: t.exercises,
  };
}

function workoutToExercises(w: Workout): TemplateExercise[] {
  return w.exercises.map((we) => ({
    name: we.exercise.name,
    sets: we.targetSets,
    repsMin: we.targetRepsMin ?? 8,
    repsMax: we.targetRepsMax ?? we.targetRepsMin ?? 12,
    restSec: we.targetRestSec ?? 90,
    note: we.notes ?? undefined,
    supersetGroup: we.supersetGroup ?? undefined,
  }));
}

function workoutToRow(w: Workout): TemplateRow {
  const exercises = workoutToExercises(w);
  return {
    id: w.id,
    name: w.name,
    description: w.notes ?? "",
    targetMuscles: w.targetMuscleKeys,
    exerciseCount: w.exercises.length,
    durationMin: w.estimatedDurationMin ?? templateDurationMin(exercises),
    lastPerformed: null,
    timesCompleted: 0,
    editable: true,
    origin: "api",
    exercises,
    _api: w,
  };
}

export function presetToRow(t: WorkoutTemplate): TemplateRow {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    targetMuscles: t.targetMuscles,
    exerciseCount: t.exercises.length,
    durationMin: t.durationMin,
    lastPerformed: null,
    timesCompleted: 0,
    editable: false,
    origin: "preset",
    exercises: t.exercises,
  };
}

// ── name → exerciseId resolution (API build) ──────────────────────────────
const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function resolveExerciseId(name: string): Promise<string | null> {
  try {
    const found = await api.library.exercises({ q: name, take: 12 });
    if (found.items.length === 0) return null;
    const key = normName(name);
    // prefer an exact name match over the search engine's fuzzy first hit
    const exact = found.items.find((e) => normName(e.name) === key);
    if (exact) return exact.id;
    const contains = found.items.find(
      (e) => normName(e.name).includes(key) || key.includes(normName(e.name)),
    );
    return (contains ?? found.items[0]).id;
  } catch {
    return null;
  }
}

async function toWorkoutInputExercises(exercises: TemplateExercise[]) {
  const out: NonNullable<import("../api/types").WorkoutInput["exercises"]> = [];
  let order = 0;
  for (const e of exercises) {
    const id = await resolveExerciseId(e.name);
    if (!id) continue; // best-effort: unresolved exercises are dropped server-side
    out.push({
      exerciseId: id,
      order: order++,
      targetSets: Math.max(1, e.sets),
      targetRepsMin: e.repsMin,
      targetRepsMax: e.repsMax,
      targetRestSec: e.restSec,
      notes: e.note,
      supersetGroup: e.supersetGroup ?? null,
      supersetType: e.supersetGroup != null ? "superset" : "straight",
    });
  }
  return out;
}

// ── list ──────────────────────────────────────────────────────────────────
export async function listTemplates(): Promise<TemplateRow[]> {
  if (API_ENABLED) {
    const workouts = await api.workouts.list({ template: "true" });
    return workouts.map(workoutToRow);
  }
  return loadData().localTemplates.map(localToRow);
}

export async function getTemplate(id: string): Promise<TemplateRow | null> {
  if (API_ENABLED) {
    try {
      return workoutToRow(await api.workouts.get(id));
    } catch {
      return null;
    }
  }
  const t = getLocalTemplate(id);
  return t ? localToRow(t) : null;
}

// ── mutations ─────────────────────────────────────────────────────────────
export async function createTemplate(draft: TemplateDraftInput): Promise<TemplateRow> {
  if (API_ENABLED) {
    const w = await api.workouts.create({
      name: draft.name,
      source: "manual",
      isTemplate: true,
      targetMuscleKeys: draft.targetMuscles ?? [],
      estimatedDurationMin: templateDurationMin(draft.exercises),
      notes: draft.description,
      exercises: await toWorkoutInputExercises(draft.exercises),
    });
    return workoutToRow(w);
  }
  return localToRow(
    saveLocalTemplate({
      name: draft.name,
      description: draft.description,
      targetMuscles: draft.targetMuscles,
      exercises: draft.exercises,
      sourceId: draft.sourceId,
    }),
  );
}

export async function updateTemplate(id: string, draft: TemplateDraftInput): Promise<TemplateRow> {
  if (API_ENABLED) {
    const w = await api.workouts.update(id, {
      name: draft.name,
      targetMuscleKeys: draft.targetMuscles ?? [],
      estimatedDurationMin: templateDurationMin(draft.exercises),
      notes: draft.description,
      exercises: await toWorkoutInputExercises(draft.exercises),
    });
    return workoutToRow(w);
  }
  updateLocalTemplate(id, {
    name: draft.name,
    description: draft.description,
    targetMuscles: draft.targetMuscles,
    exercises: draft.exercises,
  });
  const t = getLocalTemplate(id);
  return localToRow(t!);
}

export async function deleteTemplate(id: string): Promise<void> {
  if (API_ENABLED) {
    await api.workouts.remove(id);
    return;
  }
  deleteLocalTemplate(id);
}

export async function duplicateTemplate(row: TemplateRow): Promise<TemplateRow> {
  // presets and past sessions always become a fresh user template
  if (row.origin === "preset") {
    return createTemplate({
      name: `${row.name} (my copy)`,
      description: row.description,
      targetMuscles: row.targetMuscles,
      exercises: row.exercises,
      sourceId: row.id,
    });
  }
  if (API_ENABLED) {
    return workoutToRow(await api.workouts.duplicate(row.id, { asTemplate: true }));
  }
  const copy = duplicateLocalTemplate(row.id);
  return localToRow(copy!);
}

export async function renameTemplate(row: TemplateRow, name: string): Promise<void> {
  await updateTemplate(row.id, {
    name,
    description: row.description,
    targetMuscles: row.targetMuscles,
    exercises: row.exercises,
  });
}

/** Build a template from a finished session (summary / history "save as template"). */
export async function saveSessionAsTemplate(session: CompletedSession): Promise<TemplateRow> {
  const exercises: TemplateExercise[] = session.exercises
    .filter((e) => !e.skipped)
    .map((e) => {
      const working = e.sets.filter((s) => !s.warmup);
      const reps = working.map((s) => s.reps).filter((r): r is number => r != null);
      const lo = reps.length ? Math.min(...reps) : 8;
      const hi = reps.length ? Math.max(...reps) : 12;
      return {
        name: e.name,
        sets: Math.max(1, working.length),
        repsMin: lo,
        repsMax: hi,
        restSec: 90,
        supersetGroup: e.supersetGroup ?? undefined,
      };
    });
  return createTemplate({
    name: session.name,
    description: `saved from ${new Date(session.finishedAt).toLocaleDateString()}`,
    exercises,
    sourceId: session.id,
  });
}

// ── starting sessions ─────────────────────────────────────────────────────
/** Best-effort: attach a server WorkoutSession to the current local session. */
async function attachApiSession(name: string, units: Units): Promise<void> {
  if (!API_ENABLED) return;
  try {
    const s = await api.sessions.start({ name });
    updateActive((a) => ({ ...a, apiId: s.id }));
    const fresh = loadData().active;
    if (!fresh) return;
    for (let i = 0; i < fresh.exercises.length; i++) {
      const cur = loadData().active;
      if (cur) await syncNewPerformance(cur, i, units);
    }
  } catch {
    /* stays local-only */
  }
}

export async function startFromTemplateRow(row: TemplateRow, units: Units): Promise<void> {
  if (API_ENABLED && row._api) {
    await startApiSessionFromWorkout(row._api, units);
    return;
  }
  startSession(
    row.name,
    templateToStartExercises({ exercises: row.exercises }),
    row.origin === "local" ? { templateId: row.id } : undefined,
  );
  await attachApiSession(row.name, units);
}

export async function startFromPreset(preset: WorkoutTemplate, units: Units): Promise<void> {
  startSession(preset.name, templateToStartExercises(preset));
  await attachApiSession(preset.name, units);
}

export async function startQuick(units: Units): Promise<void> {
  startSession("quick workout", []);
  if (API_ENABLED) {
    try {
      const s = await api.sessions.start({ name: "quick workout" });
      updateActive((a) => ({ ...a, apiId: s.id }));
    } catch {
      /* local-only */
    }
  }
}

export async function startRepeat(session: CompletedSession, units: Units): Promise<void> {
  startSession(session.name, repeatFromCompleted(session));
  await attachApiSession(session.name, units);
}

// re-exports the builder page uses
export { templateToStartExercises, repRange };
export type { TemplateExercise, ActiveSession };
