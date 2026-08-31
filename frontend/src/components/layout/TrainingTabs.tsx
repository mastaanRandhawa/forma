import { NavLink } from "react-router-dom";
import { CalendarDays, TrendingUp, Activity } from "lucide-react";
import { useProgression } from "../../api/settings";
import type { FeatureKey } from "../../api/types";

type Tab = { to: string; label: string; icon: typeof Activity; end?: boolean; feature?: FeatureKey };

const TABS: Tab[] = [
  { to: "/workouts", label: "plan", icon: CalendarDays, end: true, feature: "workouts" },
  { to: "/progress", label: "progress", icon: TrendingUp, feature: "progress_basic" },
  { to: "/body", label: "muscle balance", icon: Activity, feature: "body_map" },
];

/**
 * Sub-navigation for the Training section — plan, progress and muscle balance
 * live under one top-level tab. Rendered above the page header on each of the
 * three screens so the grouping is visible wherever you land.
 */
export function TrainingTabs({ className = "" }: { className?: string }) {
  const { has } = useProgression();
  const tabs = TABS.filter((t) => !t.feature || has(t.feature));
  if (tabs.length < 2) return null;

  return (
    <nav
      aria-label="Training sections"
      className={`surface-recessed inline-flex max-w-full flex-wrap gap-1 rounded-pill p-1.5 ${className}`}
    >
      {tabs.map((t) => {
        const Icon = t.icon;
        return (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `focus-ring tactile inline-flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-[0.78rem] lowercase tracking-[0.04em] transition-colors ${
                isActive
                  ? "surface-float text-content-primary"
                  : "text-content-tertiary hover:text-content-secondary"
              }`
            }
          >
            <Icon size={14} strokeWidth={1.9} />
            {t.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
