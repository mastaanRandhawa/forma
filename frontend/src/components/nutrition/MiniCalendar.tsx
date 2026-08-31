import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { todayISO } from "../../lib/food";

/**
 * MiniCalendar — a compact month-grid date picker styled with the app's tokens.
 * Replaces the browser-native date input (which ignores the dark theme). Opens
 * as a popover; click-outside / Escape dismiss; days past `max` are disabled.
 */
export function MiniCalendar({
  value, max, onPick,
}: {
  value: string;
  max: string;
  onPick: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => value.slice(0, 7)); // "YYYY-MM"
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setView(value.slice(0, 7));
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const [vy, vm] = view.split("-").map(Number);
  const grid = useMemo(() => buildMonth(vy, vm), [vy, vm]);
  const monthLabel = new Date(vy, vm - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const shiftMonth = (delta: number) => {
    const d = new Date(vy, vm - 1 + delta, 1);
    setView(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="focus-ring tactile inline-flex h-9 items-center gap-1.5 rounded-pill bg-white/[0.06] px-3 text-[0.8rem] lowercase text-content-secondary hover:text-content-primary"
      >
        <Calendar size={13} strokeWidth={1.9} />
        <span className="tabular-nums">{value}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose a date"
          className="surface-float absolute right-0 z-30 mt-2 w-[17.5rem] rounded-[var(--radius-large)] p-3 shadow-[var(--shadow-float)]"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="focus-ring tactile grid h-7 w-7 place-items-center rounded-pill bg-white/[0.06] text-content-secondary hover:text-content-primary"
            >
              <ChevronLeft size={14} strokeWidth={2} />
            </button>
            <span className="text-[0.85rem] lowercase text-content-primary">{monthLabel}</span>
            <button
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="focus-ring tactile grid h-7 w-7 place-items-center rounded-pill bg-white/[0.06] text-content-secondary hover:text-content-primary"
            >
              <ChevronRight size={14} strokeWidth={2} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center">
            {["s", "m", "t", "w", "t", "f", "s"].map((d, i) => (
              <span key={i} className="label-instrument py-1">{d}</span>
            ))}
            {grid.map((iso, i) => {
              if (!iso) return <span key={i} />;
              const disabled = iso > max;
              const selected = iso === value;
              const isToday = iso === todayISO();
              return (
                <button
                  key={i}
                  disabled={disabled}
                  onClick={() => {
                    onPick(iso);
                    setOpen(false);
                  }}
                  className={`focus-ring h-8 rounded-lg text-[0.82rem] tabular-nums transition-colors ${
                    selected
                      ? "bg-[var(--accent-pink)] text-[var(--fill-on-color,#fff)]"
                      : disabled
                        ? "text-content-tertiary/40"
                        : isToday
                          ? "text-[var(--accent-pink)] hover:bg-white/[0.08]"
                          : "text-content-secondary hover:bg-white/[0.08]"
                  }`}
                >
                  {Number(iso.slice(8, 10))}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              onPick(todayISO());
              setOpen(false);
            }}
            className="focus-ring mt-2 w-full rounded-lg py-1.5 text-[0.78rem] lowercase text-content-tertiary hover:text-content-secondary"
          >
            jump to today
          </button>
        </div>
      )}
    </div>
  );
}

/** Array of ISO strings for a month grid, leading blanks as "". */
function buildMonth(year: number, month: number): (string | "")[] {
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const lead = first.getDay();
  const cells: (string | "")[] = Array.from({ length: lead }, () => "");
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return cells;
}
