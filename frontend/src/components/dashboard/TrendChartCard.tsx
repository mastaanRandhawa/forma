import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AreaChart } from "./AreaChart";
import { weekChart } from "../../lib/data";

const RANGES = ["7 days", "14 days", "30 days"] as const;

/** The dashboard's main chart card — two series, legend, range switch. */
export function TrendChartCard() {
  const [range, setRange] = useState<(typeof RANGES)[number]>("7 days");
  const [open, setOpen] = useState(false);

  const series = [
    { label: "this week", color: "var(--accent-pink)", data: weekChart.thisWeek },
    { label: "last week", color: "var(--accent-blue)", data: weekChart.lastWeek },
  ];

  return (
    <div className="metric-card !p-5" data-tone="pink" data-variant="glow">
      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="metric-card__label">training volume</div>
            <div className="mt-1.5 flex items-center gap-3">
              {series.map((s) => (
                <span key={s.label} className="flex items-center gap-1.5 text-[0.74rem] lowercase text-content-tertiary">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              className="focus-ring flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[0.76rem] lowercase text-content-secondary transition-colors hover:border-white/20"
            >
              {range}
              <ChevronDown size={13} strokeWidth={2} className={open ? "rotate-180" : ""} />
            </button>
            {open && (
              <div className="absolute right-0 top-9 z-20 w-32 overflow-hidden rounded-xl border border-white/10 bg-[rgba(24,13,20,0.97)] py-1 backdrop-blur-md">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setRange(r);
                      setOpen(false);
                    }}
                    className={`focus-ring block w-full px-3 py-1.5 text-left text-[0.76rem] lowercase transition-colors hover:bg-white/[0.06] ${
                      r === range ? "text-content-primary" : "text-content-tertiary"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <AreaChart series={series} labels={weekChart.days} height={210} />
      </div>
    </div>
  );
}
