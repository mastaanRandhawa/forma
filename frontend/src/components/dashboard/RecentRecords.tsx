import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useDashboardData } from "../../api/dashboard-context";
import { useFormaData } from "../../lib/localStore";
import { fromKg } from "../../lib/lifecycle";

/** Dashboard "recent records" — the last few personal bests, with a link to all of them. */
export function RecentRecords() {
  const dash = useDashboardData();
  const units = useFormaData().profile.units;
  const prs = (dash?.recentPRs ?? []).slice(0, 3);
  if (!prs.length) return null;
  return (
    <div className="metric-card !p-5" data-tone="lime">
      <div className="relative z-10">
        <div className="mb-3 flex items-center justify-between">
          <span className="metric-card__label">recent records</span>
          <Link
            to="/records"
            className="focus-ring flex items-center gap-1 text-[0.74rem] text-content-tertiary transition-colors hover:text-content-secondary"
          >
            all records <ChevronRight size={13} strokeWidth={2.25} />
          </Link>
        </div>
        <ul className="space-y-3">
          {prs.map((p, i) => (
            <li key={i} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[0.9rem] text-content-primary lowercase">{p.lift}</div>
                <div className="label-instrument">{p.recordType.replace(/_/g, " ")}</div>
              </div>
              <span className="metric-numeral shrink-0 text-[1.1rem] tabular-nums" style={{ color: "var(--accent-lime)" }}>
                {p.recordType === "max_reps" ? `${p.value} reps` : `${Math.round(fromKg(p.value, units))} ${units}`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
