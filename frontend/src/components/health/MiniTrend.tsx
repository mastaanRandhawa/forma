import { memo } from "react";

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
};

/**
 * MiniTrend — a tiny visual signal, no chart chrome, no axes.
 * A thin glowing curve, a dotted cadence, or micro vertical pulses.
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
}: Props) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const x = (i: number) => (i / (data.length - 1)) * width;
  const y = (d: number) => height - ((d - min) / span) * (height - 4) - 2;

  return (
    <svg
      width={fill ? "100%" : width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`${fill ? "block w-full" : "overflow-visible"} ${className}`}
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
        </>
      )}

      {mode === "dots" &&
        data.map((d, i) => (
          <circle key={i} cx={x(i)} cy={y(d)} r={1.7} fill={color} opacity={0.5 + 0.5 * ((d - min) / span)} />
        ))}

      {mode === "pulses" &&
        data.map((d, i) => (
          <line
            key={i}
            x1={x(i)}
            x2={x(i)}
            y1={height}
            y2={y(d)}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.35 + 0.65 * ((d - min) / span)}
          />
        ))}
    </svg>
  );
});
