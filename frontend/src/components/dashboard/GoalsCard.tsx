import { Link } from "react-router-dom";
import { Plus, ChevronRight } from "lucide-react";
import { GoalWidget } from "./GoalWidget";
import { EmptyState } from "../EmptyState";
import { ErrorState } from "../ErrorState";
import { Skel } from "../skeleton/Skeleton";
import { useGoals, errorMessage } from "../../api/hooks";
import { goalToWidget } from "../../api/adapt";

/** Dashboard goals block — the active goals with progress, links to /goals. */
export function GoalsCard() {
  const { data, error, initialLoading, refetch } = useGoals();
  const goals = (data ?? []).filter((g) => g.active);

  return (
    <div className="metric-card !p-5" data-tone="pink" data-variant="glow">
      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <span className="metric-card__label">goals</span>
          <Link
            to="/goals"
            className="focus-ring flex items-center gap-1 text-[0.74rem] text-content-tertiary transition-colors hover:text-content-secondary"
          >
            manage <ChevronRight size={13} strokeWidth={2.25} />
          </Link>
        </div>

        {initialLoading ? (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <Skel key={i} className="h-[72px] rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={errorMessage(error)} onRetry={refetch} className="!py-6" />
        ) : goals.length === 0 ? (
          <EmptyState
            title="no goals yet"
            body="set a target for steps, protein, sleep or training frequency."
            action={{ label: "create a goal", to: "/goals" }}
          />
        ) : (
          <div className="space-y-2.5">
            {goals.slice(0, 3).map((g, i) => (
              <GoalWidget key={g.id} goal={goalToWidget(g, i)} />
            ))}
            <Link
              to="/goals"
              className="focus-ring tactile flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/12 py-2.5 text-[0.8rem] lowercase text-content-tertiary transition-colors hover:border-white/25 hover:text-content-secondary"
            >
              <Plus size={13} strokeWidth={2.25} /> new goal
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
