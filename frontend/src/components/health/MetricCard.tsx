import { CSSProperties, ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Info, ArrowUp, ArrowDown, Minus, ChevronRight } from "lucide-react";
import { CountUp } from "./CountUp";

export type CardTone = "pink" | "cyan" | "lime" | "amber" | "mauve" | "violet";
export type CardVariant = "vivid" | "glow";
export type DeltaDir = "up" | "down" | "flat" | "warn";

type Props = {
  label: string;
  /** static value node — use `countTo` instead for an animated number */
  value?: ReactNode;
  /** animate 0 → n on reveal */
  countTo?: number;
  countFormat?: (n: number) => string;
  /** small de-emphasised unit under the value ("k lb", "% clean reps"…) */
  unit?: string;
  /** comparison line: "+14% vs yesterday" */
  delta?: { text: string; dir: DeltaDir };
  /** goal progress: fills a bar + prints "value / max" */
  goal?: { value: number; max: number; suffix?: string };
  tone?: CardTone;
  variant?: CardVariant;
  align?: "center" | "left";
  to?: string;
  /** makes the whole card a button that opens a detail view */
  onSelect?: () => void;
  action?: ReactNode;
  info?: boolean;
  /** plain-language explanation shown in a tooltip from the info button */
  infoText?: string;
  onInfo?: () => void;
  viz?: ReactNode;
  vizFull?: boolean;
  media?: ReactNode;
  children?: ReactNode;
  loading?: boolean;
  revealDelay?: number;
  className?: string;
  style?: CSSProperties;
};

const EASE = [0.22, 1, 0.36, 1] as const;

const DELTA_ICON: Record<DeltaDir, ReactNode> = {
  up: <ArrowUp size={12} strokeWidth={2.5} />,
  down: <ArrowDown size={12} strokeWidth={2.5} />,
  flat: <Minus size={12} strokeWidth={2.5} />,
  warn: <ArrowDown size={12} strokeWidth={2.5} />,
};

export function MetricCard({
  label,
  value,
  countTo,
  countFormat,
  unit,
  delta,
  goal,
  tone = "pink",
  variant = "glow",
  align = "left",
  to,
  onSelect,
  action,
  info,
  infoText,
  onInfo,
  viz,
  vizFull,
  media,
  children,
  loading = false,
  revealDelay = 0,
  className = "",
  style,
}: Props) {
  const reduce = useReducedMotion();
  const [tip, setTip] = useState(false);
  const isLink = !!to && !loading;
  const isButton = !!onSelect && !loading;
  const interactive = isLink || isButton;

  const cls = ["metric-card", "group", !interactive && "focus-ring", interactive && "metric-card--link", className]
    .filter(Boolean)
    .join(" ");

  const actionEl =
    action ??
    ((info || infoText) && (
      <span className="pointer-events-auto relative z-20">
        <button
          type="button"
          className="metric-card__action"
          aria-label={`About ${label}`}
          onMouseEnter={() => setTip(true)}
          onMouseLeave={() => setTip(false)}
          onFocus={() => setTip(true)}
          onBlur={() => setTip(false)}
          onClick={(e) => {
            e.preventDefault();
            setTip((v) => !v);
            onInfo?.();
          }}
        >
          <Info size={13} strokeWidth={2.25} />
        </button>
        <AnimatePresence>
          {tip && infoText && (
            <motion.span
              role="tooltip"
              className="absolute right-0 top-9 z-30 w-[190px] max-w-[74vw] rounded-2xl border border-white/10 bg-[rgba(24,13,20,0.97)] px-3 py-2 text-left text-[0.75rem] font-normal leading-snug text-content-secondary shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur-md"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.16, ease: EASE }}
            >
              {infoText}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    ));

  const valueNode =
    countTo != null ? (
      <CountUp value={countTo} format={countFormat} />
    ) : (
      value
    );

  const goalFraction = goal ? Math.min(1, goal.value / goal.max) : 0;

  const body = loading ? (
    <CardSkeleton align={align} hasViz={!!viz} reduce={!!reduce} />
  ) : (
    <motion.div
      key="content"
      className={`relative z-10 flex min-h-0 flex-1 flex-col ${interactive ? "pointer-events-none" : ""} ${align === "center" ? "text-center" : ""}`}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: revealDelay }}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <span className="metric-card__label">{label}</span>
        {actionEl}
      </div>

      {valueNode != null && (
        <div
          className={`flex flex-col ${
            align === "center" ? "flex-1 items-center justify-center py-4" : "mt-4 items-start"
          }`}
        >
          <span
            className="metric-card__value"
            style={{
              fontSize:
                align === "center" ? "clamp(3.6rem, 15vw, 5.4rem)" : "clamp(2.2rem, 6.5vw, 2.8rem)",
            }}
          >
            {valueNode}
          </span>
          {unit && <span className="metric-card__unit mt-2">{unit}</span>}
        </div>
      )}

      {(delta || goal) && (
        <div className={`mt-3 flex flex-col gap-2 ${align === "center" ? "items-center" : ""}`}>
          {delta && (
            <span
              className={`metric-card__delta metric-card__delta--${delta.dir}`}
            >
              {DELTA_ICON[delta.dir]}
              {delta.text}
            </span>
          )}
          {goal && (
            <div className="w-full" style={{ color: "var(--tone-color)" }}>
              <div className="mb-1 flex items-baseline justify-between text-[0.72rem] text-content-tertiary">
                <span className="num">
                  {goal.value.toLocaleString()}
                  <span className="opacity-60"> / {goal.max.toLocaleString()}{goal.suffix ? ` ${goal.suffix}` : ""}</span>
                </span>
                <span className="num">{Math.round(goalFraction * 100)}%</span>
              </div>
              <div className="metric-card__goal-track">
                <motion.span
                  className="metric-card__goal-fill"
                  initial={reduce ? { scaleX: goalFraction } : { scaleX: 0 }}
                  animate={{ scaleX: goalFraction }}
                  transition={{ duration: 0.9, ease: EASE, delay: revealDelay + 0.35 }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {children && (
        <div
          className={
            align === "center" ? "flex flex-col items-center" : valueNode == null ? "flex-1" : ""
          }
        >
          {children}
        </div>
      )}

      {interactive && (
        <span className="pointer-events-none absolute -bottom-1 right-0 z-10 flex items-center gap-1 text-[0.72rem] text-content-tertiary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          details <ChevronRight size={13} strokeWidth={2.25} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      )}
    </motion.div>
  );

  const vizShort = !!(delta || goal);
  const vizLayer = viz && !loading && (
    <motion.div
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-0 ${
        vizFull ? "top-0" : vizShort ? "h-[34%]" : "h-[44%]"
      }`}
      style={
        vizFull
          ? undefined
          : {
              WebkitMaskImage: "linear-gradient(to top, #000 55%, transparent)",
              maskImage: "linear-gradient(to top, #000 55%, transparent)",
            }
      }
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.9, ease: EASE, delay: revealDelay + 0.15 }}
    >
      {viz}
    </motion.div>
  );

  const mediaLayer = media && !loading && (
    <motion.div
      className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[40%] overflow-hidden sm:w-[44%]"
      initial={reduce ? false : { opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: EASE, delay: revealDelay + 0.1 }}
    >
      {media}
    </motion.div>
  );

  // stretched hit-area — keeps the whole card clickable without nesting
  // interactive elements (the info button / sub-links) inside an <a>/<button>.
  const hitCls = "focus-ring absolute inset-0 z-[1] rounded-[inherit]";
  const hitArea = isLink ? (
    <Link to={to!} aria-label={label} className={hitCls} />
  ) : isButton ? (
    <button type="button" onClick={onSelect} aria-label={`${label}, open details`} className={hitCls} />
  ) : null;

  return (
    <div className={cls} data-tone={tone} data-variant={variant} style={style}>
      {hitArea}
      <AnimatePresence mode="wait" initial={false}>
        {body}
      </AnimatePresence>
      {vizLayer}
      {mediaLayer}
    </div>
  );
}

/* ---------------------------------------------------------------- */

function CardSkeleton({
  align,
  hasViz,
  reduce,
}: {
  align: "center" | "left";
  hasViz: boolean;
  reduce: boolean;
}) {
  const pulse = reduce
    ? {}
    : {
        animate: { opacity: [0.35, 0.68, 0.35] as number[] },
        transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" as const },
      };
  return (
    <motion.div
      key="skeleton"
      className={`relative z-10 flex flex-1 flex-col ${align === "center" ? "items-center" : ""}`}
      initial={false}
      exit={reduce ? undefined : { opacity: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <motion.span className="block h-3 w-[42%] rounded-full bg-white/15" {...pulse} />
        <motion.span className="block h-7 w-7 rounded-full bg-white/12" {...pulse} />
      </div>
      <motion.span
        className={`block h-10 rounded-lg bg-white/20 ${
          align === "center" ? "mx-auto mt-8 w-[40%]" : "mt-7 w-[56%]"
        }`}
        {...pulse}
      />
      <motion.span
        className={`mt-2.5 block h-2.5 rounded-full bg-white/12 ${
          align === "center" ? "mx-auto w-[26%]" : "w-[32%]"
        }`}
        {...pulse}
      />
      {hasViz && (
        <motion.span className="mt-auto block h-[38%] w-full rounded-xl bg-white/[0.07]" {...pulse} />
      )}
    </motion.div>
  );
}
