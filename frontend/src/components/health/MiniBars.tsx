import { memo } from "react";

/**
 * MiniBars — a compact histogram (Apple-Health style day bars). Faint baseline,
 * the tallest bars glow. No axes, no chrome.
 */
export const MiniBars = memo(function MiniBars({
  data,
  color = "var(--accent-cyan)",
  width = 150,
  height = 40,
  className = "",
  caption,
  fill = false,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
  caption?: string;
  /** stretch to the container width instead of a fixed pixel width */
  fill?: boolean;
}) {
  const max = Math.max(...data, 0.0001);
  const n = data.length;
  const gap = 2;
  const bw = (width - gap * (n - 1)) / n;
  return (
    <svg
      width={fill ? "100%" : width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`${fill ? "block w-full" : "overflow-visible"} ${className}`}
      role="img"
      aria-label={caption ?? "trend"}
      preserveAspectRatio="none"
    >
      <line x1={0} x2={width} y1={height - 0.5} y2={height - 0.5} stroke="var(--line-soft)" strokeWidth={1} />
      {data.map((d, i) => {
        const h = Math.max(2, (d / max) * (height - 3));
        const strong = d / max > 0.8;
        return (
          <rect
            key={i}
            className="bar-grow"
            x={i * (bw + gap)}
            y={height - h}
            width={bw}
            height={h}
            rx={Math.min(bw / 2, 2)}
            fill={color}
            opacity={0.35 + 0.65 * (d / max)}
            style={{
              animationDelay: `${i * 28}ms`,
              ...(strong ? { filter: `drop-shadow(0 0 4px ${color})` } : null),
            }}
          />
        );
      })}
    </svg>
  );
});
