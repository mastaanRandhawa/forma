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
  | "duration";

export type Difficulty = "beginner" | "intermediate" | "advanced";

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
      ex("Plank", 3, 30, 45, 60, { note: "seconds, not reps" }),
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
      ex("Bulgarian Split Squat", 3, 10, 12, 90, { note: "per leg" }),
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
      ex("Plank", 3, 30, 45, 45, { note: "seconds" }),
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
      ex("Bulgarian Split Squat", 3, 8, 10, 90, { note: "per leg" }),
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
      ex("Single-Arm Dumbbell Row", 3, 10, 12, 75, { note: "per arm" }),
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
      ex("Bulgarian Split Squat", 3, 10, 15, 60, { note: "per leg" }),
      ex("Plank", 3, 30, 60, 45, { note: "seconds" }),
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
      ex("Plank", 3, 30, 45, 45, { note: "seconds" }),
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
      ex("Single-Arm Dumbbell Row", 4, 10, 12, 60, { note: "per side" }),
      ex("Push Press", 3, 6, 8, 75, { note: "per side" }),
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
      ex("Walking Lunge",        3, 12, 15, 90, { note: "per leg" }),
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
      ex("Walking Lunge",      3, 10, 12, 90, { note: "per leg" }),
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
};

const repRange = (min: number, max: number) => (min === max ? `${min}` : `${min}–${max}`);

/** "4 × 6–8" — target label shared with the plan/session UI. */
export const templateExerciseTarget = (e: TemplateExercise): string =>
  `${e.sets} × ${repRange(e.repsMin, e.repsMax)}`;

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
    sets: Array.from({ length: Math.max(1, e.sets) }, () => ({
      weight: null,
      reps: e.repsMin,
      rpe: null,
      done: false,
      warmup: e.warmup ?? false,
    })),
  }));
}

export const templateDurationMin = (exercises: TemplateExercise[]): number =>
  Math.round(
    exercises.reduce(
      (sum, e) => sum + e.sets * (((e.repsMin + e.repsMax) / 2) * 3 + e.restSec),
      0,
    ) / 60,
  );

// ── recommendations (simple heuristic, not an engine) ──────────────────────
const GOAL_CATEGORY: Record<string, TemplateCategory[]> = {
  "build muscle": ["hypertrophy", "full-body"],
  hypertrophy: ["hypertrophy", "full-body"],
  "gain strength": ["strength", "full-body"],
  strength: ["strength", "full-body"],
  "lose fat": ["duration", "full-body", "equipment"],
  "general fitness": ["full-body", "duration"],
  athleticism: ["athletic", "full-body"],
  "athletic performance": ["athletic", "full-body"],
  endurance: ["duration", "athletic"],
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
  const wantCats = GOAL_CATEGORY[goal] ?? ["full-body", "hypertrophy"];
  const recent = new Set(recentMuscleKeys.map((m) => m.toLowerCase()));
  const home = profile.environment === "home";

  const scored = WORKOUT_TEMPLATES.map((t) => {
    let score = 0;
    if (wantCats.includes(t.category)) score += 3;
    if (wantCats[0] === t.category) score += 1;
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
