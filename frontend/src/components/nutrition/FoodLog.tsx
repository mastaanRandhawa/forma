import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus, ChevronLeft, ChevronRight, Trash2, Pencil, Calendar,
  CopyPlus, Sparkles, Utensils,
} from "lucide-react";
import { PageHeader } from "../PageHeader";
import { Reveal } from "../Reveal";
import { EmptyState } from "../EmptyState";
import { ErrorState } from "../ErrorState";
import { Button, PillSelector } from "../primitives";
import { BarProgress, RingProgress } from "../health/ProgressIndicator";
import { DetailDrawer } from "../dashboard/DetailDrawer";
import { Skel } from "../skeleton/Skeleton";
import { api } from "../../api/client";
import { errorMessage } from "../../api/hooks";
import type { FoodDay, FoodLogEntry, MealType, NutritionGoalInput } from "../../api/types";
import {
  MEALS, MEAL_LABEL, fmtDay, todayISO, addDaysISO, sourceLabel, round, mealForNow,
} from "../../lib/food";
import { MiniCalendar } from "./MiniCalendar";
import { AddFoodSheet } from "./AddFoodSheet";

const TABS = ["today", "trends"] as const;

export default function FoodLog() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("today");
  const [date, setDate] = useState(todayISO());
  const [day, setDay] = useState<FoodDay | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const [add, setAdd] = useState<{ open: boolean; meal: MealType }>({ open: false, meal: "breakfast" });
  const [edit, setEdit] = useState<FoodLogEntry | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.food
      .day(date)
      .then((d) => !cancelled && setDay(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [date]);

  useEffect(load, [load]);

  const isToday = date === todayISO();

  return (
    <div className="mx-auto max-w-[1120px]">
      <PageHeader eyebrow="fuel" title="nutrition" ghost="& macros">
        <PillSelector options={TABS} value={tab} onChange={setTab} />
      </PageHeader>

      {tab === "today" && (
        <Reveal key="today" className="space-y-6">
          <DateNav
            date={date}
            onPrev={() => setDate(addDaysISO(date, -1))}
            onNext={() => setDate(addDaysISO(date, 1))}
            onToday={() => setDate(todayISO())}
            onPick={setDate}
            canGoForward={date < addDaysISO(todayISO(), 1)}
          />

          {loading && !day && <Skel className="h-52 w-full" />}
          {error && <ErrorState message={errorMessage(error)} onRetry={load} />}

          {day && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-6">
                <DaySummary day={day} onAdjust={() => setGoalOpen(true)} />
                <LogCard
                  day={day}
                  onAdd={(meal) => setAdd({ open: true, meal })}
                  onEdit={setEdit}
                  onDelete={async (id) => {
                    const r = await api.food.deleteLog(id).catch(() => null);
                    if (r) setDay(r.day);
                  }}
                />
              </div>
              <aside className="space-y-6">
                <QuickActions
                  date={date}
                  isToday={isToday}
                  onQuickAdd={() => setAdd({ open: true, meal: add.meal })}
                  onCopied={setDay}
                />
                <AttributionNote />
              </aside>
            </div>
          )}
        </Reveal>
      )}

      {tab === "trends" && (
        <Reveal key="trends" className="mt-2">
          <Trends />
        </Reveal>
      )}

      <AddFoodSheet
        open={add.open}
        meal={add.meal}
        date={date}
        onClose={() => setAdd((s) => ({ ...s, open: false }))}
        onLogged={(d) => {
          setDay(d);
          setAdd((s) => ({ ...s, open: false }));
        }}
      />

      <EditEntryDrawer
        entry={edit}
        onClose={() => setEdit(null)}
        onUpdated={(d) => {
          setDay(d);
          setEdit(null);
        }}
      />

      <DetailDrawer open={goalOpen} onClose={() => setGoalOpen(false)} title="daily targets" eyebrow="you set these">
        <GoalEditor current={day?.goal ?? null} onDone={() => setGoalOpen(false)} onSaved={load} />
      </DetailDrawer>
    </div>
  );
}

/* ── date navigation ───────────────────────────────────────────────────────── */

function DateNav({
  date, onPrev, onNext, onToday, onPick, canGoForward,
}: {
  date: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onPick: (d: string) => void;
  canGoForward: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          aria-label="Previous day"
          className="focus-ring tactile grid h-9 w-9 place-items-center rounded-pill bg-white/[0.06] text-content-secondary hover:text-content-primary"
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </button>
        <button
          onClick={onNext}
          disabled={!canGoForward}
          aria-label="Next day"
          className="focus-ring tactile grid h-9 w-9 place-items-center rounded-pill bg-white/[0.06] text-content-secondary hover:text-content-primary disabled:opacity-35"
        >
          <ChevronRight size={16} strokeWidth={2} />
        </button>
        <span className="ml-2 text-[1rem] lowercase text-content-primary">{fmtDay(date)}</span>
      </div>
      <div className="flex items-center gap-2">
        <MiniCalendar value={date} max={addDaysISO(todayISO(), 1)} onPick={onPick} />
        {date !== todayISO() && (
          <button
            onClick={onToday}
            className="focus-ring tactile h-9 rounded-pill bg-white/[0.06] px-3 text-[0.8rem] lowercase text-content-secondary hover:text-content-primary"
          >
            today
          </button>
        )}
      </div>
    </div>
  );
}

/* ── daily summary ─────────────────────────────────────────────────────────── */

function DaySummary({ day, onAdjust }: { day: FoodDay; onAdjust: () => void }) {
  const { totals, goal, remaining } = day;
  const kcalGoal = goal?.dailyCalories ?? 0;
  const kcalFraction = kcalGoal ? totals.calories / kcalGoal : 0;
  const left = remaining?.calories ?? null;

  const macros: [string, number, number | null, number | null, string][] = [
    ["protein", totals.protein, goal?.proteinGrams ?? null, remaining?.protein ?? null, "var(--accent-lime)"],
    ["carbs", totals.carbs, goal?.carbGrams ?? null, remaining?.carbs ?? null, "var(--accent-cyan)"],
    ["fat", totals.fat, goal?.fatGrams ?? null, remaining?.fat ?? null, "var(--accent-amber)"],
  ];

  return (
    <section className="surface-soft p-5 sm:p-6">
      <header className="mb-5 flex items-center justify-between">
        <h2 className="label-soft lowercase">{fmtDay(day.date)}</h2>
        <button
          onClick={onAdjust}
          className="focus-ring tactile rounded-pill bg-white/[0.06] px-3 py-1.5 text-[0.78rem] lowercase text-content-secondary hover:text-content-primary"
        >
          {goal ? "adjust targets" : "set targets"}
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-6">
        <div className="relative grid shrink-0 place-items-center">
          <RingProgress
            fraction={kcalFraction}
            size={132}
            color="var(--accent-pink)"
            ariaLabel={`${Math.round(totals.calories)} of ${kcalGoal || "no"} kcal`}
          />
          <div className="absolute text-center">
            <div className="metric-numeral text-[1.55rem] text-content-primary tabular-nums">
              {Math.round(totals.calories)}
            </div>
            <div className="label-instrument mt-0.5">/ {kcalGoal || "—"} kcal</div>
          </div>
        </div>

        <div className="min-w-[12rem] flex-1 space-y-3.5">
          {macros.map(([label, have, want, rem, color]) => (
            <div key={label}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="label-instrument">{label}</span>
                <span className="text-[0.82rem] tabular-nums text-content-secondary">
                  {round(have)}
                  <span className="text-content-tertiary"> / {want ?? "—"} g</span>
                  {rem != null && (
                    <span className={rem < 0 ? "text-[var(--accent-amber)]" : "text-content-tertiary"}>
                      {" "}
                      · {rem < 0 ? `${Math.abs(rem)} over` : `${rem} left`}
                    </span>
                  )}
                </span>
              </div>
              <BarProgress
                fraction={want ? have / want : 0}
                color={color}
                height={8}
                ariaLabel={`${label} ${round(have)} of ${want ?? 0} grams`}
              />
            </div>
          ))}
        </div>
      </div>

      <p className="mt-5 text-[0.82rem] text-content-tertiary">
        {left == null
          ? "set a calorie target to see what's remaining"
          : left < 0
            ? `${Math.abs(left)} kcal over target`
            : `${left} kcal remaining`}
      </p>
    </section>
  );
}

/* ── the log — one card, meals grouped inside ─────────────────────────────── */

function LogCard({
  day, onAdd, onEdit, onDelete,
}: {
  day: FoodDay;
  onAdd: (meal: MealType) => void;
  onEdit: (e: FoodLogEntry) => void;
  onDelete: (id: string) => void;
}) {
  const total = day.meals && Object.values(day.meals).reduce((n, l) => n + (l?.length ?? 0), 0);

  return (
    <section className="surface-soft p-5 sm:p-6">
      <header className="flex items-center justify-between">
        <h2 className="label-soft lowercase">log food</h2>
        <button
          onClick={() => onAdd(mealForNow())}
          className="focus-ring tactile inline-flex items-center gap-1.5 rounded-pill bg-white/[0.08] px-3.5 py-2 text-[0.8rem] lowercase text-content-primary hover:bg-white/[0.14]"
        >
          <Plus size={13} strokeWidth={2.25} /> add food
        </button>
      </header>

      {total === 0 && (
        <p className="mt-4 text-[0.85rem] text-content-tertiary">
          nothing logged for {fmtDay(day.date)} yet. search a food, scan a barcode, or add it manually.
        </p>
      )}

      <div className="mt-3 divide-y divide-[var(--line-soft)]">
        {MEALS.map((meal) => {
          const entries = day.meals[meal] ?? [];
          if (entries.length === 0) return null;
          const kcal = Math.round(day.mealTotals[meal]?.calories ?? 0);
          return (
            <div key={meal} className="py-3 first:pt-1">
              <div className="mb-1 flex items-center justify-between">
                <span className="label-instrument">{MEAL_LABEL[meal]}</span>
                <span className="label-instrument tabular-nums">{kcal} kcal</span>
              </div>
              <ul>
                {entries.map((e) => (
                  <li key={e.id} className="group flex items-center gap-3 py-1.5">
                    <button onClick={() => onEdit(e)} className="focus-ring min-w-0 flex-1 text-left">
                      <span className="block truncate text-[0.9rem] text-content-primary">
                        {e.foodName}
                        {e.brand && <span className="text-content-tertiary"> · {e.brand}</span>}
                      </span>
                      <span className="label-instrument">
                        {formatQty(e)} · {Math.round(e.calories)} kcal · {round(e.protein)}p
                      </span>
                    </button>
                    <button
                      onClick={() => onEdit(e)}
                      aria-label={`Edit ${e.foodName}`}
                      className="focus-ring text-content-tertiary opacity-0 transition-opacity hover:text-content-secondary group-hover:opacity-100"
                    >
                      <Pencil size={13} strokeWidth={1.9} />
                    </button>
                    <button
                      onClick={() => onDelete(e.id)}
                      aria-label={`Delete ${e.foodName}`}
                      className="focus-ring text-content-tertiary hover:text-[var(--accent-amber)]"
                    >
                      <Trash2 size={13} strokeWidth={1.9} />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => onAdd(meal)}
                className="focus-ring mt-1 inline-flex items-center gap-1 text-[0.76rem] lowercase text-content-tertiary hover:text-content-secondary"
              >
                <Plus size={11} strokeWidth={2.25} /> add to {MEAL_LABEL[meal]}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function formatQty(e: FoodLogEntry): string {
  if (e.servingUnit === "g") return `${round(e.quantity)} g`;
  if (e.servingUnit === "oz") return `${round(e.quantity)} oz`;
  const n = round(e.quantity, 2);
  return `${n} serving${n === 1 ? "" : "s"}${e.grams ? ` · ${Math.round(e.grams)} g` : ""}`;
}

/* ── edit / delete an entry ────────────────────────────────────────────────── */

function EditEntryDrawer({
  entry, onClose, onUpdated,
}: {
  entry: FoodLogEntry | null;
  onClose: () => void;
  onUpdated: (d: FoodDay) => void;
}) {
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState<"serving" | "g" | "oz">("serving");
  const [meal, setMeal] = useState<MealType>("breakfast");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!entry) return;
    setQty(String(round(entry.quantity, 2)));
    setUnit((entry.servingUnit as "serving" | "g" | "oz") ?? "serving");
    setMeal(entry.mealType);
  }, [entry]);

  const canServing = Boolean(entry?.foodId) || entry?.servingUnit === "serving";

  const save = async () => {
    if (!entry) return;
    setBusy(true);
    const r = await api.food
      .updateLog(entry.id, { quantity: Number.parseFloat(qty) || 1, servingUnit: unit, mealType: meal })
      .catch(() => null);
    setBusy(false);
    if (r) onUpdated(r.day);
  };

  const remove = async () => {
    if (!entry) return;
    setBusy(true);
    const r = await api.food.deleteLog(entry.id).catch(() => null);
    setBusy(false);
    if (r) onUpdated(r.day);
  };

  return (
    <DetailDrawer open={Boolean(entry)} onClose={onClose} title={entry?.foodName ?? "entry"} eyebrow="edit">
      {entry && (
        <div className="space-y-5">
          {entry.foodId && (
            <p className="text-[0.8rem] text-content-tertiary">
              nutrition updates when you change the amount. quick-add entries keep their numbers.
            </p>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="label-instrument">amount</span>
              <input
                inputMode="decimal"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="focus-ring mt-1.5 w-24 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 text-[0.9rem] tabular-nums text-content-primary outline-none"
              />
            </label>
            <div>
              <span className="label-instrument">unit</span>
              <div className="mt-1.5">
                <PillSelector
                  options={(canServing ? ["serving", "g", "oz"] : ["g", "oz"]) as ("serving" | "g" | "oz")[]}
                  value={unit}
                  onChange={setUnit}
                />
              </div>
            </div>
          </div>
          <div>
            <span className="label-instrument">meal</span>
            <div className="mt-1.5">
              <PillSelector options={MEALS} value={meal} onChange={setMeal} />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Button onClick={save} disabled={busy}>save changes</Button>
            <button
              onClick={remove}
              disabled={busy}
              className="focus-ring inline-flex items-center gap-1.5 text-[0.82rem] lowercase text-content-tertiary hover:text-[var(--accent-amber)]"
            >
              <Trash2 size={13} strokeWidth={1.9} /> delete
            </button>
          </div>
        </div>
      )}
    </DetailDrawer>
  );
}

/* ── goal editor ───────────────────────────────────────────────────────────── */

function GoalEditor({
  current, onDone, onSaved,
}: {
  current: FoodDay["goal"];
  onDone: () => void;
  onSaved: () => void;
}) {
  const [v, setV] = useState({
    dailyCalories: String(current?.dailyCalories ?? ""),
    proteinGrams: String(current?.proteinGrams ?? ""),
    carbGrams: String(current?.carbGrams ?? ""),
    fatGrams: String(current?.fatGrams ?? ""),
    fiberGrams: String(current?.fiberGrams ?? ""),
  });
  const [busy, setBusy] = useState(false);

  const fields: [keyof typeof v, string][] = [
    ["dailyCalories", "calories (kcal)"],
    ["proteinGrams", "protein (g)"],
    ["carbGrams", "carbs (g)"],
    ["fatGrams", "fat (g)"],
    ["fiberGrams", "fiber (g) · optional"],
  ];

  const save = async () => {
    setBusy(true);
    const n = (s: string): number | null => {
      const x = Number.parseFloat(s);
      return Number.isFinite(x) && x >= 0 ? x : null;
    };
    const body: NutritionGoalInput = {
      dailyCalories: n(v.dailyCalories) == null ? null : Math.round(n(v.dailyCalories)!),
      proteinGrams: n(v.proteinGrams),
      carbGrams: n(v.carbGrams),
      fatGrams: n(v.fatGrams),
      fiberGrams: n(v.fiberGrams),
    };
    await api.food.setGoal(body).catch(() => {});
    setBusy(false);
    onSaved();
    onDone();
  };

  return (
    <div className="space-y-4">
      <p className="text-[0.82rem] leading-relaxed text-content-secondary">
        enter your own daily targets. nothing here is a medical recommendation — set what you're
        aiming for and leave the rest blank.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {fields.map(([key, label]) => (
          <label key={key} className="block">
            <span className="label-instrument">{label}</span>
            <input
              inputMode="decimal"
              value={v[key]}
              onChange={(e) => setV((s) => ({ ...s, [key]: e.target.value }))}
              className="focus-ring mt-1.5 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 text-[0.9rem] tabular-nums text-content-primary outline-none"
            />
          </label>
        ))}
      </div>
      <Button onClick={save} disabled={busy}>save targets</Button>
    </div>
  );
}

/* ── sidebar: quick actions ───────────────────────────────────────────────── */

function QuickActions({
  date, isToday, onQuickAdd, onCopied,
}: {
  date: string;
  isToday: boolean;
  onQuickAdd: () => void;
  onCopied: (d: FoodDay) => void;
}) {
  const [busy, setBusy] = useState(false);
  const copyYesterday = async () => {
    setBusy(true);
    const r = await api.food
      .copy({ fromDate: addDaysISO(date, -1), toDate: date })
      .catch(() => null);
    setBusy(false);
    if (r) onCopied(r.day);
  };

  return (
    <section className="surface-soft p-5">
      <h2 className="label-soft lowercase">quick actions</h2>
      <div className="mt-3 space-y-2">
        <button
          onClick={onQuickAdd}
          className="focus-ring tactile flex w-full items-center gap-2 rounded-pill bg-white/[0.06] px-3.5 py-2.5 text-[0.83rem] lowercase text-content-primary hover:bg-white/[0.12]"
        >
          <Sparkles size={14} strokeWidth={1.9} /> quick add calories
        </button>
        <button
          onClick={copyYesterday}
          disabled={busy}
          className="focus-ring tactile flex w-full items-center gap-2 rounded-pill bg-white/[0.06] px-3.5 py-2.5 text-[0.83rem] lowercase text-content-secondary hover:text-content-primary disabled:opacity-50"
        >
          <CopyPlus size={14} strokeWidth={1.9} /> copy {isToday ? "yesterday" : "the day before"}
        </button>
      </div>
    </section>
  );
}

function AttributionNote() {
  return (
    <p className="px-1 text-[0.72rem] leading-relaxed text-content-tertiary">
      food data from{" "}
      <a
        href="https://world.openfoodfacts.org"
        target="_blank"
        rel="noreferrer"
        className="focus-ring underline hover:text-content-secondary"
      >
        Open Food Facts
      </a>{" "}
      (ODbL) and{" "}
      <a
        href="https://fdc.nal.usda.gov"
        target="_blank"
        rel="noreferrer"
        className="focus-ring underline hover:text-content-secondary"
      >
        USDA FoodData Central
      </a>
      .
    </p>
  );
}

/* ── trends ────────────────────────────────────────────────────────────────── */

function Trends() {
  const [data, setData] = useState<{ date: string; calories: number; protein: number }[] | null>(null);
  const [err, setErr] = useState<Error | null>(null);

  useEffect(() => {
    api.food
      .summary(14)
      .then((r) => setData(r.days))
      .catch((e) => setErr(e instanceof Error ? e : new Error(String(e))));
  }, []);

  if (err) return <ErrorState message={errorMessage(err)} />;
  if (!data) return <Skel className="h-52 w-full" />;
  if (data.length === 0)
    return (
      <EmptyState
        title="no history yet"
        icon={<Utensils size={18} strokeWidth={1.75} />}
        body="log food for a few days and your calorie and protein trend shows up here."
      />
    );

  const maxKcal = Math.max(1, ...data.map((d) => d.calories));
  const avgKcal = Math.round(data.reduce((s, d) => s + d.calories, 0) / data.length);
  const avgProtein = Math.round(data.reduce((s, d) => s + d.protein, 0) / data.length);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["avg calories", `${avgKcal}`],
          ["avg protein", `${avgProtein} g`],
        ].map(([label, value]) => (
          <div key={label} className="surface-soft p-5">
            <div className="metric-numeral text-[1.4rem] text-content-primary tabular-nums">{value}</div>
            <div className="label-instrument mt-1">{label}</div>
          </div>
        ))}
      </div>
      <section className="surface-soft p-5 sm:p-6">
        <h2 className="label-soft lowercase">last {data.length} logged days</h2>
        <ul className="mt-4 space-y-3.5">
          {data.map((d) => (
            <li key={d.date} className="flex items-center gap-4">
              <span className="w-24 shrink-0 text-[0.82rem] lowercase text-content-secondary">{fmtDay(d.date)}</span>
              <BarProgress
                fraction={d.calories / maxKcal}
                color="var(--accent-pink)"
                height={8}
                className="flex-1"
                ariaLabel={`${Math.round(d.calories)} kcal`}
              />
              <span className="w-24 shrink-0 text-right label-instrument tabular-nums">
                {Math.round(d.calories)} · {Math.round(d.protein)}p
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export { sourceLabel };
