import { Minus, Plus } from "lucide-react";

/**
 * Numeric stepper — big tap targets and a free-type field, tuned for logging
 * weight / reps / RPE between sets. Shared by the active session and the
 * workout builder.
 */
export function Stepper({
  label,
  value,
  step,
  suffix,
  onChange,
  compact = false,
}: {
  label: string;
  value: number | null;
  step: number;
  suffix?: string;
  onChange: (v: number | null) => void;
  compact?: boolean;
}) {
  const bump = (dir: number) => {
    const base = value ?? 0;
    const next = Math.round((base + dir * step) * 100) / 100;
    onChange(next < 0 ? 0 : next);
  };
  const btn =
    "focus-ring tactile grid shrink-0 place-items-center rounded-full bg-white/[0.06] text-content-secondary hover:bg-white/[0.12] active:scale-95";
  return (
    <div className="surface-recessed flex flex-1 flex-col items-center rounded-hero px-3 py-3">
      <span className="label-instrument">{label}</span>
      <div className="mt-1.5 flex w-full items-center justify-between gap-2">
        <button
          aria-label={`decrease ${label}`}
          onClick={() => bump(-1)}
          className={`${btn} ${compact ? "h-9 w-9" : "h-11 w-11"}`}
        >
          <Minus size={compact ? 15 : 18} strokeWidth={2.4} />
        </button>
        <input
          inputMode="decimal"
          value={value ?? ""}
          placeholder="—"
          onChange={(e) => {
            const raw = e.target.value.replace(",", ".");
            onChange(raw === "" ? null : Number.isNaN(Number(raw)) ? value : Number(raw));
          }}
          className={`focus-ring w-full min-w-0 rounded-[var(--radius-small)] bg-transparent text-center font-medium tabular-nums text-content-primary outline-none ${
            compact ? "text-[1.3rem]" : "text-[1.8rem]"
          }`}
        />
        <button
          aria-label={`increase ${label}`}
          onClick={() => bump(1)}
          className={`${btn} ${compact ? "h-9 w-9" : "h-11 w-11"}`}
        >
          <Plus size={compact ? 15 : 18} strokeWidth={2.4} />
        </button>
      </div>
      {suffix && <span className="label-instrument mt-1">{suffix}</span>}
    </div>
  );
}
