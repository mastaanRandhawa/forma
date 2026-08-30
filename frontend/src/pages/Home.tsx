import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Reveal } from "../components/Reveal";
import { Skel } from "../components/skeleton/Skeleton";
import { Greeting } from "../components/dashboard/Greeting";
import { RingStat } from "../components/dashboard/RingStat";
import { SessionCard } from "../components/dashboard/SessionCard";
import { TrendChartCard } from "../components/dashboard/TrendChartCard";
import { ProgressStat } from "../components/dashboard/ProgressStat";
import { StreakWidget } from "../components/dashboard/StreakWidget";
import { InsightCard } from "../components/dashboard/InsightCard";
import { GoalsCard } from "../components/dashboard/GoalsCard";
import { KaiOrb, coachMood } from "../components/KaiOrb";
import { ActivityList } from "../components/dashboard/ActivityList";
import { DashboardProvider, DashboardLoadingProvider } from "../api/dashboard-context";
import { buildLocalDashboard, readinessFromCheckin } from "../api/localDashboard";
import { useFormaData, hasRecoveryData } from "../lib/localStore";
import { currentStreak, sessionVolume, volumeInLastDays } from "../lib/fitness";
import { apiSessionToCompleted } from "../lib/lifecycle";
import { Quiet } from "../components/Quiet";
import { useProgression } from "../api/settings";
import { API_ENABLED, useDashboard, useSessionHistory } from "../api/hooks";

const DAY_MS = 864e5;

/** Volume per weekday (Mon→Sun) for the week starting `weeksAgo` weeks back. */
function weekVolume(sessions: { finishedAt: string; volume: number }[], weeksAgo: number): number[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const monday = new Date(now);
  const dow = (now.getDay() + 6) % 7; // 0 = Monday
  monday.setDate(now.getDate() - dow - weeksAgo * 7);
  const out = new Array(7).fill(0);
  for (const s of sessions) {
    const idx = Math.floor((new Date(s.finishedAt).setHours(0, 0, 0, 0) - monday.getTime()) / DAY_MS);
    if (idx >= 0 && idx < 7) out[idx] += s.volume;
  }
  return out;
}

export default function Home() {
  const data = useFormaData();
  const prog = useProgression();
  const units = data.profile.units;

  const apiDash = useDashboard();
  const apiHist = useSessionHistory();
  const sessions = useMemo(
    () => (API_ENABLED ? (apiHist.data ?? []).map((s) => apiSessionToCompleted(s, units)) : data.sessions),
    [apiHist.data, data.sessions, units],
  );

  const localDash = useMemo(() => buildLocalDashboard({ ...data, sessions }), [data, sessions]);
  const dash = API_ENABLED && apiDash.data ? apiDash.data : localDash;
  const dashLoading = API_ENABLED && apiDash.initialLoading;

  const hasRecovery = API_ENABLED
    ? (apiDash.data?.readinessAvailable ?? "unavailable") !== "unavailable"
    : hasRecoveryData(data);
  const readiness = API_ENABLED ? (apiDash.data?.readiness ?? null) : readinessFromCheckin(data);
  const streak = API_ENABLED ? (apiDash.data?.streakDays ?? 0) : currentStreak(data.sessions);
  const last7Vol = volumeInLastDays(sessions, 7);
  const hasVolume = sessions.length > 0;

  const weekTrained = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dow = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dow);
    const days = new Set(sessions.map((s) => new Date(s.finishedAt).setHours(0, 0, 0, 0)));
    return Array.from({ length: 7 }, (_, i) => days.has(monday.getTime() + i * DAY_MS));
  }, [sessions]);

  const chartSeries = useMemo(
    () => [
      { label: "this week", color: "var(--accent-pink)", data: weekVolume(sessions, 0) },
      { label: "last week", color: "var(--accent-blue)", data: weekVolume(sessions, 1) },
    ],
    [sessions],
  );

  const rings = [
    hasRecovery
      ? { id: "readiness", label: "readiness", value: String(readiness), sub: "from your check-in", pct: readiness ?? 0, tone: "pink" as const, to: "/progress" }
      : { id: "readiness", label: "readiness", value: "—", sub: "log a check-in", pct: 0, tone: "pink" as const, to: "/settings" },
    hasVolume
      ? { id: "volume", label: "7-day volume", value: `${(last7Vol / 1000).toFixed(1)}k`, sub: units, pct: Math.min(100, Math.round(last7Vol / 300)), tone: "cyan" as const, to: "/progress" }
      : { id: "volume", label: "7-day volume", value: "—", sub: "no sessions yet", pct: 0, tone: "cyan" as const, to: "/workouts" },
    { id: "form", label: "avg form", value: "—", sub: "camera not set up", pct: 0, tone: "lime" as const, to: "/settings" },
  ];

  const weeklyGoal = { done: dash.weeklyRing.done, target: dash.weeklyRing.target };
  const avgSessionVol = sessions.length
    ? Math.round(sessions.slice(0, 8).reduce((n, s) => n + sessionVolume(s.exercises), 0) / Math.min(8, sessions.length))
    : 0;

  const insight = !hasRecovery
    ? { id: "recovery", tone: "cyan" as const, icon: "moon" as const, text: "No recovery data yet. Log a quick check-in and Forma can score your readiness before each session.", actions: ["Check in"] }
    : streak === 0 && sessions.length > 0
    ? { id: "streak", tone: "amber" as const, icon: "activity" as const, text: "Your streak has lapsed. A session today restarts it.", actions: ["Today's plan"] }
    : null;

  return (
    <DashboardProvider value={dash}>
     <DashboardLoadingProvider value={dashLoading}>
      <div className="mx-auto max-w-[1120px]">
        <Reveal>
          <Greeting />
        </Reveal>

        <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_336px]">
          <div className="space-y-4">
            <Reveal onView className="grid grid-cols-3 gap-2 sm:gap-3">
              {rings.map((s) => (
                <Quiet key={s.id} widgetKey={s.id}>
                  <RingStat label={s.label} value={s.value} sub={s.sub} pct={s.pct} tone={s.tone} to={s.to} />
                </Quiet>
              ))}
            </Reveal>

            <Reveal onView className="lg:hidden">
              <SessionCard />
            </Reveal>

            <Reveal onView delay={0.06}>
              <Quiet widgetKey="training-volume-chart">
                <TrendChartCard series={chartSeries} labels={["mon", "tue", "wed", "thu", "fri", "sat", "sun"]} unit={units} />
              </Quiet>
            </Reveal>

            <Reveal onView className="grid gap-3 sm:grid-cols-2">
              <Quiet widgetKey="weekly-goal">
                <ProgressStat
                  label="weekly goal"
                  value={`${weeklyGoal.done} / ${weeklyGoal.target}`}
                  delta={weeklyGoal.done >= weeklyGoal.target ? "met" : `${weeklyGoal.target - weeklyGoal.done} to go`}
                  pct={weeklyGoal.done / Math.max(1, weeklyGoal.target)}
                  tone="pink"
                />
              </Quiet>
              <Quiet widgetKey="avg-session">
                <ProgressStat
                  label="avg session volume"
                  value={avgSessionVol ? `${(avgSessionVol / 1000).toFixed(1)}k` : "—"}
                  delta={units}
                  pct={0}
                  tone="lime"
                />
              </Quiet>
            </Reveal>

            <Reveal onView>
              <Quiet widgetKey="workout-streak">
                <StreakWidget weekTrained={weekTrained} to="/progress" />
              </Quiet>
            </Reveal>

            {prog.has("insights") && insight && (
              <Reveal onView>
                <InsightCard insight={insight} />
              </Reveal>
            )}
          </div>

          <aside className="space-y-4">
            <Reveal onView className="hidden lg:block">
              <SessionCard />
            </Reveal>

            <Reveal onView delay={0.05}>
              <Quiet widgetKey="up-next">
                <ActivityList />
              </Quiet>
            </Reveal>

            <Reveal onView delay={0.1}>
              <Quiet widgetKey="kai-message">
                <Link to="/trainer" className="focus-ring group lift block ai-card p-4">
                  <div className="flex items-start gap-3">
                    <KaiOrb size={40} state={coachMood(dash)} gaze className="mt-0.5" />
                    <div className="min-w-0">
                      <div className="label-soft lowercase">kai · your trainer</div>
                      <p className="mt-1 line-clamp-3 text-[0.86rem] leading-relaxed text-content-secondary">
                        {dash.trainerMessage}
                      </p>
                    </div>
                  </div>
                </Link>
              </Quiet>
            </Reveal>

            {prog.has("goals") && (
              <Reveal onView delay={0.15}>
                <Quiet widgetKey="goals-card">
                  <GoalsCard />
                </Quiet>
              </Reveal>
            )}
          </aside>
        </div>
      </div>
     </DashboardLoadingProvider>
    </DashboardProvider>
  );
}
