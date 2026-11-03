import { CalendarDays, ChevronRight, Clock, Coins, Lock, Play } from "lucide-react";
import { useState } from "react";
import { useCustomization } from "../../lib/customization";
import { buyItem, priceOf } from "../../lib/economy";
import { useWalletBalance } from "../../lib/wallet";
import { ExerciseThumb } from "../ExerciseThumb";
import {
  EQUIPMENT_CLASS_LABEL,
  GOAL_LABEL,
  type WorkoutTemplate,
} from "../../lib/workoutTemplates";
import {
  planEquipmentClass,
  planSessionMin,
  planTemplates,
  type WorkoutPlan,
} from "../../lib/workoutPlans";

/** A multi-day plan in the library grid. The whole card opens the plan. */
export function PlanCard({ plan, onOpen }: { plan: WorkoutPlan; onOpen: () => void }) {
  const cz = useCustomization();
  const locked = plan.premium != null && !cz.isOwned(plan.premium);
  return (
    <article className="surface-soft flex flex-col p-5" aria-label={plan.name}>
      <button
        onClick={onOpen}
        aria-label={`view plan: ${plan.name}`}
        className="focus-ring group -m-1 flex-1 rounded-[var(--radius-medium)] p-1 text-left"
      >
        <h3 className="flex items-start justify-between gap-2 text-[1rem] lowercase text-content-primary">
          <span>{plan.name}</span>
          {plan.premium && (
            <span
              className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-pill border border-[var(--accent-amber)]/40 px-2 py-0.5 text-[0.66rem] text-[var(--accent-amber)]"
              data-testid={locked ? "plan-locked" : "plan-unlocked"}
            >
              {locked ? <Lock size={10} aria-label="locked" /> : null}
              premium
            </span>
          )}
        </h3>
        <p className="mt-1 line-clamp-2 text-[0.83rem] leading-snug text-content-secondary">{plan.description}</p>
        <div className="mt-3 flex items-center gap-1.5" aria-hidden>
          {planTemplates(plan).slice(0, 6).map(({ label, template }) => (
            <ExerciseThumb key={label} name={template.exercises[0]?.name ?? ""} alt="" size={36} />
          ))}
        </div>
        <div className="label-instrument mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={12} aria-hidden /> {plan.daysPerWeek} days / week
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock size={12} aria-hidden /> ~{planSessionMin(plan)} min / session
          </span>
        </div>
        <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="details">
          {[plan.difficulty, EQUIPMENT_CLASS_LABEL[planEquipmentClass(plan)], ...plan.goals.map((g) => GOAL_LABEL[g])].map(
            (m) => (
              <li key={m} className="rounded-pill surface-recessed px-2.5 py-0.5 text-[0.72rem] lowercase text-content-secondary">
                {m}
              </li>
            ),
          )}
        </ul>
        <span className="mt-3 inline-flex items-center gap-0.5 text-[0.82rem] lowercase text-[var(--accent-pink)] group-hover:underline">
          view plan <ChevronRight size={14} aria-hidden />
        </span>
      </button>
    </article>
  );
}

/** Body of the plan drawer: the why, the week, how to progress, and each day. */
export function PlanPreview({
  plan,
  onPreviewDay,
  onStartDay,
  onSaveAll,
  busy = false,
}: {
  plan: WorkoutPlan;
  onPreviewDay: (t: WorkoutTemplate) => void;
  onStartDay: (t: WorkoutTemplate) => void;
  onSaveAll: () => void;
  busy?: boolean;
}) {
  const cz = useCustomization();
  const balance = useWalletBalance();
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const locked = plan.premium != null && !cz.isOwned(plan.premium);
  const price = plan.premium ? priceOf(plan.premium) ?? 0 : 0;

  const unlock = async () => {
    if (!plan.premium) return;
    setUnlocking(true);
    setUnlockError(null);
    const res = await buyItem(plan.premium);
    setUnlocking(false);
    if (!res.ok) setUnlockError(res.error);
  };

  const days = planTemplates(plan);
  const facts: [string, string][] = [
    ["days / week", String(plan.daysPerWeek)],
    ["session", `~${planSessionMin(plan)} min`],
    ["level", plan.difficulty],
    ["equipment", EQUIPMENT_CLASS_LABEL[planEquipmentClass(plan)]],
  ];
  return (
    <div>
      <p className="mb-4 text-[0.88rem] leading-relaxed text-content-secondary">{plan.objective}</p>
      <dl className="mb-4 grid grid-cols-2 gap-2">
        {facts.map(([k, v]) => (
          <div key={k} className="surface-recessed rounded-[var(--radius-small)] px-3 py-2">
            <dt className="label-instrument">{k}</dt>
            <dd className="mt-0.5 text-[0.84rem] lowercase text-content-primary">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mb-3 text-[0.84rem] text-content-secondary">
        <span className="label-instrument mr-1.5">schedule</span>
        {plan.schedule}
      </div>
      <div className="mb-5 text-[0.84rem] text-content-secondary">
        <span className="label-instrument mr-1.5">progression</span>
        {plan.progression}
      </div>

      <ol className="space-y-2" aria-label="plan days">
        {days.map(({ label, template }, i) => (
          <li key={`${template.id}-${i}`} className="surface-recessed flex items-center gap-3 rounded-[var(--radius-medium)] p-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[0.8rem] tabular-nums text-content-secondary">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[0.9rem] lowercase text-content-primary">{label}</div>
              <div className="label-instrument">
                {template.exercises.length} exercises · ~{template.durationMin} min
              </div>
            </div>
            <button
              onClick={() => onPreviewDay(template)}
              aria-label={`details: ${label}`}
              className="focus-ring min-h-10 rounded-pill border border-[var(--line-soft)] px-3 text-[0.78rem] lowercase text-content-secondary hover:text-content-primary"
            >
              details
            </button>
            {locked ? (
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.06] text-content-tertiary" aria-label="locked">
                <Lock size={14} aria-hidden />
              </span>
            ) : (
              <button
                onClick={() => onStartDay(template)}
                disabled={busy}
                aria-label={`start ${label}`}
                className="focus-ring grid h-10 w-10 place-items-center rounded-full bg-[var(--accent-pink)] text-white disabled:opacity-50"
              >
                <Play size={14} aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ol>

      {locked ? (
        <>
          <button
            onClick={unlock}
            disabled={unlocking || balance < price}
            className="focus-ring mt-5 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-pill bg-[var(--accent-amber)] text-[0.84rem] font-medium lowercase text-[#0c0c0c] disabled:opacity-50"
          >
            <Coins size={14} aria-hidden />
            {balance < price
              ? `${(price - balance).toLocaleString()} more coins to unlock`
              : unlocking
                ? "unlocking…"
                : `unlock for ${price.toLocaleString()}`}
          </button>
          {unlockError && <p className="label-instrument mt-2 text-center text-[var(--accent-pink)]">{unlockError}</p>}
          <p className="label-instrument mt-2 text-center">a premium plan, yours for good once unlocked.</p>
        </>
      ) : (
        <>
          <button
            onClick={onSaveAll}
            disabled={busy}
            className="focus-ring mt-5 min-h-11 w-full rounded-pill border border-[var(--line-soft)] text-[0.84rem] lowercase text-content-secondary hover:text-content-primary disabled:opacity-50"
          >
            {busy ? "saving…" : `save all ${days.length} days to my workouts`}
          </button>
          <p className="label-instrument mt-2 text-center">saved days are your own copies — edit them freely.</p>
        </>
      )}
    </div>
  );
}
