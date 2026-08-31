import { Skel, SkelText } from "./Skeleton";

/** Route-aware loading placeholder — mirrors the shape of each screen. */
export function PageSkeleton({ pathname }: { pathname: string }) {
  if (pathname === "/dashboard" || pathname === "/") return <DashboardSkeleton />;
  if (pathname.startsWith("/trainer")) return <TrainerSkeleton />;
  if (pathname.startsWith("/body")) return <BodySkeleton />;
  if (pathname.startsWith("/progress")) return <ProgressSkeleton />;
  if (pathname.startsWith("/workouts")) return <WorkoutsSkeleton />;
  if (pathname.startsWith("/nutrition")) return <NutritionSkeleton />;
  if (pathname.startsWith("/settings")) return <SettingsSkeleton />;
  return <GenericSkeleton />;
}

/** The Training-section sub-nav pill row that sits above the header on
 *  workouts / progress / muscle-balance. */
function TrainingTabsSkel() {
  return <Skel className="mb-6 h-11 w-[19rem] max-w-full" style={{ borderRadius: 999 }} />;
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[760px]">
      <Skel className="mx-auto h-[76px] w-full max-w-[420px]" style={{ borderRadius: 26 }} />

      <div className="mt-10">
        <Skel className="h-3 w-28" style={{ borderRadius: 6 }} />
        <div className="mt-2 flex items-center gap-6">
          <Skel className="h-[7rem] w-[8rem] shrink-0" style={{ borderRadius: 20 }} />
          <div className="min-w-0 flex-1">
            <Skel className="h-4 w-40" style={{ borderRadius: 6 }} />
            <SkelText lines={3} className="mt-3" />
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <Skel className="col-span-2 h-[124px]" style={{ borderRadius: 30 }} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skel key={i} className="h-[156px]" style={{ borderRadius: 30 }} />
        ))}
        <Skel className="col-span-2 h-[92px]" style={{ borderRadius: 30 }} />
      </div>

      <div className="mt-10 flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <Skel key={i} className="h-10" style={{ borderRadius: 8 }} />
        ))}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="mb-10">
      <Skel className="h-3 w-20" style={{ borderRadius: 6 }} />
      <Skel className="mt-3 h-9 w-64" style={{ borderRadius: 12 }} />
    </div>
  );
}

function GenericSkeleton() {
  return (
    <div className="mx-auto max-w-[1120px]">
      <Header />
      <Skel className="h-11 w-72" style={{ borderRadius: 999 }} />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skel key={i} className="h-32" style={{ borderRadius: 24 }} />
        ))}
      </div>
      <Skel className="mt-6 h-56 w-full" style={{ borderRadius: 30 }} />
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="mx-auto max-w-[1120px]">
      <div className="mb-10">
        <Skel className="h-3 w-16" style={{ borderRadius: 6 }} />
        <Skel className="mt-3 h-9 w-40" style={{ borderRadius: 12 }} />
      </div>

      <div className="mt-2 lg:grid lg:grid-cols-[212px_minmax(0,1fr)] lg:gap-8">
        <aside className="hidden flex-col gap-1.5 lg:flex">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Skel key={i} className="h-10 w-full" style={{ borderRadius: 16 }} />
          ))}
        </aside>

        <div className="min-w-0 space-y-5">
          <div className="surface-soft flex items-center justify-between gap-3 p-5 sm:p-6">
            <div className="min-w-0 flex-1">
              <Skel className="h-4 w-32" style={{ borderRadius: 6 }} />
              <Skel className="mt-2 h-3 w-52 max-w-full" style={{ borderRadius: 6 }} />
            </div>
            <Skel className="h-9 w-24 shrink-0" style={{ borderRadius: 999 }} />
          </div>

          <SettingsPanelSkeleton rows={7} />
        </div>
      </div>
    </div>
  );
}

/** Loading placeholder for a single settings panel — a card of nav/summary rows. */
export function SettingsPanelSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="surface-soft p-5 sm:p-6">
      <div>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 border-t border-[var(--line-soft)] py-3.5 first:border-t-0"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Skel className="h-[17px] w-[17px] shrink-0" style={{ borderRadius: 6 }} />
              <div className="min-w-0 flex-1">
                <Skel className="h-3.5 w-28" style={{ borderRadius: 6 }} />
                <Skel className="mt-1.5 h-3 w-40 max-w-full" style={{ borderRadius: 6 }} />
              </div>
            </div>
            <Skel className="h-4 w-4 shrink-0" style={{ borderRadius: 6 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkoutsSkeleton() {
  return (
    <div className="mx-auto max-w-[1120px]">
      <TrainingTabsSkel />
      <Header />
      <Skel className="h-11 w-72 max-w-full" style={{ borderRadius: 999 }} />
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Skel className="h-[420px]" style={{ borderRadius: 30 }} />
        <div className="space-y-5">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <Skel className="h-4 w-32" style={{ borderRadius: 6 }} />
              <Skel className="mt-2 h-3 w-44" style={{ borderRadius: 6 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NutritionSkeleton() {
  return (
    <div className="mx-auto max-w-[1120px]">
      <Header />
      <Skel className="h-11 w-44" style={{ borderRadius: 999 }} />
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <div className="surface-soft p-6">
            <div className="flex flex-wrap items-center gap-6">
              <Skel className="h-32 w-32 shrink-0" style={{ borderRadius: 999 }} />
              <div className="min-w-[12rem] flex-1 space-y-4">
                {[0, 1, 2].map((i) => (
                  <Skel key={i} className="h-3.5 w-full" style={{ borderRadius: 6 }} />
                ))}
              </div>
            </div>
          </div>
          <Skel className="h-40 w-full" style={{ borderRadius: 24 }} />
        </div>
        <Skel className="h-52 w-full" style={{ borderRadius: 24 }} />
      </div>
    </div>
  );
}

function TrainerSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1120px] gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <Header />
        <Skel className="h-[62vh] min-h-[440px] w-full" style={{ borderRadius: 30 }} />
      </div>
      <div className="space-y-8">
        <SkelText lines={5} />
        <SkelText lines={3} />
      </div>
    </div>
  );
}

function BodySkeleton() {
  return (
    <div className="mx-auto max-w-[1120px]">
      <TrainingTabsSkel />
      <Header />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Skel className="h-[520px]" style={{ borderRadius: 34 }} />
        <div className="space-y-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skel key={i} className="h-9" style={{ borderRadius: 8 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProgressSkeleton() {
  return (
    <div className="mx-auto max-w-[1120px]">
      <TrainingTabsSkel />
      <Header />
      <SkelText lines={3} className="max-w-[62ch]" />
      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px]">
        <Skel className="h-56" style={{ borderRadius: 24 }} />
        <div className="flex flex-col items-center gap-3">
          <Skel className="h-14 w-28" style={{ borderRadius: 14 }} />
          <Skel className="h-3 w-24" style={{ borderRadius: 6 }} />
        </div>
      </div>
      <div className="mt-14 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skel key={i} className="h-28" style={{ borderRadius: 24 }} />
        ))}
      </div>
    </div>
  );
}
