import { memo } from "react";

/**
 * Decorative card visualisations — the faint instrument graphics that sit behind
 * a MetricCard's number (reference: the radar arcs on "Last test", the dotted
 * pulse on "Viriability", the tick ruler on "Vitamin D"). All are non-interactive
 * and scale to their container.
 */

/** concentric elliptical arcs radiating from just below the card, with a few
 *  data points sitting on them — the "Last test" treatment. */
export const RadarArcs = memo(function RadarArcs({
  className = "",
}: {
  className?: string;
}) {
  const cx = 100;
  const cy = 118;
  const rings = [
    { rx: 26, ry: 17 },
    { rx: 46, ry: 30 },
    { rx: 66, ry: 43 },
    { rx: 86, ry: 56 },
    { rx: 106, ry: 69 },
  ];
  const dots = [
    { x: 70, y: 90, r: 1.8 },
    { x: 128, y: 96, r: 1.6 },
    { x: 100, y: 66, r: 2.2 },
    { x: 54, y: 104, r: 1.5 },
  ];
  return (
    <svg
      viewBox="0 0 200 100"
      preserveAspectRatio="xMidYMax slice"
      className={`h-full w-full ${className}`}
      aria-hidden
    >
      <g className="radar-breathe">
        {rings.map((r, i) => (
          <ellipse
            key={i}
            cx={cx}
            cy={cy}
            rx={r.rx}
            ry={r.ry}
            fill="none"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth={1}
          />
        ))}
      </g>
      {dots.map((d, i) => (
        <g key={i}>
          <circle cx={d.x} cy={d.y} r={d.r + 2.5} fill="rgba(255,255,255,0.12)" />
          <circle cx={d.x} cy={d.y} r={d.r} fill="rgba(255,255,255,0.72)" />
        </g>
      ))}
    </svg>
  );
});

/** a horizontal dotted line with a soft blob glow behind it — "Viriability". */
export const PulseDots = memo(function PulseDots({
  color = "rgba(255,255,255,0.6)",
  className = "",
}: {
  color?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 80"
      preserveAspectRatio="none"
      className={`h-full w-full ${className}`}
      aria-hidden
    >
      <defs>
        <radialGradient id="pd-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={color} stopOpacity="0.5" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="40" rx="78" ry="26" fill="url(#pd-glow)" />
      {Array.from({ length: 13 }).map((_, i) => (
        <circle
          key={i}
          cx={16 + i * 14}
          cy={40}
          r={i === 6 ? 2.4 : 1.7}
          fill="rgba(255,255,255,0.82)"
        />
      ))}
    </svg>
  );
});

/** a tick ruler with a triangular marker — "Vitamin D". */
export const TickGauge = memo(function TickGauge({
  fraction = 0.7,
  color = "var(--accent-lime)",
  className = "",
}: {
  fraction?: number;
  color?: string;
  className?: string;
}) {
  const n = 24;
  const markX = 8 + fraction * 184;
  return (
    <svg
      viewBox="0 0 200 44"
      preserveAspectRatio="none"
      className={`h-full w-full ${className}`}
      aria-hidden
    >
      {Array.from({ length: n }).map((_, i) => {
        const x = 8 + (i / (n - 1)) * 184;
        return (
          <line
            key={i}
            x1={x}
            x2={x}
            y1={22}
            y2={i % 4 === 0 ? 8 : 14}
            stroke="rgba(255,255,255,0.28)"
            strokeWidth={1.5}
          />
        );
      })}
      <path
        d={`M ${markX} 4 l 4 7 l -8 0 z`}
        fill={color}
      />
      <line x1={markX} x2={markX} y1={11} y2={24} stroke={color} strokeWidth={1.5} />
    </svg>
  );
});
