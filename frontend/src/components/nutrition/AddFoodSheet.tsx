import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, ScanLine, History, Star, SquarePen, ChevronLeft, Plus,
  Minus, Loader2, Trash2,
} from "lucide-react";
import { DetailDrawer } from "../dashboard/DetailDrawer";
import { EmptyState } from "../EmptyState";
import { Button, PillSelector } from "../primitives";
import { api } from "../../api/client";
import { errorMessage } from "../../api/hooks";
import type {
  Food, FoodDay, FoodSearchResult, MealType, RecentFood, FavoriteFood, CustomFoodInput,
} from "../../api/types";
import {
  MEALS, MEAL_LABEL, previewNutrition, macroMeta, round, sourceLabel,
} from "../../lib/food";
import { BarcodeScanner } from "./BarcodeScanner";

type Tab = "search" | "scan" | "recent" | "favorites" | "manual";
const TAB_META: { key: Tab; label: string; icon: JSX.Element }[] = [
  { key: "search", label: "search", icon: <Search size={14} strokeWidth={1.9} /> },
  { key: "scan", label: "scan", icon: <ScanLine size={14} strokeWidth={1.9} /> },
  { key: "recent", label: "recent", icon: <History size={14} strokeWidth={1.9} /> },
  { key: "favorites", label: "favorites", icon: <Star size={14} strokeWidth={1.9} /> },
  { key: "manual", label: "add manually", icon: <SquarePen size={14} strokeWidth={1.9} /> },
];

/** A food picked from any tab, ready for the serving screen. */
interface Picked {
  source: FoodSearchResult["source"];
  sourceId: string;
  name: string;
  preloaded?: Food;
  quantity?: number;
  servingUnit?: "serving" | "g" | "oz";
}

export function AddFoodSheet({
  open, meal, date, onClose, onLogged,
}: {
  open: boolean;
  meal: MealType;
  date: string;
  onClose: () => void;
  onLogged: (day: FoodDay) => void;
}) {
  const [tab, setTab] = useState<Tab>("search");
  const [picked, setPicked] = useState<Picked | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPicked(null);
      setPhoto(null);
      setTab("search");
    }
  }, [open]);

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title={picked ? picked.name : "add food"}
      eyebrow={picked ? "serving & meal" : MEAL_LABEL[meal]}
    >
      {picked ? (
        <div>
          <button
            onClick={() => setPicked(null)}
            className="focus-ring mb-4 inline-flex items-center gap-1 text-[0.8rem] lowercase text-content-tertiary hover:text-content-secondary"
          >
            <ChevronLeft size={13} strokeWidth={2} /> back to {tab}
          </button>
          <FoodDetail
            picked={picked}
            meal={meal}
            date={date}
            onLogged={onLogged}
          />
        </div>
      ) : (
        <div>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {TAB_META.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`focus-ring inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[0.78rem] lowercase transition-colors ${
                  tab === t.key
                    ? "bg-white/[0.14] text-content-primary"
                    : "bg-white/[0.05] text-content-tertiary hover:text-content-secondary"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {tab === "search" && <SearchTab onPick={setPicked} />}
          {tab === "scan" && (
            <ScanTab
              onPick={setPicked}
              onManual={() => setTab("search")}
              onCustom={() => setTab("manual")}
              onPhoto={(dataUrl) => {
                setPhoto(dataUrl);
                setTab("manual");
              }}
            />
          )}
          {tab === "recent" && <RecentTab onPick={setPicked} />}
          {tab === "favorites" && <FavoritesTab onPick={setPicked} />}
          {tab === "manual" && (
            <ManualEntryTab
              meal={meal}
              date={date}
              photo={photo}
              onClearPhoto={() => setPhoto(null)}
              onLogged={onLogged}
              onPickCustom={setPicked}
            />
          )}
        </div>
      )}
    </DetailDrawer>
  );
}

/* ── search ────────────────────────────────────────────────────────────────── */

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function SearchTab({ onPick }: { onPick: (p: Picked) => void }) {
  const [q, setQ] = useState("");
  const debounced = useDebounced(q.trim(), 450);
  const [results, setResults] = useState<FoodSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<Error | null>(null);
  const [degraded, setDegraded] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    if (debounced.length < 2) {
      setResults(null);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    setErr(null);
    api.food
      .search(debounced)
      .then((r) => {
        if (id !== reqId.current) return;
        setResults(r.results);
        setDegraded(r.degraded);
      })
      .catch((e) => id === reqId.current && setErr(e instanceof Error ? e : new Error(String(e))))
      .finally(() => id === reqId.current && setLoading(false));
  }, [debounced]);

  return (
    <div>
      <div className="relative">
        <Search size={15} strokeWidth={1.9} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-content-tertiary" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search foods — chicken breast, banana, greek yogurt…"
          className="focus-ring h-11 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] pl-10 pr-3 text-[0.9rem] text-content-primary placeholder:text-content-tertiary"
        />
      </div>

      <div className="mt-4 min-h-[8rem]">
        {loading && (
          <p className="flex items-center gap-2 text-[0.82rem] text-content-tertiary">
            <Loader2 size={13} className="animate-spin" /> searching…
          </p>
        )}
        {err && <p className="text-[0.82rem] text-[var(--accent-amber)]">{errorMessage(err)}</p>}
        {!loading && !err && debounced.length >= 2 && results?.length === 0 && (
          <EmptyState title="no matches" body="try a simpler term, or create a custom food." />
        )}
        {!loading && debounced.length < 2 && (
          <p className="text-[0.82rem] text-content-tertiary">type at least 2 characters. generic foods come from USDA.</p>
        )}
        {degraded && (
          <p className="mt-1 text-[0.75rem] text-content-tertiary">a food source was unavailable — showing what we could reach.</p>
        )}
        {results && results.length > 0 && (
          <ul className="mt-1 divide-y divide-[var(--line-soft)]">
            {results.map((r) => (
              <li key={`${r.source}:${r.sourceId}`}>
                <button
                  onClick={() => onPick({ source: r.source, sourceId: r.sourceId, name: r.name })}
                  className="focus-ring flex w-full items-center gap-3 py-2.5 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9rem] text-content-primary">
                      {r.name}
                      {r.brand && <span className="text-content-tertiary"> · {r.brand}</span>}
                    </span>
                    <span className="label-instrument">
                      {sourceLabel(r.source)} · {macroMeta(r.caloriesPer100, r.proteinPer100, r.dataPer, r.perServingOnly)}
                    </span>
                  </span>
                  <Plus size={14} strokeWidth={2} className="shrink-0 text-content-tertiary" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ── scan ──────────────────────────────────────────────────────────────────── */

function ScanTab({
  onPick, onManual, onCustom, onPhoto,
}: {
  onPick: (p: Picked) => void;
  onManual: () => void;
  onCustom: () => void;
  onPhoto: (dataUrl: string) => void;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "looking" | "not-found" | "unavailable">("idle");

  const lookup = async (raw: string) => {
    setCode(raw);
    setState("looking");
    const r = await api.food.barcode(raw).catch(() => null);
    if (r?.food) {
      onPick({ source: r.food.source, sourceId: r.food.sourceId, name: r.food.name, preloaded: r.food });
      return;
    }
    setState(r?.status === "source_unavailable" ? "unavailable" : "not-found");
  };

  return (
    <div className="space-y-4">
      <BarcodeScanner onDetected={lookup} onPhoto={onPhoto} />

      <div className="flex items-center gap-2">
        <input
          inputMode="numeric"
          placeholder="or type a barcode number"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.currentTarget.value.replace(/\D/g, "").length >= 8)
              void lookup(e.currentTarget.value);
          }}
          className="focus-ring h-10 flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 text-[0.88rem] tabular-nums text-content-primary placeholder:text-content-tertiary"
        />
      </div>

      {state === "looking" && (
        <p className="flex items-center gap-2 text-[0.82rem] text-content-tertiary">
          <Loader2 size={13} className="animate-spin" /> looking up {code}…
        </p>
      )}
      {(state === "not-found" || state === "unavailable") && (
        <div className="surface-recessed rounded-[var(--radius-large)] p-4">
          <p className="text-[0.88rem] text-content-primary">
            {state === "unavailable" ? "open food facts is unreachable right now" : "product not found"}
          </p>
          <p className="mt-1 text-[0.8rem] text-content-tertiary">
            {code ? `barcode ${code}. ` : ""}search for it by name or add it as a custom food.
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={onManual} className="focus-ring tactile rounded-pill bg-white/[0.08] px-3.5 py-2 text-[0.8rem] lowercase text-content-primary hover:bg-white/[0.14]">
              search manually
            </button>
            <button onClick={onCustom} className="focus-ring tactile rounded-pill bg-white/[0.08] px-3.5 py-2 text-[0.8rem] lowercase text-content-primary hover:bg-white/[0.14]">
              create custom food
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── recent ────────────────────────────────────────────────────────────────── */

function RecentTab({ onPick }: { onPick: (p: Picked) => void }) {
  const [items, setItems] = useState<RecentFood[] | null>(null);
  useEffect(() => {
    api.food.recent(25).then(setItems).catch(() => setItems([]));
  }, []);

  if (!items) return <p className="text-[0.82rem] text-content-tertiary">loading…</p>;
  if (items.length === 0)
    return <EmptyState title="nothing logged yet" body="foods you log will show up here for one-tap re-logging." />;

  return (
    <ul className="divide-y divide-[var(--line-soft)]">
      {items.map((r) => (
        <li key={`${r.source}:${r.sourceId}`}>
          <button
            onClick={() =>
              onPick({
                source: r.source,
                sourceId: r.sourceId,
                name: r.foodName,
                quantity: r.lastQuantity,
                servingUnit: r.lastServingUnit as "serving" | "g" | "oz",
              })
            }
            className="focus-ring flex w-full items-center gap-3 py-2.5 text-left"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.9rem] text-content-primary">
                {r.foodName}
                {r.brand && <span className="text-content-tertiary"> · {r.brand}</span>}
              </span>
              <span className="label-instrument">
                last: {round(r.lastQuantity, 2)} {r.lastServingUnit} · {Math.round(r.calories)} kcal
              </span>
            </span>
            <Plus size={14} strokeWidth={2} className="shrink-0 text-content-tertiary" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ── favorites ─────────────────────────────────────────────────────────────── */

function FavoritesTab({ onPick }: { onPick: (p: Picked) => void }) {
  const [items, setItems] = useState<FavoriteFood[] | null>(null);
  const reload = () => api.food.favorites().then(setItems).catch(() => setItems([]));
  useEffect(() => {
    void reload();
  }, []);

  if (!items) return <p className="text-[0.82rem] text-content-tertiary">loading…</p>;
  if (items.length === 0)
    return <EmptyState title="no favorites yet" body="star a food on its serving screen to keep it here." />;

  return (
    <ul className="divide-y divide-[var(--line-soft)]">
      {items.map((f) => (
        <li key={f.id} className="flex items-center gap-2">
          <button
            onClick={() => onPick({ source: f.source, sourceId: f.sourceId, name: f.foodName })}
            className="focus-ring flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.9rem] text-content-primary">
                {f.foodName}
                {f.brand && <span className="text-content-tertiary"> · {f.brand}</span>}
              </span>
              <span className="label-instrument">{sourceLabel(f.source)}</span>
            </span>
            <Plus size={14} strokeWidth={2} className="shrink-0 text-content-tertiary" />
          </button>
          <button
            aria-label={`Remove ${f.foodName} from favorites`}
            onClick={async () => {
              await api.food.removeFavorite(f.id).catch(() => {});
              void reload();
            }}
            className="focus-ring text-content-tertiary hover:text-[var(--accent-amber)]"
          >
            <Star size={13} strokeWidth={1.9} className="fill-current" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ── add manually — custom food + quick-add in one form ───────────────────── */

function ManualEntryTab({
  meal, date, photo, onClearPhoto, onLogged, onPickCustom,
}: {
  meal: MealType;
  date: string;
  photo: string | null;
  onClearPhoto: () => void;
  onLogged: (d: FoodDay) => void;
  onPickCustom: (p: Picked) => void;
}) {
  const [mine, setMine] = useState<Food[] | null>(null);
  const reload = () => api.food.customs().then(setMine).catch(() => setMine([]));
  useEffect(() => {
    void reload();
  }, []);

  const [f, setF] = useState({
    name: "", brand: "", servingSize: "1", servingUnit: "serving", servingGrams: "",
    basis: "serving" as "serving" | "100g",
    calories: "", protein: "", carbs: "", fat: "", fiber: "", sugar: "", sodium: "",
  });
  const [m, setM] = useState<MealType>(meal);
  const [save, setSave] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const num = (s: string): number | undefined => {
    const n = Number.parseFloat(s);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };

  const submit = async () => {
    setErr(null);
    const calories = num(f.calories);
    if (calories == null) return setErr("calories are required and can't be negative");
    for (const [k, v] of Object.entries({ protein: f.protein, carbs: f.carbs, fat: f.fat, fiber: f.fiber, sugar: f.sugar, sodium: f.sodium })) {
      if (v.trim() && num(v) == null) return setErr(`${k} can't be negative`);
    }
    setBusy(true);

    if (save) {
      if (!f.name.trim()) {
        setBusy(false);
        return setErr("a saved food needs a name");
      }
      const servingSize = num(f.servingSize);
      if (!servingSize) {
        setBusy(false);
        return setErr("serving size must be greater than 0");
      }
      const body: CustomFoodInput = {
        name: f.name.trim(),
        brand: f.brand.trim() || undefined,
        servingSize,
        servingUnit: f.servingUnit.trim() || "serving",
        servingGrams: num(f.servingGrams),
        basis: f.basis,
        calories,
        protein: num(f.protein),
        carbs: num(f.carbs),
        fat: num(f.fat),
        fiber: num(f.fiber),
        sugar: num(f.sugar),
        sodium: num(f.sodium),
      };
      const created = await api.food.createCustom(body).catch((e) => {
        setErr(errorMessage(e instanceof Error ? e : new Error(String(e))));
        return null;
      });
      if (!created) return setBusy(false);
      const r = await api.food
        .log({ source: "custom", sourceId: created.sourceId, mealType: m, quantity: 1, servingUnit: "serving", date })
        .catch(() => null);
      setBusy(false);
      if (r) onLogged(r.day);
      return;
    }

    // quick add — no reusable food
    const r = await api.food
      .log({
        quickAdd: { name: f.name.trim() || undefined, calories, protein: num(f.protein), carbs: num(f.carbs), fat: num(f.fat) },
        mealType: m,
        date,
      })
      .catch(() => null);
    setBusy(false);
    if (r) onLogged(r.day);
  };

  const input =
    "focus-ring mt-1.5 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-[0.88rem] text-content-primary outline-none placeholder:text-content-tertiary";

  return (
    <div className="space-y-4">
      {photo && (
        <div className="flex items-center gap-3 rounded-[var(--radius-large)] surface-recessed p-2.5">
          <img src={photo} alt="Captured food photo" className="h-14 w-14 rounded-xl object-cover" />
          <p className="flex-1 text-[0.78rem] leading-snug text-content-tertiary">
            photo reference to help you fill this in. it isn't uploaded or stored.
          </p>
          <button
            onClick={onClearPhoto}
            aria-label="Remove photo"
            className="focus-ring text-content-tertiary hover:text-content-secondary"
          >
            <Trash2 size={13} strokeWidth={1.9} />
          </button>
        </div>
      )}

      {mine && mine.length > 0 && (
        <div>
          <span className="label-instrument">your foods</span>
          <ul className="mt-1.5 divide-y divide-[var(--line-soft)]">
            {mine.map((food) => (
              <li key={food.id} className="flex items-center gap-2">
                <button
                  onClick={() => onPickCustom({ source: "custom", sourceId: food.sourceId, name: food.name, preloaded: food })}
                  className="focus-ring flex min-w-0 flex-1 items-center gap-3 py-2 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.88rem] text-content-primary">
                      {food.name}
                      {food.brand && <span className="text-content-tertiary"> · {food.brand}</span>}
                    </span>
                    <span className="label-instrument">
                      {Math.round(food.caloriesPer100)} kcal {food.perServingOnly ? "per serving" : "per 100 g"}
                    </span>
                  </span>
                  <Plus size={13} strokeWidth={2} className="shrink-0 text-content-tertiary" />
                </button>
                <button
                  aria-label={`Delete ${food.name}`}
                  onClick={async () => {
                    await api.food.deleteCustom(food.sourceId).catch(() => {});
                    void reload();
                  }}
                  className="focus-ring text-content-tertiary hover:text-[var(--accent-amber)]"
                >
                  <Minus size={13} strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[0.82rem] leading-relaxed text-content-secondary">
        add anything search and barcode can't find. calories are required; macros optional.
      </p>

      <label className="block">
        <span className="label-instrument">name{save ? " *" : " · optional"}</span>
        <input value={f.name} onChange={set("name")} className={input} placeholder="e.g. grandma's banana bread" />
      </label>

      <div className="grid grid-cols-4 gap-2">
        {([["calories *", "calories"], ["protein", "protein"], ["carbs", "carbs"], ["fat", "fat"]] as [string, keyof typeof f][]).map(([label, key]) => (
          <label key={key} className="block">
            <span className="label-instrument">{label}</span>
            <input value={f[key]} onChange={set(key)} inputMode="decimal" className={`${input} tabular-nums`} />
          </label>
        ))}
      </div>

      <label className="flex items-center gap-2.5 text-[0.85rem] text-content-secondary">
        <input
          type="checkbox"
          checked={save}
          onChange={(e) => setSave(e.target.checked)}
          className="focus-ring h-4 w-4 accent-[var(--accent-pink)]"
        />
        save to my foods (reusable, with a serving size)
      </label>

      {save && (
        <div className="space-y-4 rounded-[var(--radius-large)] surface-recessed p-3">
          <label className="block">
            <span className="label-instrument">brand · optional</span>
            <input value={f.brand} onChange={set("brand")} className={input} />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="block">
              <span className="label-instrument">serving size *</span>
              <input value={f.servingSize} onChange={set("servingSize")} inputMode="decimal" className={`${input} tabular-nums`} />
            </label>
            <label className="block">
              <span className="label-instrument">unit *</span>
              <input value={f.servingUnit} onChange={set("servingUnit")} className={input} placeholder="slice, cup…" />
            </label>
            <label className="block">
              <span className="label-instrument">grams · if known</span>
              <input value={f.servingGrams} onChange={set("servingGrams")} inputMode="decimal" className={`${input} tabular-nums`} />
            </label>
          </div>
          <div>
            <span className="label-instrument">values above are per</span>
            <div className="mt-1.5">
              <PillSelector
                options={["serving", "100g"] as ("serving" | "100g")[]}
                value={f.basis}
                onChange={(v) => setF((s) => ({ ...s, basis: v }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([["fiber (g)", "fiber"], ["sugar (g)", "sugar"], ["sodium (mg)", "sodium"]] as [string, keyof typeof f][]).map(([label, key]) => (
              <label key={key} className="block">
                <span className="label-instrument">{label}</span>
                <input value={f[key]} onChange={set(key)} inputMode="decimal" className={`${input} tabular-nums`} />
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <span className="label-instrument">meal</span>
        <div className="mt-1.5">
          <PillSelector options={MEALS} value={m} onChange={setM} />
        </div>
      </div>

      {err && <p className="text-[0.82rem] text-[var(--accent-amber)]">{err}</p>}
      <Button onClick={submit} disabled={busy || !num(f.calories)}>
        {save ? "save & log" : `add to ${MEAL_LABEL[m]}`}
      </Button>
    </div>
  );
}
/* ── food detail / serving screen ─────────────────────────────────────────── */

function FoodDetail({
  picked, meal, date, onLogged,
}: {
  picked: Picked;
  meal: MealType;
  date: string;
  onLogged: (d: FoodDay) => void;
}) {
  const [food, setFood] = useState<Food | null>(picked.preloaded ?? null);
  const [err, setErr] = useState<Error | null>(null);
  const [qty, setQty] = useState(String(picked.quantity ?? 1));
  const [unit, setUnit] = useState<"serving" | "g" | "oz">(picked.servingUnit ?? "serving");
  const [m, setM] = useState<MealType>(meal);
  const [busy, setBusy] = useState(false);
  const [fav, setFav] = useState(false);

  useEffect(() => {
    if (picked.preloaded) {
      setFood(picked.preloaded);
      return;
    }
    let cancelled = false;
    api.food
      .item(picked.source, picked.sourceId)
      .then((f) => !cancelled && setFood(f))
      .catch((e) => !cancelled && setErr(e instanceof Error ? e : new Error(String(e))));
    return () => {
      cancelled = true;
    };
  }, [picked]);

  const quantity = Number.parseFloat(qty) || 0;
  const preview = useMemo(
    () => (food ? previewNutrition(food, quantity, unit) : null),
    [food, quantity, unit],
  );

  // if the food has no per-100 basis, only "serving" makes sense
  const units = useMemo<("serving" | "g" | "oz")[]>(() => {
    if (!food) return ["serving"];
    if (food.perServingOnly) return ["serving"];
    return ["serving", "g", "oz"];
  }, [food]);
  useEffect(() => {
    if (food && !units.includes(unit)) setUnit(units[0]);
  }, [food, units, unit]);

  if (err) return <p className="text-[0.85rem] text-[var(--accent-amber)]">{errorMessage(err)}</p>;
  if (!food || !preview) return <p className="text-[0.82rem] text-content-tertiary">loading food…</p>;

  const noGrams = unit === "serving" && !food.servingGrams && !food.perServingOnly;

  const step = (delta: number) => {
    const inc = unit === "g" ? 10 : unit === "oz" ? 0.5 : 0.5;
    setQty(String(round(Math.max(inc, quantity + delta * inc), 2)));
  };

  const add = async () => {
    setBusy(true);
    const r = await api.food
      .log({
        source: food.source,
        sourceId: food.sourceId,
        mealType: m,
        quantity: quantity || 1,
        servingUnit: unit,
        date,
      })
      .catch(() => null);
    setBusy(false);
    if (r) onLogged(r.day);
  };

  const toggleFav = async () => {
    setFav((x) => !x);
    await api.food.addFavorite(food.source, food.sourceId).catch(() => setFav(false));
  };

  const macros: [string, number | null, string][] = [
    ["calories", preview.nutrients.calories, ""],
    ["protein", preview.nutrients.protein, "g"],
    ["carbs", preview.nutrients.carbs, "g"],
    ["fat", preview.nutrients.fat, "g"],
  ];
  const micro: [string, number | null, string][] = [
    ["fiber", preview.nutrients.fiber, "g"],
    ["sugar", preview.nutrients.sugar, "g"],
    ["sodium", preview.nutrients.sodium, "mg"],
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        {food.imageUrl && (
          <img
            src={food.imageUrl}
            alt=""
            loading="lazy"
            className="h-16 w-16 shrink-0 rounded-2xl object-cover"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[0.95rem] text-content-primary">{food.name}</p>
          <p className="label-instrument">
            {sourceLabel(food.source)}
            {food.brand ? ` · ${food.brand}` : ""}
          </p>
        </div>
        <button
          onClick={toggleFav}
          aria-pressed={fav}
          aria-label="Save to favorites"
          className={`focus-ring shrink-0 ${fav ? "text-[var(--accent-amber)]" : "text-content-tertiary hover:text-content-secondary"}`}
        >
          <Star size={16} strokeWidth={1.9} className={fav ? "fill-current" : ""} />
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <span className="label-instrument">amount</span>
          <div className="mt-1.5 flex items-center gap-2">
            <button onClick={() => step(-1)} aria-label="Decrease" className="focus-ring tactile grid h-9 w-9 place-items-center rounded-pill bg-white/[0.06] text-content-secondary hover:text-content-primary">
              <Minus size={14} strokeWidth={2.25} />
            </button>
            <input
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="focus-ring w-20 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-center text-[0.95rem] tabular-nums text-content-primary outline-none"
            />
            <button onClick={() => step(1)} aria-label="Increase" className="focus-ring tactile grid h-9 w-9 place-items-center rounded-pill bg-white/[0.06] text-content-secondary hover:text-content-primary">
              <Plus size={14} strokeWidth={2.25} />
            </button>
          </div>
        </div>
        <div>
          <span className="label-instrument">serving</span>
          <div className="mt-1.5">
            <PillSelector options={units} value={unit} onChange={setUnit} />
          </div>
        </div>
      </div>

      {preview.grams != null && (
        <p className="text-[0.78rem] text-content-tertiary">≈ {Math.round(preview.grams)} g</p>
      )}
      {noGrams && (
        <p className="text-[0.78rem] text-[var(--accent-amber)]">
          this source didn't give a gram weight for a serving — switch to grams for exact numbers.
        </p>
      )}

      <div className="grid grid-cols-4 gap-2">
        {macros.map(([label, val, u]) => (
          <div key={label} className="surface-recessed rounded-hero p-3 text-center">
            <div className="metric-numeral text-[1.15rem] text-content-primary tabular-nums">
              {val == null ? "—" : val}
              {u && <span className="text-[0.7rem] text-content-tertiary"> {u}</span>}
            </div>
            <div className="label-instrument mt-0.5">{label}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.78rem] text-content-tertiary">
        {micro.map(([label, val, u]) => (
          <span key={label}>
            {label} {val == null ? "—" : `${val} ${u}`}
          </span>
        ))}
      </div>

      <div>
        <span className="label-instrument">meal</span>
        <div className="mt-1.5">
          <PillSelector options={MEALS} value={m} onChange={setM} />
        </div>
      </div>

      <Button onClick={add} disabled={busy}>
        <Plus size={14} strokeWidth={2.25} /> add to {MEAL_LABEL[m]}
      </Button>
    </div>
  );
}
