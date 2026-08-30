import { motion, useReducedMotion } from "motion/react";
import { Flame } from "lucide-react";
import { streakData } from "../../lib/data";
import { useDashboardData } from "../../api/dashboard-context";

const DAYS = ["m", "t", "w", "t", "f", "s", "s"];

/** Streak card — flame + day count + this-week target row. */
export function StreakWidget({ onSelect }: { onSelect?: () => void }) {
  const reduce = useReducedMotion();
  const dash = useDashboardData();
  const days = dash?.streakDays ?? streakData.days;
  const best = Math.max(days, streakData.best);
  const weekDone = dash?.weeklyRing.done ?? streakData.weekDone;
  const weekTarget = dash?.weeklyRing.target ?? streakData.weekTarget;
  const Wrap = onSelect ? "button" : "div";

  return (
    <Wrap
      {...(onSelect ? { type: "button" as const, onClick: onSelect } : {})}
      data-tone="amber"
      data-variant="glow"
      className={`metric-card group focus-ring block w-full text-left ${onSelect ? "metric-card--link" : ""}`}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <span className="metric-card__label">workout streak</span>
          <motion.span
            animate={reduce ? undefined : { rotate: [0, -8, 6, -4, 0], scale: [1, 1.12, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }}
            className="grid h-7 w-7 place-items-center rounded-full"
            style={{ background: "color-mix(in srgb, var(--accent-amber) 22%, transparent)" }}
          >
            <Flame size={15} strokeWidth={2} className="text-[var(--accent-amber)]" />
          </motion.span>
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="metric-card__value text-[2.6rem]">{days}</span>
          <span className="metric-card__unit">
            {days === 0 ? "start one today" : `days · best ${best}`}
          </span>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label-instrument">this week</span>
            <span className="num text-[0.72rem] text-content-tertiary">
              {weekDone} / {weekTarget}
            </span>
          </div>
          <div className="flex gap-1.5">
            {streakData.week.map((done, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span
                  className="h-6 w-full rounded-md transition-colors"
                  style={{
                    background: done ? "var(--accent-amber)" : "rgba(255,255,255,0.07)",
                    boxShadow: done ? "0 0 12px -2px var(--accent-amber)" : "none",
                  }}
                />
                <span className="text-[0.6rem] uppercase text-content-tertiary">{DAYS[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Wrap>
  );
}
