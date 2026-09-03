import { memo, useState } from "react";

type Props = {
  data: number[];
  mode?: "curve" | "dots" | "pulses";
  color?: string;
  width?: number;
  height?: number;
  className?: string;
  /** accessible summary, e.g. "up 8% over 7 days" */
  caption?: string;
  /** stretch to the container width instead of a fixed pixel width */
  fill?: boolean;
  /** format a data value for the hover tooltip; defaults to rounded integer */
  tooltipFormat?: (v: number, i: number) => string;
};

/**
 * MiniTrend — a tiny visual signal, no chart chrome, no axes.
 * A thin glowing curve, a dotted cadence, or micro vertical pulses.
 * Hover any point to see a value bubble (rendered via overflow:visible).
 */
export const MiniTrend = memo(function MiniTrend({
  data,
  mode = "curve",
  color = "var(--accent-cyan)",
  width = 120,
  height = 34,
  className = "",
  caption,
  fill = false,
  tooltipFormat,
}: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const x = (i: number) => (i / (data.length - 1)) * width;
  const y = (d: number) => height - ((d - min) / span) * (height - 4) - 2;

  const fmt = tooltipFormat ?? ((v: number) => String(Math.round(v)));

  const tipEl = hovered !== null && data[hovered] !== undefined && (
    (() => {
      const px = x(hovered);
      const py = y(data[hovered]!);
      const label = fmt(data[hovered]!, hovered);
      const tipW = Math.max(label.length * 6.5 + 14, 28);
      const tipH = 17;
      const tipX = Math.min(Math.max(px - tipW / 2, 0), width - tipW);
      const tipY = py - tipH - 6;
      return (
        <g pointerEvents="none">
          <rect
            x={tipX} y={tipY} width={tipW} height={tipH}
            rx={tipH / 2}
            fill="rgba(24,13,20,0.93)"
            stroke={color}
            strokeWidth={0.8}
            strokeOpacity={0.55}
          />
          <text
            x={tipX + tipW / 2} y={tipY + tipH / 2 + 0.5}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            fontFamily="var(--font-mono, ui-monospace, monospace)"
            fontWeight={600}
            fill={color}
          >
            {label}
          </text>
        </g>
      );
    })()
  );

  // invisible wider hit targets per data point
  const hitW = data.length > 1 ? width / (data.length - 1) : width;
  const hitTargets = data.map((_d, i) => (
    <rect
      key={i}
      x={Math.max(x(i) - hitW / 2, 0)}
      y={0}
      width={hitW}
      height={height}
      fill="transparent"
      onMouseEnter={() => setHovered(i)}
      onMouseLeave={() => setHovered(null)}
      style={{ cursor: "crosshair" }}
    />
  ));

  return (
    <svg
      width={fill ? "100%" : width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`${fill ? "block w-full" : ""} overflow-visible ${className}`}
      role="img"
      aria-label={caption ?? "trend"}
      preserveAspectRatio={fill ? "none" : undefined}
    >
      <defs>
        <linearGradient id="mt-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {mode === "curve" && (
        <>
          <path
            className="area-in"
            d={`M ${x(0)},${y(data[0])} ` + data.map((d, i) => `L ${x(i)},${y(d)}`).join(" ") + ` L ${width},${height} L 0,${height} Z`}
            fill="url(#mt-fade)"
          />
          <path
            className="line-draw"
            pathLength={1}
            d={`M ${x(0)},${y(data[0])} ` + data.map((d, i) => `L ${x(i)},${y(d)}`).join(" ")}
            fill="none"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
          {hovered !== null && data[hovered] !== undefined && (
            <circle
              cx={x(hovered)} cy={y(data[hovered]!)} r={3}
              fill={color}
              stroke="rgba(24,13,20,0.8)"
              strokeWidth={1.5}
              pointerEvents="none"
            />
          )}
        </>
      )}

      {mode === "dots" &&
        data.map((d, i) => (
          <circle
            key={i} cx={x(i)} cy={y(d)}
            r={hovered === i ? 2.5 : 1.7}
            fill={color}
            opacity={hovered === i ? 1 : 0.5 + 0.5 * ((d - min) / span)}
            style={{ transition: "r 0.1s, opacity 0.1s" }}
          />
        ))}

      {mode === "pulses" &&
        data.map((d, i) => (
          <line
            key={i}
            x1={x(i)} x2={x(i)} y1={height} y2={y(d)}
            stroke={color}
            strokeWidth={hovered === i ? 3 : 2}
            strokeLinecap="round"
            opacity={hovered === i ? 1 : 0.35 + 0.65 * ((d - min) / span)}
            style={{ transition: "stroke-width 0.1s, opacity 0.1s" }}
          />
        ))}

      {hitTargets}
      {tipEl}
    </svg>
  );
});
