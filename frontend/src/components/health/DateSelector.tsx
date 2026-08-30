import { useMemo } from "react";

export type DayItem = { key: string; weekday: string; day: number; marked?: boolean };

/**
 * DateSelector — a recessed physical strip. Day labels sit carved-in;
 * the selected day is a raised floating pebble. Horizontal scroll on mobile.
 */
export function DateSelector({
  days,
  value,
  onChange,
  className = "",
}: {
  days?: DayItem[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  const items = useMemo(() => days ?? buildWeek(), [days]);

  return (
    <div
      className={`surface-recessed rounded-pill px-2.5 py-2.5 ${className}`}
      role="tablist"
      aria-label="Select day"
    >
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {items.map((d) => {
          const active = d.key === value;
          return (
            <button
              key={d.key}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(d.key)}
              className={`focus-ring shrink-0 rounded-pill px-3 py-2 flex flex-col items-center gap-1 transition ${
                active ? "surface-float tactile" : "tactile"
              }`}
              style={{ minWidth: 46 }}
            >
              <span
                className={`label-instrument !tracking-[0.1em] ${
                  active ? "!text-content-primary" : ""
                }`}
              >
                {d.weekday}
              </span>
              <span
                className={`tabular-nums text-[0.95rem] ${
                  active ? "text-content-primary font-medium" : "text-content-secondary"
                }`}
              >
                {d.day}
              </span>
              <span
                className="h-1 w-1 rounded-full"
                style={{
                  background: d.marked
                    ? active
                      ? "var(--text-dark)"
                      : "var(--accent-pink)"
                    : "transparent",
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function buildWeek(): DayItem[] {
  const now = new Date();
  const out: DayItem[] = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    out.push({
      key: d.toISOString().slice(0, 10),
      weekday: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3).toLowerCase(),
      day: d.getDate(),
      marked: i < 0 && i % 2 === 0,
    });
  }
  return out;
}
