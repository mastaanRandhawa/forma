/**
 * Shared training-profile option lists + unit conversions.
 *
 * Used by both the onboarding flow (`pages/Onboarding.tsx`) and the editable
 * training profile in settings (`pages/settings/TrainingProfile.tsx`) so the two
 * never drift apart.
 */
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  Building2,
  Crosshair,
  Dumbbell,
  Gauge,
  HeartPulse,
  House,
  Leaf,
  LineChart,
  Moon,
  Scale,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Environment, Experience, Units } from "./localStore";
import type { FitnessGoal } from "../api/types";

export const GOALS: { id: string; label: string; icon: LucideIcon; hint: string }[] = [
  { id: "lose", label: "lose fat", icon: Scale, hint: "burn more than you eat, keep your muscle" },
  { id: "muscle", label: "build muscle", icon: Dumbbell, hint: "add size with steady volume" },
  { id: "strength", label: "get stronger", icon: Activity, hint: "heavier lifts, lower reps" },
  { id: "fitness", label: "general fitness", icon: HeartPulse, hint: "feel capable and healthy" },
  { id: "athletic", label: "athletic performance", icon: Gauge, hint: "power, speed and conditioning" },
  { id: "sleep", label: "sleep & recovery", icon: Moon, hint: "rest better, bounce back faster" },
  { id: "maintain", label: "maintain", icon: Sparkles, hint: "hold what you've built" },
];

export const GOAL_LABELS: Record<string, string> = Object.fromEntries(
  GOALS.map((g) => [g.id, g.label]),
);

export const GOAL_TO_API: Record<string, FitnessGoal> = {
  lose: "lose_fat",
  muscle: "build_muscle",
  strength: "get_stronger",
  fitness: "general_fitness",
  athletic: "athletic_performance",
  sleep: "general_fitness",
  maintain: "maintain",
};

export const EXPERIENCE: { id: Experience; label: string; hint: string; help: string; icon: LucideIcon }[] = [
  { id: "beginner", label: "beginner", hint: "new, or back after a long break", help: "new, or back after a long break. we'll teach the movements first.", icon: Leaf },
  { id: "intermediate", label: "intermediate", hint: "training consistently for 6+ months", help: "training consistently for 6+ months. progressive overload is familiar.", icon: BarChart3 },
  { id: "advanced", label: "advanced", hint: "years of structured training", help: "years of structured training. expect heavier, more specific work.", icon: Trophy },
];

/** Recommended session counts, used to hint the schedule step. */
export const DAYS_HINT: Record<Experience, string> = {
  beginner: "3 days is a great start",
  intermediate: "4 days suits most people",
  advanced: "4–6 days, with a rest day or two",
};

export const DAYS = [2, 3, 4, 5, 6];
export const DURATIONS = [30, 45, 60, 75];

export const ENVIRONMENTS: { id: Environment; label: string; hint: string; icon: LucideIcon }[] = [
  { id: "gym", label: "full gym", hint: "racks, machines, cables and free weights", icon: Building2 },
  { id: "home", label: "home setup", hint: "whatever you have at home", icon: House },
  { id: "both", label: "both", hint: "some days at the gym, some at home", icon: ArrowLeftRight },
];

/** Body areas to work around. The label is what Kai says back ("how's your lower back feeling today?"). */
export const HEALTH_AREAS = ["Neck", "Shoulder", "Elbow", "Wrist", "Upper back", "Lower back", "Hip", "Knee", "Ankle"];

/** Coaching styles — the same five presets as the app's Coach screen. Values are the trainer's 0–1 personality dimensions. */
export interface CoachStyle {
  id: string;
  name: string;
  line: string;
  icon: LucideIcon;
  v: {
    coachingDirectness: number;
    motivationLevel: number;
    coachingDetail: number;
    formStrictness: number;
    speakingFrequency: number;
    humor: number;
  };
}
export const COACH_STYLES: CoachStyle[] = [
  { id: "steady", name: "steady", line: "balanced, encouraging, to the point.", icon: SlidersHorizontal, v: { coachingDirectness: 0.5, motivationLevel: 0.5, coachingDetail: 0.5, formStrictness: 0.5, speakingFrequency: 0.5, humor: 0.4 } },
  { id: "spark", name: "spark", line: "high energy and playful. keeps you moving.", icon: Zap, v: { coachingDirectness: 0.5, motivationLevel: 0.9, coachingDetail: 0.4, formStrictness: 0.4, speakingFrequency: 0.8, humor: 0.8 } },
  { id: "straight", name: "straight talk", line: "blunt, strict on form, no fluff.", icon: Crosshair, v: { coachingDirectness: 0.9, motivationLevel: 0.5, coachingDetail: 0.5, formStrictness: 0.85, speakingFrequency: 0.5, humor: 0.2 } },
  { id: "analyst", name: "analyst", line: "thorough, data-minded, rarely jokes.", icon: LineChart, v: { coachingDirectness: 0.7, motivationLevel: 0.3, coachingDetail: 0.95, formStrictness: 0.8, speakingFrequency: 0.5, humor: 0.1 } },
  { id: "calm", name: "calm", line: "gentle, quiet and patient.", icon: Leaf, v: { coachingDirectness: 0.25, motivationLevel: 0.2, coachingDetail: 0.6, formStrictness: 0.4, speakingFrequency: 0.3, humor: 0.4 } },
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
