import { Outlet, useLocation, useNavigation } from "react-router-dom";
import { Suspense, useEffect, useState } from "react";
import { House, Dumbbell, MessageSquare, Apple, Library, Trophy } from "lucide-react";
import { API_ENABLED } from "../api/hooks";
import { useFormaData } from "../lib/localStore";
import { grantDailyBonus } from "../lib/rewards";
import { CoinToast } from "./CoinToast";
import { AtmosphericBackground } from "./layout/AtmosphericBackground";
import { TopNav, type NavItem } from "./layout/TopNav";
import { RouteProgress } from "./layout/RouteProgress";
import { ScrollProgress } from "./layout/ScrollProgress";
import { QuickActions } from "./layout/QuickActions";
import { WorkoutInProgressBar } from "./workout/WorkoutInProgressBar";
import { PageSkeleton } from "./skeleton/PageSkeleton";

const ICON = { size: 19, strokeWidth: 1.75 } as const;

const NAV: NavItem[] = [
  { to: "/dashboard", label: "home", end: true, icon: <House {...ICON} />, feature: "dashboard" },
  {
    to: "/workouts",
    label: "training",
    icon: <Dumbbell {...ICON} />,
    feature: "workouts",
    match: ["/progress", "/body", "/training"],
  },
  { to: "/nutrition", label: "nutrition", icon: <Apple {...ICON} /> },
  { to: "/trainer", label: "trainer", icon: <MessageSquare {...ICON} />, feature: "trainer" },
];

const SECONDARY: NavItem[] = [
  { to: "/records", label: "Records", icon: <Trophy {...ICON} /> },
  { to: "/exercise-library", label: "Exercise library", icon: <Library {...ICON} /> },
];

export function AppShell() {
  const location = useLocation();
  const navigation = useNavigation();
  // Remount (and re-run the entrance animation) only when the top-level section
  // changes — navigating between subsections of the same area (e.g. Settings
  // panels) keeps the shared layout, nav rail and already-loaded panels mounted.
  const section = location.pathname.split("/")[1] || "dashboard";
  // The only genuine wait now is a code-split chunk that hasn't downloaded yet;
  // Suspense handles that. The top progress bar reflects router loader work.
  const showSkeleton = navigation.state === "loading";

  // pay the daily check-in bonus once per calendar day (idempotent)
  useEffect(() => {
    const t = setTimeout(() => grantDailyBonus(), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative min-h-[100dvh]">
      <AtmosphericBackground />
      <RouteProgress active={showSkeleton} />
      <ScrollProgress />
      <TopNav items={NAV} secondary={SECONDARY} />

      <main className="relative mx-auto w-full max-w-[1040px] px-5 pb-28 pt-28 sm:px-8 sm:pt-32">
        <div key={section} className="animate-rise">
          <Suspense fallback={<PageSkeleton pathname={location.pathname} />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      <QuickActions />
      <WorkoutInProgressBar />
      <CoinToast />
      <LocalDataBadge />
    </div>
  );
}

/** Honest marker that this build has no backend — data lives in this browser. */
function LocalDataBadge() {
  const { profile, sessions } = useFormaData();
  const [dismissed, setDismissed] = useState(false);
  if (API_ENABLED || dismissed) return null;
  const fresh = !profile.onboardedAt && sessions.length === 0;
  return (
    <div className="fixed bottom-4 left-4 z-[60] max-w-[15rem]">
      <div className="flex items-start gap-2 rounded-2xl border border-white/10 bg-[rgba(24,13,20,0.92)] px-3 py-2 text-[0.72rem] leading-snug text-content-tertiary shadow-[0_16px_36px_-14px_rgba(0,0,0,0.6)] backdrop-blur-md">
        <span>
          {fresh
            ? "Demo build · running on template defaults. Finish setup to make it yours — data stays in this browser."
            : "Local build · your data is stored in this browser, not on a server."}
        </span>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="focus-ring -mr-1 -mt-0.5 shrink-0 text-content-tertiary hover:text-content-secondary"
        >
          ×
        </button>
      </div>
    </div>
  );
}
