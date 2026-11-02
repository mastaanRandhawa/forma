import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { DetailDrawer } from "../dashboard/DetailDrawer";
import { ExerciseThumb } from "../ExerciseThumb";
import type { RepDbCatalogEntry } from "../../lib/repdb";
import { useFormaData } from "../../lib/localStore";
import { useSessionHistory } from "../../api/hooks";

const RECENT_MAX = 8;

/** Distinct exercise names, most recently trained first: this session, then history. */
function useRecentExercises(): string[] {
  const data = useFormaData();
  const hist = useSessionHistory();
  return useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    const add = (name: string) => {
      const k = name.toLowerCase();
      if (!seen.has(k) && out.length < RECENT_MAX) {
        seen.add(k);
        out.push(name);
      }
    };
    [...(data.active?.exercises ?? [])].reverse().forEach((e) => add(e.name));
    const past = [
      ...data.sessions.map((s) => ({ at: s.finishedAt, names: s.exercises.map((e) => e.name) })),
      ...(hist.data ?? []).map((s) => ({
        at: s.endedAt ?? s.startedAt,
        names: (s.performances ?? []).flatMap((p) => (p.exercise?.name ? [p.exercise.name] : [])),
      })),
    ].sort((a, b) => b.at.localeCompare(a.at));
    past.forEach((s) => s.names.forEach(add));
    return out;
  }, [data.active, data.sessions, hist.data]);
}

/** Exact name first, then names with the query as a phrase, then names that only contain its words. */
function rank(name: string, phrase: string): number {
  if (!phrase || name === phrase) return 0;
  return name.includes(phrase) ? 1 : 2;
}

/**
 * ExercisePicker — the shared "add / replace an exercise" bottom sheet.
 *
 * Searches the RepDB catalog (works in every build; the Library API is a
 * superset of the same data). Leads with what you've trained recently, has a
 * muscle / equipment quick-filter, and a "use this name anyway" escape hatch
 * below the matches so a custom movement can still be logged.
 */
export function ExercisePicker({
  open,
  onClose,
  onPick,
  title = "add exercise",
  eyebrow,
  suggestions = [],
  verb = "add",
}: {
  open: boolean;
  onClose: () => void;
  onPick: (name: string) => void;
  title?: string;
  eyebrow?: string;
  /** shown first, e.g. swaps for the exercise being replaced */
  suggestions?: string[];
  /** what picking does, for screen-reader labels: "add" or "swap to" */
  verb?: string;
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
    return [...s].sort();
  }, [cat]);

  const equipmentOpts = useMemo(() => {
    const s = new Set<string>();
    for (const e of cat) if (e.equipment) s.add(e.equipment);
    return [...s].sort();
  }, [cat]);

  const matches = useMemo(() => {
    const phrase = q.trim().toLowerCase().replace(/\s+/g, " ");
    const words = phrase.split(" ").filter(Boolean);
    const hits = cat.filter((e) => {
      const name = e.name.toLowerCase();
      if (words.length && !words.every((w) => name.includes(w))) return false;
      if (muscle && !e.primary.includes(muscle)) return false;
      if (equipment && e.equipment !== equipment) return false;
      return true;
    });
    // stable sort: keeps the catalog's alphabetical order within each rank
    return hits.sort((a, b) => rank(a.name.toLowerCase(), phrase) - rank(b.name.toLowerCase(), phrase));
  }, [q, muscle, equipment, cat]);
  const shown = matches.slice(0, 60);

  const custom = q.trim();
  const hasExact = shown.some((e) => e.name.toLowerCase() === custom.toLowerCase());

  const recentNames = useRecentExercises();
  const recent = useMemo(() => {
    const byName = new Map(cat.map((e) => [e.name.toLowerCase(), e]));
    return recentNames.map((name) => ({ name: byName.get(name.toLowerCase())?.name ?? name, entry: byName.get(name.toLowerCase()) ?? null }));
  }, [recentNames, cat]);
  const showRecent = recent.length > 0 && !q && !muscle && !equipment;

  const pick = (name: string) => {
    onPick(name);
    onClose();
  };

  const chip = (active: boolean) =>
    `focus-ring shrink-0 rounded-pill px-3 py-1 text-[0.74rem] lowercase transition-colors ${
      active ? "surface-float text-content-primary" : "surface-recessed text-content-tertiary hover:text-content-secondary"
    }`;

  return (
    <DetailDrawer open={open} onClose={onClose} title={title} eyebrow={eyebrow}>
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-content-tertiary" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search exercises…"
          aria-label="search exercises"
          autoFocus
          className="focus-ring surface-recessed w-full rounded-pill py-2.5 pl-10 pr-4 text-[0.9rem] text-content-primary outline-none placeholder:text-content-tertiary"
        />
      </div>

      {muscles.length > 0 && (
        <div role="group" aria-label="muscle" className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
          <button className={chip(!muscle)} aria-pressed={!muscle} onClick={() => setMuscle(null)}>
            all muscles
          </button>
          {muscles.map((m) => (
            <button key={m} className={chip(muscle === m)} aria-pressed={muscle === m} onClick={() => setMuscle(muscle === m ? null : m)}>
              {m.toLowerCase()}
            </button>
          ))}
        </div>
      )}
      {equipmentOpts.length > 0 && (
        <div role="group" aria-label="equipment" className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
          <button className={chip(!equipment)} aria-pressed={!equipment} onClick={() => setEquipment(null)}>
            any equipment
          </button>
          {equipmentOpts.map((eq) => (
            <button
              key={eq}
              className={chip(equipment === eq)}
              aria-pressed={equipment === eq}
              onClick={() => setEquipment(equipment === eq ? null : eq)}
            >
              {eq.toLowerCase()}
            </button>
          ))}
        </div>
      )}

      {suggestions.length > 0 && !q && !muscle && !equipment && (
        <div className="mb-3">
          <div className="label-instrument mb-1.5">suggested swaps</div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((name) => (
              <button
                key={name}
                aria-label={`${verb} ${name}`}
                onClick={() => pick(name)}
                className="focus-ring min-h-9 rounded-pill border border-[var(--line-soft)] px-3 text-[0.8rem] lowercase text-content-primary hover:bg-white/[0.06]"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {showRecent && (
        <section aria-label="recent exercises" className="mb-4">
          <div className="label-instrument mb-1">recent</div>
          <div className="divide-y divide-[var(--line-soft)]">
            {recent.map((r) => (
              <ExerciseRow key={r.name} name={r.name} entry={r.entry} verb={verb} onPick={pick} />
            ))}
          </div>
        </section>
      )}

      {cat.length > 0 && (
        <p className="label-instrument mb-1" aria-live="polite">
          {showRecent ? "all exercises · " : ""}
          {matches.length > shown.length
            ? `showing ${shown.length} of ${matches.length} — search or filter to narrow it down`
            : `${matches.length} exercise${matches.length === 1 ? "" : "s"}`}
        </p>
      )}

      <div className="divide-y divide-[var(--line-soft)]">
        {shown.map((e) => (
          <ExerciseRow key={e.id} name={e.name} entry={e} verb={verb} onPick={pick} />
        ))}
        {cat.length > 0 && shown.length === 0 && (
          <p className="label-instrument py-4">no exercises match — try a different filter.</p>
        )}
      </div>

      {/* after the real matches, so a near-miss search doesn't log an untracked custom name */}
      {custom && !hasExact && (
        <button
          onClick={() => pick(custom)}
          className="focus-ring mt-2 flex w-full items-center gap-2 rounded-[var(--radius-large)] border border-dashed border-[var(--line-soft)] px-3 py-2.5 text-left text-[0.85rem] lowercase text-content-secondary hover:text-content-primary"
        >
          <Plus size={14} /> use "{custom}" as a custom exercise
        </button>
      )}
    </DetailDrawer>
  );
}

function ExerciseRow({
  name,
  entry,
  verb,
  onPick,
}: {
  name: string;
  entry: RepDbCatalogEntry | null;
  verb: string;
  onPick: (name: string) => void;
}) {
  return (
    <button
      aria-label={`${verb} ${name}`}
      onClick={() => onPick(name)}
      className="focus-ring flex w-full items-center gap-3 py-2.5 text-left"
    >
      <ExerciseThumb name={name} alt="" size={52} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.92rem] lowercase text-content-primary">{name}</span>
        <span className="label-instrument">
          {entry ? (entry.primary[0] ?? entry.bodyPart) + " · " + entry.equipment : "custom"}
        </span>
      </span>
    </button>
  );
}
