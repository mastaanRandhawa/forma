import { useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Reveal } from "../components/Reveal";
import { ExerciseThumb } from "../components/ExerciseThumb";
import { ExerciseDetailDrawer } from "../components/ExerciseDetailDrawer";
import { REPDB_URL, repdbImage, type RepDbCatalogEntry } from "../lib/repdb";
import { REPDB_CATALOG } from "../lib/repdb.catalog";

const MUSCLES = ["All", "Chest", "Back", "Lats", "Shoulders", "Biceps", "Triceps", "Glutes", "Quads", "Hamstrings", "Abs", "Calves"];
const EQUIPMENT = ["All", "Barbell", "Dumbbell", "Kettlebell", "Cable", "Machine", "Bodyweight", "Bands"];
const LIMIT = 80;

export default function ExerciseLibrary() {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState("All");
  const [equipment, setEquipment] = useState("All");
  const [selected, setSelected] = useState<RepDbCatalogEntry | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return REPDB_CATALOG.filter((e) => {
      if (muscle !== "All" && ![...e.primary, ...e.secondary].includes(muscle)) return false;
      if (equipment !== "All" && e.equipment !== equipment) return false;
      if (!needle) return true;
      return (
        e.name.toLowerCase().includes(needle) ||
        e.equipment.toLowerCase().includes(needle) ||
        e.bodyPart.toLowerCase().includes(needle) ||
        [...e.primary, ...e.secondary].some((m) => m.toLowerCase().includes(needle))
      );
    });
  }, [q, muscle, equipment]);

  const shown = filtered.slice(0, LIMIT);

  return (
    <div className="mx-auto max-w-[1120px]">
      <PageHeader eyebrow="library" title="exercises" ghost={`· ${REPDB_CATALOG.length}`} />

      <Reveal className="mb-6 space-y-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search by name, muscle or equipment…"
          className="focus-ring surface-recessed w-full rounded-pill px-4 py-2.5 text-[0.9rem] text-content-primary outline-none placeholder:text-content-tertiary"
        />
        <FilterRow value={muscle} onChange={setMuscle} options={MUSCLES} />
        <FilterRow value={equipment} onChange={setEquipment} options={EQUIPMENT} />
      </Reveal>

      <Reveal as="ul" onView delay={0.05} className="divide-y divide-[var(--line-soft)]">
        {shown.map((e) => (
          <li key={e.id}>
            <button
              onClick={() => setSelected(e)}
              className="focus-ring flex w-full items-center gap-3.5 py-3 text-left"
            >
              <ExerciseThumb src={repdbImage(e.imgStart ?? e.imgEnd)} alt={e.name} size={46} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.95rem] text-content-primary">{e.name}</span>
                <span className="label-instrument mt-0.5 block truncate">
                  {(e.primary[0] ?? e.bodyPart) + " · " + e.equipment}
                  <span className="ml-2 text-content-tertiary/70">{e.difficulty}</span>
                </span>
              </span>
              {e.mechanic && (
                <span className="label-instrument hidden shrink-0 rounded-pill surface-recessed px-3 py-1 sm:block">
                  {e.mechanic}
                </span>
              )}
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="py-6 text-[0.9rem] text-content-tertiary">No exercises match those filters.</li>
        )}
      </Reveal>

      {filtered.length > LIMIT && (
        <p className="label-instrument mt-4">
          showing {LIMIT} of {filtered.length} — refine your search to narrow it down
        </p>
      )}

      <p className="label-instrument mt-10 border-t border-[var(--line-soft)] pt-5">
        Exercise data &amp; illustrations by{" "}
        <a href={REPDB_URL} target="_blank" rel="noreferrer" className="underline hover:text-content-secondary">
          RepDB (repdb.co)
        </a>
      </p>

      <ExerciseDetailDrawer exercise={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function FilterRow({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`focus-ring tactile rounded-pill px-3.5 py-1.5 text-[0.76rem] lowercase tracking-[0.03em] ${
            value === o
              ? "surface-float text-content-primary"
              : "text-content-tertiary hover:text-content-secondary"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
