import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { MiniBars } from "../health/MiniBars";
import { MiniTrend } from "../health/MiniTrend";
import { metricDetails } from "../../lib/data";
import type { MetricDetail } from "../../lib/progressMetrics";

/** Body content for the DetailDrawer — headline, full chart, contributing
 *  factors, and one recommendation. Pass a real-data `detail` object, or fall
 *  back to the static copy keyed by metric id. */
export function MetricDetailBody({
  id,
  detail,
  onClose,
}: {
  id: string;
  detail?: MetricDetail;
  onClose: () => void;
}) {
  const d = detail ?? metricDetails[id];
  if (!d) return null;

  return (
    <div>
      <div className="flex items-end gap-3">
        <span className="metric-numeral text-[2.6rem] text-content-primary">{d.value}</span>
        <span className="metric-card__unit mb-1.5">{d.unit}</span>
      </div>

      <div className="mt-4 h-24 overflow-hidden rounded-2xl bg-white/[0.03] p-3">
        {d.mode === "bars" ? (
          <MiniBars data={d.chart} color={d.color} fill height={72} caption={`${d.title} trend`} />
        ) : (
          <MiniTrend data={d.chart} mode="curve" color={d.color} fill height={72} caption={`${d.title} trend`} />
        )}
      </div>

      <div className="mt-6">
        <div className="label-instrument mb-3">what's driving it</div>
        <ul className="space-y-3">
          {d.factors.map((f) => (
            <li key={f.label}>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-[0.9rem] lowercase text-content-primary">{f.label}</span>
                <span className="num text-[0.8rem] text-content-secondary">{f.value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(Math.min(1, f.fraction) * 100)}%`,
                    background: d.color,
                    boxShadow: `0 0 10px ${d.color}`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="label-instrument mb-1.5" style={{ color: "var(--accent-cyan)" }}>
          recommendation
        </div>
        <p className="text-[0.9rem] leading-relaxed text-content-secondary">{d.recommendation}</p>
      </div>

      <Link
        to={d.to}
        onClick={onClose}
        className="focus-ring tactile mt-5 inline-flex items-center gap-2 rounded-pill bg-white/[0.07] px-4 py-2 text-[0.84rem] lowercase text-content-primary transition-colors hover:bg-white/[0.13]"
      >
        view full history
        <ArrowRight size={14} strokeWidth={2} />
      </Link>
    </div>
  );
}
