import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { InfiniteDateStrip, todayISO } from "../components/health/InfiniteDateStrip";
import { BodyMuscles } from "../components/BodyMuscles";
import { Reveal } from "../components/Reveal";
import { Greeting } from "../components/dashboard/Greeting";
import { RingStat } from "../components/dashboard/RingStat";
import { TrendChartCard } from "../components/dashboard/TrendChartCard";
import { ProgressStat } from "../components/dashboard/ProgressStat";
import { StreakWidget } from "../components/dashboard/StreakWidget";
import { InsightCard } from "../components/dashboard/InsightCard";
import { GoalsCard } from "../components/dashboard/GoalsCard";
import { KaiOrb } from "../components/KaiOrb";
import { ActivityList } from "../components/dashboard/ActivityList";
import { DetailDrawer } from "../components/dashboard/DetailDrawer";
import { MetricDetailBody } from "../components/dashboard/MetricDetailBody";
import {
  insights,
  metricDetails,
  muscleActivation,
  progressStats,
  ringStats,
  todayWorkout,
  trainerMessage,
} from "../lib/data";

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
          {/* top row — ring stats */}
          <Reveal onView className="grid gap-3 sm:grid-cols-3">
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
          {/* today's session — featured card with the body map */}
          <Reveal onView>
            <Link
              to="/workouts/active"
              className="metric-card metric-card--link group focus-ring relative flex min-h-[320px] flex-col overflow-hidden"
              data-tone="pink"
              data-variant="vivid"
            >
              {/* full-bleed body map — zoomed onto today's worked chest / shoulders */}
              <div className="pointer-events-none absolute inset-0 z-0 grid place-items-center overflow-hidden">
                <BodyMuscles
                  activation={muscleActivation}
                  className="[&_svg]:!max-w-none [&_svg]:origin-[50%_18%] [&_svg]:scale-[2.15]"
                />
              </div>
              {/* legibility scrim */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[1]"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(36,10,30,0.6) 0%, rgba(36,10,30,0.12) 34%, rgba(36,10,30,0.12) 62%, rgba(36,10,30,0.72) 100%)",
                }}
              />

              <div className="relative z-10 flex items-start justify-between">
                <span className="metric-card__label !text-white">today's session</span>
                <span className="metric-card__action !h-8 !w-8 !bg-white/20 !text-white transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <ArrowUpRight size={16} strokeWidth={2.25} />
                </span>
              </div>
              <div className="relative z-10 mt-3">
                <div className="text-[1.4rem] font-light lowercase leading-tight text-white [text-shadow:0_2px_12px_rgba(20,4,14,0.5)]">
                  {todayWorkout.name}
                </div>
                <div className="num mt-1 text-[0.78rem] text-white/85">
                  45 min · {todayWorkout.exercises} exercises
                </div>
              </div>
              <div className="relative z-10 mt-auto pt-5">
                <div className="label-instrument !text-white/70">trained today</div>
                <div className="mt-1 text-[0.85rem] lowercase text-white">chest, shoulders · 95%</div>
              </div>
            </Link>
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
