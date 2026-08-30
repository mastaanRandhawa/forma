import { useState } from "react";
import { Link } from "react-router-dom";
import { InfiniteDateStrip, todayISO } from "../components/health/InfiniteDateStrip";
import { Reveal } from "../components/Reveal";
import { ErrorState } from "../components/ErrorState";
import { Skel } from "../components/skeleton/Skeleton";
import { Greeting } from "../components/dashboard/Greeting";
import { RingStat } from "../components/dashboard/RingStat";
import { SessionCard } from "../components/dashboard/SessionCard";
import { TrendChartCard } from "../components/dashboard/TrendChartCard";
import { ProgressStat } from "../components/dashboard/ProgressStat";
import { StreakWidget } from "../components/dashboard/StreakWidget";
import { InsightCard } from "../components/dashboard/InsightCard";
import { GoalsCard } from "../components/dashboard/GoalsCard";
import { KaiOrb } from "../components/KaiOrb";
import { ActivityList } from "../components/dashboard/ActivityList";
import { DetailDrawer } from "../components/dashboard/DetailDrawer";
import { MetricDetailBody } from "../components/dashboard/MetricDetailBody";
import { insights as mockInsights, metricDetails, progressStats, ringStats, trainerMessage } from "../lib/data";
import { DashboardProvider } from "../api/dashboard-context";
import { useDashboard, errorMessage } from "../api/hooks";
import { insightToCard, volumeK } from "../api/adapt";

export default function Home() {
  const [day, setDay] = useState(todayISO());
  const [detail, setDetail] = useState<string | null>(null);
  const detailData = detail ? metricDetails[detail] : null;

  const { data: dash, error, initialLoading, refetch } = useDashboard();

  // live values where the aggregate carries them; the rest stay on the mock shape
  const rings = dash
    ? [
        { ...ringStats[0], value: String(dash.readiness), pct: dash.readiness },
        { ...ringStats[1], value: volumeK(dash.weeklyVolumeKg) },
        ringStats[2],
      ]
    : ringStats;
  const pstats = dash
    ? [
        {
          ...progressStats[0],
          value: `${dash.weeklyRing.done} / ${dash.weeklyRing.target}`,
          pct: dash.weeklyRing.done / Math.max(1, dash.weeklyRing.target),
        },
        progressStats[1],
      ]
    : progressStats;
  const insightItems = dash
    ? dash.insights.map(insightToCard).slice(0, 1)
    : mockInsights.slice(0, 1);
  const kaiMessage = dash?.trainerMessage ?? trainerMessage;

  return (
    <DashboardProvider value={dash}>
      <div className="mx-auto max-w-[1120px]">
        <Reveal>
          <Greeting />
        </Reveal>
        <Reveal delay={0.06}>
          <InfiniteDateStrip value={day} onChange={setDay} />
        </Reveal>

        {error && !dash ? (
          <Reveal className="mt-8">
            <ErrorState message={errorMessage(error)} onRetry={refetch} />
          </Reveal>
        ) : (
          <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_336px]">
            {/* ---------------- MAIN ---------------- */}
            <div className="space-y-4">
              {/* top row — ring stats (compact squares on mobile) */}
              <Reveal onView className="grid grid-cols-3 gap-2 sm:gap-3">
                {initialLoading
                  ? [0, 1, 2].map((i) => <Skel key={i} className="aspect-square rounded-[var(--radius-medium)] sm:aspect-auto sm:h-[104px]" />)
                  : rings.map((s) => (
                      <RingStat
                        key={s.id}
                        label={s.label}
                        value={s.value}
                        sub={s.sub}
                        pct={s.pct}
                        tone={s.tone}
                        onSelect={metricDetails[s.id] ? () => setDetail(s.id) : undefined}
                        to={metricDetails[s.id] ? undefined : "/progress"}
                      />
                    ))}
              </Reveal>

              {/* today's session — sits here on mobile, in the sidebar on desktop */}
              <Reveal onView className="lg:hidden">
                {initialLoading ? <Skel className="h-[220px] rounded-[var(--radius-large)]" /> : <SessionCard />}
              </Reveal>

              {/* main chart */}
              <Reveal onView delay={0.06}>
                <TrendChartCard />
              </Reveal>

              {/* bottom row — progress stats */}
              <Reveal onView className="grid gap-3 sm:grid-cols-2">
                {initialLoading
                  ? [0, 1].map((i) => <Skel key={i} className="h-[120px] rounded-[var(--radius-large)]" />)
                  : pstats.map((s) => (
                      <ProgressStat
                        key={s.id}
                        label={s.label}
                        value={s.value}
                        delta={s.delta}
                        pct={s.pct}
                        tone={s.tone}
                        onSelect={metricDetails[s.id] ? () => setDetail(s.id) : undefined}
                      />
                    ))}
              </Reveal>

              <Reveal onView>
                <StreakWidget onSelect={() => setDetail("streak")} />
              </Reveal>

              {insightItems.length > 0 && (
                <Reveal onView className="space-y-3">
                  {insightItems.map((i) => (
                    <InsightCard key={i.id} insight={i} />
                  ))}
                </Reveal>
              )}
            </div>

            {/* ---------------- SIDEBAR ---------------- */}
            <aside className="space-y-4">
              {/* today's session — featured card with the body map (desktop sidebar) */}
              <Reveal onView className="hidden lg:block">
                {initialLoading ? <Skel className="h-[320px] rounded-[var(--radius-large)]" /> : <SessionCard />}
              </Reveal>

              <Reveal onView delay={0.05}>
                <ActivityList />
              </Reveal>

              <Reveal onView delay={0.1}>
                <Link
                  to="/trainer"
                  className="focus-ring group block ai-card p-4 transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex items-start gap-3">
                    <KaiOrb size={40} state="idle" gaze className="mt-0.5" />
                    <div className="min-w-0">
                      <div className="label-soft lowercase">kai · your trainer</div>
                      <p className="mt-1 line-clamp-3 text-[0.86rem] leading-relaxed text-content-secondary">
                        {kaiMessage}
                      </p>
                    </div>
                  </div>
                </Link>
              </Reveal>

              <Reveal onView delay={0.15}>
                <GoalsCard />
              </Reveal>
            </aside>
          </div>
        )}

        <DetailDrawer
          open={!!detail}
          onClose={() => setDetail(null)}
          eyebrow={detailData?.eyebrow ?? ""}
          title={detailData?.title ?? ""}
        >
          {detail && <MetricDetailBody id={detail} onClose={() => setDetail(null)} />}
        </DetailDrawer>
      </div>
    </DashboardProvider>
  );
}
