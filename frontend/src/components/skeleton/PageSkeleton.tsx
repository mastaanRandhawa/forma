import { Skel, SkelText } from "./Skeleton";

/** Route-aware loading placeholder — mirrors the shape of each screen. */
export function PageSkeleton({ pathname }: { pathname: string }) {
  if (pathname === "/dashboard" || pathname === "/") return <DashboardSkeleton />;
  if (pathname.startsWith("/trainer")) return <TrainerSkeleton />;
  if (pathname.startsWith("/body")) return <BodySkeleton />;
  if (pathname.startsWith("/progress")) return <ProgressSkeleton />;
  return <GenericSkeleton />;
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
