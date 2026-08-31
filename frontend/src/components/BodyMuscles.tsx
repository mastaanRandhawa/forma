import { useEffect, useMemo, useRef } from "react";
import { BodyChart, ViewSide, INTENSITY_COLORS, type BodyState } from "body-muscles";

/* Fitness heatmap ramp: neutral grey (untrained) → deep red (very high volume).
   The library reads INTENSITY_COLORS[0..10] at render time, so we mutate the
   exported object in place. Anchor stops are interpolated across the 0..10 scale
   so continuous activation scores get a smooth heatmap gradient, not 6 discrete
   buckets. */
const HEAT_STOPS = [
  "#E5E7EB", // 0 · no workout / not trained
  "#FEE2E2", // low activity
  "#FCA5A5", // moderate
  "#EF4444", // high
  "#B91C1C", // very high
  "#7F1D1D", // maxed out
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
}
/** Sample the anchor ramp at t (0..1), linearly interpolating between stops. */
function heatColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const pos = clamped * (HEAT_STOPS.length - 1);
  const i = Math.min(Math.floor(pos), HEAT_STOPS.length - 2);
  const f = pos - i;
  const a = hexToRgb(HEAT_STOPS[i]);
  const b = hexToRgb(HEAT_STOPS[i + 1]);
  return rgbToHex(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
}

const HEAT_RAMP: Record<number, string> = {};
for (let level = 0; level <= 10; level++) HEAT_RAMP[level] = heatColor(level / 10);
Object.assign(INTENSITY_COLORS as Record<number, string>, HEAT_RAMP);

/**
 * React wrapper around the imperative `body-muscles` BodyChart (70+ muscle SVG,
 * 0-10 intensity heatmap). We keep the app's simple activation model
 * (`Record<groupKey, 0..1>`) and expand it to the library's per-side muscle ids.
 */

const GROUP_TO_IDS: Record<string, string[]> = {
  chest: ["chest-upper-left", "chest-upper-right", "chest-lower-left", "chest-lower-right"],
  shoulders: [
    "shoulder-front-left", "shoulder-front-right",
    "shoulder-side-left", "shoulder-side-right",
    "deltoid-rear-left", "deltoid-rear-right",
    "traps-upper-left", "traps-upper-right",
  ],
  triceps: [
    "triceps-long-left", "triceps-lateral-left",
    "triceps-long-right", "triceps-lateral-right",
  ],
  biceps: ["biceps-left", "biceps-right"],
  abs: [
    "abs-upper-left", "abs-upper-right",
    "abs-lower-left", "abs-lower-right",
    "obliques-left", "obliques-right",
  ],
  back: [
    "lats-upper-left", "lats-mid-left", "lats-lower-left",
    "lats-upper-right", "lats-mid-right", "lats-lower-right",
    "lower-back-erectors-left", "lower-back-erectors-right", "spine",
    "traps-mid-left", "traps-mid-right", "traps-lower-left", "traps-lower-right",
  ],
  quads: ["quads-left", "quads-right"],
  glutes: [
    "gluteus-maximus-left", "gluteus-maximus-right",
    "gluteus-medius-left", "gluteus-medius-right",
  ],
  hamstrings: [
    "hamstrings-medial-left", "hamstrings-lateral-left",
    "hamstrings-medial-right", "hamstrings-lateral-right",
  ],
  calves: [
    "calves-gastroc-medial-left", "calves-gastroc-lateral-left", "calves-soleus-left",
    "calves-gastroc-medial-right", "calves-gastroc-lateral-right", "calves-soleus-right",
  ],
};

/**
 * Turn per-group activity scores into per-muscle heat levels.
 *
 * Scores are normalized so the hardest-trained muscle sits at the top of the
 * heatmap (level 10) and everything else scales relative to it — the result
 * reads as a training/recovery heatmap rather than absolute volume. Untrained
 * muscles are painted explicitly at level 0 (neutral grey). When several SVG
 * paths map to one group (left/right pecs, both biceps, the lat stack, …) they
 * all receive the same level.
 */
function buildState(activation: Record<string, number>): BodyState {
  const state: BodyState = {};
  const max = Math.max(0, ...Object.values(activation).filter((v) => Number.isFinite(v)));

  for (const [group, ids] of Object.entries(GROUP_TO_IDS)) {
    const value = activation[group] ?? 0;
    const normalized = max > 0 ? Math.max(0, value) / max : 0;
    const intensity = Math.max(0, Math.min(10, Math.round(normalized * 10)));
    for (const id of ids) state[id] = { intensity, selected: false };
  }
  return state;
}

export function BodyMuscles({
  activation,
  view = "front",
  className = "",
  onSelect,
}: {
  activation: Record<string, number>;
  view?: "front" | "back";
  className?: string;
  onSelect?: (id: string, name: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<BodyChart | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const bodyState = useMemo(() => buildState(activation), [activation]);
  const side = view === "back" ? ViewSide.BACK : ViewSide.FRONT;

  useEffect(() => {
    if (!hostRef.current) return;
    const chart = new BodyChart(hostRef.current, {
      view: side,
      bodyState,
      enableTransitions: true,
      ariaLabel: "Interactive muscle activation map",
      onMuscleClick: (id, name) => onSelectRef.current?.(id, name),
    });
    chartRef.current = chart;
    return () => {
      chart.destroy();
      chartRef.current = null;
    };
    // create once; subsequent prop changes go through .update()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chartRef.current?.update({ view: side, bodyState });
  }, [side, bodyState]);

  return <div ref={hostRef} className={`body-muscles ${className}`} />;
}
