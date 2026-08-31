/**
 * nutrition — pure derivations for the Nutrition screen.
 *
 * Targets are estimated from the training profile the user already gave us
 * (bodyweight, goal, training frequency). There is no height/age/sex in the
 * profile, so this is a deliberately simple bodyweight-driven model — good
 * enough to give someone a protein number and a calorie band to aim at, and
 * fully overridable from the screen.
 */
import type { MealEntry, NutritionTargets, Profile } from "./localStore";
import { LB_TO_KG } from "./profileOptions";

export interface DerivedTargets extends NutritionTargets {
  /** how the numbers were reached, for the "why these numbers" line */
  basis: string;
}

const round5 = (n: number) => Math.round(n / 5) * 5;
const round10 = (n: number) => Math.round(n / 10) * 10;

/** Goal → calorie adjustment vs. maintenance, and protein g per kg bodyweight. */
const GOAL_MODEL: Record<string, { kcalFactor: number; proteinPerKg: number; note: string }> = {
  lose: { kcalFactor: 0.8, proteinPerKg: 2.2, note: "~20% deficit for fat loss" },
  muscle: { kcalFactor: 1.1, proteinPerKg: 2.0, note: "slight surplus to build muscle" },
  strength: { kcalFactor: 1.05, proteinPerKg: 2.0, note: "small surplus for strength work" },
  fitness: { kcalFactor: 1.0, proteinPerKg: 1.8, note: "maintenance for general fitness" },
  sleep: { kcalFactor: 1.0, proteinPerKg: 1.6, note: "maintenance, recovery focus" },
  maintain: { kcalFactor: 1.0, proteinPerKg: 1.8, note: "hold current weight" },
};

/**
 * Auto targets from the profile, or `null` when there isn't enough to go on
 * (we need a bodyweight at minimum).
 */
export function deriveTargets(profile: Profile): DerivedTargets | null {
  if (!profile.bodyweight || profile.bodyweight <= 0) return null;
  const bwKg = profile.units === "kg" ? profile.bodyweight : profile.bodyweight * LB_TO_KG;

  // maintenance ≈ bodyweight × an activity multiplier that grows with training days
  const days = profile.daysPerWeek ?? 3;
  const activity = 26 + Math.min(days, 6) * 1.3; // ~28 (2d) … ~34 (6d) kcal/kg
  const maintenance = bwKg * activity;

  const model = GOAL_MODEL[profile.goal ?? "fitness"] ?? GOAL_MODEL.fitness;
  const kcal = round10(Math.max(1200, maintenance * model.kcalFactor));

  const protein = round5(bwKg * model.proteinPerKg);
  const fat = round5(Math.max(bwKg * 0.9, kcal * 0.25 / 9));
  const carbs = Math.max(0, round5((kcal - protein * 4 - fat * 9) / 4));

  return {
    kcal,
    protein,
    carbs,
    fat,
    basis: `${Math.round(bwKg)} kg · ${days}×/week · ${model.note}`,
  };
}

export interface MacroTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function sumMeals(meals: MealEntry[]): MacroTotals {
  return meals.reduce<MacroTotals>(
    (t, m) => ({
      kcal: t.kcal + (m.kcal ?? 0),
      protein: t.protein + (m.protein ?? 0),
      carbs: t.carbs + (m.carbs ?? 0),
      fat: t.fat + (m.fat ?? 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/** Meals grouped by day (YYYY-MM-DD), newest day first. */
export function mealsByDay(meals: MealEntry[]): { date: string; meals: MealEntry[]; totals: MacroTotals }[] {
  const groups = new Map<string, MealEntry[]>();
  for (const m of meals) {
    const list = groups.get(m.date) ?? [];
    list.push(m);
    groups.set(m.date, list);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, list]) => ({ date, meals: list, totals: sumMeals(list) }));
}

/** A few realistic one-tap items so the log isn't a cold form. */
export const QUICK_ADDS: { label: string; kcal: number; protein: number; carbs: number; fat: number }[] = [
  { label: "protein shake", kcal: 160, protein: 30, carbs: 6, fat: 2 },
  { label: "chicken & rice", kcal: 550, protein: 45, carbs: 60, fat: 12 },
  { label: "greek yogurt bowl", kcal: 280, protein: 22, carbs: 30, fat: 8 },
  { label: "eggs & toast", kcal: 340, protein: 20, carbs: 28, fat: 16 },
  { label: "handful of nuts", kcal: 200, protein: 6, carbs: 7, fat: 17 },
];

export const WATER_CUP_ML = 250;
export const WATER_CUP_TARGET = 8;
