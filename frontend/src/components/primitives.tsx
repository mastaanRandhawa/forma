import { ReactNode, useId } from "react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { MetricCard, CardTone } from "./health/MetricCard";
import { MiniTrend } from "./health/MiniTrend";
import { RadialMetric } from "./health/RadialMetric";

/* -------------------------------------------------------------------------
   Shared primitives — API-stable wrappers over the new material system so
   every screen inherits the soft-3D language. Screens are progressively
   given bespoke compositions on top of these.
   ------------------------------------------------------------------------- */

type Identity = "ember" | "chartreuse" | "orchid" | "jade" | "aurum";

const TONE: Record<Identity, CardTone> = {
  ember: "amber",
  chartreuse: "lime",
  orchid: "pink",
  jade: "cyan",
  aurum: "amber",
};
const TONE_COLOR: Record<CardTone, string> = {
  pink: "var(--accent-pink)",
  cyan: "var(--accent-cyan)",
  lime: "var(--accent-lime)",
  amber: "var(--accent-amber)",
  mauve: "var(--accent-mauve)",
  violet: "var(--accent-blue)",
};

export function StatCard({
  label,
  value,
  unit,
  identity,
  spark,
  className = "",
}: {
  label: string;
  value: string;
  unit?: string;
  identity: Identity;
  spark?: number[];
  className?: string;
}) {
  const tone = TONE[identity];
  return (
    <MetricCard
      tone={tone}
      label={label.toLowerCase()}
      value={value}
      unit={unit}
      className={`min-h-[168px] ${className}`}
      viz={
        spark ? (
          <MiniTrend data={spark} mode="curve" color={TONE_COLOR[tone]} fill height={52} />
        ) : undefined
      }
    />
  );
}

export function Panel({
  children,
  className = "",
  title,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`surface-soft p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between">
          {title && <h2 className="label-soft lowercase">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "ghost";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "focus-ring tactile inline-flex items-center justify-center gap-2 rounded-pill px-6 py-3 text-[0.92rem] font-medium lowercase tracking-[0.01em] transition";
  const styles =
    variant === "primary"
      ? "surface-raised surface-raised--interactive text-content-primary"
      : "surface-recessed text-content-secondary hover:text-content-primary";
  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function PillSelector<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  const groupId = useId();
  const reduce = useReducedMotion();
  return (
    <LayoutGroup id={groupId}>
      <div className="surface-recessed inline-flex rounded-pill p-1.5" role="tablist">
        {options.map((o) => {
          const active = value === o;
          return (
            <button
              key={o}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(o)}
              className={`focus-ring relative rounded-pill px-4 py-1.5 text-[0.78rem] lowercase tracking-[0.04em] transition-colors ${
                active ? "text-content-primary" : "text-content-tertiary hover:text-content-secondary"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="pill-active"
                  className="surface-float absolute inset-0 rounded-pill"
                  aria-hidden
                  transition={
                    reduce ? { duration: 0 } : { type: "spring", stiffness: 460, damping: 36 }
                  }
                />
              )}
              <span className="relative">{o}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

export function RingGauge({
  value,
  max = 100,
  identity = "var(--accent-pink)",
  label,
  size = 180,
}: {
  value: number;
  max?: number;
  identity?: string;
  label?: string;
  size?: number;
}) {
  return (
    <RadialMetric
      value={value}
      max={max}
      size={size}
      mode="dots"
      color={identity.startsWith("#") || identity.startsWith("var") ? identity : "var(--accent-pink)"}
      center={
        <div>
          <div className="metric-numeral text-content-primary" style={{ fontSize: size * 0.26 }}>
            {value}
          </div>
          <div className="label-instrument mt-1">/ {max}</div>
          {label && <div className="label-soft mt-1.5 lowercase">{label}</div>}
        </div>
      }
      ariaLabel={`${label ?? "value"} ${value} of ${max}`}
    />
  );
}

export function Sparkline({
  data,
  stroke = "var(--accent-cyan)",
  width = 120,
  height = 36,
}: {
  data: number[];
  stroke?: string;
  width?: number;
  height?: number;
}) {
  return <MiniTrend data={data} mode="curve" color={stroke} width={width} height={height} />;
}
