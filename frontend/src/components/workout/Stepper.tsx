import { Minus, Plus } from "lucide-react";

/**
 * Numeric stepper — big tap targets and a free-type field, tuned for logging
 * weight / reps / RPE between sets. Shared by the active session and the
 * workout builder.
 *
 * `suggested` shows greyed out while the field is empty, and the buttons step
 * from it — so "+" on a suggested 8 reps gives 9, not 1.
 */
export function Stepper({
  label,
  value,
  step,
  suffix,
  onChange,
  compact = false,
  suggested = null,
  integer = false,
  invalid = false,
  id,
  describedBy,
}: {
  label: string;
  value: number | null;
  step: number;
  suffix?: string;
  onChange: (v: number | null) => void;
  compact?: boolean;
  suggested?: number | null;
  /** whole numbers only (reps), so phones show the plain number pad */
  integer?: boolean;
  invalid?: boolean;
  id?: string;
  describedBy?: string;
}) {
  const bump = (dir: number) => {
    const base = value ?? suggested ?? 0;
    const next = Math.round((base + dir * step) * 100) / 100;
    onChange(next < 0 ? 0 : next);
  };
  const btn =
    "focus-ring tactile grid shrink-0 place-items-center rounded-full bg-white/[0.06] text-content-secondary hover:bg-white/[0.12] active:scale-95";
  const minus = (
    <button aria-label={`decrease ${label}`} onClick={() => bump(-1)} className={`${btn} ${compact ? "h-9 w-9" : "h-11 w-11"}`}>
      <Minus size={compact ? 15 : 18} strokeWidth={2.4} />
    </button>
  );
  const plus = (
    <button aria-label={`increase ${label}`} onClick={() => bump(1)} className={`${btn} ${compact ? "h-9 w-9" : "h-11 w-11"}`}>
      <Plus size={compact ? 15 : 18} strokeWidth={2.4} />
    </button>
  );
  const input = (
    <input
      id={id}
      inputMode={integer ? "numeric" : "decimal"}
      aria-label={suffix ? `${label} (${suffix})` : label}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      value={value ?? ""}
      placeholder={suggested != null ? String(suggested) : "—"}
      onChange={(e) => {
        const raw = e.target.value.replace(",", ".");
        onChange(raw === "" ? null : Number.isNaN(Number(raw)) ? value : Number(raw));
      }}
      className={`focus-ring w-full min-w-0 rounded-[var(--radius-small)] bg-transparent text-center font-medium tabular-nums text-content-primary outline-none placeholder:text-content-tertiary ${
        compact ? "text-[1.15rem]" : "text-[1.6rem] sm:text-[1.8rem]"
      }`}
    />
  );
  // outline, not ring: the surface's own box-shadow would paint over a ring
  const box = `surface-recessed flex min-w-0 flex-1 flex-col items-center rounded-hero py-3 px-2 ${
    invalid ? "outline outline-2 outline-[var(--accent-amber)]" : ""
  }`;

  if (compact) {
    return (
      <div className={box}>
        <span className="label-instrument">{label}</span>
        <div className="mt-1.5 flex w-full items-center justify-between gap-2">
          {minus}
          {input}
          {plus}
        </div>
        {suffix && <span className="label-instrument mt-1">{suffix}</span>}
      </div>
    );
  }
  // Full size (the workout logger). Three of these share a phone's width, and
  // with the buttons either side of the field there was no room left for the
  // number at all — so below `lg` the number gets its own row with the buttons
  // under it; on wide screens they sit either side again to save height.
  return (
    <div className={box}>
      <span className="label-instrument">{label}</span>
      <div className="mt-1 grid w-full grid-cols-2 items-center gap-x-1.5 gap-y-2 lg:mt-1.5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-x-2">
        <div className="col-span-2 lg:col-span-1 lg:col-start-2 lg:row-start-1">{input}</div>
        <div className="justify-self-end lg:col-start-1 lg:row-start-1">{minus}</div>
        <div className="justify-self-start lg:col-start-3 lg:row-start-1">{plus}</div>
      </div>
      {suffix && <span className="label-instrument mt-1">{suffix}</span>}
    </div>
  );
}
