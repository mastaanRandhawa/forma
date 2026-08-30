import { Link } from "react-router-dom";
import { CalendarPlus, Dumbbell, MoreHorizontal } from "lucide-react";
import { upcomingWorkouts } from "../../lib/data";
import { useDashboardData } from "../../api/dashboard-context";
import { API_ENABLED } from "../../api/hooks";

/**
 * ActivityList — the "up next" schedule styled like a transactions feed:
 * circular glyph, name + muscles, day on the trailing edge. When the dashboard
 * aggregate names an upcoming workout it leads with that; otherwise it shows
 * the local schedule preview, or an empty prompt.
 */
export function ActivityList() {
  const dash = useDashboardData();
  const items = API_ENABLED
    ? dash?.upcomingWorkout
      ? [{ day: "next", name: dash.upcomingWorkout.name, muscles: dash.upcomingWorkout.muscles }]
      : []
    : upcomingWorkouts;

  return (
    <div className="metric-card !p-4" data-tone="mauve" data-variant="glow">
      <div className="relative z-10">
        <div className="mb-3 flex items-center justify-between">
          <span className="metric-card__label">up next</span>
          <Link to="/workouts" aria-label="All workouts" className="focus-ring text-content-tertiary hover:text-content-secondary">
            <MoreHorizontal size={16} strokeWidth={2} />
          </Link>
        </div>

        {items.length === 0 ? (
          <Link
            to="/workouts"
            className="focus-ring tactile flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/12 px-4 py-6 text-center transition-colors hover:border-white/25"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.06] text-content-tertiary">
              <CalendarPlus size={15} strokeWidth={1.9} />
            </span>
            <span className="text-[0.85rem] lowercase text-content-secondary">nothing scheduled</span>
            <span className="label-instrument">plan your next session</span>
          </Link>
        ) : (
          <ul>
            {items.map((w) => (
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
        )}
      </div>
    </div>
  );
}
