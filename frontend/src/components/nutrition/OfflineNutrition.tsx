import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Minus } from "lucide-react";
import { PageHeader } from "../PageHeader";
import { Reveal } from "../Reveal";
import { EmptyState } from "../EmptyState";
import { Button, PillSelector } from "../primitives";
import { BarProgress, RingProgress, DotProgress } from "../health/ProgressIndicator";
import { DetailDrawer } from "../dashboard/DetailDrawer";
import {
  addMeal,
  removeMeal,
  addQuickLog,
  removeLastQuickLog,
  saveNutritionTargets,
  useFormaData,
  waterCupsToday,
  type NutritionTargets,
} from "../../lib/localStore";
import {
  deriveTargets,
  mealsByDay,
  sumMeals,
  QUICK_ADDS,
  WATER_CUP_ML,
  WATER_CUP_TARGET,
} from "../../lib/nutrition";
import { API_ENABLED } from "../../api/hooks";
import { api } from "../../api/client";

const TABS = ["today", "trends"] as const;

const todayKey = () => new Date().toISOString().slice(0, 10);
const fmtDay = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

export default function OfflineNutrition() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("today");
  const data = useFormaData();

  const targets = useMemo<NutritionTargets | null>(() => {
    if (data.nutritionTargets) return data.nutritionTargets;
    const auto = deriveTargets(data.profile);
    return auto ? { kcal: auto.kcal, protein: auto.protein, carbs: auto.carbs, fat: auto.fat } : null;
  }, [data.nutritionTargets, data.profile]);
  const basis = useMemo(() => deriveTargets(data.profile)?.basis ?? null, [data.profile]);
  const custom = Boolean(data.nutritionTargets);

  const today = todayKey();
  const todayMeals = useMemo(() => data.meals.filter((m) => m.date === today), [data.meals, today]);
  const totals = useMemo(() => sumMeals(todayMeals), [todayMeals]);

  return (
    <div className="mx-auto max-w-[1120px]">
      <PageHeader eyebrow="fuel" title="nutrition" ghost="& macros">
        <PillSelector options={TABS} value={tab} onChange={setTab} />
      </PageHeader>

      {tab === "today" && (
        <Reveal key="today" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-6">
            <TodayTargets targets={targets} totals={totals} custom={custom} basis={basis} />
            <QuickLogMeals />
            <TodayList meals={todayMeals} />
          </div>
          <aside className="space-y-6">
            <WaterCard cups={waterCupsToday(data)} />
            {!targets && (
              <div className="surface-soft p-5 text-[0.85rem] leading-relaxed text-content-secondary">
                add your bodyweight in{" "}
                <Link to="/settings/training" className="focus-ring underline hover:text-content-primary">
                  training profile
                </Link>{" "}
                and we'll estimate calorie and protein targets for you.
              </div>
            )}
          </aside>
        </Reveal>
      )}

      {tab === "trends" && (
        <Reveal key="trends">
          <Trends targets={targets} />
        </Reveal>
      )}
    </div>
  );
}

/* ── today: targets ─────────────────────────────────────────────────────────── */

function TodayTargets({
  targets,
  totals,
  custom,
  basis,
}: {
  targets: NutritionTargets | null;
  totals: { kcal: number; protein: number; carbs: number; fat: number };
  custom: boolean;
  basis: string | null;
}) {
  const [editing, setEditing] = useState(false);

  const kcalTarget = targets?.kcal ?? 0;
  const kcalFraction = kcalTarget ? totals.kcal / kcalTarget : 0;
  const remaining = kcalTarget ? Math.max(0, kcalTarget - Math.round(totals.kcal)) : null;

  const macros: [string, number, number, string][] = [
    ["protein", totals.protein, targets?.protein ?? 0, "var(--accent-lime)"],
    ["carbs", totals.carbs, targets?.carbs ?? 0, "var(--accent-cyan)"],
    ["fat", totals.fat, targets?.fat ?? 0, "var(--accent-amber)"],
  ];

  return (
    <section className="surface-soft p-5 sm:p-6">
      <header className="mb-5 flex items-center justify-between">
        <h2 className="label-soft lowercase">today</h2>
        {targets && (
          <button
            onClick={() => setEditing(true)}
            className="focus-ring tactile rounded-pill bg-white/[0.06] px-3 py-1.5 text-[0.78rem] lowercase text-content-secondary hover:text-content-primary"
          >
            adjust targets
          </button>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-6">
        <div className="relative grid shrink-0 place-items-center">
          <RingProgress
            fraction={kcalFraction}
            size={128}
            color="var(--accent-pink)"
            ariaLabel={`${Math.round(totals.kcal)} of ${kcalTarget || "—"} kcal`}
          />
          <div className="absolute text-center">
            <div className="metric-numeral text-[1.5rem] text-content-primary tabular-nums">
              {Math.round(totals.kcal)}
            </div>
            <div className="label-instrument mt-0.5">/ {kcalTarget || "—"} kcal</div>
          </div>
        </div>

        <div className="min-w-[12rem] flex-1 space-y-3.5">
          {macros.map(([label, have, want, color]) => (
            <div key={label}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="label-instrument">{label}</span>
                <span className="text-[0.82rem] tabular-nums text-content-secondary">
                  {Math.round(have)}
                  <span className="text-content-tertiary"> / {want || "—"} g</span>
                </span>
              </div>
              <BarProgress
                fraction={want ? have / want : 0}
                color={color}
                height={8}
                ariaLabel={`${label} ${Math.round(have)} of ${want} grams`}
              />
            </div>
          ))}
        </div>
      </div>

      <p className="mt-5 text-[0.82rem] text-content-tertiary">
        {remaining != null
          ? `${remaining} kcal left today`
          : "log a meal to start tracking"}
        {basis && !custom && <> · {basis}</>}
        {custom && <> · custom targets</>}
      </p>

      <DetailDrawer open={editing} onClose={() => setEditing(false)} title="daily targets" eyebrow="adjust">
        <TargetsEditor
          current={targets}
          onDone={() => setEditing(false)}
        />
      </DetailDrawer>
    </section>
  );
}

function TargetsEditor({
  current,
  onDone,
}: {
  current: NutritionTargets | null;
  onDone: () => void;
}) {
  const [kcal, setKcal] = useState(String(current?.kcal ?? ""));
  const [protein, setProtein] = useState(String(current?.protein ?? ""));
  const [carbs, setCarbs] = useState(String(current?.carbs ?? ""));
  const [fat, setFat] = useState(String(current?.fat ?? ""));

  const fields: [string, string, (v: string) => void][] = [
    ["calories (kcal)", kcal, setKcal],
    ["protein (g)", protein, setProtein],
    ["carbs (g)", carbs, setCarbs],
    ["fat (g)", fat, setFat],
  ];

  const save = () => {
    const n = (s: string) => Math.max(0, Math.round(Number.parseFloat(s) || 0));
    saveNutritionTargets({ kcal: n(kcal), protein: n(protein), carbs: n(carbs), fat: n(fat) });
    onDone();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {fields.map(([label, value, set]) => (
          <label key={label} className="block">
            <span className="label-instrument">{label}</span>
            <input
              inputMode="decimal"
              value={value}
              onChange={(e) => set(e.target.value)}
              className="focus-ring mt-1.5 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 text-[0.9rem] tabular-nums text-content-primary outline-none"
            />
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={save}>save targets</Button>
        <button
          onClick={() => {
            saveNutritionTargets(null);
            onDone();
          }}
          className="focus-ring text-[0.82rem] lowercase text-content-tertiary underline hover:text-content-secondary"
        >
          reset to auto
        </button>
      </div>
    </div>
  );
}

/* ── today: quick-log ───────────────────────────────────────────────────────── */

function log(entry: { label: string; kcal: number | null; protein: number | null; carbs: number | null; fat: number | null }) {
  addMeal(entry);
  if (API_ENABLED) {
    void api.progress
      .addNutrition({
        date: new Date().toISOString().slice(0, 10),
        label: entry.label || undefined,
        calories: entry.kcal ?? undefined,
        proteinG: entry.protein ?? undefined,
        carbsG: entry.carbs ?? undefined,
        fatG: entry.fat ?? undefined,
      })
      .catch(() => {});
  }
}

function QuickLogMeals() {
  const [label, setLabel] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  const num = (s: string) => {
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? n : null;
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!label.trim() && !kcal && !protein && !carbs && !fat) return;
    log({
      label: label.trim() || "logged item",
      kcal: num(kcal),
      protein: num(protein),
      carbs: num(carbs),
      fat: num(fat),
    });
    setLabel("");
    setKcal("");
    setProtein("");
    setCarbs("");
    setFat("");
  };

  const inputCls =
    "focus-ring h-9 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-center text-[0.85rem] tabular-nums text-content-primary placeholder:text-content-tertiary";

  return (
    <section className="surface-soft p-5 sm:p-6">
      <h2 className="label-soft lowercase">add food</h2>

      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_ADDS.map((q) => (
          <button
            key={q.label}
            onClick={() => log({ label: q.label, kcal: q.kcal, protein: q.protein, carbs: q.carbs, fat: q.fat })}
            className="focus-ring tactile rounded-pill border border-white/10 px-3 py-1.5 text-[0.8rem] lowercase text-content-tertiary transition-colors hover:text-content-secondary"
          >
            + {q.label}
            <span className="ml-1.5 text-content-tertiary/60">{q.kcal} kcal</span>
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-4 space-y-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="what did you eat?"
          className="focus-ring h-9 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[0.85rem] text-content-primary placeholder:text-content-tertiary"
        />
        <div className="flex flex-wrap items-center gap-2">
          <input value={kcal} onChange={(e) => setKcal(e.target.value)} inputMode="numeric" placeholder="kcal" className={`${inputCls} w-16`} />
          <input value={protein} onChange={(e) => setProtein(e.target.value)} inputMode="decimal" placeholder="p (g)" className={`${inputCls} w-16`} />
          <input value={carbs} onChange={(e) => setCarbs(e.target.value)} inputMode="decimal" placeholder="c (g)" className={`${inputCls} w-16`} />
          <input value={fat} onChange={(e) => setFat(e.target.value)} inputMode="decimal" placeholder="f (g)" className={`${inputCls} w-16`} />
          <button
            type="submit"
            className="focus-ring tactile inline-flex h-9 items-center gap-1.5 rounded-pill bg-white/[0.06] px-3.5 text-[0.8rem] lowercase text-content-primary hover:bg-white/[0.12]"
          >
            <Plus size={13} strokeWidth={2.25} /> add
          </button>
        </div>
      </form>
    </section>
  );
}

function TodayList({ meals }: { meals: ReturnType<typeof useFormaData>["meals"] }) {
  if (meals.length === 0) return null;
  return (
    <section className="surface-soft p-5 sm:p-6">
      <h2 className="label-soft lowercase">logged today</h2>
      <ul className="mt-3 divide-y divide-[var(--line-soft)]">
        {meals.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-4 py-2.5 text-[0.88rem]">
            <span className="min-w-0 truncate text-content-primary lowercase">{m.label}</span>
            <span className="flex shrink-0 items-center gap-3 label-instrument">
              <span className="tabular-nums">
                {m.kcal != null && `${Math.round(m.kcal)} kcal`}
                {m.protein != null && ` · ${Math.round(m.protein)}p`}
              </span>
              <button
                aria-label="Remove entry"
                onClick={() => removeMeal(m.id)}
                className="focus-ring text-content-tertiary hover:text-content-secondary"
              >
                <Trash2 size={13} strokeWidth={1.9} />
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── today: water ───────────────────────────────────────────────────────────── */

function WaterCard({ cups }: { cups: number }) {
  const ml = cups * WATER_CUP_ML;
  return (
    <section className="surface-soft p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="label-soft lowercase">water</h2>
        <span className="label-instrument tabular-nums">
          {(ml / 1000).toFixed(2)} L
        </span>
      </div>
      <div className="mt-4">
        <DotProgress
          done={Math.min(cups, WATER_CUP_TARGET)}
          total={WATER_CUP_TARGET}
          color="var(--accent-cyan)"
          ariaLabel={`${cups} of ${WATER_CUP_TARGET} cups`}
        />
      </div>
      <p className="mt-3 text-[0.8rem] text-content-tertiary">
        {cups} / {WATER_CUP_TARGET} cups · {WATER_CUP_ML} ml each
      </p>
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => addQuickLog("water", WATER_CUP_ML, "ml")}
          className="focus-ring tactile inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-pill bg-white/[0.06] text-[0.82rem] lowercase text-content-primary hover:bg-white/[0.12]"
        >
          <Plus size={13} strokeWidth={2.25} /> cup
        </button>
        <button
          onClick={() => removeLastQuickLog("water")}
          disabled={cups === 0}
          aria-label="Undo last cup"
          className="focus-ring tactile grid h-9 w-9 place-items-center rounded-pill bg-white/[0.06] text-content-secondary hover:bg-white/[0.12] disabled:opacity-40"
        >
          <Minus size={14} strokeWidth={2.25} />
        </button>
      </div>
    </section>
  );
}

/* ── trends ─────────────────────────────────────────────────────────────────── */

function Trends({ targets }: { targets: NutritionTargets | null }) {
  const data = useFormaData();
  const days = useMemo(() => mealsByDay(data.meals).slice(0, 14), [data.meals]);

  if (days.length === 0) {
    return (
      <Reveal className="mt-6">
        <EmptyState
          title="no history yet"
          body="log meals for a few days and your calorie and protein trend shows up here."
        />
      </Reveal>
    );
  }

  const logged = days.length;
  const avgKcal = Math.round(days.reduce((s, d) => s + d.totals.kcal, 0) / logged);
  const avgProtein = Math.round(days.reduce((s, d) => s + d.totals.protein, 0) / logged);
  const proteinHits = targets?.protein
    ? days.filter((d) => d.totals.protein >= targets.protein * 0.95).length
    : 0;
  const maxKcal = Math.max(targets?.kcal ?? 0, ...days.map((d) => d.totals.kcal), 1);

  const tiles: [string, string][] = [
    ["avg calories", `${avgKcal}`],
    ["avg protein", `${avgProtein} g`],
    [
      "protein target hit",
      targets?.protein ? `${proteinHits} / ${logged} days` : "set a target",
    ],
  ];

  return (
    <>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        {tiles.map(([label, value]) => (
          <div key={label} className="surface-soft p-5">
            <div className="metric-numeral text-[1.4rem] text-content-primary tabular-nums">{value}</div>
            <div className="label-instrument mt-1">{label}</div>
          </div>
        ))}
      </div>

      <section className="surface-soft mt-6 p-5 sm:p-6">
        <h2 className="label-soft lowercase">last {logged} logged day{logged > 1 ? "s" : ""}</h2>
        <ul className="mt-4 space-y-3.5">
          {days.map((d) => {
            const over = targets?.kcal ? d.totals.kcal > targets.kcal * 1.05 : false;
            return (
              <li key={d.date} className="flex items-center gap-4">
                <span className="w-28 shrink-0 text-[0.82rem] text-content-secondary lowercase">
                  {fmtDay(d.date)}
                </span>
                <BarProgress
                  fraction={d.totals.kcal / maxKcal}
                  color={over ? "var(--accent-amber)" : "var(--accent-pink)"}
                  height={8}
                  className="flex-1"
                  ariaLabel={`${Math.round(d.totals.kcal)} kcal`}
                />
                <span className="w-24 shrink-0 text-right label-instrument tabular-nums">
                  {Math.round(d.totals.kcal)} · {Math.round(d.totals.protein)}p
                </span>
              </li>
            );
          })}
        </ul>
        {targets?.kcal && (
          <p className="mt-4 text-[0.8rem] text-content-tertiary">
            target {targets.kcal} kcal · bars past it show amber
          </p>
        )}
      </section>
    </>
  );
}
