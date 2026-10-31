import { useEffect, useId, useRef, useState } from "react";
import { ChevronRight, Clock, Dumbbell, MoreHorizontal, Play, Repeat } from "lucide-react";
import type { TemplateRow } from "../../lib/templates";
import { ExerciseThumb } from "../ExerciseThumb";

const fmtAgo = (iso: string | null): string | null => {
  if (!iso) return null;
  const days = Math.floor((Date.now() - Date.parse(iso)) / 864e5);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

export interface TemplateCardAction {
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}

/**
 * One workout template / preset. The card body opens the preview (it says so,
 * with a "details" chevron); the footer carries a primary "start" and up to two
 * secondary buttons, with any further actions in a "more" menu.
 */
export function TemplateCard({
  row,
  onStart,
  onOpen,
  actions = [],
  starting = false,
  difficulty,
  meta = [],
}: {
  row: TemplateRow;
  onStart: () => void;
  onOpen?: () => void;
  actions?: TemplateCardAction[];
  starting?: boolean;
  difficulty?: string;
  /** short facts shown as chips, e.g. "dumbbells only", "2–3× / week" */
  meta?: string[];
}) {
  const ago = fmtAgo(row.lastPerformed);
  const visible = actions.length > 2 ? actions.slice(0, 1) : actions;
  const overflow = actions.length > 2 ? actions.slice(1) : [];
  return (
    <article className="surface-soft flex flex-col p-5" aria-label={row.name}>
      <button
        onClick={onOpen}
        disabled={!onOpen}
        aria-label={onOpen ? `view details: ${row.name}` : undefined}
        className="focus-ring group -m-1 flex-1 rounded-[var(--radius-medium)] p-1 text-left disabled:cursor-default"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[1rem] lowercase text-content-primary">{row.name}</h3>
          {onOpen && (
            <span
              aria-hidden
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full surface-recessed text-content-tertiary transition-colors group-hover:text-content-primary"
            >
              <ChevronRight size={14} />
            </span>
          )}
        </div>
        {row.description && (
          <p className="mt-1 line-clamp-2 text-[0.83rem] leading-snug text-content-secondary lowercase">
            {row.description}
          </p>
        )}
        {row.exercises.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5" aria-hidden>
            {row.exercises.slice(0, 4).map((e, i) => (
              <ExerciseThumb key={`${e.name}-${i}`} name={e.name} alt="" size={40} />
            ))}
            {row.exercises.length > 4 && (
              <span className="label-instrument ml-1 tabular-nums">+{row.exercises.length - 4}</span>
            )}
          </div>
        )}
        <div className="label-instrument mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <Dumbbell size={12} aria-hidden /> {row.exerciseCount} exercises
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock size={12} aria-hidden /> ~{row.durationMin} min
          </span>
          {row.timesCompleted > 0 && (
            <span className="inline-flex items-center gap-1">
              <Repeat size={12} aria-hidden /> {row.timesCompleted}×
            </span>
          )}
          {ago && <span>· {ago}</span>}
        </div>
        {(difficulty || meta.length > 0) && (
          <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="details">
            {[difficulty, ...meta].filter(Boolean).map((m) => (
              <li key={m} className="rounded-pill surface-recessed px-2.5 py-0.5 text-[0.72rem] lowercase text-content-secondary">
                {m}
              </li>
            ))}
          </ul>
        )}
        {row.targetMuscles.length > 0 && (
          <div className="mt-2 text-[0.78rem] lowercase text-content-tertiary">
            {row.targetMuscles.slice(0, 4).join(", ")}
          </div>
        )}
      </button>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={onStart}
          disabled={starting}
          aria-label={`start ${row.name}`}
          className="focus-ring tactile inline-flex min-h-10 items-center gap-1.5 rounded-pill bg-[var(--accent-pink)] px-4 text-[0.82rem] lowercase text-white disabled:opacity-50"
        >
          <Play size={13} aria-hidden /> {starting ? "starting…" : "start"}
        </button>
        {visible.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            aria-label={`${a.label}: ${row.name}`}
            className={`focus-ring inline-flex min-h-10 items-center rounded-pill border border-[var(--line-soft)] px-3.5 text-[0.8rem] lowercase transition-colors hover:text-content-primary ${
              a.tone === "danger" ? "text-[var(--accent-pink)]" : "text-content-secondary"
            }`}
          >
            {a.label}
          </button>
        ))}
        {overflow.length > 0 && <ActionMenu label={`more actions: ${row.name}`} actions={overflow} />}
      </div>
    </article>
  );
}

/** A small disclosure menu: button + list of actions; Escape and outside clicks close it. */
function ActionMenu({ label, actions }: { label: string; actions: TemplateCardAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-[var(--line-soft)] text-content-secondary hover:text-content-primary"
      >
        <MoreHorizontal size={16} aria-hidden />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="surface-float absolute bottom-full left-0 z-30 mb-2 min-w-[11rem] overflow-hidden rounded-[var(--radius-medium)] py-1 shadow-lg"
        >
          {actions.map((a) => (
            <button
              key={a.label}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                a.onClick();
              }}
              className={`focus-ring block w-full px-4 py-2.5 text-left text-[0.85rem] lowercase hover:bg-white/[0.06] ${
                a.tone === "danger" ? "text-[var(--accent-pink)]" : "text-content-primary"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
