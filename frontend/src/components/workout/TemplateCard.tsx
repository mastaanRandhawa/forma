import { Clock, Dumbbell, Repeat } from "lucide-react";
import type { TemplateRow } from "../../lib/templates";

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
 * One workout template / preset. Card body opens the preview; the footer carries
 * a primary "start" plus any secondary actions the screen supplies.
 */
export function TemplateCard({
  row,
  onStart,
  onOpen,
  actions = [],
  starting = false,
  difficulty,
}: {
  row: TemplateRow;
  onStart: () => void;
  onOpen?: () => void;
  actions?: TemplateCardAction[];
  starting?: boolean;
  difficulty?: string;
}) {
  const ago = fmtAgo(row.lastPerformed);
  return (
    <div className="surface-soft flex flex-col p-5">
      <button
        onClick={onOpen}
        disabled={!onOpen}
        className="focus-ring -m-1 flex-1 rounded-[var(--radius-medium)] p-1 text-left disabled:cursor-default"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[1rem] lowercase text-content-primary">{row.name}</h3>
          {difficulty && <span className="label-instrument shrink-0">{difficulty}</span>}
        </div>
        {row.description && (
          <p className="mt-1 line-clamp-2 text-[0.83rem] leading-snug text-content-secondary lowercase">
            {row.description}
          </p>
        )}
        <div className="label-instrument mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <Dumbbell size={12} /> {row.exerciseCount} exercises
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock size={12} /> ~{row.durationMin} min
          </span>
          {row.timesCompleted > 0 && (
            <span className="inline-flex items-center gap-1">
              <Repeat size={12} /> {row.timesCompleted}×
            </span>
          )}
          {ago && <span>· {ago}</span>}
        </div>
        {row.targetMuscles.length > 0 && (
          <div className="mt-1 text-[0.78rem] lowercase text-content-tertiary">
            {row.targetMuscles.slice(0, 4).join(", ")}
          </div>
        )}
      </button>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          onClick={onStart}
          disabled={starting}
          className="focus-ring tactile rounded-pill bg-[var(--accent-pink)] px-4 py-2 text-[0.82rem] lowercase text-white disabled:opacity-50"
        >
          {starting ? "starting…" : "start"}
        </button>
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className={`focus-ring text-[0.78rem] lowercase hover:text-content-primary ${
              a.tone === "danger" ? "text-[var(--accent-pink)]" : "text-content-tertiary"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
