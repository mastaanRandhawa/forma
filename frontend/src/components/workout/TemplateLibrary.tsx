import { useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { Button } from "../primitives";
import { EmptyState } from "../EmptyState";
import { TemplateCard } from "./TemplateCard";
import { PlanCard } from "./PlanViews";
import { presetToRow, type TemplateRow } from "../../lib/templates";
import {
  DURATION_BUCKET_LABEL,
  EQUIPMENT_CLASS_LABEL,
  GOAL_LABEL,
  WORKOUT_TEMPLATES,
  durationBucket,
  equipmentClass,
  matchesTemplateQuery,
  templateFrequency,
  templateGoals,
  type Difficulty,
  type DurationBucket,
  type EquipmentClass,
  type TrainingGoal,
} from "../../lib/workoutTemplates";
import {
  WORKOUT_PLANS,
  matchesPlanQuery,
  planEquipmentClass,
  planSessionMin,
  type WorkoutPlan,
} from "../../lib/workoutPlans";
import type { useTemplates } from "../../api/hooks";

type Any = "any";
const DAYS_OPTIONS = [2, 3, 4, 5, 6] as const;

/**
 * The Templates tab: your own workouts, then multi-day plans, then single
 * workouts — all narrowed by one search box and a small set of filters.
 */
export function TemplateLibrary({
  templates,
  starting,
  startingPreset,
  onStart,
  onStartPreset,
  onCreate,
  onEdit,
  onCustomize,
  onSaveCopy,
  onDuplicate,
  onRename,
  onDelete,
  onPreview,
  onOpenPlan,
}: {
  templates: ReturnType<typeof useTemplates>;
  starting: boolean;
  startingPreset: boolean;
  onStart: (row: TemplateRow) => void;
  onStartPreset: (id: string) => void;
  onCreate: () => void;
  onEdit: (row: TemplateRow) => void;
  onCustomize: (id: string) => void;
  onSaveCopy: (row: TemplateRow) => void;
  onDuplicate: (row: TemplateRow) => void;
  onRename: (row: TemplateRow) => void;
  onDelete: (row: TemplateRow) => void;
  onPreview: (row: TemplateRow) => void;
  onOpenPlan: (plan: WorkoutPlan) => void;
}) {
  const [query, setQuery] = useState("");
  const [goal, setGoal] = useState<TrainingGoal | Any>("any");
  const [level, setLevel] = useState<Difficulty | Any>("any");
  const [kit, setKit] = useState<EquipmentClass | Any>("any");
  const [length, setLength] = useState<DurationBucket | Any>("any");
  const [days, setDays] = useState<number | Any>("any");

  const filtersActive =
    query.trim() !== "" || goal !== "any" || level !== "any" || kit !== "any" || length !== "any" || days !== "any";
  const clear = () => {
    setQuery("");
    setGoal("any");
    setLevel("any");
    setKit("any");
    setLength("any");
    setDays("any");
  };

  const mine = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (templates.data ?? []).filter(
      (r) =>
        !q ||
        [r.name, r.description, ...r.targetMuscles, ...r.exercises.map((e) => e.name)]
          .join(" ")
          .toLowerCase()
          .includes(q),
    );
  }, [templates.data, query]);

  const plans = useMemo(
    () =>
      WORKOUT_PLANS.filter(
        (p) =>
          matchesPlanQuery(p, query) &&
          (goal === "any" || p.goals.includes(goal)) &&
          (level === "any" || p.difficulty === level) &&
          (kit === "any" || planEquipmentClass(p) === kit) &&
          (length === "any" || durationBucket(planSessionMin(p)) === length) &&
          (days === "any" || p.daysPerWeek === days),
      ),
    [query, goal, level, kit, length, days],
  );

  // "days / week" describes plans; a single workout has no such number
  const singles = useMemo(
    () =>
      days !== "any"
        ? []
        : WORKOUT_TEMPLATES.filter(
            (t) =>
              matchesTemplateQuery(t, query) &&
              (goal === "any" || templateGoals(t).includes(goal)) &&
              (level === "any" || t.difficulty === level) &&
              (kit === "any" || equipmentClass(t.equipment) === kit) &&
              (length === "any" || durationBucket(t.durationMin) === length),
          ),
    [query, goal, level, kit, length, days],
  );

  const chip = (active: boolean) =>
    `focus-ring shrink-0 min-h-9 rounded-pill px-3.5 text-[0.78rem] lowercase transition-colors ${
      active ? "surface-float text-content-primary" : "surface-recessed text-content-tertiary hover:text-content-secondary"
    }`;
  const selectCls =
    "focus-ring surface-recessed mt-1 w-full min-h-10 rounded-pill px-3 text-[0.84rem] lowercase text-content-primary outline-none";

  return (
    <div className="space-y-10">
      {/* ── search + filters ─────────────────────────────────────────── */}
      <section aria-label="find a workout" className="space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-content-tertiary" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search by name, muscle or exercise"
            aria-label="search workouts and plans"
            className="focus-ring surface-recessed min-h-11 w-full rounded-pill py-2.5 pl-10 pr-10 text-[0.9rem] text-content-primary outline-none placeholder:text-content-tertiary"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="clear search"
              className="focus-ring absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-content-tertiary hover:text-content-secondary"
            >
              <X size={14} aria-hidden />
            </button>
          )}
        </div>

        <div role="group" aria-label="goal" className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
          <button className={chip(goal === "any")} aria-pressed={goal === "any"} onClick={() => setGoal("any")}>
            all goals
          </button>
          {(Object.keys(GOAL_LABEL) as TrainingGoal[]).map((g) => (
            <button key={g} className={chip(goal === g)} aria-pressed={goal === g} onClick={() => setGoal(goal === g ? "any" : g)}>
              {GOAL_LABEL[g]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div>
            <label htmlFor="tl-level" className="label-instrument">level</label>
            <select id="tl-level" className={selectCls} value={level} onChange={(e) => setLevel(e.target.value as Difficulty | Any)}>
              <option value="any">any level</option>
              <option value="beginner">beginner</option>
              <option value="intermediate">intermediate</option>
              <option value="advanced">advanced</option>
            </select>
          </div>
          <div>
            <label htmlFor="tl-kit" className="label-instrument">equipment</label>
            <select id="tl-kit" className={selectCls} value={kit} onChange={(e) => setKit(e.target.value as EquipmentClass | Any)}>
              <option value="any">any equipment</option>
              {(Object.keys(EQUIPMENT_CLASS_LABEL) as EquipmentClass[]).map((k) => (
                <option key={k} value={k}>
                  {EQUIPMENT_CLASS_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tl-length" className="label-instrument">duration</label>
            <select id="tl-length" className={selectCls} value={length} onChange={(e) => setLength(e.target.value as DurationBucket | Any)}>
              <option value="any">any length</option>
              {(Object.keys(DURATION_BUCKET_LABEL) as DurationBucket[]).map((d) => (
                <option key={d} value={d}>
                  {DURATION_BUCKET_LABEL[d]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tl-days" className="label-instrument">days / week</label>
            <select id="tl-days"
              className={selectCls}
              value={String(days)}
              onChange={(e) => setDays(e.target.value === "any" ? "any" : Number(e.target.value))}
            >
              <option value="any">any schedule</option>
              {DAYS_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
          <p className="label-instrument" aria-live="polite">
            {plans.length} plan{plans.length === 1 ? "" : "s"} · {singles.length} workout{singles.length === 1 ? "" : "s"}
            {days !== "any" ? " (days / week applies to plans only)" : ""}
          </p>
          {filtersActive && (
            <button
              onClick={clear}
              className="focus-ring min-h-9 rounded-pill px-3 text-[0.8rem] lowercase text-content-secondary underline-offset-4 hover:underline"
            >
              clear filters
            </button>
          )}
        </div>
      </section>

      {/* ── my workouts ──────────────────────────────────────────────── */}
      <section aria-labelledby="mine-h">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="mine-h" className="label-soft lowercase">
            my workouts
          </h2>
          <Button variant="ghost" onClick={onCreate}>
            <Plus size={14} aria-hidden /> create workout
          </Button>
        </div>
        {templates.initialLoading ? (
          <p className="label-instrument">loading…</p>
        ) : (templates.data ?? []).length === 0 ? (
          <EmptyState
            title="no saved workouts yet"
            body="build one from scratch, or open any plan or workout below and save it to make it yours."
            action={{ label: "create a workout", onClick: onCreate }}
          />
        ) : mine.length === 0 ? (
          <p className="label-instrument">none of your workouts match "{query}".</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {mine.map((row) => (
              <TemplateCard
                key={row.id}
                row={row}
                starting={starting}
                onStart={() => onStart(row)}
                onOpen={() => onPreview(row)}
                actions={[
                  { label: "edit", onClick: () => onEdit(row) },
                  { label: "duplicate", onClick: () => onDuplicate(row) },
                  { label: "rename", onClick: () => onRename(row) },
                  { label: "delete", onClick: () => onDelete(row), tone: "danger" },
                ]}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── plans ────────────────────────────────────────────────────── */}
      <section aria-labelledby="plans-h">
        <h2 id="plans-h" className="label-soft mb-1 lowercase">
          training plans
        </h2>
        <p className="label-instrument mb-4">a full week of workouts that fit together.</p>
        {plans.length === 0 ? (
          <p className="label-instrument">no plans match these filters.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => (
              <PlanCard key={p.id} plan={p} onOpen={() => onOpenPlan(p)} />
            ))}
          </div>
        )}
      </section>

      {/* ── single workouts ──────────────────────────────────────────── */}
      <section aria-labelledby="singles-h">
        <h2 id="singles-h" className="label-soft mb-1 lowercase">
          single workouts
        </h2>
        <p className="label-instrument mb-4">one session each — start as-is or save a copy to change it.</p>
        {singles.length === 0 ? (
          plans.length === 0 ? (
            <EmptyState
              title="nothing matches"
              body="try fewer filters, or a broader search like a muscle name."
              icon={<Search size={18} strokeWidth={1.75} />}
              action={{ label: "clear filters", onClick: clear }}
            />
          ) : (
            <p className="label-instrument">
              {days !== "any" ? "clear “days / week” to see single workouts." : "no single workouts match these filters."}
            </p>
          )
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {singles.map((t) => {
              const row = presetToRow(t);
              return (
                <TemplateCard
                  key={t.id}
                  row={row}
                  difficulty={t.difficulty}
                  meta={[EQUIPMENT_CLASS_LABEL[equipmentClass(t.equipment)], templateFrequency(t)]}
                  starting={startingPreset}
                  onStart={() => onStartPreset(t.id)}
                  onOpen={() => onPreview(row)}
                  actions={[
                    { label: "customize", onClick: () => onCustomize(t.id) },
                    { label: "save a copy", onClick: () => onSaveCopy(row) },
                  ]}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
