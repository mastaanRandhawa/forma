import { Suspense } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { SettingsNav } from "../../components/settings/SettingsNav";
import { SettingsPanelSkeleton } from "../../components/skeleton/PageSkeleton";

/**
 * Settings shell — a persistent category rail on desktop, a single editing
 * column on the right. On mobile the rail is hidden: `/settings` is the category
 * list itself and each child route is a full screen with a back link.
 */
export default function SettingsLayout() {
  const { pathname } = useLocation();
  const atRoot = pathname === "/settings" || pathname === "/settings/";

  return (
    <div className="mx-auto max-w-[1120px]">
      <PageHeader eyebrow="account" title="settings" />

      <div className="mt-2 lg:grid lg:grid-cols-[212px_minmax(0,1fr)] lg:gap-8">
        <aside className="hidden lg:block">
          <SettingsNav />
        </aside>

        <div className="min-w-0">
          {!atRoot && (
            <Link
              to="/settings"
              className="focus-ring mb-4 inline-flex items-center gap-1 text-[0.82rem] lowercase text-content-tertiary transition-colors hover:text-content-secondary lg:hidden"
            >
              <ChevronLeft size={14} strokeWidth={2} /> settings
            </Link>
          )}
          {/* Key the panel (not the rail) so switching subsections gives a
              light entrance transition while the nav rail and any already-
              mounted panels stay put. */}
          <div key={pathname} className="animate-rise">
            <Suspense fallback={<SettingsPanelSkeleton rows={6} />}>
              <Outlet />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
