import { memo, useId, useState } from "react";

type Series = { label: string; color: string; data: number[] };

/** Catmull-Rom → cubic bezier, for a smooth curve through the points. */
function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/**
 * AreaChart — two overlapping smooth area series with gradient fills, faint
 * horizontal gridlines, day labels, and a hover crosshair with per-series
 * values. Fills its container width.
 */
export const AreaChart = memo(function AreaChart({
  series,
  labels,
  height = 220,
  yTicks = 4,
}: {
  series: Series[];
  labels: string[];
  height?: number;
  yTicks?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const w = 640;
  const padX = 8;
  const padTop = 12;
  const padBottom = 22;
  const [hover, setHover] = useState<number | null>(null);

  const allMax = Math.max(...series.flatMap((s) => s.data));
  const max = allMax * 1.15;
  const n = labels.length;

  const x = (i: number) => padX + (i / (n - 1)) * (w - padX * 2);
  const y = (v: number) => padTop + (1 - v / max) * (height - padTop - padBottom);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * w;
    setHover(Math.max(0, Math.min(n - 1, Math.round(((px - padX) / (w - padX * 2)) * (n - 1)))));
  };

  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      className="w-full touch-none"
      preserveAspectRatio="none"
      role="img"
      aria-label={series.map((s) => s.label).join(" and ") + " over the week"}
      onPointerMove={onMove}
      onPointerLeave={() => setHover(null)}
    >
      <defs>
        {series.map((s, si) => (
          <linearGradient key={si} id={`${uid}-g${si}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={s.color} stopOpacity="0.34" />
            <stop offset="1" stopColor={s.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>

      {/* gridlines */}
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const gy = padTop + (i / yTicks) * (height - padTop - padBottom);
        return <line key={i} x1={padX} x2={w - padX} y1={gy} y2={gy} stroke="var(--line-soft)" strokeWidth={1} />;
      })}

      {series.map((s, si) => {
        const pts = s.data.map((v, i) => [x(i), y(v)] as [number, number]);
        const line = smoothPath(pts);
        return (
          <g key={si}>
            <path
              className="area-in"
              d={`${line} L ${x(n - 1)},${height - padBottom} L ${x(0)},${height - padBottom} Z`}
              fill={`url(#${uid}-g${si})`}
            />
            <path
              className="line-draw"
              pathLength={1}
              d={line}
              fill="none"
              stroke={s.color}
              strokeWidth={2.25}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 5px ${s.color})` }}
            />
          </g>
        );
      })}

      {/* hover crosshair + points */}
      {hover != null && (
        <>
          <line x1={x(hover)} x2={x(hover)} y1={padTop} y2={height - padBottom} stroke="rgba(255,255,255,0.16)" strokeWidth={1} />
          {series.map((s, si) => (
            <circle key={si} cx={x(hover)} cy={y(s.data[hover])} r={3.5} fill={s.color} style={{ filter: `drop-shadow(0 0 5px ${s.color})` }} />
          ))}
        </>
      )}

      {/* x labels */}
      {labels.map((l, i) => (
        <text
          key={i}
          x={x(i)}
          y={height - 5}
          textAnchor="middle"
          fontFamily="'Space Grotesk', monospace"
          fontSize="9.5"
          fill="var(--text-tertiary)"
        >
          {l}
        </text>
      ))}
    </svg>
  );
});
