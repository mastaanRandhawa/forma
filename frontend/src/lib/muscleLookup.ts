/**
 * Exercise name → RepDB primary / secondary muscles, for screens that derive
 * muscle load from logged sessions (Progress, Body). The catalog is ~640 kB, so
 * it's imported lazily once and shared by every caller.
 */
import { useEffect, useMemo, useState } from "react";
import type { RepDbCatalogEntry } from "./repdb";

export interface MuscleHit {
  primary: string[];
  secondary: string[];
}
export type MuscleLookup = (exerciseName: string) => MuscleHit | null;

let catalogPromise: Promise<RepDbCatalogEntry[]> | null = null;
const loadCatalog = () => (catalogPromise ??= import("./repdb.catalog").then((m) => m.REPDB_CATALOG));

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

/** Exact name match first, then the closest substring match either way. */
export function buildMuscleLookup(catalog: RepDbCatalogEntry[]): MuscleLookup {
  const byName = new Map(catalog.map((e) => [norm(e.name), e]));
  const memo = new Map<string, MuscleHit | null>();
  return (exerciseName) => {
    const key = norm(exerciseName);
    if (!key) return null;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    const entry =
      byName.get(key) ??
      catalog.find((e) => {
        const n = norm(e.name);
        return n.includes(key) || key.includes(n);
      });
    const hit = entry ? { primary: entry.primary, secondary: entry.secondary } : null;
    memo.set(key, hit);
    return hit;
  };
}

/** `null` until the catalog has loaded. */
export function useMuscleLookup(): MuscleLookup | null {
  const [catalog, setCatalog] = useState<RepDbCatalogEntry[] | null>(null);
  useEffect(() => {
    let live = true;
    void loadCatalog().then((c) => {
      if (live) setCatalog(c);
    });
    return () => {
      live = false;
    };
  }, []);
  return useMemo(() => (catalog ? buildMuscleLookup(catalog) : null), [catalog]);
}
