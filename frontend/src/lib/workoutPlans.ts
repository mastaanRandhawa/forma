/**
 * workoutPlans — multi-day training plans built from the preset sessions in
 * lib/workoutTemplates. A plan is just an ordered list of template days plus
 * the guidance a single session can't carry: how many days a week, how to lay
 * them out, and how to progress. Equipment, duration and muscles are derived
 * from the days so they can't drift.
 */
import {
  templateById,
  equipmentClass,
  matchesTemplateQuery,
  GOAL_LABEL,
  type Difficulty,
  type EquipmentClass,
  type TrainingGoal,
  type WorkoutTemplate,
} from "./workoutTemplates";

export interface WorkoutPlan {
  id: string;
  name: string;
  description: string;
  objective: string;
  goals: TrainingGoal[];
  difficulty: Difficulty;
  /** training days per week the plan is written for */
  daysPerWeek: number;
  /** how to lay the days out across the week */
  schedule: string;
  /** how to progress week to week */
  progression: string;
  /** the rotation; may be shorter than daysPerWeek (A / B alternation) */
  days: { label: string; templateId: string }[];
  /** the store item that unlocks this plan; absent means it's free */
  premium?: string;
}

const DOUBLE_PROGRESSION =
  "Work within each rep range. When every set reaches the top of the range, add the smallest weight step next time (about 2.5 kg on upper-body lifts, 5 kg on lower-body lifts).";

export const WORKOUT_PLANS: WorkoutPlan[] = [
  {
    id: "ppl-3",
    name: "Push / Pull / Legs — 3 days",
    description: "The classic split, each muscle group trained once a week with plenty of volume per session.",
    objective: "Build muscle on a three-day schedule.",
    goals: ["muscle"],
    difficulty: "intermediate",
    daysPerWeek: 3,
    schedule: "Mon · Wed · Fri, with a rest day between sessions",
    progression: DOUBLE_PROGRESSION,
    days: [
      { label: "Push", templateId: "push-hypertrophy" },
      { label: "Pull", templateId: "pull-hypertrophy" },
      { label: "Legs", templateId: "legs-hypertrophy" },
    ],
  },
  {
    id: "ppl-6",
    name: "Push / Pull / Legs — 6 days",
    description: "Each muscle twice a week, alternating A and B days so exercise selection varies.",
    objective: "High-frequency muscle building for lifters who can train six days a week.",
    goals: ["muscle"],
    difficulty: "advanced",
    daysPerWeek: 6,
    schedule: "Mon – Sat in order, Sunday off. Take an extra rest day whenever recovery lags",
    progression: DOUBLE_PROGRESSION,
    days: [
      { label: "Push A", templateId: "push-hypertrophy" },
      { label: "Pull A", templateId: "pull-hypertrophy" },
      { label: "Legs A", templateId: "legs-hypertrophy" },
      { label: "Push B", templateId: "ppl-push-b" },
      { label: "Pull B", templateId: "ppl-pull-b" },
      { label: "Legs B", templateId: "ppl-legs-b" },
    ],
  },
  {
    id: "upper-lower-4",
    name: "Upper / Lower — 4 days",
    description: "Upper and lower body twice a week each, with A and B variations.",
    objective: "Balanced muscle and strength gains with each muscle trained twice a week.",
    goals: ["muscle", "strength"],
    difficulty: "intermediate",
    daysPerWeek: 4,
    schedule: "Mon · Tue · Thu · Fri",
    progression: DOUBLE_PROGRESSION,
    days: [
      { label: "Upper A", templateId: "upper-body" },
      { label: "Lower A", templateId: "lower-body" },
      { label: "Upper B", templateId: "upper-b" },
      { label: "Lower B", templateId: "lower-b" },
    ],
  },
  {
    id: "full-body-3",
    name: "Full Body — 2 to 3 days",
    description: "Three full-body sessions in rotation. Train two or three days a week and keep cycling A → B → C.",
    objective: "General strength and muscle with minimal time in the gym.",
    goals: ["general", "muscle"],
    difficulty: "beginner",
    daysPerWeek: 3,
    schedule: "3 days: Mon · Wed · Fri. 2 days: e.g. Tue · Fri, continuing the rotation the next week",
    progression: DOUBLE_PROGRESSION,
    days: [
      { label: "Full Body A", templateId: "full-body-strength" },
      { label: "Full Body B", templateId: "full-body-b" },
      { label: "Full Body C", templateId: "full-body-c" },
    ],
  },
  {
    id: "bro-5",
    name: "Body-Part Split — 5 days",
    description: "One major muscle group per day: chest, back, shoulders, arms and legs.",
    objective: "High per-session volume for each muscle group, once a week.",
    goals: ["muscle"],
    difficulty: "intermediate",
    daysPerWeek: 5,
    schedule: "Mon – Fri, weekends off. Keep shoulder and chest days apart if you shuffle the order",
    progression: DOUBLE_PROGRESSION,
    days: [
      { label: "Chest", templateId: "bro-chest" },
      { label: "Back", templateId: "bro-back" },
      { label: "Shoulders", templateId: "bro-shoulders" },
      { label: "Arms", templateId: "bro-arms" },
      { label: "Legs", templateId: "legs-hypertrophy" },
    ],
  },
  {
    id: "phul-4",
    name: "PHUL — 4 days",
    description: "Power Hypertrophy Upper Lower: two heavy days and two volume days.",
    objective: "Get stronger on the main lifts while still building muscle.",
    goals: ["strength", "muscle"],
    difficulty: "intermediate",
    daysPerWeek: 4,
    schedule: "Mon (upper power) · Tue (lower power) · Thu (upper hypertrophy) · Fri (lower hypertrophy)",
    progression:
      "Power days: add weight when you hit the top of the range for every set. Hypertrophy days: add reps first, then weight.",
    days: [
      { label: "Upper Power", templateId: "phul-upper-power" },
      { label: "Lower Power", templateId: "phul-lower-power" },
      { label: "Upper Hypertrophy", templateId: "phul-upper-hypertrophy" },
      { label: "Lower Hypertrophy", templateId: "phul-lower-hypertrophy" },
    ],
  },
  {
    id: "gzclp-3",
    name: "GZCLP — 3 days",
    description: "A linear-progression strength program built around four main lifts, alternating two sessions.",
    objective: "Steady strength gains on squat, bench, deadlift and overhead press.",
    goals: ["strength"],
    difficulty: "beginner",
    daysPerWeek: 3,
    schedule: "Mon · Wed · Fri, alternating A and B (A·B·A one week, B·A·B the next)",
    progression:
      "Add weight to the main lift each session while you complete all sets. When you can't, drop to the next set and rep scheme as noted on the lift.",
    days: [
      { label: "Session A", templateId: "gzclp-a" },
      { label: "Session B", templateId: "gzclp-b" },
    ],
  },
  {
    id: "fundamentals-2",
    name: "Gym Fundamentals — 2 to 3 days",
    description: "A first program: machines on day A, free weights on day B, nothing complicated.",
    objective: "Learn the main movement patterns and build a consistent habit.",
    goals: ["general", "muscle"],
    difficulty: "beginner",
    daysPerWeek: 3,
    schedule: "2–3 days a week with at least one rest day between, alternating A and B",
    progression: DOUBLE_PROGRESSION,
    days: [
      { label: "Fundamentals A", templateId: "beginner-a" },
      { label: "Fundamentals B", templateId: "beginner-b" },
    ],
  },
  {
    id: "calisthenics-3",
    name: "Calisthenics — 3 days",
    description: "Bodyweight push, pull, legs and core. Needs a pull-up bar for day B.",
    objective: "Build strength with bodyweight progressions at home or in a park.",
    goals: ["calisthenics", "general"],
    difficulty: "intermediate",
    daysPerWeek: 3,
    schedule: "Mon · Wed · Fri, alternating A and B",
    progression:
      "When you pass the top of a rep range on every set, move to a harder variation (e.g. push-up → decline push-up) and start again at the bottom.",
    days: [
      { label: "Push & Legs", templateId: "calisthenics-a" },
      { label: "Pull & Core", templateId: "calisthenics-b" },
    ],
  },
  {
    id: "general-fitness-3",
    name: "General Fitness — 3 days",
    description: "Two full-body strength days and one conditioning day, with an optional mobility session.",
    objective: "Rounded fitness: strength, work capacity and mobility.",
    goals: ["general", "conditioning"],
    difficulty: "beginner",
    daysPerWeek: 3,
    schedule: "Mon (strength) · Wed (conditioning) · Fri (strength); mobility flow on any rest day",
    progression: "Add weight on the strength days as in any full-body plan; on conditioning days add a round or shorten rests.",
    days: [
      { label: "Strength A", templateId: "full-body-strength" },
      { label: "Conditioning", templateId: "conditioning-intervals" },
      { label: "Strength C", templateId: "full-body-c" },
      { label: "Mobility (optional)", templateId: "mobility-recovery" },
    ],
  },

  // ── premium: bought in the store ──────────────────────────────────────────
  {
    id: "powerbuilding-4",
    premium: "pl-powerbuilding",
    name: "Powerbuilding — 4 days",
    description: "One big lift a day, trained heavy, then the hypertrophy work that makes it bigger.",
    objective: "Get genuinely stronger on all four main lifts while still building muscle.",
    goals: ["strength", "muscle"],
    difficulty: "advanced",
    daysPerWeek: 4,
    schedule: "Mon (squat) · Tue (bench) · Thu (deadlift) · Fri (overhead), with weekends off",
    progression:
      "Add the smallest weight step to a top set when you hit the top of its rep range at RPE 8 or below. Back-off sets follow the top set. If a top set hits RPE 10 twice in a row, drop it 10% and build back up.",
    days: [
      { label: "Squat Day", templateId: "pb-squat" },
      { label: "Bench Day", templateId: "pb-bench" },
      { label: "Deadlift Day", templateId: "pb-deadlift" },
      { label: "Overhead Day", templateId: "pb-press" },
    ],
  },
  {
    id: "arms-4",
    premium: "pl-arms",
    name: "Arm Specialization — 4 days",
    description: "Two arm-first days and two full lower and upper days, so your arms get priority without losing the rest.",
    objective: "Put size on lagging arms for 6–8 weeks, then return to a balanced plan.",
    goals: ["muscle"],
    difficulty: "intermediate",
    daysPerWeek: 4,
    schedule: "Mon (biceps first) · Tue (lower) · Thu (triceps first) · Fri (upper), with weekends off",
    progression: DOUBLE_PROGRESSION,
    days: [
      { label: "Biceps Priority", templateId: "arms-a" },
      { label: "Lower Body", templateId: "lower-body" },
      { label: "Triceps Priority", templateId: "arms-b" },
      { label: "Upper Body", templateId: "upper-b" },
    ],
  },
  {
    id: "glutes-3",
    premium: "pl-glutes",
    name: "Glute Priority — 3 days",
    description: "A heavy hinge day, a volume day and an upper-body day to keep everything else moving.",
    objective: "Build the glutes as the main goal while the rest of your body holds its ground.",
    goals: ["muscle"],
    difficulty: "intermediate",
    daysPerWeek: 3,
    schedule: "Mon (heavy) · Wed (upper) · Fri (volume), with a rest day between sessions",
    progression: DOUBLE_PROGRESSION,
    days: [
      { label: "Heavy Hinge", templateId: "glutes-a" },
      { label: "Upper Balance", templateId: "glutes-b" },
      { label: "Volume Pump", templateId: "glutes-c" },
    ],
  },
];

export const planById = (id: string): WorkoutPlan | undefined => WORKOUT_PLANS.find((p) => p.id === id);

/** The plan's days resolved to templates (unknown ids are skipped). */
export function planTemplates(plan: WorkoutPlan): { label: string; template: WorkoutTemplate }[] {
  return plan.days.flatMap((d) => {
    const template = templateById(d.templateId);
    return template ? [{ label: d.label, template }] : [];
  });
}

export function planEquipment(plan: WorkoutPlan): string[] {
  return [...new Set(planTemplates(plan).flatMap((d) => d.template.equipment))];
}

export const planEquipmentClass = (plan: WorkoutPlan): EquipmentClass => equipmentClass(planEquipment(plan));

/** Typical session length, minutes (median of the days). */
export function planSessionMin(plan: WorkoutPlan): number {
  const mins = planTemplates(plan)
    .map((d) => d.template.durationMin)
    .sort((a, b) => a - b);
  return mins.length ? mins[Math.floor(mins.length / 2)] : 0;
}

export function planMuscles(plan: WorkoutPlan): string[] {
  return [...new Set(planTemplates(plan).flatMap((d) => d.template.targetMuscles))];
}

export function matchesPlanQuery(plan: WorkoutPlan, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const own = [plan.name, plan.description, plan.objective, ...plan.goals.map((g) => GOAL_LABEL[g])]
    .join(" ")
    .toLowerCase();
  return (
    q.split(/\s+/).every((w) => own.includes(w)) ||
    planTemplates(plan).some((d) => matchesTemplateQuery(d.template, q))
  );
}
