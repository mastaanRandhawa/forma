/**
 * Shared training-profile option lists + unit conversions.
 *
 * Used by both the onboarding flow (`pages/Onboarding.tsx`) and the editable
 * training profile in settings (`pages/settings/TrainingProfile.tsx`) so the two
 * never drift apart.
 */
import { Activity, Dumbbell, HeartPulse, Moon, Scale, Sparkles, type LucideIcon } from "lucide-react";
import type { Environment, Experience, Units } from "./localStore";
import type { FitnessGoal } from "../api/types";

export const GOALS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "lose", label: "lose fat", icon: Scale },
  { id: "muscle", label: "build muscle", icon: Dumbbell },
  { id: "strength", label: "get stronger", icon: Activity },
  { id: "fitness", label: "general fitness", icon: HeartPulse },
  { id: "sleep", label: "sleep & recovery", icon: Moon },
  { id: "maintain", label: "maintain", icon: Sparkles },
];

export const GOAL_LABELS: Record<string, string> = Object.fromEntries(
  GOALS.map((g) => [g.id, g.label]),
);

export const GOAL_TO_API: Record<string, FitnessGoal> = {
  lose: "lose_fat",
  muscle: "build_muscle",
  strength: "get_stronger",
  fitness: "general_fitness",
  sleep: "general_fitness",
  maintain: "maintain",
};

export const EXPERIENCE: { id: Experience; label: string; hint: string }[] = [
  { id: "beginner", label: "beginner", hint: "new, or back after a long break" },
  { id: "intermediate", label: "intermediate", hint: "training consistently for 6+ months" },
  { id: "advanced", label: "advanced", hint: "years of structured training" },
];

export const DAYS = [2, 3, 4, 5, 6];
export const DURATIONS = [30, 45, 60, 75];

export const ENVIRONMENTS: { id: Environment; label: string }[] = [
  { id: "gym", label: "full gym" },
  { id: "home", label: "home setup" },
  { id: "both", label: "both" },
];

export const EQUIPMENT = [
  "Barbell",
  "Dumbbells",
  "Machines",
  "Cables",
  "Kettlebell",
  "Bands",
  "Pull-up bar",
  "Bodyweight only",
];

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const UNITS: Units[] = ["lb", "kg"];

export const LB_TO_KG = 0.453592;
export const IN_TO_CM = 2.54;
