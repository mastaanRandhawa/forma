import { motion, useReducedMotion } from "motion/react";
import { TrendingUp } from "lucide-react";
import type { CardTone } from "../health/MetricCard";

const TONE: Record<CardTone, string> = {
  pink: "var(--accent-pink)",
  cyan: "var(--accent-cyan)",
  lime: "var(--accent-lime)",
  amber: "var(--accent-amber)",
  mauve: "var(--accent-mauve)",
  violet: "var(--accent-blue)",
};

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * ProgressStat — label + trend glyph up top, big value + delta, a thin
 * progress bar along the bottom. The dashboard's bottom row.
 */
export function ProgressStat({
  label,
  value,
  delta,
  pct,
  tone = "pink",
  onSelect,
}: {
  label: string;
  value: string;
  delta: string;
  pct: number;
  tone?: CardTone;
  onSelect?: () => void;
}) {
  const reduce = useReducedMotion();
  const color = TONE[tone];
  const Tag = onSelect ? "button" : "div";

  return (
    <Tag
      {...(onSelect ? { type: "button" as const, onClick: onSelect } : {})}
      data-tone={tone}
      data-variant="glow"
      className={`metric-card group focus-ring block w-full text-left !p-4 ${
        onSelect ? "metric-card--link" : ""
      }`}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <span className="metric-card__label">{label}</span>
          <TrendingUp size={14} strokeWidth={2} style={{ color }} />
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="metric-numeral text-[1.5rem] text-content-primary">{value}</span>
          <span className="num text-[0.78rem] text-[var(--accent-lime)]">{delta}</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
          <motion.span
            className="block h-full rounded-full"
            style={{ background: color, boxShadow: `0 0 10px ${color}`, transformOrigin: "left" }}
            initial={reduce ? { scaleX: pct } : { scaleX: 0 }}
            animate={{ scaleX: Math.max(0, Math.min(1, pct)) }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
          />
        </div>
      </div>
    </Tag>
  );
}
