import { useEffect, useMemo, useRef } from "react";
import { BodyChart, ViewSide, INTENSITY_COLORS, type BodyState } from "body-muscles";

/* Retint the library's yellow→red diagnostic ramp into the Forma pink/wine
   family (mutating the exported object before BodyChart reads it at render). */
const FORMA_RAMP: Record<number, string> = {
  0: "#5C4557",
  1: "#E9C4D9",
  2: "#E3AECC",
  3: "#DD97BE",
  4: "#D97FB0",
  5: "#D65F9E",
  6: "#D53F8C",
  7: "#D51A7A",
  8: "#B71566",
  9: "#921050",
  10: "#6E0C3D",
};
Object.assign(INTENSITY_COLORS as Record<number, string>, FORMA_RAMP);

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

function buildState(activation: Record<string, number>): BodyState {
  const state: BodyState = {};
  for (const [group, value] of Object.entries(activation)) {
    const ids = GROUP_TO_IDS[group];
    if (!ids || value <= 0) continue;
    const intensity = Math.max(0, Math.min(10, Math.round(value * 10)));
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
