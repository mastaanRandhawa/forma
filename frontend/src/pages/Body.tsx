import { useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Reveal } from "../components/Reveal";
import { PillSelector } from "../components/primitives";
import { BarProgress } from "../components/health/ProgressIndicator";
import { MiniTrend } from "../components/health/MiniTrend";
import { BodyMuscles } from "../components/BodyMuscles";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Skel } from "../components/skeleton/Skeleton";
import { muscleActivation, rankedMuscles } from "../lib/data";
import { useMuscleMap, API_ENABLED, errorMessage } from "../api/hooks";

const VIEWS = ["Front", "Back"] as const;
const RANGE = ["Today", "Week", "Month"] as const;

export default function Body() {
  const [range, setRange] = useState<(typeof RANGE)[number]>("Today");
  return (
    <div className="mx-auto max-w-[1120px]">
      <PageHeader eyebrow="body" title="muscle" ghost="map">
        <PillSelector options={RANGE} value={range} onChange={setRange} />
      </PageHeader>
      <BodyView range={range} />
    </div>
  );
}

/** The muscle-map view without the page chrome, reused inside Workouts. */
export function BodyView({ range = "Today" }: { range?: (typeof RANGE)[number] }) {
  const [view, setView] = useState<(typeof VIEWS)[number]>("Front");
  const [picked, setPicked] = useState<string | null>(null);
  const map = useMuscleMap(range.toLowerCase() as "today" | "week" | "month");

  // Drive the muscle heatmap from the workouts completed in the selected range.
  // Falls back to the static sample when no muscle-map data is available yet.
  const activation = useMemo(() => {
    const rows = map.data?.muscles ?? [];
    if (rows.length === 0) return muscleActivation;
    const out: Record<string, number> = {};
    for (const m of rows) out[m.key] = m.score;
    return out;
  }, [map.data]);

  const ranked = API_ENABLED
    ? [...(map.data?.muscles ?? [])]
        .sort((a, b) => b.score - a.score)
        .map((m) => ({ name: m.name, pct: Math.round(m.score * 100), trend: [] as number[] }))
    : rankedMuscles;

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* translucent anatomical chamber */}
        <Reveal as="section" className="surface-soft relative isolate flex flex-col items-center overflow-hidden p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[420px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(131,233,244,0.18), transparent 68%)",
              filter: "blur(40px)",
            }}
          />
          <div className="mb-5">
            <PillSelector options={VIEWS} value={view} onChange={setView} />
          </div>
          <BodyMuscles
            activation={activation}
            view={view.toLowerCase() as "front" | "back"}
            className="w-full max-w-[280px] [&_svg]:h-auto [&_svg]:w-full"
            onSelect={(_id, name) => setPicked(name)}
          />
          <div className="mt-5 flex items-center gap-4 label-instrument">
            {[
              ["rest", "#E5E7EB"],
              ["light", "#FCA5A5"],
              ["heavy", "#B91C1C"],
            ].map(([l, c]) => (
              <span key={l} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
                {l}
              </span>
            ))}
          </div>
          <div className="mt-2 h-5 label-instrument" style={{ color: "var(--accent-cyan)" }}>
            {picked ?? ""}
          </div>
        </Reveal>

        <div className="space-y-10">
          <Reveal onView delay={0.06}>
            <div className="label-soft lowercase">ranked · {range.toLowerCase()}</div>
            {map.initialLoading ? (
              <div className="mt-4 space-y-4">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skel key={i} className="h-5 rounded-md" />
                ))}
              </div>
            ) : map.error && ranked.length === 0 ? (
              <ErrorState className="mt-4" message={errorMessage(map.error)} onRetry={map.refetch} />
            ) : ranked.length === 0 ? (
              <EmptyState
                className="mt-4"
                title="nothing trained yet"
                body="finish a session and your worked muscles will rank here by load."
                action={{ label: "start training", to: "/workouts" }}
              />
            ) : (
              <ul className="mt-4 space-y-4">
                {ranked.map((m) => (
                  <li key={m.name} className="flex items-center gap-4">
                    <span className="w-28 text-[0.9rem] text-content-primary lowercase">{m.name}</span>
                    <BarProgress
                      fraction={m.pct / 100}
                      color="var(--accent-mauve)"
                      height={8}
                      className="flex-1"
                      ariaLabel={`${m.name} ${m.pct} percent`}
                    />
                    <span className="w-10 text-right label-instrument tabular-nums">{m.pct}%</span>
                    {m.trend.length > 0 && (
                      <MiniTrend data={m.trend} mode="dots" color="var(--accent-cyan)" width={60} height={20} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Reveal>

          <Reveal onView delay={0.1} className="grid gap-8 sm:grid-cols-2">
            <div>
              <div className="label-soft lowercase">balance</div>
              <div className="mt-4 space-y-4">
                {([
                  ["push / pull", 62],
                  ["left / right", 51],
                  ["anterior / posterior", 58],
                ] as [string, number][]).map(([label, v]) => (
                  <div key={label}>
                    <div className="label-instrument mb-1.5">{label}</div>
                    <div className="surface-recessed relative h-2.5 rounded-pill">
                      <div
                        className="absolute inset-y-0 left-[40%] right-[40%] rounded-pill"
                        style={{ background: "rgba(131,233,244,0.14)" }}
                      />
                      <div
                        className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full surface-float"
                        style={{ left: `calc(${v}% - 7px)` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[0.85rem] leading-relaxed text-content-secondary">
                Push volume is running ~60% ahead of pull this month. Next week prioritizes
                back work.
              </p>
            </div>

            <div>
              <div className="label-soft lowercase">undertrained</div>
              <ul className="mt-4 space-y-2.5 text-[0.9rem]">
                {["Hamstrings", "Calves", "Rear Delts"].map((m) => (
                  <li
                    key={m}
                    className="flex items-center justify-between surface-recessed rounded-pill px-4 py-2.5"
                  >
                    <span className="text-content-primary lowercase">{m}</span>
                    <span className="label-instrument" style={{ color: "var(--accent-orange)" }}>
                      2× / month
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </>
  );
}
