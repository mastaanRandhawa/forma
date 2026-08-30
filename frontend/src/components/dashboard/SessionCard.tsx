import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { BodyMuscles } from "../BodyMuscles";
import { muscleActivation, todayWorkout } from "../../lib/data";

/**
 * SessionCard — the featured "today's session" tile: a full-bleed muscle map
 * zoomed onto the worked area with the workout details layered on top.
 */
export function SessionCard() {
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
        <span className="metric-card__action !h-8 !w-8 !bg-white/20 !text-white transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
          <ArrowUpRight size={16} strokeWidth={2.25} />
        </span>
      </div>
      <div className="relative z-10 mt-3">
        <div className="text-[1.4rem] font-light lowercase leading-tight text-white [text-shadow:0_2px_12px_rgba(20,4,14,0.5)]">
          {todayWorkout.name}
        </div>
        <div className="num mt-1 text-[0.78rem] text-white/85">45 min · {todayWorkout.exercises} exercises</div>
      </div>
      <div className="relative z-10 mt-auto pt-5">
        <div className="label-instrument !text-white/70">trained today</div>
        <div className="mt-1 text-[0.85rem] lowercase text-white">chest, shoulders · 95%</div>
      </div>
    </Link>
  );
}
