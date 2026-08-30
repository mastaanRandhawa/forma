// Lightweight 2D stand-in for the 3D muscle body (MuscleMapThumbnail / MuscleBody3DView).
// Ion ramp: neutral -> ion, driven by activation 0..1.

import { memo } from "react";

function color(v: number) {
  if (v <= 0.01) return "rgba(255,241,248,0.06)";
  // interpolate dusty mauve -> hot pink
  const a = [90, 60, 80];
  const b = [213, 26, 122];
  const m = a.map((x, i) => Math.round(x + (b[i] - x) * Math.min(1, v)));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}

type Props = {
  activation: Record<string, number>;
  view?: "front" | "back";
  size?: number;
};

export const MuscleMap = memo(function MuscleMap({ activation, view = "front", size = 260 }: Props) {
  const g = (k: string) => activation[k] ?? 0;
  return (
    <svg
      width={size}
      height={size * 1.7}
      viewBox="0 0 120 200"
      role="img"
      aria-label="Muscle activation map"
    >
      {/* head */}
      <circle cx="60" cy="16" r="10" fill="rgba(255,241,248,0.05)" stroke="rgba(255,255,255,0.08)" />
      {/* torso base */}
      <path
        d="M42 30 h36 l4 44 -6 30 h-32 l-6 -30 z"
        fill="rgba(255,241,248,0.04)"
        stroke="rgba(255,255,255,0.08)"
      />
      {view === "front" ? (
        <>
          {/* chest */}
          <path d="M45 34 h30 v16 q-15 8 -30 0 z" fill={color(g("chest"))} />
          {/* shoulders */}
          <circle cx="41" cy="36" r="8" fill={color(g("shoulders"))} />
          <circle cx="79" cy="36" r="8" fill={color(g("shoulders"))} />
          {/* biceps */}
          <rect x="30" y="44" width="9" height="24" rx="4" fill={color(g("biceps"))} />
          <rect x="81" y="44" width="9" height="24" rx="4" fill={color(g("biceps"))} />
          {/* abs */}
          <rect x="50" y="56" width="20" height="26" rx="4" fill={color(g("abs"))} />
        </>
      ) : (
        <>
          {/* back */}
          <path d="M45 34 h30 v30 h-30 z" fill={color(g("back"))} />
          {/* rear delts */}
          <circle cx="41" cy="36" r="8" fill={color(g("shoulders"))} />
          <circle cx="79" cy="36" r="8" fill={color(g("shoulders"))} />
          {/* triceps */}
          <rect x="30" y="44" width="9" height="24" rx="4" fill={color(g("triceps"))} />
          <rect x="81" y="44" width="9" height="24" rx="4" fill={color(g("triceps"))} />
          {/* glutes */}
          <rect x="48" y="86" width="24" height="16" rx="6" fill={color(g("glutes"))} />
        </>
      )}
      {/* legs */}
      <rect x="44" y="104" width="14" height="44" rx="6" fill={color(g("quads"))} />
      <rect x="62" y="104" width="14" height="44" rx="6" fill={color(g("quads"))} />
      <rect
        x="45"
        y="150"
        width="12"
        height="34"
        rx="5"
        fill={color(g(view === "back" ? "calves" : "hamstrings"))}
      />
      <rect
        x="63"
        y="150"
        width="12"
        height="34"
        rx="5"
        fill={color(g(view === "back" ? "calves" : "hamstrings"))}
      />
    </svg>
  );
});
