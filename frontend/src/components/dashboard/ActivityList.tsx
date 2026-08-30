import { Link } from "react-router-dom";
import { Dumbbell, MoreHorizontal } from "lucide-react";
import { upcomingWorkouts } from "../../lib/data";

/**
 * ActivityList — the "up next" schedule styled like a transactions feed:
 * circular glyph, name + muscles, day on the trailing edge.
 */
export function ActivityList() {
  return (
    <div className="metric-card !p-4" data-tone="mauve" data-variant="glow">
      <div className="relative z-10">
        <div className="mb-3 flex items-center justify-between">
          <span className="metric-card__label">up next</span>
          <Link to="/workouts" aria-label="All workouts" className="focus-ring text-content-tertiary hover:text-content-secondary">
            <MoreHorizontal size={16} strokeWidth={2} />
          </Link>
        </div>
        <ul>
          {upcomingWorkouts.map((w) => (
            <li key={w.day}>
              <Link
                to="/workouts"
                className="focus-ring -mx-1 flex items-center gap-3 rounded-xl px-1 py-2.5 transition-colors hover:bg-white/[0.05]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.06] text-content-secondary">
                  <Dumbbell size={15} strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.9rem] text-content-primary">{w.name}</span>
                  <span className="label-instrument mt-0.5 block truncate">
                    {w.muscles.join(", ").toLowerCase()}
                  </span>
                </span>
                <span className="num shrink-0 text-[0.74rem] text-content-tertiary">{w.day.toLowerCase()}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
