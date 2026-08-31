import { useMemo, useRef, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { TrainingTabs } from "../components/layout/TrainingTabs";
import { Reveal } from "../components/Reveal";
import { EmptyState } from "../components/EmptyState";
import { PillSelector } from "../components/primitives";
import { MetricCard } from "../components/health/MetricCard";
import { MiniTrend } from "../components/health/MiniTrend";
import { CountUp } from "../components/health/CountUp";
import { useFormaData } from "../lib/localStore";
import { readinessFromCheckin } from "../api/localDashboard";
import { DailyCheckinDrawer } from "../components/health/DailyCheckin";
import { apiSessionToCompleted } from "../lib/lifecycle";
import { API_ENABLED, useSessionHistory } from "../api/hooks";
import { NutritionCard } from "../components/NutritionCard";
import {
  adherence,
  allTimePRs,
  avgWeeklyVolume,
  consistencyDays,
  longestStreak,
  loggedExerciseNames,
  strengthSeriesFor,
  weeklyVolumeSeries,
  workoutsThisMonth,
} from "../lib/fitness";

const RANGE = ["1M", "3M", "6M", "1Y"] as const;
const RANGE_DAYS: Record<(typeof RANGE)[number], number> = { "1M": 30, "3M": 91, "6M": 182, "1Y": 365 };

function TrendCurve({ data, unit = "lb" }: { data: number[]; unit?: string }) {
  const color = "var(--accent-pink)";
  const w = 560;
  const h = 220;
  const pad = 16;
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (data.length - 1 || 1)) * (w - pad * 2);
  const y = (d: number) => h - pad - ((d - min) / span) * (h - pad * 2);
  const line = data.map((d, i) => `${x(i)},${y(d)}`).join(" ");

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * w;
    const i = Math.round(((px - pad) / (w - pad * 2)) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  const hi = hover == null ? data.length - 1 : hover;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${w} ${h}`}
      className="w-full touch-none"
      role="img"
      aria-label={`Estimated 1RM trend, latest ${data[data.length - 1]} ${unit}`}
      onPointerMove={onMove}
      onPointerLeave={() => setHover(null)}
    >
      <defs>
        <linearGradient id="pg-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.20" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={pad} x2={w - pad} y1={h - pad} y2={h - pad} stroke="var(--line-soft)" strokeWidth="1" />
      <polygon className="area-in" points={`${x(0)},${h - pad} ${line} ${x(data.length - 1)},${h - pad}`} fill="url(#pg-fill)" />
      <polyline
        className="line-draw"
        pathLength={1}
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
      {hover != null && (
        <line x1={x(hi)} x2={x(hi)} y1={pad} y2={h - pad} stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      )}
      <circle cx={x(hi)} cy={y(data[hi])} r="4.5" fill={color} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      {hover != null && (
        <g transform={`translate(${Math.min(Math.max(x(hi), 34), w - 34)}, ${Math.max(y(data[hi]) - 16, 14)})`}>
          <rect x="-30" y="-15" width="60" height="22" rx="7" fill="rgba(24,13,20,0.96)" stroke="rgba(255,255,255,0.1)" />
          <text x="0" y="0" textAnchor="middle" fontFamily="'Space Grotesk', monospace" fontSize="12" fill="#fff">
            {data[hi]} {unit}
          </text>
        </g>
      )}
    </svg>
  );
}

function RecoverySection() {
  const data = useFormaData();
  const [open, setOpen] = useState(false);
  const checkins = useMemo(
    () => [...data.checkins].sort((a, b) => a.date.localeCompare(b.date)),
    [data.checkins],
  );
  const last = checkins[checkins.length - 1] ?? null;
  const today = new Date().toISOString().slice(0, 10);
  const series = checkins
    .slice(-14)
    .map((c) => readinessFromCheckin({ ...data, checkins: [c] }) ?? 0);
  const readiness = last ? readinessFromCheckin(data) : null;

  return (
    <Reveal onView className="mt-12">
      <div className="flex items-center justify-between">
        <div className="label-soft lowercase">recovery</div>
        <button
          onClick={() => setOpen(true)}
          className="focus-ring tactile rounded-pill bg-white/[0.06] px-3.5 py-1.5 text-[0.78rem] lowercase text-content-primary transition-colors hover:bg-white/[0.12]"
        >
          {last?.date === today ? "update check-in" : "daily check-in"}
        </button>
      </div>
      {last ? (
        <div className="mt-4 grid gap-6 sm:grid-cols-[190px_minmax(0,1fr)] sm:items-center">
          <div>
            <div className="metric-numeral text-content-primary" style={{ fontSize: "2.6rem" }}>
              {readiness}
            </div>
            <div className="label-instrument mt-1">readiness · {last.date}</div>
            <div className="mt-2 text-[0.82rem] text-content-tertiary">
              {last.sleepH}h sleep · quality {last.sleepQuality}/5 · fatigue {last.fatigue}/5 ·
              soreness {last.soreness}/5
            </div>
          </div>
          {series.length >= 2 && (
            <MiniTrend data={series} mode="curve" color="var(--accent-pink)" fill height={72} />
          )}
        </div>
      ) : (
        <p className="mt-3 max-w-[52ch] text-[0.86rem] leading-relaxed text-content-secondary">
          no check-ins yet. log how you're sleeping and recovering and forma scores your readiness
          before each session.
        </p>
      )}
      <DailyCheckinDrawer open={open} onClose={() => setOpen(false)} />
    </Reveal>
  );
}

export default function Progress() {
  const [range, setRange] = useState<(typeof RANGE)[number]>("3M");
  const data = useFormaData();
  const profile = data.profile;
  const apiHist = useSessionHistory();
  const sessions = useMemo(
    () => (API_ENABLED ? (apiHist.data ?? []).map((s) => apiSessionToCompleted(s, profile.units)) : data.sessions),
    [apiHist.data, data.sessions, profile.units],
  );
  const windowDays = RANGE_DAYS[range];

  const inRange = useMemo(
    () => sessions.filter((s) => Date.parse(s.finishedAt) >= Date.now() - windowDays * 864e5),
    [sessions, windowDays],
  );

  const liftNames = useMemo(() => loggedExerciseNames(sessions), [sessions]);
  const [lift, setLift] = useState<string | null>(null);
  const activeLift = lift ?? liftNames[0] ?? null;
  const liftSeries = useMemo(
    () => (activeLift ? strengthSeriesFor(inRange, activeLift) : []),
    [inRange, activeLift],
  );

  const consistency = useMemo(() => consistencyDays(sessions, 91), [sessions]);
  const prs = useMemo(() => allTimePRs(sessions).slice(0, 6), [sessions]);
  const weeklyVol = useMemo(() => weeklyVolumeSeries(sessions, 8), [sessions]);
  const adh = useMemo(
    () => (profile.daysPerWeek ? adherence(sessions, profile.daysPerWeek, 13) : null),
    [sessions, profile.daysPerWeek],
  );
  const trainedDays91 = consistency.filter((c) => c > 0).length;

  const hasData = sessions.length > 0;

  if (!hasData) {
    return (
      <div className="mx-auto max-w-[1120px]">
        <TrainingTabs className="mb-6" />
        <PageHeader eyebrow="progress" title="your" ghost="trends" />
        <Reveal className="mt-6">
          <EmptyState
            title="nothing to chart yet"
            body="finish a few workouts and this fills in — estimated 1RM, volume, streaks, PRs and consistency, all from your logged sets."
            action={{ label: "start a workout", to: "/workouts" }}
          />
        </Reveal>
        <RecoverySection />
        {API_ENABLED && (
          <Reveal className="mt-10">
            <NutritionCard />
          </Reveal>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1120px]">
      <TrainingTabs className="mb-6" />
      <PageHeader eyebrow="progress" title="your" ghost="trends">
        <PillSelector options={RANGE} value={range} onChange={setRange} />
      </PageHeader>

      <Reveal as="p" className="max-w-[62ch] text-[1rem] leading-relaxed text-content-secondary">
        <span className="label-instrument mr-2" style={{ color: "var(--accent-cyan)" }}>
          summary
        </span>
        {sessions.length} session{sessions.length > 1 ? "s" : ""} logged, {trainedDays91} active days in the
        last 13 weeks{adh != null ? `, ${Math.round(adh * 100)}% of your ${profile.daysPerWeek}-day target` : ""}.
      </Reveal>

      <RecoverySection />

      {/* strength */}
      <Reveal onView delay={0.05} className="mt-12">
        <div className="label-soft lowercase">estimated 1rm · Epley</div>
        {liftNames.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="no lifts tracked yet"
            body="log weight and reps on a working set and its strength curve appears here."
          />
        ) : (
          <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
            <div>
              <div className="flex flex-wrap gap-1.5">
                {liftNames.slice(0, 6).map((n) => (
                  <button
                    key={n}
                    onClick={() => setLift(n)}
                    className={`focus-ring tactile rounded-pill px-3.5 py-1.5 text-[0.76rem] lowercase tracking-[0.03em] ${
                      activeLift === n
                        ? "surface-float text-content-primary"
                        : "text-content-tertiary hover:text-content-secondary"
                    }`}
                  >
                    {n.split(" ").slice(-2).join(" ")}
                  </button>
                ))}
              </div>
              <div className="mt-6">
                {liftSeries.length >= 2 ? (
                  <TrendCurve key={`${activeLift}-${range}`} data={liftSeries.map((p) => p.e1rm)} unit={profile.units} />
                ) : (
                  <p className="label-instrument py-10">
                    need at least two sessions with {activeLift?.toLowerCase()} in this range
                  </p>
                )}
              </div>
              <div className="label-instrument mt-2">{activeLift?.toLowerCase()} · estimated 1rm</div>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="local-glow" style={{ width: 240, height: 240 }} />
              <CountUp
                value={liftSeries.length ? liftSeries[liftSeries.length - 1].e1rm : 0}
                className="metric-numeral text-content-primary"
                style={{ fontSize: "3.6rem" }}
              />
              <div className="label-instrument mt-1">{profile.units} estimated 1rm</div>
              {liftSeries.length >= 2 && (
                <div className="mt-3 text-[0.82rem] tabular-nums" style={{ color: "var(--accent-lime)" }}>
                  {liftSeries[liftSeries.length - 1].e1rm - liftSeries[0].e1rm >= 0 ? "+" : ""}
                  {liftSeries[liftSeries.length - 1].e1rm - liftSeries[0].e1rm} {profile.units} over {range}
                </div>
              )}
            </div>
          </div>
        )}
      </Reveal>

      {/* training counts */}
      <Reveal onView className="mt-14 grid gap-4 sm:grid-cols-3">
        <MetricCard
          tone="amber"
          label="workouts / month"
          value={String(workoutsThisMonth(sessions))}
          unit="sessions"
          className="min-h-[168px]"
          viz={<MiniTrend data={weeklyVol.map((v) => v || 0.01)} mode="pulses" color="var(--accent-amber)" fill height={54} />}
        />
        <MetricCard
          tone="cyan"
          label="avg weekly volume"
          value={(avgWeeklyVolume(sessions) / 1000).toFixed(1)}
          unit={`k ${profile.units}`}
          revealDelay={0.08}
          className="min-h-[168px]"
          viz={<MiniTrend data={weeklyVol.map((v) => v || 0.01)} mode="curve" color="var(--accent-cyan)" fill height={54} />}
        />
        <MetricCard
          tone="mauve"
          label="longest streak"
          value={String(longestStreak(sessions))}
          unit="days"
          revealDelay={0.16}
          className="min-h-[168px]"
        />
      </Reveal>

      {/* consistency + PRs */}
      <Reveal onView className="mt-14 grid gap-10 sm:grid-cols-2">
        <div>
          <div className="label-soft lowercase">consistency · last 13 weeks</div>
          <div className="mt-4 grid grid-cols-[repeat(13,1fr)] grid-flow-col gap-1.5" style={{ gridTemplateRows: "repeat(7, 1fr)" }}>
            {consistency.map((count, i) => (
              <div
                key={i}
                title={count ? `${count} session${count > 1 ? "s" : ""}` : "rest"}
                className="aspect-square rounded-[4px]"
                style={{
                  background:
                    count >= 2
                      ? "var(--accent-pink)"
                      : count === 1
                      ? "rgba(213,26,122,0.55)"
                      : "rgba(255,241,248,0.06)",
                }}
              />
            ))}
          </div>
          <div className="label-instrument mt-3">
            {adh != null ? `${Math.round(adh * 100)}% adherence` : `${trainedDays91} active days`}
          </div>
        </div>

        <div>
          <div className="label-soft lowercase">personal records</div>
          {prs.length === 0 ? (
            <EmptyState
              className="mt-4"
              title="no prs yet"
              body="beat a previous best on any lift and it lands here automatically."
              action={{ label: "start a workout", to: "/workouts" }}
            />
          ) : (
            <ul className="mt-4 divide-y divide-[var(--line-soft)]">
              {prs.map((pr) => (
                <li key={pr.exercise} className="flex items-center justify-between py-3 first:pt-0">
                  <div>
                    <div className="text-[0.92rem] text-content-primary lowercase">{pr.exercise}</div>
                    <div className="label-instrument mt-0.5">
                      {pr.detail} · e1rm {pr.e1rm} {profile.units}
                    </div>
                  </div>
                  <span className="label-instrument">{pr.date}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Reveal>

      {API_ENABLED && (
        <Reveal onView className="mt-14">
          <NutritionCard />
        </Reveal>
      )}
    </div>
  );
}
