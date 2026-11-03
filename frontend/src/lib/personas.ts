/**
 * personas — what Kai sounds like with a store persona equipped. These are the
 * in-workout cues and the no-backend chat; in API mode backend/src/services/ai.ts
 * gives Kai's chat the same voice.
 */
import type { CueContext, CueEvent } from "./session";

type Lines = Partial<Record<CueEvent, (ctx: CueContext) => string | null>>;

const left = (n: number | undefined) => n ?? 0;

const PERSONAS: Record<string, { lines: Lines; chatOpener: string }> = {
  "ps-drill": {
    chatOpener: "Listen up.",
    lines: {
      start: (c) => (c.totalExercises ? `${c.totalExercises} exercises. No excuses. Move.` : "Clock's running. Move."),
      "before-set": (c) =>
        c.heavierThanLast ? "Heavier. Good. Brace and don't you dare back down." : c.noHistory ? null : "You've done this before. Do it again, better.",
      "set-done": (c) =>
        left(c.setsLeftInExercise) <= 0 ? "That one's dead. Next." : left(c.setsLeftInExercise) === 1 ? "One left. Leave nothing." : `${c.setsLeftInExercise} to go. Keep moving.`,
      rest: () => "Rest. You earned exactly this much of it.",
      "rest-over": () => "Time's up. On your feet.",
      pr: (c) => (c.prDetail ? `${c.prDetail}. A new best. Now do it again next week.` : "New best. Now do it again next week."),
      "almost-done": () => "Last exercise. Finish it like you mean it.",
      finish: () => "Done. Dismissed. Eat, sleep, come back.",
    },
  },
  "ps-zen": {
    chatOpener: "Take a breath.",
    lines: {
      start: () => "Arrive first. Then begin, one set at a time.",
      "before-set": (c) =>
        c.heavierThanLast ? "Heavier today. Breathe in, brace, and let it be steady." : "Settle in. Slow and clean is the whole practice.",
      "set-done": (c) =>
        left(c.setsLeftInExercise) <= 0 ? "That's complete. Let it go." : "Good. Notice how that felt, then let it pass.",
      rest: () => "Rest fully. Long breath out. Nothing to rush.",
      "rest-over": () => "When you're ready, return.",
      pr: (c) => (c.prDetail ? `${c.prDetail}. A new best, and it came from patience.` : "A new best, and it came from patience."),
      "almost-done": () => "One exercise remains. Stay with it.",
      finish: () => "Well practiced. Rest is part of the work.",
    },
  },
  "ps-analyst": {
    chatOpener: "Looking at the numbers:",
    lines: {
      start: (c) => (c.totalExercises ? `Session plan: ${c.totalExercises} exercises. Logging begins now.` : "Logging begins now."),
      "before-set": (c) =>
        c.heavierThanLast ? "Load is above last session. Expect slightly lower reps." : c.lighterThanLast ? "Load is below last session. Prioritise bar speed." : c.noHistory ? "No history here. This set is your baseline." : "Same load as last time. Target: match or beat the reps.",
      "set-done": (c) =>
        left(c.setsLeftInExercise) <= 0 ? "Exercise complete. Data logged." : `Logged. ${c.setsLeftInExercise} set${c.setsLeftInExercise === 1 ? "" : "s"} remaining.`,
      rest: (c) => (c.restSeconds ? `Rest target: ${c.restSeconds} seconds.` : "Rest. Recovery affects the next set's output."),
      "rest-over": () => "Rest target reached.",
      pr: (c) => (c.prDetail ? `New record: ${c.prDetail}. Trend is positive.` : "New record. Trend is positive."),
      "almost-done": () => "One exercise left in the plan.",
      finish: () => "Session logged. The trend line will show it.",
    },
  },
  "ps-hype": {
    chatOpener: "Let's GO.",
    lines: {
      start: (c) => (c.totalExercises ? `${c.totalExercises} exercises and you're going to crush every one. LET'S GO!` : "LET'S GO!"),
      "before-set": (c) =>
        c.heavierThanLast ? "HEAVIER than last time?! You're built for this!" : "This one's yours. Own it!",
      "set-done": (c) =>
        left(c.setsLeftInExercise) <= 0 ? "THAT'S how you finish an exercise!" : left(c.setsLeftInExercise) === 1 ? "ONE more! Big finish!" : `YES! ${c.setsLeftInExercise} more, you've got this!`,
      rest: () => "Unreal set. Shake it out, you're on fire!",
      "rest-over": () => "We're back! Let's go!",
      pr: (c) => (c.prDetail ? `NEW BEST! ${c.prDetail}! ARE YOU KIDDING ME?!` : "NEW BEST! ARE YOU KIDDING ME?!"),
      "almost-done": () => "Final exercise! Leave it all out there!",
      finish: () => "WHAT a session! That's a champion's work!",
    },
  },
};

/** The persona's line for this moment, or null to fall back on Kai's own. */
export function personaCue(persona: string | undefined, event: CueEvent, ctx: CueContext): string | null {
  return (persona && PERSONAS[persona]?.lines[event]?.(ctx)) || null;
}

/** How Kai opens a reply in the no-backend chat. */
export const personaOpener = (persona: string | undefined): string | null =>
  (persona && PERSONAS[persona]?.chatOpener) || null;
