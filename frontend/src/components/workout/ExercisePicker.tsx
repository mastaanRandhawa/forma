import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { DetailDrawer } from "../dashboard/DetailDrawer";
import { ExerciseThumb } from "../ExerciseThumb";
import { repdbThumb } from "../../lib/repdb";
import type { RepDbCatalogEntry } from "../../lib/repdb";

/**
 * ExercisePicker — the shared "add / replace an exercise" bottom sheet.
 *
 * Searches the RepDB catalog (works in every build; the Library API is a
 * superset of the same data). Supports a muscle / equipment quick-filter and a
 * "use this name anyway" escape hatch so a custom movement can still be logged.
 */
export function ExercisePicker({
  open,
  onClose,
  onPick,
  title = "add exercise",
  eyebrow,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (name: string) => void;
  title?: string;
  eyebrow?: string;
}) {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [cat, setCat] = useState<RepDbCatalogEntry[]>([]);

  useEffect(() => {
    if (open && cat.length === 0)
      void import("../../lib/repdb.catalog").then((m) => setCat(m.REPDB_CATALOG));
  }, [open, cat.length]);

  useEffect(() => {
    if (!open) {
      setQ("");
      setMuscle(null);
      setEquipment(null);
    }
  }, [open]);

  const muscles = useMemo(() => {
    const s = new Set<string>();
    for (const e of cat) e.primary.forEach((m) => s.add(m));
    return [...s].sort().slice(0, 14);
  }, [cat]);

  const equipmentOpts = useMemo(() => {
    const s = new Set<string>();
    for (const e of cat) if (e.equipment) s.add(e.equipment);
    return [...s].sort();
  }, [cat]);

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return cat
      .filter((e) => {
        if (n && !e.name.toLowerCase().includes(n)) return false;
        if (muscle && !e.primary.includes(muscle)) return false;
        if (equipment && e.equipment !== equipment) return false;
        return true;
      })
      .slice(0, 60);
  }, [q, muscle, equipment, cat]);

  const custom = q.trim();
  const hasExact = shown.some((e) => e.name.toLowerCase() === custom.toLowerCase());

  const chip = (active: boolean) =>
    `focus-ring shrink-0 rounded-pill px-3 py-1 text-[0.74rem] lowercase transition-colors ${
      active ? "surface-float text-content-primary" : "surface-recessed text-content-tertiary hover:text-content-secondary"
    }`;

  return (
    <DetailDrawer open={open} onClose={onClose} title={title} eyebrow={eyebrow}>
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-content-tertiary" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search exercises…"
          autoFocus
          className="focus-ring surface-recessed w-full rounded-pill py-2.5 pl-10 pr-4 text-[0.9rem] text-content-primary outline-none placeholder:text-content-tertiary"
        />
      </div>

      {muscles.length > 0 && (
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
          <button className={chip(!muscle)} onClick={() => setMuscle(null)}>
            all muscles
          </button>
          {muscles.map((m) => (
            <button key={m} className={chip(muscle === m)} onClick={() => setMuscle(muscle === m ? null : m)}>
              {m.toLowerCase()}
            </button>
          ))}
        </div>
      )}
      {equipmentOpts.length > 0 && (
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
          <button className={chip(!equipment)} onClick={() => setEquipment(null)}>
            any equipment
          </button>
          {equipmentOpts.map((eq) => (
            <button
              key={eq}
              className={chip(equipment === eq)}
              onClick={() => setEquipment(equipment === eq ? null : eq)}
            >
              {eq.toLowerCase()}
            </button>
          ))}
        </div>
      )}

      {custom && !hasExact && (
        <button
          onClick={() => {
            onPick(custom);
            onClose();
          }}
          className="focus-ring mb-2 flex w-full items-center gap-2 rounded-[var(--radius-large)] border border-dashed border-[var(--line-soft)] px-3 py-2.5 text-left text-[0.85rem] lowercase text-content-secondary hover:text-content-primary"
        >
          <Plus size={14} /> use "{custom}" as a custom exercise
        </button>
      )}

      <div className="divide-y divide-[var(--line-soft)]">
        {shown.map((e) => (
          <button
            key={e.id}
            onClick={() => {
              onPick(e.name);
              onClose();
            }}
            className="focus-ring flex w-full items-center gap-3 py-2.5 text-left"
          >
            <ExerciseThumb src={repdbThumb(e.name)} alt="" size={40} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.92rem] lowercase text-content-primary">{e.name}</span>
              <span className="label-instrument">
                {(e.primary[0] ?? e.bodyPart) + " · " + e.equipment}
              </span>
            </span>
          </button>
        ))}
        {cat.length > 0 && shown.length === 0 && (
          <p className="label-instrument py-4">no exercises match — try a different filter.</p>
        )}
      </div>
    </DetailDrawer>
  );
}
