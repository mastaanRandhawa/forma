/**
 * Adapters — map API DTOs onto the shapes the existing presentational
 * components already expect, so the UI layer doesn't have to change.
 */
import type { Goal, GoalTone } from "../lib/data";
import type * as T from "./types";

const fmt = (n: number) => (n >= 1000 ? Math.round(n).toLocaleString() : n % 1 === 0 ? String(n) : n.toFixed(1));
const GOAL_TONES: GoalTone[] = ["pink", "cyan", "lime", "amber", "mauve", "violet"];

const INSIGHT_TONE: Record<string, string> = {
  recovery: "cyan", volume: "amber", form: "lime",
  consistency: "pink", nutrition: "lime", strength: "amber",
};
const INSIGHT_ICON: Record<string, "moon" | "activity" | "sparkles"> = {
  recovery: "moon", form: "sparkles", strength: "sparkles",
};

/** `CoachingInsight` (API) → the shape `InsightCard` expects. */
export function insightToCard(i: T.CoachingInsight) {
  return {
    id: i.id,
    tone: (INSIGHT_TONE[i.category] ?? "cyan") as "cyan" | "amber" | "lime" | "pink",
    icon: INSIGHT_ICON[i.category] ?? "activity",
    text: i.body,
    actions: i.actions?.length ? i.actions : ["Why?", "Dismiss"],
  };
}

/** kg → "48.2k" (lb, thousands). */
export function volumeK(kg: number): string {
  const lb = kg * 2.20462;
  return lb >= 1000 ? `${(lb / 1000).toFixed(1)}k` : String(Math.round(lb));
}

/** `GoalWithProgress` (API) → `Goal` (GoalWidget). Synthesizes streak / eta. */
export function goalToWidget(g: T.GoalWithProgress, i = 0): Goal {
  const tone = (GOAL_TONES as string[]).includes(g.tone) ? (g.tone as GoalTone) : GOAL_TONES[i % GOAL_TONES.length];
  const remaining = Math.max(0, g.target - g.current);
  return {
    id: g.id,
    label: g.label,
    value: g.current,
    max: g.target,
    tone,
    unit: g.unit,
    cadence: g.cadence,
    streak: 0,
    eta: g.completed ? "goal reached" : `${fmt(remaining)} ${g.unit} to go`,
  };
}
