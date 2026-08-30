import { Outlet, useLocation } from "react-router-dom";
import { Suspense, useEffect, useState } from "react";
import { House, Dumbbell, MessageSquare, TrendingUp, Target, Library } from "lucide-react";
import { AtmosphericBackground } from "./layout/AtmosphericBackground";
import { TopNav, type NavItem } from "./layout/TopNav";
import { RouteProgress } from "./layout/RouteProgress";
import { ScrollProgress } from "./layout/ScrollProgress";
import { QuickActions } from "./layout/QuickActions";
import { PageSkeleton } from "./skeleton/PageSkeleton";

const ICON = { size: 19, strokeWidth: 1.75 } as const;

const NAV: NavItem[] = [
  { to: "/dashboard", label: "home", end: true, icon: <House {...ICON} />, feature: "dashboard" },
  { to: "/workouts", label: "train", icon: <Dumbbell {...ICON} />, feature: "workouts" },
  { to: "/goals", label: "goals", icon: <Target {...ICON} />, feature: "goals" },
  { to: "/trainer", label: "trainer", icon: <MessageSquare {...ICON} />, feature: "trainer" },
  { to: "/progress", label: "progress", icon: <TrendingUp {...ICON} />, feature: "progress_basic" },
];

const SECONDARY: NavItem[] = [
  { to: "/exercise-library", label: "Exercise library", icon: <Library {...ICON} /> },
];

const LOAD_MS = 380;
const seen = new Set<string>();

export function AppShell() {
  const location = useLocation();
  const pinned =
    typeof window !== "undefined" && window.location.search.includes("skel");
  // only gate the FIRST visit to a route; repeat navigation is instant.
  const [phase, setPhase] = useState<"loading" | "ready">(
    seen.has(location.pathname) ? "ready" : "loading"
  );

  useEffect(() => {
    if (pinned) return;
    if (seen.has(location.pathname)) {
      setPhase("ready");
      return;
    }
    seen.add(location.pathname);
    setPhase("loading");
    const t = setTimeout(() => setPhase("ready"), LOAD_MS);
    return () => clearTimeout(t);
  }, [location.pathname, pinned]);

  const showSkeleton = pinned || phase === "loading";

  return (
    <div className="relative min-h-[100dvh]">
      <AtmosphericBackground />
      <RouteProgress active={showSkeleton} />
      <ScrollProgress />
      <TopNav items={NAV} secondary={SECONDARY} />

      <main className="relative mx-auto w-full max-w-[1040px] px-5 pb-28 pt-28 sm:px-8 sm:pt-32">
        {showSkeleton ? (
          <PageSkeleton pathname={location.pathname} />
        ) : (
          <div key={location.pathname} className="animate-rise">
            <Suspense fallback={<PageSkeleton pathname={location.pathname} />}>
              <Outlet />
            </Suspense>
          </div>
        )}
      </main>

      <QuickActions />
    </div>
  );
}
