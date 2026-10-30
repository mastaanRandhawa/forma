/**
 * Exercise name → RepDB catalog entry (primary / secondary muscles and the
 * rest), for screens that derive muscle load from logged sessions (Progress,
 * Body, the workout summary, weekly challenges). The catalog is ~640 kB, so it's
 * imported lazily once and every caller shares one matcher.
 */
import { useEffect, useState } from "react";
import { aliasExerciseId, normExerciseName as norm, type RepDbCatalogEntry } from "./repdb";

export type MuscleLookup = (exerciseName: string) => RepDbCatalogEntry | null;

let lookupPromise: Promise<MuscleLookup> | null = null;
/** Loads the catalog on first call; later calls get the same matcher. */
export const loadMuscleLookup = () =>
  (lookupPromise ??= import("./repdb.catalog").then(
    (m) => buildMuscleLookup(m.REPDB_CATALOG),
    (err) => {
      lookupPromise = null; // let the next caller retry a failed chunk load
      throw err;
    },
  ));

/**
 * Alias, then exact name, then the closest whole-word containment either way
 * ("Paused Front Squat" → "Front Squat", "Leg Curl" → "Lying Leg Curl"):
 * the candidate whose name length is nearest the query's wins.
 */
export function buildMuscleLookup(catalog: RepDbCatalogEntry[]): MuscleLookup {
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const names = catalog.map((e) => ({ entry: e, padded: ` ${norm(e.name)} ` }));
  const byName = new Map(names.map((n) => [n.padded.trim(), n.entry]));
  const memo = new Map<string, RepDbCatalogEntry | null>();
  return (exerciseName) => {
    const key = norm(exerciseName);
    if (!key) return null;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    const alias = aliasExerciseId(exerciseName);
    let entry = (alias && byId.get(alias)) || byName.get(key);
    if (!entry) {
      const padded = ` ${key} `;
      let best = Infinity;
      for (const n of names) {
        if (!n.padded.includes(padded) && !padded.includes(n.padded)) continue;
        const gap = Math.abs(n.padded.length - padded.length);
        if (gap < best) [best, entry] = [gap, n.entry];
      }
    }
    memo.set(key, entry ?? null);
    return entry ?? null;
  };
}

/** `null` until the catalog has loaded. */
export function useMuscleLookup(): MuscleLookup | null {
  const [lookup, setLookup] = useState<MuscleLookup | null>(null);
  useEffect(() => {
    let live = true;
    void loadMuscleLookup().then((fn) => {
      if (live) setLookup(() => fn);
    });
    return () => {
      live = false;
    };
  }, []);
  return lookup;
}
