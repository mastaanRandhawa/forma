import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { MiniTrend } from "../health/MiniTrend";
import { weeklySummary } from "../../lib/data";

/**
 * WeeklySummary — one consolidated card that replaces four separate metric
 * tiles. Four weekly stats, each a sparkline + week-over-week delta, divided
 * rather than boxed. Tapping a stat opens its breakdown; the header link goes
 * to the full report.
 */
export function WeeklySummary({ onStat }: { onStat?: (id: string) => void }) {
  return (
    <div className="metric-card !rounded-[var(--radius-large)] !p-5" data-tone="mauve" data-variant="glow">
      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <span className="metric-card__label">this week</span>
          <Link
            to="/progress"
            className="focus-ring flex items-center gap-1 text-[0.74rem] text-content-tertiary transition-colors hover:text-content-secondary"
          >
            full report <ChevronRight size={13} strokeWidth={2.25} />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
          {weeklySummary.stats.map((s) => {
            const Tag = s.detail && onStat ? "button" : "div";
            return (
              <Tag
                key={s.id}
                {...(s.detail && onStat ? { type: "button" as const, onClick: () => onStat(s.detail!) } : {})}
                className={`focus-ring group/stat block text-left ${
                  s.detail && onStat ? "cursor-pointer" : ""
                }`}
              >
                <div className="metric-numeral text-[1.45rem] text-content-primary">{s.value}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[0.72rem] text-content-tertiary">
                  {s.label}
                  {s.detail && onStat && (
                    <ChevronRight
                      size={11}
                      strokeWidth={2.5}
                      className="opacity-0 transition-opacity group-hover/stat:opacity-60"
                    />
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <MiniTrend data={s.spark} mode="curve" color="var(--accent-mauve)" width={44} height={16} />
                  <span className="num text-[0.7rem] text-[var(--accent-lime)]">{s.delta}</span>
                </div>
              </Tag>
            );
          })}
        </div>

        <p className="mt-4 border-t border-[var(--line-soft)] pt-3 text-[0.83rem] leading-relaxed text-content-secondary">
          {weeklySummary.takeaway}
        </p>
      </div>
    </div>
  );
}
