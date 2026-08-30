import { useMemo, useRef, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Reveal } from "../components/Reveal";
import { PillSelector } from "../components/primitives";
import { MetricCard } from "../components/health/MetricCard";
import { MiniTrend } from "../components/health/MiniTrend";
import { CountUp } from "../components/health/CountUp";
import { AchievementStrip } from "../components/dashboard/AchievementStrip";
import { useFakeLoad } from "../lib/motion";
import { progressSummary, strengthSeries } from "../lib/data";

const RANGE = ["1M", "3M", "6M", "1Y"] as const;

/** Interactive strength curve — glowing line, hover crosshair + value readout,
 *  redraws itself when the lift or range changes. */
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
  const x = (i: number) => pad + (i / (data.length - 1)) * (w - pad * 2);
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
      {/* crosshair + readout */}
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

export default function Progress() {
  const [range, setRange] = useState<(typeof RANGE)[number]>("3M");
  const loading = useFakeLoad("progress-cards", 700);
  const [lift, setLift] = useState(strengthSeries[0]);

  const grid = useMemo(
    () => Array.from({ length: 91 }).map(() => Math.random()),
    []
  );

  return (
    <div className="mx-auto max-w-[1120px]">
      <PageHeader eyebrow="progress" title="your" ghost="trends">
        <PillSelector options={RANGE} value={range} onChange={setRange} />
      </PageHeader>

      {/* summary — a sentence, not a dashboard */}
      <Reveal as="p" className="max-w-[62ch] text-[1rem] leading-relaxed text-content-secondary">
        <span className="label-instrument mr-2" style={{ color: "var(--accent-cyan)" }}>
          8-week summary
        </span>
        {progressSummary}
      </Reveal>

      {/* primary strength number as a graphic object */}
      <Reveal onView delay={0.05} className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
        <div>
          <div className="flex flex-wrap gap-1.5">
            {strengthSeries.map((s) => (
              <button
                key={s.label}
                onClick={() => setLift(s)}
                className={`focus-ring tactile rounded-pill px-3.5 py-1.5 text-[0.76rem] lowercase tracking-[0.03em] ${
                  lift.label === s.label
                    ? "surface-float text-content-primary"
                    : "text-content-tertiary hover:text-content-secondary"
                }`}
              >
                {s.label.split(" ")[0]}
              </button>
            ))}
          </div>
          <div className="mt-6">
            <TrendCurve key={`${lift.label}-${range}`} data={lift.data} />
          </div>
          <div className="label-instrument mt-2">{lift.label.toLowerCase()} · estimated 1rm</div>
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="local-glow" style={{ width: 240, height: 240 }} />
          <CountUp
            value={lift.e1rm}
            className="metric-numeral text-content-primary"
            style={{ fontSize: "3.6rem" }}
          />
          <div className="label-instrument mt-1">lb estimated 1rm</div>
          <div className="mt-3 text-[0.82rem] tabular-nums" style={{ color: "var(--accent-lime)" }}>
            +{lift.data[lift.data.length - 1] - lift.data[0]} lb over {range}
          </div>
        </div>
      </Reveal>

      <Reveal onView className="mt-14 block">
        <div className="label-soft lowercase">achievements</div>
        <div className="mt-4">
          <AchievementStrip />
        </div>
      </Reveal>

      <Reveal onView className="mt-14 grid gap-4 sm:grid-cols-3">
        <MetricCard
          tone="amber"
          label="workouts / month"
          value="18"
          unit="sessions"
          loading={loading}
          className="min-h-[168px]"
          viz={<MiniTrend data={[0.6, 0.7, 0.65, 0.8, 0.9, 1]} mode="pulses" color="var(--accent-amber)" fill height={54} />}
        />
        <MetricCard
          tone="cyan"
          label="avg weekly volume"
          value="46.8"
          unit="k lb"
          loading={loading}
          revealDelay={0.08}
          className="min-h-[168px]"
          viz={<MiniTrend data={[0.4, 0.5, 0.6, 0.7, 0.85, 1]} mode="curve" color="var(--accent-cyan)" fill height={54} />}
        />
        <MetricCard tone="mauve" label="longest streak" value="21" unit="days" loading={loading} revealDelay={0.16} className="min-h-[168px]" />
      </Reveal>

      <Reveal onView className="mt-14 grid gap-10 sm:grid-cols-2">
        <div>
          <div className="label-soft lowercase">consistency · last 13 weeks</div>
          <div className="mt-4 grid grid-cols-[repeat(13,1fr)] gap-1.5">
            {grid.map((v, i) => (
              <div
                key={i}
                className="aspect-square rounded-[4px]"
                style={{
                  background:
                    v > 0.72
                      ? "var(--accent-pink)"
                      : v > 0.5
                      ? "rgba(213,26,122,0.5)"
                      : v > 0.35
                      ? "rgba(122,23,79,0.4)"
                      : "rgba(255,241,248,0.06)",
                }}
              />
            ))}
          </div>
          <div className="label-instrument mt-3">82% adherence</div>
        </div>

        <div>
          <div className="label-soft lowercase">personal records</div>
          <ul className="mt-4 divide-y divide-[var(--line-soft)]">
            {[
              ["Bench Press", "195 lb × 3", "Aug 12"],
              ["Back Squat", "285 lb × 2", "Aug 05"],
              ["Deadlift", "365 lb × 1", "Jul 29"],
              ["Overhead Press", "135 lb × 5", "Jul 22"],
            ].map(([l, detail, date]) => (
              <li key={l} className="flex items-center justify-between py-3 first:pt-0">
                <div>
                  <div className="text-[0.92rem] text-content-primary lowercase">{l}</div>
                  <div className="label-instrument mt-0.5">{detail}</div>
                </div>
                <span className="label-instrument">{date.toLowerCase()}</span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  );
}
