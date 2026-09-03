/**
 * Plate calculator — given a target total weight and bar weight, returns the
 * plates to load on each side, largest to smallest.
 */

const KG_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5];
const LB_PLATES = [45, 35, 25, 10, 5, 2.5];

export interface PlateResult {
  /** Plates per side, largest first */
  perSide: number[];
  /** Loaded total (may differ from target by rounding) */
  loaded: number;
  /** How many kilos/lbs could not be accounted for */
  remainder: number;
}

export function plateCombo(
  targetTotal: number,
  barWeight: number,
  units: "kg" | "lb",
): PlateResult {
  const plates = units === "kg" ? KG_PLATES : LB_PLATES;
  const perSide: number[] = [];
  let remaining = Math.max(0, targetTotal - barWeight) / 2;

  for (const plate of plates) {
    while (remaining >= plate - 0.001) {
      perSide.push(plate);
      remaining = Math.round((remaining - plate) * 1000) / 1000;
    }
  }

  const loaded = barWeight + perSide.reduce((s, p) => s + p, 0) * 2;
  return { perSide, loaded, remainder: Math.round(remaining * 1000) / 1000 };
}

/** Human-readable plate list, e.g. "20 · 10 · 2.5" */
export function plateLabel(perSide: number[]): string {
  if (!perSide.length) return "bar only";
  const grouped = new Map<number, number>();
  for (const p of perSide) grouped.set(p, (grouped.get(p) ?? 0) + 1);
  return [...grouped.entries()]
    .map(([p, n]) => (n > 1 ? `${n}×${p}` : `${p}`))
    .join(" · ");
}
