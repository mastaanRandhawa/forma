/**
 * Goals for the no-backend (demo/local) build: add, log, retarget and remove,
 * kept in the same local store as everything else so they survive a reload.
 * The first change copies the sample goals in, so nothing disappears under you.
 */
import type { GoalCadence, GoalInput, GoalWithProgress } from "../api/types";
import { demoGoals } from "../api/demo";
import { loadData, mutate } from "./localStore";

export function localGoals(): GoalWithProgress[] {
  return loadData().goals ?? demoGoals();
}

function change(fn: (goals: GoalWithProgress[]) => GoalWithProgress[]): GoalWithProgress[] {
  const next = fn(localGoals());
  mutate((d) => ({ ...d, goals: next }));
  return next;
}

const withDone = (g: GoalWithProgress): GoalWithProgress => ({ ...g, completed: g.current >= g.target });

export function addLocalGoal(input: GoalInput): GoalWithProgress {
  const goal: GoalWithProgress = withDone({
    id: `goal-${input.key}-${Date.now()}`,
    key: input.key,
    label: input.label,
    target: input.target,
    unit: input.unit,
    cadence: input.cadence,
    tone: input.tone ?? "pink",
    active: true,
    current: 0,
    completed: false,
    periodKey: new Date().toISOString().slice(0, 10),
  });
  change((gs) => [...gs, goal]);
  return goal;
}

export function updateLocalGoal(id: string, patch: { label?: string; target?: number; unit?: string; cadence?: GoalCadence }): void {
  change((gs) => gs.map((g) => (g.id === id ? withDone({ ...g, ...patch }) : g)));
}

export function logLocalGoal(id: string, value: number, mode: "set" | "increment"): GoalWithProgress | null {
  let out: GoalWithProgress | null = null;
  change((gs) =>
    gs.map((g) => {
      if (g.id !== id) return g;
      out = withDone({ ...g, current: Math.max(0, mode === "set" ? value : g.current + value) });
      return out;
    }),
  );
  return out;
}

export function removeLocalGoal(id: string): void {
  change((gs) => gs.filter((g) => g.id !== id));
}
