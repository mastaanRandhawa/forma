import { AreaChart } from "./AreaChart";

type Series = { label: string; color: string; data: number[] };

/** The dashboard's main chart card — this-week vs last-week training volume. */
export function TrendChartCard({
  series,
  labels = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
  unit = "lb",
}: {
  series: Series[];
  labels?: string[];
  unit?: string;
}) {
  const empty = series.every((s) => s.data.every((v) => v === 0));

  return (
    <div className="metric-card !p-5" data-tone="pink" data-variant="glow">
      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="metric-card__label">training volume · {unit}</div>
            <div className="mt-1.5 flex items-center gap-3">
              {series.map((s) => (
                <span key={s.label} className="flex items-center gap-1.5 text-[0.74rem] lowercase text-content-tertiary">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {empty ? (
          <p className="py-14 text-center text-[0.85rem] text-content-tertiary">
            finish a session and your weekly volume charts here
          </p>
        ) : (
          <AreaChart series={series} labels={labels} height={210} />
        )}
      </div>
    </div>
  );
}
