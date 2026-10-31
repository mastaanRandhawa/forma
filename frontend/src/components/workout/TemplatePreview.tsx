import { Play } from "lucide-react";
import { ExerciseThumb } from "../ExerciseThumb";
import { supersetLetter } from "../../lib/session";
import {
  EQUIPMENT_CLASS_LABEL,
  GOAL_LABEL,
  equipmentClass,
  templateById,
  templateExerciseTarget,
  templateFrequency,
  templateGoals,
} from "../../lib/workoutTemplates";
import type { TemplateRow } from "../../lib/templates";

/**
 * The body of the template "details" drawer: what it's for, how often, what you
 * need, then every exercise with sets × reps, rest and any swaps.
 */
export function TemplatePreview({
  row,
  onStart,
  onCustomize,
  onSaveCopy,
  busy = false,
}: {
  row: TemplateRow;
  onStart: () => void;
  onCustomize: () => void;
  onSaveCopy?: () => void;
  busy?: boolean;
}) {
  const preset = row.origin === "preset" ? templateById(row.id) : undefined;
  const facts: [string, string][] = preset
    ? [
        ["goal", templateGoals(preset).map((g) => GOAL_LABEL[g]).join(", ")],
        ["level", preset.difficulty],
        ["how often", templateFrequency(preset)],
        ["equipment", EQUIPMENT_CLASS_LABEL[equipmentClass(preset.equipment)]],
      ]
    : [];

  return (
    <div>
      {(preset?.objective || row.description) && (
        <p className="mb-4 text-[0.88rem] leading-relaxed text-content-secondary">
          {preset?.objective ?? row.description}
        </p>
      )}
      {facts.length > 0 && (
        <dl className="mb-4 grid grid-cols-2 gap-2">
          {facts.map(([k, v]) => (
            <div key={k} className="surface-recessed rounded-[var(--radius-small)] px-3 py-2">
              <dt className="label-instrument">{k}</dt>
              <dd className="mt-0.5 text-[0.84rem] lowercase text-content-primary">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {preset?.intensity && (
        <p className="mb-4 text-[0.82rem] text-content-secondary">
          <span className="label-instrument mr-1.5">effort</span>
          {preset.intensity}
        </p>
      )}

      <ol className="space-y-1.5" aria-label="exercises">
        {row.exercises.map((e, i) => {
          const g = e.supersetGroup ?? null;
          const prevG = i > 0 ? row.exercises[i - 1].supersetGroup ?? null : null;
          return (
            <li key={i}>
              {g != null && g !== prevG && (
                <div className="label-instrument mb-1 mt-1.5 uppercase tracking-[0.1em] text-[var(--accent-mauve)]">
                  superset {supersetLetter(g)}
                </div>
              )}
              <div
                className={`pill-row items-start ${g != null ? "border-l-2 border-[color-mix(in_srgb,var(--accent-mauve)_45%,transparent)]" : ""}`}
              >
                <ExerciseThumb name={e.name} alt="" size={48} />
                <div className="min-w-0 flex-1">
                  <div className="text-[0.9rem] lowercase text-content-primary">{e.name}</div>
                  {(e.note || e.alternatives?.length) && (
                    <div className="mt-0.5 text-[0.76rem] text-content-tertiary">
                      {e.note}
                      {e.note && e.alternatives?.length ? " · " : ""}
                      {e.alternatives?.length ? `swap: ${e.alternatives.join(", ").toLowerCase()}` : ""}
                    </div>
                  )}
                </div>
                <span className="label-instrument shrink-0 text-right">
                  {templateExerciseTarget(e)}
                  <br />
                  {e.restSec}s rest{e.rpe != null ? ` · rpe ${e.rpe}` : ""}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 flex flex-col gap-2">
        <button
          onClick={onStart}
          disabled={busy}
          className="focus-ring tactile inline-flex w-full items-center justify-center gap-1.5 rounded-pill bg-[var(--accent-lime)] py-3 text-[0.88rem] lowercase text-[#0c0c0c] disabled:opacity-50"
        >
          <Play size={14} aria-hidden /> start workout
        </button>
        <div className="flex gap-2">
          <button
            onClick={onCustomize}
            className="focus-ring min-h-11 flex-1 rounded-pill border border-[var(--line-soft)] text-[0.84rem] lowercase text-content-secondary hover:text-content-primary"
          >
            {row.editable ? "edit" : "customize a copy"}
          </button>
          {onSaveCopy && (
            <button
              onClick={onSaveCopy}
              className="focus-ring min-h-11 flex-1 rounded-pill border border-[var(--line-soft)] text-[0.84rem] lowercase text-content-secondary hover:text-content-primary"
            >
              save to my workouts
            </button>
          )}
        </div>
        {!row.editable && (
          <p className="label-instrument text-center">the original stays unchanged — you edit your own copy.</p>
        )}
      </div>
    </div>
  );
}
