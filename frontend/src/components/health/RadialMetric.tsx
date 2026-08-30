import { ReactNode, useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  max?: number;
  /** 0..1 fraction override (use instead of value/max when you have a ratio) */
  fraction?: number;
  size?: number;
  /** arc stroke color — defaults to the pink key light */
  color?: string;
  trackColor?: string;
  /** "arc" = continuous stroke, "dots" = segmented cadence */
  mode?: "arc" | "dots";
  label?: string;
  unit?: ReactNode;
  center?: ReactNode;
  /** accessible description of what the ring represents */
  ariaLabel?: string;
  className?: string;
};

/**
 * RadialMetric — premium circular readout. Not a chart-library gauge:
 * dimensional track, soft bloom, optional segmented arc, animated reveal.
 */
export function RadialMetric({
  value,
  max = 100,
  fraction,
  size = 260,
  color = "var(--accent-pink)",
  trackColor = "rgba(255,255,255,0.07)",
  mode = "arc",
  label,
  unit,
  center,
  ariaLabel,
  className = "",
}: Props) {
  const target = Math.max(0, Math.min(1, fraction ?? value / max));
  const [p, setP] = useState(0);
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    if (reduce) {
      setP(target);
      return;
    }
    const start = performance.now();
    const from = 0;
    const dur = 900;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setP(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduce]);

  const stroke = Math.max(6, size * 0.03);
  const r = size / 2 - stroke * 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const sweep = 0.75; // 270° open-bottom arc
  const arcLen = circumference * sweep;
  const gapRot = 135; // rotate so the opening faces down

  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel ?? `${label ?? "value"}: ${Math.round(target * max)} of ${max}`}
    >
      {/* soft bloom behind the ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 46%, ${color}44, transparent 62%)`,
          filter: "blur(26px)",
        }}
      />
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: `rotate(${gapRot}deg)` }}
      >
        <defs>
          <linearGradient id="rm-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.55" />
            <stop offset="1" stopColor={color} stopOpacity="1" />
          </linearGradient>
          <filter id="rm-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={stroke * 0.5} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {mode === "arc" ? (
          <>
            <circle
              cx={cx}
              cy={cx}
              r={r}
              fill="none"
              stroke={trackColor}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${arcLen} ${circumference}`}
            />
            <circle
              cx={cx}
              cy={cx}
              r={r}
              fill="none"
              stroke="url(#rm-grad)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${arcLen * p} ${circumference}`}
              filter="url(#rm-glow)"
            />
          </>
        ) : (
          <DottedArc
            cx={cx}
            r={r}
            sweep={sweep}
            p={p}
            color={color}
            track={trackColor}
            dot={stroke * 0.55}
          />
        )}
      </svg>

      {/* recessed inner face */}
      <div
        className="absolute rounded-full surface-recessed grid place-items-center text-center"
        style={{ inset: stroke * 2.4 }}
      >
        <div>
          {center ?? (
            <>
              <div
                className="metric-numeral text-content-primary"
                style={{ fontSize: size * 0.26 }}
              >
                {Math.round(p * max)}
              </div>
              {unit && <div className="label-instrument mt-1">{unit}</div>}
              {label && (
                <div className="label-soft mt-2 lowercase tracking-[0.08em]">{label}</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DottedArc({
  cx,
  r,
  sweep,
  p,
  color,
  track,
  dot,
}: {
  cx: number;
  r: number;
  sweep: number;
  p: number;
  color: string;
  track: string;
  dot: number;
}) {
  const count = 44;
  const filled = Math.round(count * p);
  return (
    <g>
      {Array.from({ length: count }).map((_, i) => {
        const ang = (i / (count - 1)) * sweep * Math.PI * 2;
        const x = cx + r * Math.cos(ang);
        const y = cx + r * Math.sin(ang);
        const on = i < filled;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={on ? dot : dot * 0.7}
            fill={on ? color : track}
            opacity={on ? 1 : 0.8}
          />
        );
      })}
    </g>
  );
}

export function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  const mq = useRef<MediaQueryList | null>(null);
  useEffect(() => {
    mq.current = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.current.matches);
    const on = () => setReduce(mq.current!.matches);
    mq.current.addEventListener("change", on);
    return () => mq.current?.removeEventListener("change", on);
  }, []);
  return reduce;
}
