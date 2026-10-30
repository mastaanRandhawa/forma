/**
 * RepDB (repdb.co) exercise data — client helpers.
 *
 * When VITE_API_URL is set the Exercise Library reads the enriched records off
 * the backend (`/library/exercises`). With no backend (the GitHub Pages build)
 * it reads `repdb.catalog.json`, the compact display slice built by
 * `scripts/build-repdb-catalog.mjs`.
 *
 * This module carries only the light stuff — attribution strings, the image URL
 * helper, and a name→illustration matcher backed by the slim `repdb.index.json`
 * (~40 kB) so the main workout screens don't pull the full catalog. The Library
 * pulls the full catalog from `./repdb.catalog`.
 *
 * Images are RepDB's 512px flat WebP illustrations, hot-linked from
 * exercise-dataset.com and lazy-loaded. Attribution ("Exercise data by RepDB —
 * repdb.co") is shown in the Library footer and Settings ▸ About.
 */
import index from "./repdb.index.json";

export const REPDB_ATTRIBUTION = "Exercise data by RepDB";
export const REPDB_URL = "https://repdb.co";
export const REPDB_IMAGE_BASE = "https://exercise-dataset.com/images/flat/";

export interface RepDbCatalogEntry {
  id: string;
  name: string;
  primary: string[];
  secondary: string[];
  equipment: string;
  bodyPart: string;
  difficulty: string;
  mechanic: string | null;
  force: string | null;
  discipline: string | null;
  unilateral: boolean;
  bodyweight: boolean;
  met: number | null;
  goals: string[];
  description: string | null;
  instructions: string[];
  tips: string[];
  imgStart: string | null;
  imgEnd: string | null;
}

interface IndexEntry {
  id: string;
  name: string;
  imgStart: string | null;
  imgEnd: string | null;
}
const INDEX = (index as { exercises: IndexEntry[] }).exercises;

export const repdbImage = (file: string | null | undefined): string | null =>
  file ? REPDB_IMAGE_BASE + file : null;

// ── name → catalog matching (for enriching plan / session exercise rows) ────
export const normExerciseName = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\b(the|a|with|and)\b/g, " ").replace(/\s+/g, " ").trim();

/**
 * Hand-checked aliases where the app's exercise name ≠ RepDB's name. Mostly the
 * short forms people type ("Deadlift"), which would otherwise fuzzy-match a
 * variant ("Banded Romanian Deadlift"). Keys are `normExerciseName` output.
 */
const ALIASES: Record<string, string> = {
  "bench press": "bench-press",
  "barbell bench press": "bench-press",
  "decline barbell press": "decline-bench-press-barbell",
  "incline dumbbell press": "incline-db-press",
  "overhead press": "ohp",
  ohp: "ohp",
  "military press": "ohp",
  "lateral raise": "lateral-raise",
  "triceps rope pushdown": "tricep-pushdown",
  "tricep rope pushdown": "tricep-pushdown",
  "triceps pushdown": "tricep-pushdown",
  deadlift: "deadlift",
  "conventional deadlift": "deadlift",
  rdl: "romanian-deadlift",
  squat: "squat",
  "back squat": "squat",
  "barbell squat": "squat",
  "barbell front squat": "front-squat",
  "dumbbell row": "bent-over-db-row",
  "barbell row": "barbell-row",
  "bicep curl": "bicep-curl",
  "biceps curl": "bicep-curl",
  "dumbbell curl": "bicep-curl",
  "hammer curl": "hammer-curl",
  "lat pulldown": "lat-pulldown",
  "face pull": "face-pull",
  "leg press": "leg-press",
  "walking lunge": "walking-lunge",
  "leg curl": "leg-curl",
  "calf raise": "standing-calf-raise",
  "standing calf raise": "standing-calf-raise",
};

/** RepDB id for a name the alias table knows, else undefined. */
export const aliasExerciseId = (name: string): string | undefined => ALIASES[normExerciseName(name)];

const byId = new Map(INDEX.map((e) => [e.id, e]));
const byName = new Map(INDEX.map((e) => [normExerciseName(e.name), e]));

/** Thumbnail URL for a free-text exercise name, or null if no confident match. */
export function repdbThumb(name: string): string | null {
  const alias = aliasExerciseId(name);
  const hit = (alias && byId.get(alias)) || byName.get(normExerciseName(name));
  return hit ? repdbImage(hit.imgStart ?? hit.imgEnd) : null;
}
