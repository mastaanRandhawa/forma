import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { useResource, useAction, API_ENABLED } from "../api/hooks";
import type { NutritionDay } from "../api/types";

/**
 * Daily nutrition log (§5). API-only — there is no offline stand-in, so the card
 * hides itself when the backend is disabled.
 */
export function NutritionCard() {
  const today = new Date().toISOString().slice(0, 10);
  const res = useResource<NutritionDay>("nutrition-today", () => api.progress.nutrition(today));
  const add = useAction((body: Parameters<typeof api.progress.addNutrition>[0]) => api.progress.addNutrition(body));
  const del = useAction((id: string) => api.progress.deleteNutrition(id));

  const [label, setLabel] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");

  if (!API_ENABLED) return null;

  const totals = res.data?.totals ?? { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  const entries = res.data?.entries ?? [];

  async function submit(e: FormEvent) {
    e.preventDefault();
    const cal = Number.parseInt(calories, 10);
    const pro = Number.parseFloat(protein);
    if (!label.trim() && !Number.isFinite(cal) && !Number.isFinite(pro)) return;
    const ok = await add.run({
      date: today,
      label: label.trim() || undefined,
      calories: Number.isFinite(cal) ? cal : undefined,
      proteinG: Number.isFinite(pro) ? pro : undefined,
    });
    if (ok) {
      setLabel("");
      setCalories("");
      setProtein("");
      res.refetch();
    }
  }

  return (
    <div>
      <div className="label-soft lowercase">nutrition · today</div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {[
          ["calories", Math.round(totals.calories), "kcal"],
          ["protein", totals.proteinG, "g"],
          ["carbs", totals.carbsG, "g"],
          ["fat", totals.fatG, "g"],
        ].map(([k, v, u]) => (
          <div key={k as string} className="surface-recessed rounded-hero p-3 text-center">
            <div className="metric-numeral text-[1.3rem] text-content-primary tabular-nums">{v}</div>
            <div className="label-instrument mt-0.5">
              {k} {u}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="what did you eat?"
          className="focus-ring h-9 min-w-[10rem] flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[0.85rem] text-content-primary placeholder:text-content-tertiary"
        />
        <input
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          inputMode="numeric"
          placeholder="kcal"
          className="focus-ring h-9 w-16 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-center text-[0.85rem] tabular-nums text-content-primary placeholder:text-content-tertiary"
        />
        <input
          value={protein}
          onChange={(e) => setProtein(e.target.value)}
          inputMode="decimal"
          placeholder="protein"
          className="focus-ring h-9 w-16 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-center text-[0.85rem] tabular-nums text-content-primary placeholder:text-content-tertiary"
        />
        <button
          type="submit"
          disabled={add.pending}
          className="focus-ring tactile inline-flex h-9 items-center gap-1.5 rounded-pill bg-white/[0.06] px-3 text-[0.8rem] lowercase text-content-primary hover:bg-white/[0.12] disabled:opacity-50"
        >
          <Plus size={13} strokeWidth={2.25} /> add
        </button>
      </form>

      {entries.length > 0 && (
        <ul className="mt-3 divide-y divide-[var(--line-soft)]">
          {entries.map((en) => (
            <li key={en.id} className="flex items-center justify-between py-2 text-[0.85rem]">
              <span className="text-content-primary lowercase">{en.label || "logged item"}</span>
              <span className="flex items-center gap-3 label-instrument">
                {en.calories ? `${en.calories} kcal` : ""}
                {en.proteinG ? ` · ${en.proteinG}g p` : ""}
                <button
                  aria-label="Delete entry"
                  onClick={async () => {
                    await del.run(en.id);
                    res.refetch();
                  }}
                  className="focus-ring text-content-tertiary hover:text-content-secondary"
                >
                  <Trash2 size={13} strokeWidth={1.9} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {res.error && <p className="mt-2 label-instrument text-[var(--accent-pink)]">couldn't load nutrition</p>}
    </div>
  );
}
