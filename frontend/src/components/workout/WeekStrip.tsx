import { Check, Flame } from "lucide-react";
import { currentStreak, weekProgress } from "../../lib/fitness";
import { useProtectedDays } from "../../lib/streak";
import { useFormaData, type CompletedSession } from "../../lib/localStore";

const LETTERS = ["m", "t", "w", "t", "f", "s", "s"];
const NAMES = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

/**
 * This week at a glance: a dot per day (filled when trained), sessions against
 * the weekly goal, and the current streak once it's worth mentioning.
 */
export function WeekStrip({
  sessions,
  goal,
  className = "",
}: {
  sessions: CompletedSession[];
  goal: number | null;
  className?: string;
}) {
  const { days, count, todayIndex } = weekProgress(sessions);
  useProtectedDays();
  const { profile } = useFormaData();
  const streak = currentStreak(sessions, profile);
  const hit = goal != null && count >= goal;
  return (
    <section aria-label="this week" className={`surface-soft flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 ${className}`}>
      <ol className="flex gap-1.5 sm:gap-2" aria-label="days trained this week">
        {days.map((done, i) => (
          <li
            key={i}
            aria-label={`${NAMES[i]}: ${done ? "trained" : i > todayIndex ? "upcoming" : "rest"}`}
            className={`grid h-9 w-9 place-items-center rounded-full text-[0.72rem] lowercase transition-colors ${
              done
                ? "bg-[var(--accent-pink)] text-white"
                : i === todayIndex
                  ? "border-2 border-[var(--accent-pink)] text-content-primary"
                  : "surface-recessed text-content-tertiary"
            }`}
          >
            {done ? <Check size={14} strokeWidth={3} aria-hidden /> : LETTERS[i]}
          </li>
        ))}
      </ol>
      <div className="text-right">
        <div className="text-[0.95rem] lowercase text-content-primary tabular-nums">
          {goal != null ? (
            <>
              {count} of {goal} workouts this week{hit ? " — goal hit" : ""}
            </>
          ) : (
            <>
              {count} workout{count === 1 ? "" : "s"} this week
            </>
          )}
        </div>
        {streak >= 2 && (
          <div className="mt-0.5 inline-flex items-center gap-1 text-[0.8rem] lowercase text-[var(--accent-amber)]">
            <Flame size={13} aria-hidden /> {streak}-day streak
          </div>
        )}
      </div>
    </section>
  );
}
