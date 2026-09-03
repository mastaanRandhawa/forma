/**
 * food — pure client-side helpers for the food logger.
 *
 * The server is the source of truth for what actually gets stored on a FoodLog
 * row (it recomputes and snapshots nutrition). These helpers only drive the
 * live "250 g → 413 kcal" preview on the serving screen, and small formatting.
 * The math mirrors backend/src/services/food/nutrition.ts.
 */
import type { Food, FoodNutrients, MealType } from "../api/types";

export const OZ_TO_G = 28.349523125;
export const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
export const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "breakfast",
  lunch: "lunch",
  dinner: "dinner",
  snack: "snacks",
};

export function round(n: number, dp = 1): number {
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** dp;
  return Math.round((n + Number.EPSILON) * f) / f || 0;
}

export function resolveGrams(quantity: number, unit: string, servingGrams?: number | null): number | null {
  if (!Number.isFinite(quantity) || quantity < 0) return null;
  if (unit === "g") return round(quantity, 2);
  if (unit === "oz") return round(quantity * OZ_TO_G, 2);
  if (servingGrams && servingGrams > 0) return round(quantity * servingGrams, 2);
  return null;
}

/** Live nutrition preview for a serving selection. */
export function previewNutrition(
  food: Pick<
    Food,
    | "caloriesPer100" | "proteinPer100" | "carbsPer100" | "fatPer100"
    | "fiberPer100" | "sugarPer100" | "sodiumPer100" | "servingGrams" | "perServingOnly"
  >,
  quantity: number,
  unit: string,
): { grams: number | null; nutrients: FoodNutrients } {
  const grams = resolveGrams(quantity, unit, food.servingGrams);
  const val = (per100: number | null): number | null => {
    if (per100 == null) return null;
    if (food.perServingOnly) return unit === "serving" ? per100 * quantity : null;
    if (grams != null) return (per100 * grams) / 100;
    return null;
  };
  return {
    grams,
    nutrients: {
      calories: Math.round(val(food.caloriesPer100) ?? 0),
      protein: round(val(food.proteinPer100) ?? 0),
      carbs: round(val(food.carbsPer100) ?? 0),
      fat: round(val(food.fatPer100) ?? 0),
      fiber: food.fiberPer100 == null ? null : round(val(food.fiberPer100) ?? 0),
      sugar: food.sugarPer100 == null ? null : round(val(food.sugarPer100) ?? 0),
      sodium: food.sodiumPer100 == null ? null : Math.round(val(food.sodiumPer100) ?? 0),
    },
  };
}

export function mealForNow(d = new Date()): MealType {
  const h = d.getHours();
  if (h >= 4 && h < 11) return "breakfast";
  if (h >= 11 && h < 15) return "lunch";
  if (h >= 17 && h < 22) return "dinner";
  return "snack";
}

export const todayISO = (): string => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

export const addDaysISO = (iso: string, days: number): string => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const fmtDay = (iso: string): string => {
  const t = todayISO();
  if (iso === t) return "today";
  if (iso === addDaysISO(t, -1)) return "yesterday";
  if (iso === addDaysISO(t, 1)) return "tomorrow";
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

export const sourceLabel = (s: string | null): string =>
  s === "usda"
    ? "USDA"
    : s === "open_food_facts"
      ? "Open Food Facts"
      : s === "nutritionix"
        ? "Nutritionix"
        : s === "edamam"
          ? "Edamam"
          : s === "custom"
            ? "custom"
            : "quick add";

/** "165 kcal · 31 g protein" style meta line for a search row. */
export function macroMeta(kcalPer100: number, proteinPer100: number, per: string, perServingOnly: boolean): string {
  const basis = perServingOnly ? "per serving" : per === "serving" ? "per serving" : "per 100 g";
  return `${Math.round(kcalPer100)} kcal · ${round(proteinPer100)} g protein · ${basis}`;
}
