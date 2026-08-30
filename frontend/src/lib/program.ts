/**
 * program — a deterministic starter plan.
 *
 * There is no server-side program generator in this build, so "today's workout"
 * is a fixed rotation of templates picked by day of week. It is honest about
 * being a template (no "week 4 of 8", no adaptive-progression claims) — the
 * audit (§F, §L) calls for a real progression engine before those claims return.
 */
import type { Profile } from "./localStore";

export interface PlanExercise {
  name: string;
  target: string;
}

export interface DayPlan {
  name: string;
  focus: string[];
  exercises: PlanExercise[];
}

const PUSH: DayPlan = {
  name: "Upper Push",
  focus: ["Chest", "Shoulders", "Triceps"],
  exercises: [
    { name: "Barbell Bench Press", target: "4 × 6–8" },
    { name: "Incline Dumbbell Press", target: "3 × 8–10" },
    { name: "Overhead Press", target: "3 × 8–10" },
    { name: "Cable Fly", target: "3 × 12–15" },
    { name: "Lateral Raise", target: "3 × 15" },
    { name: "Triceps Rope Pushdown", target: "3 × 12–15" },
  ],
};

const PULL: DayPlan = {
  name: "Upper Pull",
  focus: ["Back", "Biceps", "Rear Delts"],
  exercises: [
    { name: "Pull-up", target: "4 × 6–10" },
    { name: "Barbell Row", target: "4 × 8–10" },
    { name: "Lat Pulldown", target: "3 × 10–12" },
    { name: "Face Pull", target: "3 × 15–20" },
    { name: "Dumbbell Curl", target: "3 × 10–12" },
    { name: "Hammer Curl", target: "3 × 12–15" },
  ],
};

const LEGS: DayPlan = {
  name: "Lower Body",
  focus: ["Quads", "Glutes", "Hamstrings"],
  exercises: [
    { name: "Back Squat", target: "4 × 5–8" },
    { name: "Romanian Deadlift", target: "3 × 8–10" },
    { name: "Leg Press", target: "3 × 10–12" },
    { name: "Walking Lunge", target: "3 × 12 / leg" },
    { name: "Leg Curl", target: "3 × 12–15" },
    { name: "Standing Calf Raise", target: "4 × 12–15" },
  ],
};

const FULL: DayPlan = {
  name: "Full Body",
  focus: ["Full body"],
  exercises: [
    { name: "Back Squat", target: "3 × 6–8" },
    { name: "Barbell Bench Press", target: "3 × 6–8" },
    { name: "Barbell Row", target: "3 × 8–10" },
    { name: "Overhead Press", target: "3 × 8–10" },
    { name: "Romanian Deadlift", target: "3 × 8–10" },
  ],
};

const ROTATION = [PUSH, PULL, LEGS, PUSH, PULL, FULL, LEGS];

/** Today's plan — a stable pick from the weekly rotation. */
export function todayPlan(_profile?: Profile, date = new Date()): DayPlan {
  return ROTATION[date.getDay()];
}

/** The next few scheduled sessions after today. */
export function upcomingPlans(count = 3, date = new Date()): { when: string; plan: DayPlan }[] {
  const out: { when: string; plan: DayPlan }[] = [];
  const labels = ["Tomorrow", "In 2 days", "In 3 days", "In 4 days", "In 5 days"];
  for (let i = 1; i <= count; i++) {
    const d = new Date(date);
    d.setDate(d.getDate() + i);
    out.push({ when: labels[i - 1] ?? `In ${i} days`, plan: ROTATION[d.getDay()] });
  }
  return out;
}

export const ALL_TEMPLATES: DayPlan[] = [PUSH, PULL, LEGS, FULL];
