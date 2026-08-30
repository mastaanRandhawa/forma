import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarPlus } from "lucide-react";
import { BodyMuscles } from "../BodyMuscles";
import { muscleActivation, todayWorkout } from "../../lib/data";
import { useDashboardData } from "../../api/dashboard-context";

/**
 * SessionCard — the featured "today's session" tile: a full-bleed muscle map
 * zoomed onto the worked area with the workout details layered on top.
 * Falls back to a "plan a session" prompt on a rest day.
 */
export function SessionCard() {
  const dash = useDashboardData();
  const workout = dash ? dash.todayWorkout : { name: todayWorkout.name, exercises: todayWorkout.exercises, durationMin: 45 };

  if (!workout) {
    return (
      <Link
        to="/workouts"
        className="metric-card metric-card--link group focus-ring relative flex min-h-[220px] flex-col items-center justify-center gap-3 overflow-hidden text-center"
        data-tone="mauve"
        data-variant="glow"
      >
        <span className="grid h-11 w-11 place-items-center rounded-pill bg-white/[0.06] text-content-tertiary">
          <CalendarPlus size={18} strokeWidth={1.75} />
        </span>
        <div className="text-[0.98rem] lowercase text-content-primary">rest day</div>
        <p className="max-w-[28ch] text-[0.84rem] leading-relaxed text-content-secondary">
          nothing scheduled for today. plan a session or start one now.
        </p>
        <span className="label-instrument">go to training →</span>
      </Link>
    );
  }

  return (
    <Link
      to="/workouts/active"
      className="metric-card metric-card--link group focus-ring relative flex min-h-[320px] flex-col overflow-hidden"
      data-tone="pink"
      data-variant="vivid"
    >
      {/* full-bleed body map — zoomed onto today's worked chest / shoulders */}
      <div className="pointer-events-none absolute inset-0 z-0 grid place-items-center overflow-hidden">
        <BodyMuscles
          activation={muscleActivation}
          className="[&_svg]:!max-w-none [&_svg]:origin-[50%_18%] [&_svg]:scale-[2.15]"
        />
      </div>
      {/* legibility scrim */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(180deg, rgba(36,10,30,0.6) 0%, rgba(36,10,30,0.12) 34%, rgba(36,10,30,0.12) 62%, rgba(36,10,30,0.72) 100%)",
        }}
      />

      <div className="relative z-10 flex items-start justify-between">
        <span className="metric-card__label !text-white">today's session</span>
        <span className="metric-card__action !h-8 !w-8 !bg-white/20 !text-white">
          <ArrowUpRight size={16} strokeWidth={2.25} />
        </span>
      </div>
      <div className="relative z-10 mt-3">
        <div className="text-[1.4rem] font-light lowercase leading-tight text-white [text-shadow:0_2px_12px_rgba(20,4,14,0.5)]">
          {workout.name}
        </div>
        <div className="num mt-1 text-[0.78rem] text-white/85">
          {workout.durationMin ?? 45} min · {workout.exercises} exercises
        </div>
      </div>
      <div className="relative z-10 mt-auto pt-5">
        <div className="label-instrument !text-white/70">trained today</div>
        <div className="mt-1 text-[0.85rem] lowercase text-white">chest, shoulders · 95%</div>
      </div>
    </Link>
  );
}
