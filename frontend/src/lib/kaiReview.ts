/**
 * The no-backend Kai Deep Review: 28 days of logged numbers, with no AI involved.
 * Matches backend/src/services/kaiReview.ts, section for section.
 */
import type { KaiReview } from "../api/types";
import { epley1RM, sessionsPerGroup } from "./fitness";
import { fromKg } from "./lifecycle";
import type { CompletedSession, FormaData } from "./localStore";

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 28;

type MuscleOf = Parameters<typeof sessionsPerGroup>[1];

const hasWork = (s: CompletedSession) => s.exercises.some((e) => e.sets.some((x) => x.done && !x.warmup));
const kg = (s: CompletedSession) => (s.units === "kg" ? s.volume : fromKg(s.volume, "kg"));

function bestLifts(sessions: CompletedSession[]): Map<string, number> {
  const best = new Map<string, number>();
  for (const s of sessions) {
    const toKgFactor = s.units === "kg" ? 1 : 0.45359237;
    for (const e of s.exercises) {
      for (const set of e.sets) {
        if (!set.done || set.warmup || !set.weight || !set.reps) continue;
        const e1 = epley1RM(set.weight * toKgFactor, set.reps);
        if (e1 > (best.get(e.name) ?? 0)) best.set(e.name, e1);
      }
    }
  }
  return best;
}

export function buildLocalReview(data: FormaData, muscleOf: MuscleOf | null): KaiReview {
  const now = Date.now();
  const from = now - WINDOW_DAYS * DAY_MS;
  const priorFrom = now - 2 * WINDOW_DAYS * DAY_MS;
  const worked = data.sessions.filter(hasWork);
  const recent = worked.filter((s) => Date.parse(s.finishedAt) >= from);
  const prior = worked.filter((s) => {
    const at = Date.parse(s.finishedAt);
    return at >= priorFrom && at < from;
  });
  const sections: KaiReview["sections"] = [];

  // consistency
  const target = data.profile.daysPerWeek;
  const perWeek = Math.round((recent.length / (WINDOW_DAYS / 7)) * 10) / 10;
  sections.push({
    heading: "consistency",
    body: recent.length
      ? `${recent.length} session${recent.length === 1 ? "" : "s"} in 28 days, about ${perWeek} a week${
          target ? ` against your target of ${target}` : ""
        }. ${target && perWeek >= target ? "You're hitting your target." : target ? "That's the first thing to lift." : ""}`.trim()
      : "No completed sessions in the last 28 days. Starting again is the whole job right now.",
  });

  // volume
  const sum = (list: CompletedSession[]) => list.reduce((n, s) => n + kg(s), 0);
  const now28 = sum(recent);
  const was28 = sum(prior);
  const change = was28 > 0 ? Math.round(((now28 - was28) / was28) * 100) : null;
  sections.push({
    heading: "volume",
    body: `${Math.round(now28).toLocaleString("en-US")} kg moved${
      change == null ? "." : `, ${change >= 0 ? "up" : "down"} ${Math.abs(change)}% on the 28 days before.`
    }`,
  });

  // lifts: compare the best estimated 1RM in each window
  const before = bestLifts(prior);
  const moved = [...bestLifts(recent).entries()]
    .flatMap(([name, e1]) => {
      const was = before.get(name);
      return was ? [{ name, delta: Math.round(e1 - was) }] : [];
    })
    .sort((a, b) => b.delta - a.delta);
  const up = moved.filter((m) => m.delta > 0).slice(0, 3);
  const down = moved.filter((m) => m.delta < 0).slice(-1)[0];
  sections.push({
    heading: "lifts",
    body: moved.length
      ? [
          up.length ? `Moving up: ${up.map((m) => `${m.name} +${m.delta} kg e1RM`).join(", ")}.` : "No lift has moved up yet.",
          down ? `Watch ${down.name}, down ${Math.abs(down.delta)} kg e1RM.` : "",
        ].filter(Boolean).join(" ")
      : "Not enough repeat lifts across both windows to compare yet.",
  });

  // records
  const prNames = [...new Set(recent.flatMap((s) => s.prs.map((p) => p.split(" — ")[0])))];
  sections.push({
    heading: "records",
    body: prNames.length
      ? `Personal records on ${prNames.slice(0, 5).join(", ")}${prNames.length > 5 ? ` and ${prNames.length - 5} more` : ""}.`
      : "No new records in this window.",
  });

  // muscle balance
  const ranked = muscleOf
    ? sessionsPerGroup(recent, muscleOf, WINDOW_DAYS).filter((g) => g.sessions > 0).sort((a, b) => b.sessions - a.sessions)
    : [];
  const most = ranked[0]?.group;
  const least = ranked.length > 1 ? ranked[ranked.length - 1].group : null;
  sections.push({
    heading: "balance",
    body: most ? `Most work went to ${most}${least ? `, least to ${least}` : ""}.` : "No muscle data in this window yet.",
  });

  // the next step, picked from the weakest signal above
  sections.push({
    heading: "next step",
    body: !recent.length
      ? "Book two short sessions this week. Don't worry about load until the habit is back."
      : target && perWeek < target
        ? `Add one session a week until you're at ${target}. Consistency will do more than any program change.`
        : down
          ? `Keep ${down.name} at the current weight for a week and aim to beat your reps before adding load.`
          : least
            ? `Add 2–3 sets for ${least} this week to even things out.`
            : "Keep going as you are, and add the smallest weight step when you reach the top of a rep range.",
  });

  return { title: "28-day review", generatedAt: new Date(now).toISOString(), sections };
}
