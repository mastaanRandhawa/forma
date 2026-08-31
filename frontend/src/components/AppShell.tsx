import { Outlet, useLocation } from "react-router-dom";
import { Suspense, useEffect, useState } from "react";
import { House, Dumbbell, MessageSquare, Apple, Library } from "lucide-react";
import { API_ENABLED } from "../api/hooks";
import { useFormaData } from "../lib/localStore";
import { AtmosphericBackground } from "./layout/AtmosphericBackground";
import { TopNav, type NavItem } from "./layout/TopNav";
import { RouteProgress } from "./layout/RouteProgress";
import { ScrollProgress } from "./layout/ScrollProgress";
import { QuickActions } from "./layout/QuickActions";
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
