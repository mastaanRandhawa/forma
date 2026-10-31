/**
 * workoutTemplates — the preloaded ("prebuilt") workout catalog.
 *
 * These are curated starting points, not adaptive programs. Everything here is
 * static client data: no DB row, no "week 4 of 8". A user can start one as-is,
 * or "save a copy" to get an editable template of their own (see lib/templates).
 *
 * Exercise `name`s are chosen to match entries in `repdb.catalog.json` (or the
 * hand aliases in lib/repdb.ts) so thumbnails, how-to and substitutions resolve.
 */
import type { Profile } from "./localStore";
import type { StartExercise } from "./localStore";

export type TemplateCategory =
  | "full-body"
  | "hypertrophy"
  | "strength"
  | "athletic"
  | "equipment"
  | "duration"
  | "bodyweight"
  | "conditioning"
  | "mobility";

export type Difficulty = "beginner" | "intermediate" | "advanced";

/** What a template is for — the library's primary filter. */
export type TrainingGoal =
  | "muscle"
  | "strength"
  | "general"
  | "endurance"
  | "functional"
  | "calisthenics"
  | "mobility"
  | "conditioning";

export const GOAL_LABEL: Record<TrainingGoal, string> = {
  muscle: "muscle building",
  strength: "strength",
  general: "general fitness",
  endurance: "muscular endurance",
  functional: "functional fitness",
  calisthenics: "bodyweight / calisthenics",
  mobility: "mobility & recovery",
  conditioning: "conditioning",
};

export interface TemplateExercise {
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  /** seconds of rest after the set */
  restSec: number;
  /** optional RPE / RIR target */
  rpe?: number;
  /** short cue or warm-up guidance */
  note?: string;
  warmup?: boolean;
  /** exercises sharing a group value are performed back-to-back as a superset */
  supersetGroup?: number;
  /** reps are seconds (holds, stretches, intervals) */
  timed?: boolean;
  /** the reps (or seconds) are per side */
  perSide?: boolean;
  /** sensible swaps when the equipment is busy or missing */
  alternatives?: string[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  /** secondary tags for filtering (goal, split, equipment) */
  tags: string[];
  difficulty: Difficulty;
  durationMin: number;
  targetMuscles: string[];
  equipment: string[];
  exercises: TemplateExercise[];
  /** defaults from `category` when omitted (see `templateGoals`) */
  goals?: TrainingGoal[];
  /** one sentence: what this session trains and why */
  objective?: string;
  /** how often to run it on its own, e.g. "2–3× / week" */
  frequency?: string;
  /** effort guidance, e.g. "stop each set with 2 reps in reserve" */
  intensity?: string;
}

// ── shorthand builders ──────────────────────────────────────────────────────
const ex = (
  name: string,
  sets: number,
  repsMin: number,
  repsMax: number,
  restSec: number,
  extra: Partial<TemplateExercise> = {},
): TemplateExercise => ({ name, sets, repsMin, repsMax, restSec, ...extra });

/** A/B/C… label for a superset group index. */
export const supersetLetter = (group: number): string =>
  String.fromCharCode(64 + Math.max(1, group));

// ═══════════════════════════════════════════════════════════════════════════
export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  // ── full body ────────────────────────────────────────────────────────────
  {
    id: "full-body-strength",
    name: "Full Body",
    description: "A balanced full-body session hitting every major movement once. Great 3×/week base.",
    category: "full-body",
    tags: ["general fitness", "3x week"],
    difficulty: "beginner",
    durationMin: 50,
    targetMuscles: ["quads", "chest", "back", "shoulders", "hamstrings"],
    equipment: ["barbell", "dumbbell"],
    exercises: [
      ex("Barbell Back Squat", 3, 6, 8, 150, { rpe: 7, note: "2 light warm-up sets first" }),
      ex("Barbell Bench Press", 3, 6, 8, 150, { rpe: 7 }),
      ex("Bent-Over Barbell Row", 3, 8, 10, 120),
      ex("Barbell Overhead Press", 3, 8, 10, 120),
      ex("Romanian Deadlift", 3, 8, 10, 120, { note: "hinge, keep the bar close" }),
      ex("Plank", 3, 30, 45, 60, { timed: true }),
    ],
  },
  {
    id: "athletic-full-body",
    name: "Athletic Full Body",
    description: "Power-biased full body: a jump, a fast pull, then strength. Warm up thoroughly.",
    category: "athletic",
    tags: ["power", "explosiveness", "sport"],
    difficulty: "intermediate",
    durationMin: 55,
    targetMuscles: ["quads", "glutes", "back", "shoulders"],
    equipment: ["barbell", "box"],
    exercises: [
      ex("Box Jump", 4, 3, 4, 90, { note: "step down every rep, full recovery" }),
      ex("Hang Power Clean", 4, 3, 3, 150, { rpe: 7, note: "move the bar fast" }),
      ex("Barbell Back Squat", 3, 4, 6, 150, { rpe: 8 }),
      ex("Bent-Over Barbell Row", 3, 6, 8, 120),
      ex("Barbell Hip Thrust", 3, 8, 10, 90),
    ],
  },

  // ── split: push / pull / legs ────────────────────────────────────────────
  {
    id: "push-hypertrophy",
    name: "Push Day",
    description: "Chest, shoulders and triceps for size. Compound first, then isolation to finish.",
    category: "hypertrophy",
    tags: ["ppl", "push", "upper"],
    difficulty: "intermediate",
    durationMin: 55,
    targetMuscles: ["chest", "shoulders", "triceps"],
    equipment: ["barbell", "dumbbell", "cable"],
    exercises: [
      ex("Barbell Bench Press", 4, 6, 8, 150, { rpe: 8, note: "warm up to your first working weight" }),
      ex("Incline Dumbbell Press", 3, 8, 12, 120),
      ex("Seated Dumbbell Shoulder Press", 3, 8, 12, 120),
      ex("Cable Fly", 3, 12, 15, 75),
      ex("Dumbbell Lateral Raise", 4, 12, 20, 60, { note: "lead with the elbows" }),
      ex("Cable Tricep Pushdown", 3, 10, 15, 60),
      ex("Overhead Tricep Extension", 2, 12, 15, 60),
    ],
  },
  {
    id: "pull-hypertrophy",
    name: "Pull Day",
    description: "Back and biceps volume. Vertical and horizontal pulls, then arms.",
    category: "hypertrophy",
    tags: ["ppl", "pull", "upper"],
    difficulty: "intermediate",
    durationMin: 55,
    targetMuscles: ["back", "biceps", "rear delts"],
    equipment: ["barbell", "dumbbell", "cable"],
    exercises: [
      ex("Pull-Up", 4, 5, 10, 150, { note: "add load or use a band to stay in range" }),
      ex("Bent-Over Barbell Row", 4, 8, 10, 120, { rpe: 8 }),
      ex("Lat Pulldown", 3, 10, 12, 90),
      ex("Seated Cable Row", 3, 10, 12, 90),
      ex("Cable Face Pull", 3, 15, 20, 60),
      ex("Dumbbell Bicep Curl", 3, 10, 12, 60),
      ex("Dumbbell Hammer Curl", 2, 12, 15, 60),
    ],
  },
  {
    id: "legs-hypertrophy",
    name: "Leg Day",
    description: "Quads, hamstrings, glutes and calves. Squat-led with plenty of accessory work.",
    category: "hypertrophy",
    tags: ["ppl", "legs", "lower"],
    difficulty: "intermediate",
    durationMin: 60,
    targetMuscles: ["quads", "hamstrings", "glutes", "calves"],
    equipment: ["barbell", "machine"],
    exercises: [
      ex("Barbell Back Squat", 4, 6, 8, 180, { rpe: 8, note: "2–3 warm-up sets ramping to weight" }),
      ex("Romanian Deadlift", 3, 8, 10, 120),
      ex("Leg Press", 3, 10, 15, 120),
      ex("Bulgarian Split Squat", 3, 10, 12, 90, { perSide: true }),
      ex("Lying Leg Curl", 3, 12, 15, 75),
      ex("Standing Calf Raise", 4, 12, 15, 60),
    ],
  },

  // ── split: upper / lower ─────────────────────────────────────────────────
  {
    id: "upper-body",
    name: "Upper Body",
    description: "Full upper session — horizontal and vertical push and pull, balanced.",
    category: "hypertrophy",
    tags: ["upper lower", "upper"],
    difficulty: "intermediate",
    durationMin: 55,
    targetMuscles: ["chest", "back", "shoulders", "arms"],
    equipment: ["barbell", "dumbbell"],
    exercises: [
      ex("Barbell Bench Press", 4, 6, 8, 150, { rpe: 8 }),
      ex("Bent-Over Barbell Row", 4, 8, 10, 120),
      ex("Seated Dumbbell Shoulder Press", 3, 8, 12, 120),
      ex("Lat Pulldown", 3, 10, 12, 90),
      ex("Dumbbell Lateral Raise", 3, 12, 20, 60),
      ex("Barbell Curl", 3, 8, 12, 60),
      ex("Cable Tricep Pushdown", 3, 10, 15, 60),
    ],
  },
  {
    id: "lower-body",
    name: "Lower Body",
    description: "Quad- and hip-dominant work with direct hamstring and calf training.",
    category: "hypertrophy",
    tags: ["upper lower", "lower"],
    difficulty: "intermediate",
    durationMin: 55,
    targetMuscles: ["quads", "glutes", "hamstrings", "calves"],
    equipment: ["barbell", "machine"],
    exercises: [
      ex("Barbell Back Squat", 4, 5, 8, 180, { rpe: 8 }),
      ex("Barbell Hip Thrust", 3, 8, 12, 120),
      ex("Leg Press", 3, 12, 15, 120),
      ex("Romanian Deadlift", 3, 8, 10, 120),
      ex("Seated Calf Raise", 4, 12, 20, 60),
    ],
  },

  // ── body-part splits ────────────────────────────────────────────────────
  {
    id: "chest-triceps",
    name: "Chest & Triceps",
    description: "Pressing-focused: flat and incline chest, then triceps from two angles.",
    category: "hypertrophy",
    tags: ["bro split", "push"],
    difficulty: "intermediate",
    durationMin: 50,
    targetMuscles: ["chest", "triceps"],
    equipment: ["barbell", "dumbbell", "cable"],
    exercises: [
      ex("Barbell Bench Press", 4, 6, 8, 150, { rpe: 8 }),
      ex("Incline Dumbbell Press", 3, 8, 12, 120),
      ex("Cable Fly", 3, 12, 15, 75),
      ex("Close-Grip Bench Press", 3, 8, 10, 120),
      ex("Overhead Tricep Extension", 3, 12, 15, 60),
      ex("Cable Tricep Pushdown", 3, 12, 15, 60),
    ],
  },
  {
    id: "back-biceps",
    name: "Back & Biceps",
    description: "Width and thickness for the back, then curls in the stretched and peak positions.",
    category: "hypertrophy",
    tags: ["bro split", "pull"],
    difficulty: "intermediate",
    durationMin: 50,
    targetMuscles: ["back", "biceps"],
    equipment: ["barbell", "dumbbell", "cable"],
    exercises: [
      ex("Pull-Up", 4, 6, 10, 150),
      ex("Bent-Over Barbell Row", 4, 8, 10, 120),
      ex("Seated Cable Row", 3, 10, 12, 90),
      ex("Lat Pulldown", 3, 10, 12, 90),
      ex("Incline Dumbbell Curl", 3, 10, 12, 60),
      ex("Barbell Curl", 3, 8, 12, 60),
    ],
  },
  {
    id: "shoulders-arms",
    name: "Shoulders & Arms",
    description: "Delts from every head, supersetted arm work to finish.",
    category: "hypertrophy",
    tags: ["bro split", "accessory"],
    difficulty: "beginner",
    durationMin: 45,
    targetMuscles: ["shoulders", "biceps", "triceps"],
    equipment: ["dumbbell", "cable"],
    exercises: [
      ex("Seated Dumbbell Shoulder Press", 4, 8, 12, 120),
      ex("Dumbbell Lateral Raise", 4, 12, 20, 45, { supersetGroup: 1 }),
      ex("Cable Face Pull", 4, 15, 20, 75, { supersetGroup: 1 }),
      ex("Barbell Curl", 3, 10, 12, 45, { supersetGroup: 2 }),
      ex("Cable Tricep Pushdown", 3, 12, 15, 75, { supersetGroup: 2 }),
      ex("Dumbbell Hammer Curl", 2, 12, 15, 45),
    ],
  },

  // ── strength focus ──────────────────────────────────────────────────────
  {
    id: "strength-lower",
    name: "Lower Strength",
    description: "Heavy squat and deadlift in the 3–5 rep range with long rests. Advanced.",
    category: "strength",
    tags: ["powerlifting", "strength", "lower"],
    difficulty: "advanced",
    durationMin: 60,
    targetMuscles: ["quads", "glutes", "hamstrings", "back"],
    equipment: ["barbell"],
    exercises: [
      ex("Barbell Back Squat", 5, 3, 5, 210, { rpe: 8, note: "ramp up over 3–4 warm-up sets" }),
      ex("Barbell Deadlift", 3, 3, 5, 240, { rpe: 8 }),
      ex("Front Squat", 3, 5, 6, 180),
      ex("Barbell Hip Thrust", 3, 6, 8, 120),
    ],
  },
  {
    id: "strength-upper",
    name: "Upper Strength",
    description: "Heavy bench and overhead press with back strength work. Low reps, full rest.",
    category: "strength",
    tags: ["powerlifting", "strength", "upper"],
    difficulty: "advanced",
    durationMin: 60,
    targetMuscles: ["chest", "shoulders", "back", "triceps"],
    equipment: ["barbell"],
    exercises: [
      ex("Barbell Bench Press", 5, 3, 5, 210, { rpe: 8, note: "ramp over several warm-up sets" }),
      ex("Barbell Overhead Press", 4, 4, 6, 180, { rpe: 8 }),
      ex("Bent-Over Barbell Row", 4, 5, 6, 150),
      ex("Close-Grip Bench Press", 3, 6, 8, 120),
    ],
  },

  // ── athletic ────────────────────────────────────────────────────────────
  {
    id: "explosiveness",
    name: "Explosiveness",
    description: "Triple-extension power: jumps and Olympic-lift variations, kept fast and crisp.",
    category: "athletic",
    tags: ["power", "sport", "cns"],
    difficulty: "advanced",
    durationMin: 45,
    targetMuscles: ["quads", "glutes", "calves", "back"],
    equipment: ["barbell", "box"],
    exercises: [
      ex("Box Jump", 5, 3, 3, 120, { note: "max intent, full recovery" }),
      ex("Hang Power Clean", 5, 2, 3, 180, { rpe: 7 }),
      ex("Push Press", 4, 3, 5, 150),
      ex("Jump Squat", 4, 4, 5, 120, { note: "light or bodyweight, fast" }),
    ],
  },
  {
    id: "plyometrics",
    name: "Plyometrics",
    description: "Low-load, high-speed bounding and jumping for reactive strength. Land soft.",
    category: "athletic",
    tags: ["power", "conditioning", "sport"],
    difficulty: "intermediate",
    durationMin: 35,
    targetMuscles: ["quads", "calves", "glutes"],
    equipment: ["box", "bodyweight"],
    exercises: [
      ex("Box Jump", 5, 4, 5, 90),
      ex("Jump Squat", 4, 6, 8, 75),
      ex("Jumping Jacks", 3, 30, 40, 45, { note: "reps — keep the pace up" }),
      ex("Plank", 3, 30, 45, 45, { timed: true }),
    ],
  },
  {
    id: "speed-power",
    name: "Speed & Power",
    description: "Contrast training: a heavy strength lift paired with an explosive match.",
    category: "athletic",
    tags: ["power", "contrast", "sport"],
    difficulty: "advanced",
    durationMin: 50,
    targetMuscles: ["quads", "glutes", "chest", "back"],
    equipment: ["barbell", "box"],
    exercises: [
      ex("Barbell Back Squat", 4, 3, 4, 90, { rpe: 8, note: "then straight into box jumps" }),
      ex("Box Jump", 4, 3, 4, 180),
      ex("Barbell Bench Press", 4, 3, 4, 90, { rpe: 8 }),
      ex("Medicine Ball Slam", 4, 5, 6, 120),
    ],
  },
  {
    id: "lower-body-power",
    name: "Lower Body Power",
    description: "Strength-speed for the legs and hips — the base for sprinting and jumping.",
    category: "athletic",
    tags: ["power", "sport", "lower"],
    difficulty: "intermediate",
    durationMin: 50,
    targetMuscles: ["quads", "glutes", "hamstrings", "calves"],
    equipment: ["barbell", "box"],
    exercises: [
      ex("Barbell Back Squat", 4, 4, 6, 150, { rpe: 8 }),
      ex("Barbell Hip Thrust", 4, 6, 8, 120),
      ex("Box Jump", 4, 4, 5, 120),
      ex("Standing Calf Raise", 4, 8, 12, 60),
    ],
  },
  {
    id: "basketball-strength",
    name: "Basketball Strength",
    description: "Unilateral leg strength, pressing and core — built for contact and change of direction.",
    category: "athletic",
    tags: ["basketball", "sport", "strength"],
    difficulty: "intermediate",
    durationMin: 55,
    targetMuscles: ["quads", "glutes", "shoulders", "core"],
    equipment: ["barbell", "dumbbell"],
    exercises: [
      ex("Barbell Back Squat", 4, 5, 6, 150, { rpe: 8 }),
      ex("Bulgarian Split Squat", 3, 8, 10, 90, { perSide: true }),
      ex("Barbell Overhead Press", 3, 6, 8, 120),
      ex("Bent-Over Barbell Row", 3, 8, 10, 90),
      ex("Hanging Leg Raise", 3, 10, 15, 60),
    ],
  },
  {
    id: "basketball-explosiveness",
    name: "Basketball Explosiveness",
    description: "Court-transfer power: jumps, fast pulls and single-leg bounds.",
    category: "athletic",
    tags: ["basketball", "sport", "power", "vertical"],
    difficulty: "advanced",
    durationMin: 45,
    targetMuscles: ["quads", "glutes", "calves"],
    equipment: ["box", "barbell"],
    exercises: [
      ex("Box Jump", 5, 3, 4, 120, { note: "measure the height, chase it" }),
      ex("Hang Power Clean", 4, 2, 3, 180),
      ex("Jump Squat", 4, 4, 5, 120),
      ex("Standing Calf Raise", 4, 6, 10, 60, { note: "explode up, slow down" }),
    ],
  },
  {
    id: "vertical-jump",
    name: "Vertical Jump",
    description: "A focused block for jumping higher: strength, rate of force, and elastic bounce.",
    category: "athletic",
    tags: ["vertical", "power", "sport"],
    difficulty: "intermediate",
    durationMin: 45,
    targetMuscles: ["quads", "glutes", "calves", "hamstrings"],
    equipment: ["barbell", "box"],
    exercises: [
      ex("Box Jump", 5, 3, 3, 120, { note: "reset every rep" }),
      ex("Barbell Back Squat", 4, 3, 5, 180, { rpe: 8 }),
      ex("Romanian Deadlift", 3, 6, 8, 120),
      ex("Standing Calf Raise", 4, 8, 12, 60),
      ex("Jump Squat", 3, 5, 5, 90),
    ],
  },

  // ── equipment ───────────────────────────────────────────────────────────
  {
    id: "dumbbell-only",
    name: "Dumbbell Only",
    description: "A complete full-body workout with nothing but a pair of dumbbells.",
    category: "equipment",
    tags: ["dumbbell", "full body", "minimal"],
    difficulty: "beginner",
    durationMin: 45,
    targetMuscles: ["quads", "chest", "back", "shoulders"],
    equipment: ["dumbbell"],
    exercises: [
      ex("Dumbbell Squat", 3, 10, 12, 90),
      ex("Dumbbell Bench Press", 3, 8, 12, 90),
      ex("Single-Arm Dumbbell Row", 3, 10, 12, 75, { perSide: true }),
      ex("Seated Dumbbell Shoulder Press", 3, 8, 12, 90),
      ex("Dumbbell Romanian Deadlift", 3, 10, 12, 90),
      ex("Dumbbell Hammer Curl", 2, 12, 15, 45),
    ],
  },
  {
    id: "barbell-only",
    name: "Barbell",
    description: "Just a barbell and plates. Five big lifts, straightforward and heavy.",
    category: "equipment",
    tags: ["barbell", "full body", "strength"],
    difficulty: "intermediate",
    durationMin: 50,
    targetMuscles: ["quads", "chest", "back", "shoulders", "hamstrings"],
    equipment: ["barbell"],
    exercises: [
      ex("Barbell Back Squat", 4, 5, 8, 150),
      ex("Barbell Bench Press", 4, 5, 8, 150),
      ex("Bent-Over Barbell Row", 4, 6, 10, 120),
      ex("Barbell Overhead Press", 3, 6, 10, 120),
      ex("Romanian Deadlift", 3, 8, 10, 120),
    ],
  },
  {
    id: "bodyweight",
    name: "Bodyweight",
    description: "No equipment at all. Progress by adding reps or slowing the tempo.",
    category: "equipment",
    tags: ["bodyweight", "home", "travel"],
    difficulty: "beginner",
    durationMin: 35,
    targetMuscles: ["chest", "back", "quads", "core"],
    equipment: ["bodyweight"],
    exercises: [
      ex("Push-Up", 4, 8, 20, 75),
      ex("Bodyweight Squat", 4, 15, 25, 75),
      ex("Inverted Row", 4, 8, 15, 75, { note: "under a table or bar" }),
      ex("Bulgarian Split Squat", 3, 10, 15, 60, { perSide: true }),
      ex("Plank", 3, 30, 60, 45, { timed: true }),
    ],
  },
  {
    id: "home-workout",
    name: "Home Workout",
    description: "Dumbbells plus bodyweight — a realistic garage / living-room session.",
    category: "equipment",
    tags: ["home", "dumbbell", "minimal"],
    difficulty: "beginner",
    durationMin: 40,
    targetMuscles: ["full body"],
    equipment: ["dumbbell", "bodyweight"],
    exercises: [
      ex("Goblet Squat", 3, 10, 15, 75),
      ex("Dumbbell Bench Press", 3, 10, 12, 75, { note: "off the floor if no bench" }),
      ex("Single-Arm Dumbbell Row", 3, 10, 12, 60),
      ex("Dumbbell Romanian Deadlift", 3, 10, 12, 75),
      ex("Push-Up", 3, 10, 20, 60),
      ex("Plank", 3, 30, 45, 45, { timed: true }),
    ],
  },
  {
    id: "gym-workout",
    name: "Gym Workout",
    description: "Uses the full rack of machines and cables for a joint-friendly full body.",
    category: "equipment",
    tags: ["gym", "machine", "full body"],
    difficulty: "beginner",
    durationMin: 45,
    targetMuscles: ["quads", "chest", "back", "shoulders"],
    equipment: ["machine", "cable"],
    exercises: [
      ex("Leg Press", 3, 12, 15, 90),
      ex("Machine Chest Press", 3, 10, 12, 90),
      ex("Lat Pulldown", 3, 10, 12, 90),
      ex("Machine Shoulder Press", 3, 10, 12, 75),
      ex("Lying Leg Curl", 3, 12, 15, 60),
      ex("Cable Tricep Pushdown", 3, 12, 15, 60),
    ],
  },
  {
    id: "minimal-equipment",
    name: "Minimal Equipment",
    description: "One kettlebell (or dumbbell). Full-body strength and conditioning in a small space.",
    category: "equipment",
    tags: ["kettlebell", "minimal", "conditioning"],
    difficulty: "intermediate",
    durationMin: 30,
    targetMuscles: ["glutes", "back", "shoulders", "core"],
    equipment: ["kettlebell"],
    exercises: [
      ex("Kettlebell Swing", 5, 12, 15, 60),
      ex("Goblet Squat", 4, 10, 12, 75),
      ex("Single-Arm Dumbbell Row", 4, 10, 12, 60, { perSide: true }),
      ex("Push Press", 3, 6, 8, 75, { perSide: true }),
    ],
  },

  // ── duration ────────────────────────────────────────────────────────────
  {
    id: "20-minute",
    name: "20 Minute Workout",
    description: "Three supersetted compounds, minimal rest. In and out.",
    category: "duration",
    tags: ["quick", "full body", "superset"],
    difficulty: "beginner",
    durationMin: 20,
    targetMuscles: ["quads", "chest", "back"],
    equipment: ["dumbbell"],
    exercises: [
      ex("Goblet Squat", 3, 12, 15, 30, { supersetGroup: 1 }),
      ex("Dumbbell Bench Press", 3, 10, 12, 30, { supersetGroup: 1 }),
      ex("Single-Arm Dumbbell Row", 3, 10, 12, 90, { supersetGroup: 1 }),
    ],
  },
  {
    id: "30-minute",
    name: "30 Minute Workout",
    description: "Four movements covering the whole body, brisk pace.",
    category: "duration",
    tags: ["quick", "full body"],
    difficulty: "beginner",
    durationMin: 30,
    targetMuscles: ["quads", "chest", "back", "shoulders"],
    equipment: ["barbell", "dumbbell"],
    exercises: [
      ex("Barbell Back Squat", 3, 8, 10, 75),
      ex("Barbell Bench Press", 3, 8, 10, 75),
      ex("Bent-Over Barbell Row", 3, 10, 12, 75),
      ex("Seated Dumbbell Shoulder Press", 3, 10, 12, 60),
    ],
  },
  {
    id: "45-minute",
    name: "45 Minute Workout",
    description: "A full session that respects the clock: two compounds and three accessories.",
    category: "duration",
    tags: ["full body"],
    difficulty: "intermediate",
    durationMin: 45,
    targetMuscles: ["quads", "chest", "back", "shoulders", "arms"],
    equipment: ["barbell", "dumbbell", "cable"],
    exercises: [
      ex("Barbell Back Squat", 4, 6, 8, 120),
      ex("Barbell Bench Press", 4, 6, 8, 120),
      ex("Lat Pulldown", 3, 10, 12, 90),
      ex("Dumbbell Lateral Raise", 3, 12, 20, 60),
      ex("Barbell Curl", 3, 10, 12, 60),
    ],
  },
  {
    id: "full-training-session",
    name: "Full Training Session",
    description: "No time limit — the complete workout with warm-ups, main lifts and full accessory work.",
    category: "duration",
    tags: ["long", "full body", "complete"],
    difficulty: "advanced",
    durationMin: 90,
    targetMuscles: ["quads", "chest", "back", "shoulders", "hamstrings", "arms"],
    equipment: ["barbell", "dumbbell", "cable", "machine"],
    exercises: [
      ex("Barbell Back Squat", 5, 5, 8, 180, { note: "3 warm-up sets ramping up" }),
      ex("Barbell Bench Press", 4, 6, 8, 150),
      ex("Barbell Deadlift", 3, 5, 6, 210),
      ex("Barbell Overhead Press", 3, 8, 10, 120),
      ex("Bent-Over Barbell Row", 3, 8, 10, 120),
      ex("Lying Leg Curl", 3, 12, 15, 75),
      ex("Dumbbell Lateral Raise", 3, 12, 20, 60),
      ex("Barbell Curl", 3, 10, 12, 60),
      ex("Cable Tricep Pushdown", 3, 12, 15, 60),
    ],
  },

  // ── PHUL — Power Hypertrophy Upper Lower ────────────────────────────────
  {
    id: "phul-upper-power",
    name: "PHUL — Upper Power",
    description: "Heavy compound upper day from the Power Hypertrophy Upper Lower program. 4×/week pairing.",
    category: "strength",
    tags: ["phul", "upper", "power", "4x week"],
    difficulty: "intermediate",
    durationMin: 60,
    targetMuscles: ["chest", "back", "shoulders"],
    equipment: ["barbell", "dumbbell", "cable"],
    exercises: [
      ex("Barbell Bench Press",       4, 3, 5, 180, { rpe: 8, note: "work up to a heavy top set" }),
      ex("Bent-Over Barbell Row",     4, 3, 5, 180, { rpe: 8 }),
      ex("Incline Dumbbell Press",    3, 6, 10, 120),
      ex("Lat Pulldown",              3, 6, 10, 120),
      ex("Dumbbell Lateral Raise",    3, 10, 15, 60),
      ex("Barbell Curl",              3, 8, 12, 60),
      ex("Cable Tricep Pushdown",     3, 8, 12, 60),
    ],
  },
  {
    id: "phul-lower-power",
    name: "PHUL — Lower Power",
    description: "Heavy compound lower day from PHUL. Focus on squat and deadlift strength.",
    category: "strength",
    tags: ["phul", "lower", "power", "4x week"],
    difficulty: "intermediate",
    durationMin: 65,
    targetMuscles: ["quads", "hamstrings", "glutes"],
    equipment: ["barbell"],
    exercises: [
      ex("Barbell Back Squat",   4, 3, 5, 210, { rpe: 8, note: "belt up for top sets" }),
      ex("Deadlift",             4, 3, 5, 210, { rpe: 8 }),
      ex("Leg Press",            3, 10, 15, 120),
      ex("Lying Leg Curl",       3, 10, 15, 90),
      ex("Standing Calf Raise",  4, 8, 12, 60),
    ],
  },
  {
    id: "phul-upper-hypertrophy",
    name: "PHUL — Upper Hypertrophy",
    description: "Higher-volume upper day from PHUL — moderate weight, more sets, more pump.",
    category: "hypertrophy",
    tags: ["phul", "upper", "volume", "4x week"],
    difficulty: "intermediate",
    durationMin: 60,
    targetMuscles: ["chest", "back", "shoulders", "arms"],
    equipment: ["barbell", "dumbbell", "cable"],
    exercises: [
      ex("Incline Barbell Bench Press",  3, 8, 12, 120),
      ex("Cable Fly",                    3, 12, 15, 75),
      ex("Seated Cable Row",             3, 8, 12, 120),
      ex("Dumbbell Row",                 3, 10, 12, 90),
      ex("Dumbbell Shoulder Press",      3, 10, 12, 90),
      ex("Dumbbell Lateral Raise",       3, 12, 20, 60),
      ex("Dumbbell Curl",                3, 10, 15, 60),
      ex("Overhead Tricep Extension",    3, 10, 15, 60),
    ],
  },
  {
    id: "phul-lower-hypertrophy",
    name: "PHUL — Lower Hypertrophy",
    description: "Higher-volume lower day from PHUL — lunges, leg press, isolation work.",
    category: "hypertrophy",
    tags: ["phul", "lower", "volume", "4x week"],
    difficulty: "intermediate",
    durationMin: 60,
    targetMuscles: ["quads", "hamstrings", "glutes", "calves"],
    equipment: ["barbell", "machine", "dumbbell"],
    exercises: [
      ex("Barbell Front Squat",  3, 8, 12, 150, { note: "or goblet squat if front squat is new" }),
      ex("Hack Squat",           3, 10, 15, 120),
      ex("Walking Lunge",        3, 12, 15, 90, { perSide: true }),
      ex("Seated Leg Curl",      3, 12, 15, 75),
      ex("Romanian Deadlift",    3, 10, 12, 120),
      ex("Standing Calf Raise",  4, 12, 20, 60),
    ],
  },

  // ── 5/3/1 — Jim Wendler ──────────────────────────────────────────────────
  {
    id: "531-week1-squat",
    name: "5/3/1 — Squat Week 1",
    description: "Week 1 (5s) of Jim Wendler's 5/3/1 squat day. Set your training max first (90% of true 1RM).",
    category: "strength",
    tags: ["531", "wendler", "squat", "powerlifting"],
    difficulty: "intermediate",
    durationMin: 65,
    targetMuscles: ["quads", "glutes", "hamstrings"],
    equipment: ["barbell"],
    exercises: [
      ex("Barbell Back Squat", 1, 5, 5, 180, { rpe: 6, note: "65% of training max" }),
      ex("Barbell Back Squat", 1, 5, 5, 180, { rpe: 7, note: "75% of training max" }),
      ex("Barbell Back Squat", 1, 5, 20, 180, { rpe: 9, note: "85% of training max — do as many as possible (AMRAP)" }),
      ex("Leg Press",          3, 10, 15, 120, { note: "FSL: first set last or assistance" }),
      ex("Romanian Deadlift",  3, 10, 12, 120),
      ex("Walking Lunge",      3, 10, 12, 90, { perSide: true }),
    ],
  },
  {
    id: "531-week1-bench",
    name: "5/3/1 — Bench Week 1",
    description: "Week 1 (5s) of 5/3/1 bench day. Target: 65%, 75%, 85%+ AMRAP of your training max.",
    category: "strength",
    tags: ["531", "wendler", "bench", "powerlifting"],
    difficulty: "intermediate",
    durationMin: 60,
    targetMuscles: ["chest", "triceps", "shoulders"],
    equipment: ["barbell", "dumbbell", "cable"],
    exercises: [
      ex("Barbell Bench Press", 1, 5, 5, 150, { rpe: 6, note: "65% of training max" }),
      ex("Barbell Bench Press", 1, 5, 5, 150, { rpe: 7, note: "75% of training max" }),
      ex("Barbell Bench Press", 1, 5, 20, 150, { rpe: 9, note: "85% AMRAP — beat the log book" }),
      ex("Incline Dumbbell Press",  3, 10, 15, 90, { note: "supplemental volume" }),
      ex("Cable Fly",               3, 12, 15, 60),
      ex("Cable Tricep Pushdown",   3, 12, 15, 60),
    ],
  },

  // ── GZCLP — Beginner linear progression ─────────────────────────────────
  {
    id: "gzclp-a",
    name: "GZCLP — Session A",
    description: "Beginner GZCLP Session A. Squat + Bench as T1/T2, assistance T3s. Add weight every session.",
    category: "strength",
    tags: ["gzclp", "beginner", "linear progression", "3x week"],
    difficulty: "beginner",
    durationMin: 50,
    targetMuscles: ["quads", "chest", "back", "triceps"],
    equipment: ["barbell", "dumbbell"],
    exercises: [
      ex("Barbell Back Squat",    5, 3, 3, 180, { rpe: 8, note: "T1: add 2.5 kg each session until fail, then switch to 6×2 → 10×1" }),
      ex("Barbell Bench Press",   3, 10, 10, 90, { rpe: 7, note: "T2: add 2.5 kg each session. 3×10 → 3×8 → 3×6 on fail" }),
      ex("Lat Pulldown",          3, 15, 15, 60, { note: "T3: 2–3 sets, 15+ reps, pick challenging weight" }),
      ex("Tricep Pushdown",       2, 15, 20, 60),
      ex("Dumbbell Curl",         2, 15, 20, 60),
    ],
  },
  {
    id: "gzclp-b",
    name: "GZCLP — Session B",
    description: "Beginner GZCLP Session B. Deadlift + OHP as T1/T2, assistance T3s.",
    category: "strength",
    tags: ["gzclp", "beginner", "linear progression", "3x week"],
    difficulty: "beginner",
    durationMin: 50,
    targetMuscles: ["hamstrings", "glutes", "back", "shoulders"],
    equipment: ["barbell", "dumbbell"],
    exercises: [
      ex("Deadlift",                  1, 5, 5, 210, { rpe: 8, note: "T1: add 5 kg each session, 1×5 only" }),
      ex("Barbell Overhead Press",    3, 10, 10, 90, { rpe: 7, note: "T2: add 2.5 kg each session" }),
      ex("Dumbbell Row",              3, 15, 15, 60, { note: "T3: one heavy set per side" }),
      ex("Dumbbell Lateral Raise",    2, 15, 20, 60),
      ex("Face Pull",                 2, 15, 20, 60),
    ],
  },

  // ── Hypertrophy Specialization — chest ──────────────────────────────────
  {
    id: "hypertrophy-chest-specialization",
    name: "Chest Specialization",
    description: "High-frequency chest block for a lagging muscle group. Run 2–3×/week for 4–6 weeks.",
    category: "hypertrophy",
    tags: ["specialization", "chest", "frequency", "advanced"],
    difficulty: "advanced",
    durationMin: 50,
    targetMuscles: ["chest", "triceps", "shoulders"],
    equipment: ["barbell", "dumbbell", "cable"],
    exercises: [
      ex("Barbell Bench Press",       4, 6,  8, 150, { rpe: 8 }),
      ex("Incline Dumbbell Press",    3, 10, 12, 90, { rpe: 8 }),
      ex("Decline Barbell Press",     3, 8,  12, 90),
      ex("Cable Fly",                 4, 12, 20, 60, { note: "full stretch at the bottom" }),
      ex("Dumbbell Pullover",         3, 12, 15, 75, { note: "rib cage expansion at the bottom" }),
      ex("Cable Tricep Pushdown",     3, 12, 15, 60),
    ],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // Plan days and goal-specific sessions. Most are days of a plan in
  // lib/workoutPlans.ts; each also works on its own.
  // ═════════════════════════════════════════════════════════════════════════

  // ── push / pull / legs, B days (6-day PPL) ──────────────────────────────
  {
    id: "ppl-push-b",
    name: "Push Day B",
    description: "The second push day of a 6-day PPL: overhead press leads, incline and dips for the chest, more side-delt work.",
    objective: "Shoulders, upper chest and triceps with a different exercise mix from Push Day A.",
    category: "hypertrophy",
    tags: ["ppl", "push", "upper"],
    goals: ["muscle"],
    difficulty: "intermediate",
    frequency: "1× / week in a 6-day PPL",
    intensity: "compounds at RPE 7–8; isolation work close to failure",
    durationMin: 55,
    targetMuscles: ["shoulders", "chest", "triceps"],
    equipment: ["barbell", "dumbbell", "cable"],
    exercises: [
      ex("Barbell Overhead Press", 4, 6, 8, 150, { rpe: 8, alternatives: ["Seated Dumbbell Shoulder Press", "Machine Shoulder Press"] }),
      ex("Incline Barbell Bench Press", 3, 8, 10, 120, { alternatives: ["Incline Dumbbell Press"] }),
      ex("Chest Dips", 3, 8, 12, 90, { note: "lean forward to bias the chest", alternatives: ["Machine Chest Press", "Bench Dips"] }),
      ex("Cable Lateral Raise", 4, 12, 15, 60, { perSide: true, alternatives: ["Dumbbell Lateral Raise"] }),
      ex("Pec Deck", 3, 12, 15, 60, { alternatives: ["Cable Fly"] }),
      ex("Skull Crusher", 3, 10, 12, 75, { alternatives: ["Overhead Tricep Extension"] }),
    ],
  },
  {
    id: "ppl-pull-b",
    name: "Pull Day B",
    description: "Deadlift-led pull day: heavy hinge, chin-ups, chest-supported rows and arms.",
    objective: "Back thickness and posterior chain strength, with biceps and rear delts to finish.",
    category: "hypertrophy",
    tags: ["ppl", "pull", "upper"],
    goals: ["muscle", "strength"],
    difficulty: "intermediate",
    frequency: "1× / week in a 6-day PPL",
    intensity: "deadlift at RPE 7–8 — keep 2 reps in reserve",
    durationMin: 50,
    targetMuscles: ["back", "lats", "biceps", "hamstrings"],
    equipment: ["barbell", "dumbbell", "cable"],
    exercises: [
      ex("Barbell Deadlift", 3, 4, 6, 180, { rpe: 8, note: "ramp up over 2–3 warm-up sets", alternatives: ["Romanian Deadlift"] }),
      ex("Chin-Ups", 3, 6, 10, 120, { note: "use a band to stay in range", alternatives: ["Lat Pulldown"] }),
      ex("Chest-Supported Dumbbell Row", 3, 10, 12, 90, { alternatives: ["Seated Cable Row", "T-Bar Row"] }),
      ex("Straight-Arm Pulldown", 3, 12, 15, 60),
      ex("Rear Delt Fly", 3, 15, 20, 60, { alternatives: ["Cable Face Pull"] }),
      ex("Preacher Curl", 3, 10, 12, 60, { alternatives: ["Barbell Curl"] }),
    ],
  },
  {
    id: "ppl-legs-b",
    name: "Leg Day B",
    description: "Front-squat and hip-thrust leg day with unilateral work, to pair with Leg Day A.",
    objective: "Quads and glutes from different angles than Leg Day A, plus direct hamstring and calf work.",
    category: "hypertrophy",
    tags: ["ppl", "legs", "lower"],
    goals: ["muscle"],
    difficulty: "intermediate",
    frequency: "1× / week in a 6-day PPL",
    intensity: "front squat at RPE 7–8; lunges and isolation close to failure",
    durationMin: 60,
    targetMuscles: ["quads", "glutes", "hamstrings", "calves"],
    equipment: ["barbell", "machine", "dumbbell"],
    exercises: [
      ex("Front Squat", 4, 6, 8, 180, { rpe: 8, alternatives: ["Hack Squat", "Goblet Squat"] }),
      ex("Barbell Hip Thrust", 3, 8, 12, 120, { alternatives: ["Glute Bridge"] }),
      ex("Walking Lunge", 3, 10, 12, 90, { perSide: true, alternatives: ["Reverse Lunge", "Bulgarian Split Squat"] }),
      ex("Seated Leg Curl", 3, 10, 15, 75, { alternatives: ["Lying Leg Curl"] }),
      ex("Leg Extension", 3, 12, 15, 60),
      ex("Seated Calf Raise", 4, 12, 20, 60, { alternatives: ["Standing Calf Raise"] }),
    ],
  },

  // ── upper / lower, B days ───────────────────────────────────────────────
  {
    id: "upper-b",
    name: "Upper Body B",
    description: "The second upper day of a 4-day split: incline and overhead pressing, chin-ups and rows, arms in a superset.",
    objective: "Balanced upper-body volume with different pressing and pulling angles from Upper Body A.",
    category: "hypertrophy",
    tags: ["upper lower", "upper"],
    goals: ["muscle"],
    difficulty: "intermediate",
    frequency: "1× / week in a 4-day upper / lower split",
    intensity: "RPE 7–8 on compounds",
    durationMin: 60,
    targetMuscles: ["chest", "back", "shoulders", "arms"],
    equipment: ["barbell", "dumbbell", "cable"],
    exercises: [
      ex("Incline Dumbbell Press", 4, 8, 10, 120, { alternatives: ["Incline Barbell Bench Press"] }),
      ex("Chin-Ups", 4, 6, 10, 120, { alternatives: ["Lat Pulldown"] }),
      ex("Barbell Overhead Press", 3, 6, 8, 150, { rpe: 8, alternatives: ["Seated Dumbbell Shoulder Press"] }),
      ex("Seated Cable Row", 3, 10, 12, 90, { alternatives: ["Single-Arm Dumbbell Row"] }),
      ex("Cable Fly", 3, 12, 15, 60, { alternatives: ["Pec Deck"] }),
      ex("Rear Delt Fly", 3, 15, 20, 60, { alternatives: ["Cable Face Pull"] }),
      ex("Dumbbell Hammer Curl", 3, 10, 12, 30, { supersetGroup: 1 }),
      ex("Overhead Tricep Extension", 3, 10, 12, 90, { supersetGroup: 1 }),
    ],
  },
  {
    id: "lower-b",
    name: "Lower Body B",
    description: "Deadlift-led lower day with split squats and direct leg isolation work.",
    objective: "Posterior chain and single-leg strength, complementing Lower Body A's squat focus.",
    category: "hypertrophy",
    tags: ["upper lower", "lower"],
    goals: ["muscle", "strength"],
    difficulty: "intermediate",
    frequency: "1× / week in a 4-day upper / lower split",
    intensity: "deadlift at RPE 7–8",
    durationMin: 60,
    targetMuscles: ["hamstrings", "glutes", "quads", "calves"],
    equipment: ["barbell", "machine", "dumbbell"],
    exercises: [
      ex("Barbell Deadlift", 3, 4, 6, 180, { rpe: 8, note: "ramp up over 2–3 warm-up sets", alternatives: ["Romanian Deadlift"] }),
      ex("Bulgarian Split Squat", 3, 8, 10, 90, { perSide: true, alternatives: ["Reverse Lunge"] }),
      ex("Hack Squat", 3, 8, 12, 120, { alternatives: ["Leg Press"] }),
      ex("Lying Leg Curl", 3, 10, 12, 75, { alternatives: ["Seated Leg Curl"] }),
      ex("Leg Extension", 3, 12, 15, 60),
      ex("Standing Calf Raise", 4, 10, 15, 60),
      ex("Hanging Leg Raise", 3, 10, 15, 60),
    ],
  },

  // ── full body, B and C days ─────────────────────────────────────────────
  {
    id: "full-body-b",
    name: "Full Body B",
    description: "Hinge-led full-body day: deadlift, incline press, pulldown, lunges and core.",
    objective: "Whole-body strength and muscle with a hip-hinge focus, to rotate with Full Body A and C.",
    category: "full-body",
    tags: ["full body", "3x week"],
    goals: ["general", "muscle"],
    difficulty: "beginner",
    frequency: "2–3× / week, rotating A / B / C",
    intensity: "leave 2–3 reps in reserve while you learn the lifts",
    durationMin: 50,
    targetMuscles: ["hamstrings", "glutes", "chest", "back"],
    equipment: ["barbell", "dumbbell", "cable"],
    exercises: [
      ex("Barbell Deadlift", 3, 5, 5, 150, { rpe: 7, note: "learn the hinge with light weight first", alternatives: ["Dumbbell Romanian Deadlift"] }),
      ex("Incline Dumbbell Press", 3, 8, 12, 120, { alternatives: ["Push-Up"] }),
      ex("Lat Pulldown", 3, 8, 12, 90, { alternatives: ["Inverted Row"] }),
      ex("Walking Lunge", 3, 10, 10, 90, { perSide: true, alternatives: ["Goblet Squat"] }),
      ex("Dumbbell Lateral Raise", 3, 12, 15, 60),
      ex("Hanging Leg Raise", 3, 8, 12, 60, { alternatives: ["Dead Bug"] }),
    ],
  },
  {
    id: "full-body-c",
    name: "Full Body C",
    description: "Machine- and dumbbell-friendly full-body day with an arm superset and side planks.",
    objective: "Rounds out the A / B / C rotation with lower-fatigue variations.",
    category: "full-body",
    tags: ["full body", "3x week"],
    goals: ["general", "muscle"],
    difficulty: "beginner",
    frequency: "2–3× / week, rotating A / B / C",
    intensity: "leave 2–3 reps in reserve",
    durationMin: 50,
    targetMuscles: ["quads", "chest", "back", "shoulders"],
    equipment: ["machine", "dumbbell", "cable"],
    exercises: [
      ex("Leg Press", 3, 10, 12, 120, { alternatives: ["Goblet Squat"] }),
      ex("Dumbbell Bench Press", 3, 8, 12, 120, { alternatives: ["Machine Chest Press"] }),
      ex("Seated Cable Row", 3, 10, 12, 90, { alternatives: ["Single-Arm Dumbbell Row"] }),
      ex("Seated Dumbbell Shoulder Press", 3, 8, 12, 90, { alternatives: ["Machine Shoulder Press"] }),
      ex("Lying Leg Curl", 3, 10, 12, 75),
      ex("Dumbbell Bicep Curl", 2, 10, 12, 30, { supersetGroup: 1 }),
      ex("Cable Tricep Pushdown", 2, 10, 12, 75, { supersetGroup: 1 }),
      ex("Side Plank", 2, 20, 30, 45, { timed: true, perSide: true }),
    ],
  },

  // ── bro split (5 days) ──────────────────────────────────────────────────
  {
    id: "bro-chest",
    name: "Chest Day",
    description: "One muscle, one day: flat, incline and machine pressing, flyes and dips.",
    objective: "High chest volume in a single session, for a 5-day body-part split.",
    category: "hypertrophy",
    tags: ["bro split", "push"],
    goals: ["muscle"],
    difficulty: "intermediate",
    frequency: "1× / week in a 5-day body-part split",
    intensity: "RPE 8 on presses; take flyes and dips close to failure",
    durationMin: 45,
    targetMuscles: ["chest", "triceps", "shoulders"],
    equipment: ["barbell", "dumbbell", "machine", "cable"],
    exercises: [
      ex("Barbell Bench Press", 4, 6, 8, 150, { rpe: 8, alternatives: ["Dumbbell Bench Press"] }),
      ex("Incline Dumbbell Press", 3, 8, 10, 120, { alternatives: ["Incline Barbell Bench Press"] }),
      ex("Machine Chest Press", 3, 10, 12, 90, { alternatives: ["Push-Up"] }),
      ex("Cable Fly", 3, 12, 15, 60, { alternatives: ["Pec Deck"] }),
      ex("Chest Dips", 3, 8, 12, 90, { note: "lean forward", alternatives: ["Bench Dips"] }),
    ],
  },
  {
    id: "bro-back",
    name: "Back Day",
    description: "Pull-ups for width, rows for thickness, straight-arm work for the lats.",
    objective: "High back volume in a single session, for a 5-day body-part split.",
    category: "hypertrophy",
    tags: ["bro split", "pull"],
    goals: ["muscle"],
    difficulty: "intermediate",
    frequency: "1× / week in a 5-day body-part split",
    intensity: "RPE 8 on the first two lifts",
    durationMin: 50,
    targetMuscles: ["back", "lats", "biceps"],
    equipment: ["barbell", "cable", "dumbbell"],
    exercises: [
      ex("Pull-Up", 4, 6, 10, 150, { note: "add load or use a band to stay in range", alternatives: ["Lat Pulldown"] }),
      ex("Bent-Over Barbell Row", 4, 8, 10, 120, { rpe: 8, alternatives: ["T-Bar Row"] }),
      ex("Lat Pulldown", 3, 10, 12, 90),
      ex("Seated Cable Row", 3, 10, 12, 90, { alternatives: ["Chest-Supported Dumbbell Row"] }),
      ex("Straight-Arm Pulldown", 3, 12, 15, 60),
    ],
  },
  {
    id: "bro-shoulders",
    name: "Shoulder Day",
    description: "Overhead pressing, then side and rear delts from cables and dumbbells, shrugs to finish.",
    objective: "All three delt heads plus traps, for a 5-day body-part split.",
    category: "hypertrophy",
    tags: ["bro split", "push"],
    goals: ["muscle"],
    difficulty: "intermediate",
    frequency: "1× / week in a 5-day body-part split",
    intensity: "press at RPE 8; raises close to failure with clean form",
    durationMin: 50,
    targetMuscles: ["shoulders", "rear delts", "traps"],
    equipment: ["barbell", "dumbbell", "cable"],
    exercises: [
      ex("Barbell Overhead Press", 4, 6, 8, 150, { rpe: 8, alternatives: ["Seated Dumbbell Shoulder Press"] }),
      ex("Arnold Press", 3, 10, 12, 90, { alternatives: ["Machine Shoulder Press"] }),
      ex("Dumbbell Lateral Raise", 4, 12, 20, 60, { note: "lead with the elbows" }),
      ex("Cable Lateral Raise", 3, 12, 15, 60, { perSide: true }),
      ex("Rear Delt Fly", 4, 15, 20, 60, { alternatives: ["Cable Face Pull"] }),
      ex("Dumbbell Shrug", 3, 10, 15, 60),
    ],
  },
  {
    id: "bro-arms",
    name: "Arm Day",
    description: "Biceps and triceps in three supersets: heavy, stretched and pump.",
    objective: "Direct arm volume, for a 5-day body-part split.",
    category: "hypertrophy",
    tags: ["bro split", "arms", "superset"],
    goals: ["muscle"],
    difficulty: "intermediate",
    frequency: "1× / week in a 5-day body-part split",
    intensity: "rest after each pair, not between the two exercises",
    durationMin: 45,
    targetMuscles: ["biceps", "triceps", "forearms"],
    equipment: ["barbell", "dumbbell", "cable"],
    exercises: [
      ex("Barbell Curl", 4, 8, 10, 30, { supersetGroup: 1 }),
      ex("Close-Grip Bench Press", 4, 6, 10, 120, { supersetGroup: 1 }),
      ex("Incline Dumbbell Curl", 3, 10, 12, 30, { supersetGroup: 2 }),
      ex("Overhead Tricep Extension", 3, 10, 12, 90, { supersetGroup: 2 }),
      ex("Dumbbell Hammer Curl", 3, 12, 15, 30, { supersetGroup: 3 }),
      ex("Cable Tricep Pushdown", 3, 12, 15, 75, { supersetGroup: 3 }),
    ],
  },

  // ── beginner fundamentals ───────────────────────────────────────────────
  {
    id: "beginner-a",
    name: "Gym Fundamentals A",
    description: "Machines and cables that are easy to learn and set up: one push, one pull and one leg movement each.",
    objective: "Learn the main movement patterns safely and build a base of strength.",
    category: "full-body",
    tags: ["beginner", "full body", "machines"],
    goals: ["general", "muscle"],
    difficulty: "beginner",
    frequency: "2–3× / week, alternating A and B",
    intensity: "stop each set with 2–3 reps left; add weight when every set reaches the top of the range",
    durationMin: 45,
    targetMuscles: ["quads", "chest", "back", "shoulders"],
    equipment: ["machine", "cable"],
    exercises: [
      ex("Leg Press", 3, 10, 12, 120, { note: "full, controlled range", alternatives: ["Goblet Squat"] }),
      ex("Machine Chest Press", 3, 10, 12, 90, { alternatives: ["Push-Up"] }),
      ex("Lat Pulldown", 3, 10, 12, 90),
      ex("Lying Leg Curl", 2, 10, 15, 75, { alternatives: ["Seated Leg Curl"] }),
      ex("Machine Shoulder Press", 2, 10, 12, 90),
      ex("Plank", 3, 20, 30, 60, { timed: true }),
    ],
  },
  {
    id: "beginner-b",
    name: "Gym Fundamentals B",
    description: "Free-weight versions of the same patterns: goblet squat, dumbbell press, row and hinge.",
    objective: "Build on Fundamentals A with dumbbells, adding a hip hinge and core control.",
    category: "full-body",
    tags: ["beginner", "full body", "dumbbell"],
    goals: ["general", "muscle"],
    difficulty: "beginner",
    frequency: "2–3× / week, alternating A and B",
    intensity: "stop each set with 2–3 reps left",
    durationMin: 45,
    targetMuscles: ["quads", "chest", "back", "hamstrings"],
    equipment: ["dumbbell", "cable"],
    exercises: [
      ex("Goblet Squat", 3, 10, 12, 90),
      ex("Dumbbell Bench Press", 3, 8, 12, 90, { alternatives: ["Push-Up"] }),
      ex("Seated Cable Row", 3, 10, 12, 90, { alternatives: ["Single-Arm Dumbbell Row"] }),
      ex("Dumbbell Romanian Deadlift", 3, 10, 12, 90, { note: "push the hips back, soft knees" }),
      ex("Dumbbell Lateral Raise", 2, 12, 15, 60),
      ex("Dead Bug", 3, 8, 10, 45, { perSide: true }),
    ],
  },

  // ── calisthenics ────────────────────────────────────────────────────────
  {
    id: "calisthenics-a",
    name: "Calisthenics A — Push & Legs",
    description: "Push-up and pike progressions, chair dips, split squats and a hollow hold. A sturdy chair is all you need.",
    objective: "Upper-body pushing and leg strength using bodyweight progressions.",
    category: "bodyweight",
    tags: ["calisthenics", "home", "bodyweight"],
    goals: ["calisthenics", "general"],
    difficulty: "intermediate",
    frequency: "2–3× / week, alternating A and B",
    intensity: "pick the progression where the last 2 reps are hard; make it harder when you pass the top of the range",
    durationMin: 40,
    targetMuscles: ["chest", "shoulders", "triceps", "quads", "abs"],
    equipment: ["bodyweight"],
    exercises: [
      ex("Push-Up", 4, 8, 15, 90, { alternatives: ["Decline Push-Up"] }),
      ex("Pike Push Ups", 3, 6, 10, 90, { note: "hips high, head between the hands" }),
      ex("Bench Dips", 3, 8, 15, 75, { note: "hands on a chair or bench" }),
      ex("Bulgarian Split Squat", 3, 8, 12, 90, { perSide: true, alternatives: ["Reverse Lunge"] }),
      ex("Jump Squat", 3, 8, 8, 60, { alternatives: ["Bodyweight Squat"] }),
      ex("Hollow Body Hold", 3, 20, 30, 45, { timed: true }),
    ],
  },
  {
    id: "calisthenics-b",
    name: "Calisthenics B — Pull & Core",
    description: "Pull-ups, chin-ups and rows with hamstring and core work. Needs a pull-up bar.",
    objective: "Upper-body pulling strength and trunk control using bodyweight progressions.",
    category: "bodyweight",
    tags: ["calisthenics", "bodyweight"],
    goals: ["calisthenics", "general"],
    difficulty: "intermediate",
    frequency: "2–3× / week, alternating A and B",
    intensity: "use bands or slow negatives until you can do the bottom of each range",
    durationMin: 40,
    targetMuscles: ["back", "lats", "biceps", "glutes", "abs"],
    equipment: ["bodyweight", "pull-up bar"],
    exercises: [
      ex("Pull-Up", 4, 5, 10, 120, { note: "band-assisted or slow negatives if you can't do 5" }),
      ex("Chin-Ups", 3, 6, 10, 90),
      ex("Inverted Row", 3, 8, 12, 90, { note: "under a sturdy table or a low bar" }),
      ex("Single Leg Glute Bridge", 3, 10, 12, 60, { perSide: true }),
      ex("Hanging Leg Raise", 3, 8, 12, 60, { alternatives: ["Dead Bug"] }),
      ex("Side Plank", 2, 20, 30, 45, { timed: true, perSide: true }),
    ],
  },

  // ── goal-specific sessions ──────────────────────────────────────────────
  {
    id: "endurance-circuit",
    name: "Muscular Endurance Circuit",
    description: "Six exercises back to back with moderate weight, three rounds. Rest only after each round.",
    objective: "Build the ability to keep working at moderate loads for longer.",
    category: "conditioning",
    tags: ["circuit", "dumbbell", "endurance"],
    goals: ["endurance", "general"],
    difficulty: "beginner",
    frequency: "2–3× / week",
    intensity: "a weight you could lift 25 times; keep moving within the round",
    durationMin: 35,
    targetMuscles: ["quads", "chest", "back", "shoulders", "abs"],
    equipment: ["dumbbell", "bodyweight"],
    exercises: [
      ex("Goblet Squat", 3, 15, 20, 15, { supersetGroup: 1 }),
      ex("Push-Up", 3, 12, 20, 15, { supersetGroup: 1 }),
      ex("Single-Arm Dumbbell Row", 3, 12, 15, 15, { perSide: true, supersetGroup: 1 }),
      ex("Reverse Lunge", 3, 12, 12, 15, { perSide: true, supersetGroup: 1 }),
      ex("Dumbbell Shoulder Press", 3, 12, 15, 15, { supersetGroup: 1 }),
      ex("Mountain Climbers", 3, 30, 40, 120, { timed: true, supersetGroup: 1 }),
    ],
  },
  {
    id: "functional-fitness",
    name: "Functional Strength",
    description: "Swings, squats, single-arm rows, step-ups and loaded carries — strength that carries over to daily life.",
    objective: "Hinge, squat, push, pull and carry patterns with a kettlebell and dumbbells.",
    category: "athletic",
    tags: ["functional", "kettlebell", "carries"],
    goals: ["functional", "general"],
    difficulty: "beginner",
    frequency: "2–3× / week",
    intensity: "moderate weights, crisp reps; carries heavy but with tall posture",
    durationMin: 45,
    targetMuscles: ["glutes", "hamstrings", "back", "quads", "abs"],
    equipment: ["kettlebell", "dumbbell"],
    exercises: [
      ex("Kettlebell Swing", 4, 12, 15, 75, { note: "hinge, don't squat; snap the hips" }),
      ex("Goblet Squat", 3, 8, 12, 90),
      ex("Single-Arm Dumbbell Row", 3, 10, 10, 75, { perSide: true }),
      ex("Step Ups", 3, 8, 10, 75, { perSide: true, alternatives: ["Reverse Lunge"] }),
      ex("Push-Up", 3, 10, 15, 60),
      ex("Dumbbell Farmer's Walk", 3, 30, 45, 90, { timed: true, alternatives: ["Kettlebell Farmer's Walk"] }),
      ex("Suitcase Carry", 2, 30, 40, 60, { timed: true, perSide: true }),
    ],
  },
  {
    id: "mobility-recovery",
    name: "Mobility & Recovery Flow",
    description: "Gentle holds and flows for the hips, spine and shoulders. Good on rest days or after training.",
    objective: "Move through a comfortable range of motion in the hips, spine and shoulders.",
    category: "mobility",
    tags: ["mobility", "recovery", "stretching", "home"],
    goals: ["mobility"],
    difficulty: "beginner",
    frequency: "daily, or on rest days",
    intensity: "breathe slowly and ease into each position — it should never hurt",
    durationMin: 20,
    targetMuscles: ["hips", "back", "shoulders", "hamstrings"],
    equipment: ["bodyweight"],
    exercises: [
      ex("Cat-Cow", 2, 45, 60, 15, { timed: true }),
      ex("Kneeling Hip Flexor Stretch", 2, 30, 45, 15, { timed: true, perSide: true }),
      ex("Pigeon Stretch", 2, 30, 45, 15, { timed: true, perSide: true }),
      ex("Downward-Facing Dog", 2, 30, 45, 15, { timed: true }),
      ex("Seated Spinal Twist", 2, 30, 30, 15, { timed: true, perSide: true }),
      ex("Bird-Dog", 2, 8, 10, 15, { perSide: true }),
      ex("Cross-Body Shoulder Stretch", 2, 30, 30, 15, { timed: true, perSide: true }),
      ex("Child's Pose", 1, 60, 60, 0, { timed: true }),
    ],
  },
  {
    id: "conditioning-intervals",
    name: "Conditioning Intervals",
    description: "Rower warm-up, then bike sprints, swings, battle ropes and burpees.",
    objective: "Raise work capacity with short, hard intervals and full recoveries.",
    category: "conditioning",
    tags: ["conditioning", "intervals", "hiit"],
    goals: ["conditioning", "endurance"],
    difficulty: "intermediate",
    frequency: "2× / week on non-consecutive days",
    intensity: "intervals at about 8/10 effort — hard but repeatable",
    durationMin: 35,
    targetMuscles: ["quads", "glutes", "shoulders", "abs"],
    equipment: ["machine", "kettlebell"],
    exercises: [
      ex("Rowing Machine", 1, 300, 300, 60, { timed: true, note: "easy pace warm-up" }),
      ex("Air Bike", 6, 20, 30, 90, { timed: true, alternatives: ["Stationary Bike", "Rowing Machine"] }),
      ex("Kettlebell Swing", 3, 15, 15, 60),
      ex("Battle Ropes", 4, 20, 30, 60, { timed: true, alternatives: ["Jump Rope"] }),
      ex("Burpees", 3, 8, 10, 60, { alternatives: ["Mountain Climbers"] }),
    ],
  },
  {
    id: "express-20-home",
    name: "Express 20 — No Equipment",
    description: "Six bodyweight moves in a circuit, three rounds. Done in about 20 minutes, anywhere.",
    objective: "A short full-body session when time and equipment are limited.",
    category: "duration",
    tags: ["quick", "home", "bodyweight", "circuit"],
    goals: ["conditioning", "general"],
    difficulty: "beginner",
    frequency: "2–4× / week",
    intensity: "steady effort; rest only after each round",
    durationMin: 20,
    targetMuscles: ["quads", "chest", "glutes", "abs"],
    equipment: ["bodyweight"],
    exercises: [
      ex("Jump Squat", 3, 10, 12, 10, { supersetGroup: 1, alternatives: ["Bodyweight Squat"] }),
      ex("Push-Up", 3, 8, 15, 10, { supersetGroup: 1 }),
      ex("Reverse Lunge", 3, 10, 10, 10, { perSide: true, supersetGroup: 1 }),
      ex("Mountain Climbers", 3, 30, 30, 10, { timed: true, supersetGroup: 1 }),
      ex("Burpees", 3, 6, 10, 10, { supersetGroup: 1 }),
      ex("Plank", 3, 30, 45, 90, { timed: true, supersetGroup: 1 }),
    ],
  },
];

// ── lookup / mapping helpers ────────────────────────────────────────────────
export const templateById = (id: string): WorkoutTemplate | undefined =>
  WORKOUT_TEMPLATES.find((t) => t.id === id);

export const CATEGORY_LABEL: Record<TemplateCategory, string> = {
  "full-body": "full body",
  hypertrophy: "hypertrophy",
  strength: "strength",
  athletic: "athletic",
  equipment: "equipment",
  duration: "by duration",
  bodyweight: "bodyweight",
  conditioning: "conditioning",
  mobility: "mobility",
};

// ── derived metadata (so filters can't drift from the data) ─────────────────
const CATEGORY_GOALS: Record<TemplateCategory, TrainingGoal[]> = {
  "full-body": ["general", "muscle"],
  hypertrophy: ["muscle"],
  strength: ["strength"],
  athletic: ["functional", "conditioning"],
  equipment: ["general"],
  duration: ["general"],
  bodyweight: ["calisthenics"],
  conditioning: ["conditioning"],
  mobility: ["mobility"],
};

const CATEGORY_FREQUENCY: Record<TemplateCategory, string> = {
  "full-body": "2–3× / week, a rest day between",
  hypertrophy: "1–2× / week as part of a split",
  strength: "1–2× / week as part of a strength plan",
  athletic: "1–2× / week alongside sport practice",
  equipment: "2–3× / week",
  duration: "2–4× / week",
  bodyweight: "2–3× / week",
  conditioning: "2–3× / week on non-consecutive days",
  mobility: "daily, or on rest days",
};

export const templateGoals = (t: WorkoutTemplate): TrainingGoal[] => t.goals ?? CATEGORY_GOALS[t.category];
export const templateFrequency = (t: WorkoutTemplate): string => t.frequency ?? CATEGORY_FREQUENCY[t.category];

export type EquipmentClass = "none" | "dumbbells" | "minimal" | "gym";
export const EQUIPMENT_CLASS_LABEL: Record<EquipmentClass, string> = {
  none: "no equipment",
  dumbbells: "dumbbells only",
  minimal: "minimal kit",
  gym: "full gym",
};

/** Bodyweight-only → "none"; dumbbells (+ bodyweight) → "dumbbells"; bars, bands, bells, boxes → "minimal"; else "gym". */
export function equipmentClass(equipment: string[]): EquipmentClass {
  const kit = equipment.filter((e) => e !== "bodyweight");
  if (kit.length === 0) return "none";
  if (kit.every((e) => e === "dumbbell")) return "dumbbells";
  if (kit.every((e) => ["dumbbell", "kettlebell", "bands", "box", "pull-up bar"].includes(e))) return "minimal";
  return "gym";
}

export type DurationBucket = "express" | "short" | "standard" | "long";
export const DURATION_BUCKET_LABEL: Record<DurationBucket, string> = {
  express: "≤ 20 min",
  short: "30 min",
  standard: "45–60 min",
  long: "60+ min",
};
export function durationBucket(min: number): DurationBucket {
  if (min <= 22) return "express";
  if (min <= 38) return "short";
  if (min <= 62) return "standard";
  return "long";
}

/** Free-text match over name, description, tags, muscles, goals and exercises. */
export function matchesTemplateQuery(t: WorkoutTemplate, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    t.name,
    t.description,
    t.objective ?? "",
    ...t.tags,
    ...t.targetMuscles,
    ...templateGoals(t).map((g) => GOAL_LABEL[g]),
    ...t.exercises.map((e) => e.name),
  ]
    .join(" ")
    .toLowerCase();
  return q.split(/\s+/).every((word) => hay.includes(word));
}

const repRange = (min: number, max: number) => (min === max ? `${min}` : `${min}–${max}`);

/** "4 × 6–8", "3 × 30–45 s", "3 × 10 / side" — target label shared with the plan/session UI. */
export const templateExerciseTarget = (e: TemplateExercise): string =>
  `${e.sets} × ${repRange(e.repsMin, e.repsMax)}${e.timed ? " s" : ""}${e.perSide ? " / side" : ""}`;

/**
 * The server's WorkoutExercise has no columns for RPE, warm-up, timed or
 * per-side, so they ride in `notes` as a readable suffix —
 * "lean forward [rpe 8 · warm-up · per side]" — and are parsed back on load.
 */
const FLAG_SUFFIX = /\s*\[([^\]]*)\]\s*$/;

export function encodeExerciseNotes(e: TemplateExercise): string | undefined {
  const flags = [
    e.rpe != null ? `rpe ${e.rpe}` : null,
    e.warmup ? "warm-up" : null,
    e.timed ? "timed" : null,
    e.perSide ? "per side" : null,
  ].filter(Boolean);
  const note = (e.note ?? "").trim();
  if (!flags.length) return note || undefined;
  return `${note}${note ? " " : ""}[${flags.join(" · ")}]`;
}

export function decodeExerciseNotes(
  notes: string | null | undefined,
): Pick<TemplateExercise, "note" | "rpe" | "warmup" | "timed" | "perSide"> {
  const raw = notes ?? "";
  const m = FLAG_SUFFIX.exec(raw);
  const tokens = m ? m[1].split("·").map((t) => t.trim()) : [];
  const known = tokens.every((t) => /^(rpe [\d.]+|warm-up|timed|per side)$/.test(t));
  if (!m || !known) return { note: raw || undefined };
  const rpe = tokens.find((t) => t.startsWith("rpe "));
  const note = raw.slice(0, m.index).trim();
  return {
    note: note || undefined,
    rpe: rpe ? Number(rpe.slice(4)) : undefined,
    warmup: tokens.includes("warm-up") || undefined,
    timed: tokens.includes("timed") || undefined,
    perSide: tokens.includes("per side") || undefined,
  };
}

/**
 * Map a template's exercises onto the `StartExercise[]` the session store wants.
 * Reps are pre-seeded to `repsMin` so the logger opens with a sensible number;
 * weight is left blank for the user (or the prescription engine) to fill.
 */
export function templateToStartExercises(t: {
  exercises: TemplateExercise[];
}): StartExercise[] {
  return t.exercises.map((e) => ({
    name: e.name,
    target: templateExerciseTarget(e),
    supersetGroup: e.supersetGroup ?? null,
    prescription:
      e.rpe != null || e.note
        ? { weightKg: null, reps: e.repsMin, rpe: e.rpe ?? null, note: e.note ?? "" }
        : null,
    sets: startSets(e.sets, e.repsMin, e.warmup),
  }));
}

/**
 * `sets` working sets, preceded by one lighter warm-up set when asked for
 * ("include a warm-up set"). Warm-ups don't count toward volume or PRs.
 */
export function startSets(sets: number, reps: number | null, warmup = false): NonNullable<StartExercise["sets"]> {
  const working = Array.from({ length: Math.max(1, sets) }, () => ({
    weight: null,
    reps,
    rpe: null,
    done: false,
  }));
  return warmup ? [{ weight: null, reps, rpe: null, done: false, warmup: true }, ...working] : working;
}

/** Rough minutes: ~3 s per rep (or the hold time), doubled per side, plus rest. */
export const templateDurationMin = (exercises: TemplateExercise[]): number =>
  Math.round(
    exercises.reduce((sum, e) => {
      const work = ((e.repsMin + e.repsMax) / 2) * (e.timed ? 1 : 3) * (e.perSide ? 2 : 1);
      return sum + e.sets * (work + e.restSec);
    }, 0) / 60,
  );

// ── recommendations (simple heuristic, not an engine) ──────────────────────
const PROFILE_GOALS: Record<string, TrainingGoal[]> = {
  "build muscle": ["muscle", "general"],
  hypertrophy: ["muscle", "general"],
  "gain strength": ["strength", "muscle"],
  strength: ["strength", "muscle"],
  "lose fat": ["conditioning", "general", "endurance"],
  "general fitness": ["general", "functional"],
  athleticism: ["functional", "conditioning"],
  "athletic performance": ["functional", "conditioning"],
  endurance: ["endurance", "conditioning"],
};

/**
 * A few sensible template picks for the hub. Signals: the user's stated goal,
 * their environment/equipment, and which muscles they've hit most recently
 * (so we suggest something complementary). Deliberately conservative — no
 * claims beyond "matches your goal and recent training".
 */
export function recommendTemplates(
  profile: Pick<Profile, "goal" | "experience" | "environment" | "equipment">,
  recentMuscleKeys: string[] = [],
  count = 3,
): WorkoutTemplate[] {
  const goal = (profile.goal ?? "").toLowerCase();
  const wantGoals = PROFILE_GOALS[goal] ?? ["general", "muscle"];
  const recent = new Set(recentMuscleKeys.map((m) => m.toLowerCase()));
  const home = profile.environment === "home";

  const scored = WORKOUT_TEMPLATES.map((t) => {
    let score = 0;
    const goals = templateGoals(t);
    if (goals.some((g) => wantGoals.includes(g))) score += 3;
    if (goals.includes(wantGoals[0])) score += 1;
    // complementary: reward templates that mostly train not-recently-hit muscles
    const overlap = t.targetMuscles.filter((m) => recent.has(m.toLowerCase())).length;
    score -= overlap;
    // environment fit
    if (home && (t.equipment.includes("machine") || t.equipment.includes("cable"))) score -= 2;
    if (home && (t.equipment.includes("bodyweight") || t.equipment.includes("dumbbell"))) score += 1;
    if (profile.experience === "beginner" && t.difficulty === "advanced") score -= 2;
    if (profile.experience === "advanced" && t.difficulty === "beginner") score -= 1;
    return { t, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((s) => s.t);
}
