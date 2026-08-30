import { useState } from "react";
import { Link } from "react-router-dom";
import { InfiniteDateStrip, todayISO } from "../components/health/InfiniteDateStrip";
import { Reveal } from "../components/Reveal";
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
import { insights, metricDetails, progressStats, ringStats, trainerMessage } from "../lib/data";

export default function Home() {
  const [day, setDay] = useState(todayISO());
  const [detail, setDetail] = useState<string | null>(null);
  const detailData = detail ? metricDetails[detail] : null;

  return (
    <div className="mx-auto max-w-[1120px]">
      <Reveal>
        <Greeting />
      </Reveal>
      <Reveal delay={0.06}>
        <InfiniteDateStrip value={day} onChange={setDay} />
      </Reveal>

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_336px]">
        {/* ---------------- MAIN ---------------- */}
        <div className="space-y-4">
          {/* top row — ring stats (compact squares on mobile) */}
          <Reveal onView className="grid grid-cols-3 gap-2 sm:gap-3">
            {ringStats.map((s) => (
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
            <SessionCard />
          </Reveal>

          {/* main chart */}
          <Reveal onView delay={0.06}>
            <TrendChartCard />
          </Reveal>

          {/* bottom row — progress stats */}
          <Reveal onView className="grid gap-3 sm:grid-cols-2">
            {progressStats.map((s) => (
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

          <Reveal onView className="space-y-3">
            {insights.slice(0, 1).map((i) => (
              <InsightCard key={i.id} insight={i} />
            ))}
          </Reveal>
        </div>

        {/* ---------------- SIDEBAR ---------------- */}
        <aside className="space-y-4">
          {/* today's session — featured card with the body map (desktop sidebar) */}
          <Reveal onView className="hidden lg:block">
            <SessionCard />
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
                    {trainerMessage}
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

      <DetailDrawer
        open={!!detail}
        onClose={() => setDetail(null)}
        eyebrow={detailData?.eyebrow ?? ""}
        title={detailData?.title ?? ""}
      >
        {detail && <MetricDetailBody id={detail} onClose={() => setDetail(null)} />}
      </DetailDrawer>
    </div>
  );
}
