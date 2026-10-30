import { useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { TrainingTabs } from "../components/layout/TrainingTabs";
import { Reveal } from "../components/Reveal";
import { PillSelector } from "../components/primitives";
import { BarProgress } from "../components/health/ProgressIndicator";
import { BodyMuscles } from "../components/BodyMuscles";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Skel } from "../components/skeleton/Skeleton";
import { useMuscleMap, useSessionHistory, API_ENABLED, errorMessage } from "../api/hooks";
import { useFormaData } from "../lib/localStore";
import { apiSessionToCompleted } from "../lib/lifecycle";
import { useMuscleLookup } from "../lib/muscleLookup";
import {
  foldToBodyGroups,
  muscleBalance,
  muscleFatigue,
  muscleSets,
  sessionsPerGroup,
  sumToBodyGroups,
} from "../lib/fitness";

const VIEWS = ["Front", "Back"] as const;
const RANGE = ["Today", "Week", "Month"] as const;
const MODES = ["Activation", "Fatigue"] as const;

export default function Body() {
  const [range, setRange] = useState<(typeof RANGE)[number]>("Today");
  const [mode, setMode] = useState<(typeof MODES)[number]>("Activation");
  return (
    <div className="mx-auto max-w-[1120px]">
      <TrainingTabs className="mb-6" />
      <PageHeader eyebrow="body" title="muscle" ghost="map">
        <div className="flex flex-wrap gap-2">
          <PillSelector options={MODES} value={mode} onChange={setMode} />
          <PillSelector options={RANGE} value={range} onChange={setRange} />
        </div>
      </PageHeader>
      <BodyView range={range} mode={mode} />
    </div>
  );
}

const ACTIVATION_LEGEND: [string, string][] = [["rest", "#E5E7EB"], ["light", "#FCA5A5"], ["heavy", "#B91C1C"]];
const FATIGUE_LEGEND: [string, string][] = [["recovered", "#86EFAC"], ["moderate", "#FCA5A5"], ["fatigued", "#B91C1C"]];

function LegendRow({ mode }: { mode: (typeof MODES)[number] }) {
  const items = mode === "Activation" ? ACTIVATION_LEGEND : FATIGUE_LEGEND;
  return (
    <div className="mt-5 flex items-center gap-4 label-instrument">
      {items.map(([l, c]) => (
        <span key={l} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
          {l}
        </span>
      ))}
    </div>
  );
}

/** One line on the push / pull split, from the push share of hard sets (0–100). */
function pushPullNote(pushShare: number): string {
  if (pushShare >= 100) return "All of your upper-body sets in the last 4 weeks were push work.";
  if (pushShare <= 0) return "All of your upper-body sets in the last 4 weeks were pull work.";
  const ahead = (a: number, b: number) => Math.round((a / b - 1) * 100);
  if (pushShare >= 58) return `Push work is running ~${ahead(pushShare, 100 - pushShare)}% ahead of pull over the last 4 weeks.`;
  if (pushShare <= 42) return `Pull work is running ~${ahead(100 - pushShare, pushShare)}% ahead of push over the last 4 weeks.`;
  return "Push and pull are roughly even over the last 4 weeks.";
}

/** The muscle-map view without the page chrome. */
export function BodyView({ range = "Today", mode = "Activation" }: { range?: (typeof RANGE)[number]; mode?: (typeof MODES)[number] }) {
  const [view, setView] = useState<(typeof VIEWS)[number]>("Front");
  const [picked, setPicked] = useState<string | null>(null);
  const map = useMuscleMap(range.toLowerCase() as "today" | "week" | "month");
  const data = useFormaData();
  const apiHist = useSessionHistory();
  const sessions = useMemo(
    () => (API_ENABLED ? (apiHist.data ?? []).map((s) => apiSessionToCompleted(s, data.profile.units)) : data.sessions),
    [apiHist.data, data.sessions, data.profile.units],
  );
  const muscleOf = useMuscleLookup();
  const fatigue = mode === "Fatigue";

  // Activation: the server's muscle map in API builds, otherwise hard sets in
  // the range from local history. Fatigue: sets from the last 72 h decaying to
  // zero, on an absolute scale (see lib/fitness `muscleFatigue`).
  const activation = useMemo<Record<string, number>>(() => {
    if (fatigue) return muscleOf ? muscleFatigue(sessions, muscleOf) : {};
    if (API_ENABLED) return foldToBodyGroups(map.data?.muscles ?? []);
    if (!muscleOf) return {};
    const windowH = range === "Today" ? new Date().getHours() + new Date().getMinutes() / 60 : range === "Week" ? 168 : 720;
    return sumToBodyGroups(muscleSets(sessions, muscleOf, (h) => (h >= 0 && h <= windowH ? 1 : 0)));
  }, [fatigue, muscleOf, sessions, map.data, range]);

  const ranked = useMemo(() => {
    if (API_ENABLED && !fatigue) {
      return [...(map.data?.muscles ?? [])]
        .sort((a, b) => b.score - a.score)
        .map((m) => ({ name: m.name, pct: Math.round(m.score * 100) }));
    }
    const max = fatigue ? 1 : Math.max(0, ...Object.values(activation));
    return Object.entries(activation)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, v]) => ({ name, pct: max > 0 ? Math.round((v / max) * 100) : 0 }));
  }, [fatigue, map.data, activation]);
  const rankedLoading = API_ENABLED && !fatigue ? map.initialLoading : !muscleOf || (API_ENABLED && apiHist.initialLoading);
  const rankedError = API_ENABLED ? (fatigue ? apiHist.error : map.error) : null;

  // Balance + undertrained: last 4 weeks of hard sets, in every build.
  const month = useMemo(
    () => (muscleOf ? muscleSets(sessions, muscleOf, (h) => (h >= 0 && h <= 28 * 24 ? 1 : 0)) : {}),
    [muscleOf, sessions],
  );
  const balance = muscleBalance(month);
  const under = useMemo(() => (muscleOf ? sessionsPerGroup(sessions, muscleOf, 28).slice(0, 3) : []), [muscleOf, sessions]);
  const hasMonth = Object.keys(month).length > 0;

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
            normalize={!fatigue}
            onSelect={(_id, name) => setPicked(name)}
          />
          <LegendRow mode={mode} />
          <div className="mt-2 h-5 label-instrument" style={{ color: "var(--accent-cyan)" }}>
            {picked ?? ""}
          </div>
        </Reveal>

        <div className="space-y-10">
          <Reveal onView delay={0.06}>
            <div className="label-soft lowercase">
              {fatigue ? "fatigue · last 3 days" : `ranked · ${range.toLowerCase()}`}
            </div>
            {rankedLoading ? (
              <div className="mt-4 space-y-4">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skel key={i} className="h-5 rounded-md" />
                ))}
              </div>
            ) : rankedError && ranked.length === 0 ? (
              <ErrorState
                className="mt-4"
                message={errorMessage(rankedError)}
                onRetry={fatigue ? apiHist.refetch : map.refetch}
              />
            ) : ranked.length === 0 ? (
              <EmptyState
                className="mt-4"
                title={fatigue ? "fully recovered" : "nothing trained yet"}
                body={
                  fatigue
                    ? "no hard sets in the last 3 days, so every muscle reads as recovered."
                    : "finish a session and your worked muscles will rank here by load."
                }
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
                  </li>
                ))}
              </ul>
            )}
          </Reveal>

          <Reveal onView delay={0.1} className="grid gap-8 sm:grid-cols-2">
            <div>
              <div className="label-soft lowercase">balance · 4 weeks</div>
              {!hasMonth && (
                <p className="mt-4 text-[0.85rem] leading-relaxed text-content-secondary">
                  Log a few sessions and your push / pull and front / back split will show here.
                </p>
              )}
              <div className="mt-4 space-y-4">
                {([
                  ["push / pull", balance.pushPull],
                  ["anterior / posterior", balance.antPost],
                ] as [string, number | null][]).flatMap(([label, v]) => (v == null ? [] : [[label, v] as const])).map(([label, v]) => (
                  <div key={label}>
                    <div className="label-instrument mb-1.5">{label}</div>
                    <div className="surface-recessed relative h-2.5 rounded-pill">
                      <div
                        className="absolute inset-y-0 left-[40%] right-[40%] rounded-pill"
                        style={{ background: "rgba(131,233,244,0.14)" }}
                      />
                      <div
                        className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full surface-float"
                        // leans toward the dominant side's label (left = push / anterior)
                        style={{ left: `calc(${100 - v}% - 7px)` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {balance.pushPull != null && (
                <p className="mt-4 text-[0.85rem] leading-relaxed text-content-secondary">
                  {pushPullNote(balance.pushPull)}
                </p>
              )}
            </div>

            <div>
              <div className="label-soft lowercase">undertrained · 4 weeks</div>
              {hasMonth ? (
                <ul className="mt-4 space-y-2.5 text-[0.9rem]">
                  {under.map((m) => (
                    <li
                      key={m.group}
                      className="flex items-center justify-between surface-recessed rounded-pill px-4 py-2.5"
                    >
                      <span className="text-content-primary lowercase">{m.group}</span>
                      <span className="label-instrument" style={{ color: "var(--accent-orange)" }}>
                        {m.sessions}× / 4 wk
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-[0.85rem] leading-relaxed text-content-secondary">
                  Muscles you rarely train will be flagged here once you have some history.
                </p>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </>
  );
}
