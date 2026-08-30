import { Link } from "react-router-dom";
import type { CardTone } from "../health/MetricCard";

const TONE: Record<CardTone, string> = {
  pink: "var(--accent-pink)",
  cyan: "var(--accent-cyan)",
  lime: "var(--accent-lime)",
  amber: "var(--accent-amber)",
  mauve: "var(--accent-mauve)",
  violet: "var(--accent-blue)",
};

/**
 * RingStat — a compact stat card: label + big value on the left, a small
 * donut ring (percent) on the right. The dashboard's top row.
 */
export function RingStat({
  label,
  value,
  sub,
  pct,
  tone = "pink",
  to,
  onSelect,
}: {
  label: string;
  value: string;
  sub?: string;
  pct: number;
  tone?: CardTone;
  to?: string;
  onSelect?: () => void;
}) {
  const color = TONE[tone];
  const size = 54;
  const sw = 5;
  const r = size / 2 - sw;
  const c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, pct / 100));

  const inner = (
    <>
      <div className="relative z-10 min-w-0 sm:flex-1">
        <div className="metric-card__label line-clamp-2 text-center text-[0.72rem] leading-tight sm:truncate sm:text-left sm:text-[0.9rem]">
          {label}
        </div>
        <div className="metric-numeral mt-1.5 hidden text-[1.55rem] text-content-primary sm:block">{value}</div>
        {sub && (
          <div className="num mt-0.5 hidden truncate text-[0.72rem] text-content-tertiary sm:block">{sub}</div>
        )}
      </div>
      <div className="relative z-10 mt-auto shrink-0 sm:mt-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={sw} />
          <circle
            className="ring-fill"
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={`${c * f} ${c}`}
            strokeDashoffset={0}
            style={{ filter: `drop-shadow(0 0 5px ${color})`, ["--ring-circumference" as string]: c }}
          />
        </svg>
        <span className="num absolute inset-0 grid place-items-center text-[0.68rem] text-content-secondary">
          {Math.round(pct)}%
        </span>
      </div>
    </>
  );

  // mobile: a compact square — just the label + ring. sm+: the full row with value + sub.
  // `w-full` + fixed height so all three cards are exactly the same size.
  const cls =
    "metric-card metric-card--link group focus-ring flex aspect-square w-full flex-col items-center justify-between gap-2 !rounded-[var(--radius-medium)] !p-3 " +
    "sm:!flex-row sm:aspect-auto sm:h-[104px] sm:items-center sm:justify-between sm:gap-3 sm:!p-4";

  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} data-tone={tone} data-variant="glow" className={`${cls} text-left`}>
        {inner}
      </button>
    );
  }
  return (
    <Link to={to ?? "/progress"} data-tone={tone} data-variant="glow" className={cls}>
      {inner}
    </Link>
  );
}
