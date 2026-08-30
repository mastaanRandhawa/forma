type Common = { className?: string; ariaLabel?: string; color?: string };

/** segmented dot row — e.g. "3 of 5 workouts" */
export function DotProgress({
  done,
  total,
  className = "",
  ariaLabel,
  color = "var(--accent-pink)",
}: Common & { done: number; total: number }) {
  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      role="img"
      aria-label={ariaLabel ?? `${done} of ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className="h-2.5 w-2.5 rounded-full transition-colors"
          style={{
            background: i < done ? color : "rgba(255,255,255,0.10)",
            boxShadow: i < done ? `0 0 10px ${color}88` : "none",
          }}
        />
      ))}
    </div>
  );
}

/** soft recessed bar with an illuminated fill */
export function BarProgress({
  fraction,
  className = "",
  ariaLabel,
  color = "var(--accent-pink)",
  height = 10,
}: Common & { fraction: number; height?: number }) {
  const f = Math.max(0, Math.min(1, fraction));
  return (
    <div
      className={`surface-recessed rounded-pill overflow-hidden ${className}`}
      style={{ height }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(f * 100)}
      aria-label={ariaLabel}
    >
      <div
        className="h-full rounded-pill"
        style={{
          width: `${Math.max(f * 100, 3)}%`,
          background: color,
          boxShadow: `0 0 16px ${color}, inset 0 1px 0 rgba(255,255,255,0.35)`,
          transition: "width 700ms var(--ease-luxury)",
        }}
      />
    </div>
  );
}

/** tiny radial ring */
export function RingProgress({
  fraction,
  size = 44,
  className = "",
  ariaLabel,
  color = "var(--accent-pink)",
}: Common & { fraction: number; size?: number }) {
  const f = Math.max(0, Math.min(1, fraction));
  const stroke = size * 0.12;
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="img"
      aria-label={ariaLabel ?? `${Math.round(f * 100)}%`}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle
        className="ring-fill"
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${c * f} ${c}`}
        strokeDashoffset={0}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ filter: `drop-shadow(0 0 4px ${color})`, ["--ring-circumference" as string]: c }}
      />
    </svg>
  );
}
