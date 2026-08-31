/**
 * build-repdb-catalog — distils the RepDB (repdb.co) free-tier dataset into the
 * compact catalog the Exercise Library ships in the no-backend build.
 *
 *   node scripts/build-repdb-catalog.mjs [path-or-url]
 *
 * Default source: https://exercise-dataset.com/exercises.json
 * Output: src/lib/repdb.catalog.json  (EN locale, display fields only)
 *
 * The full record set lives in the backend (`npm run db:import-repdb`); this
 * file is only the slice the client renders when VITE_API_URL is unset.
 *
 * Licensing: RepDB free tier — in-app use with visible attribution. Not a
 * dataset redistribution: fields are reshaped for our UI, not republished as-is.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const SRC = process.argv[2] ?? "https://exercise-dataset.com/exercises.json";
const LIB = resolve(dirname(fileURLToPath(import.meta.url)), "../src/lib");
const OUT = resolve(LIB, "repdb.catalog.json");
const OUT_INDEX = resolve(LIB, "repdb.index.json");

const MUSCLE = {
  pectoralis_major: "Chest", anterior_deltoid: "Shoulders", lateral_deltoid: "Shoulders",
  supraspinatus: "Shoulders", posterior_deltoid: "Rear delts", triceps_brachii: "Triceps",
  biceps_brachii: "Biceps", brachialis: "Biceps", brachioradialis: "Forearms",
  forearm_flexors: "Forearms", forearm_extensors: "Forearms", forearms: "Forearms",
  latissimus_dorsi: "Lats", trapezius: "Traps", rhomboids: "Back", erector_spinae: "Back",
  quadratus_lumborum: "Back", rectus_abdominis: "Abs", transverse_abdominis: "Abs",
  obliques: "Obliques", serratus_anterior: "Obliques", hip_flexors: "Abs",
  gluteus_maximus: "Glutes", gluteus_medius: "Glutes", abductors: "Glutes",
  quadriceps: "Quads", hamstrings: "Hamstrings", gastrocnemius: "Calves", soleus: "Calves",
  adductors: "Adductors",
};

const EQUIP = {
  barbell: "Barbell", ez_bar: "Barbell", trap_bar: "Barbell", plates: "Barbell",
  dumbbell: "Dumbbell", kettlebell: "Kettlebell", cable: "Cable",
  loop_band: "Bands", resistance_band: "Bands", battle_rope: "Bands",
  pull_up_bar: "Bodyweight", dip_station: "Bodyweight", rings: "Bodyweight",
  suspension_trainer: "Bodyweight", stability_ball: "Bodyweight", plyo_box: "Bodyweight",
  jump_rope: "Bodyweight", ab_wheel: "Bodyweight", flat_bench: "Bodyweight",
};

const equipLabel = (raw) => {
  if (!raw) return "Bodyweight";
  if (EQUIP[raw]) return EQUIP[raw];
  if (raw.endsWith("_machine") || ["leg_press", "leg_curl", "leg_extension", "hack_squat", "smith_machine", "pec_deck"].includes(raw))
    return "Machine";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const dedupe = (xs) => [...new Set(xs)];
const mapMuscles = (xs) => dedupe((xs ?? []).map((m) => MUSCLE[m]).filter(Boolean));

async function load() {
  if (/^https?:/.test(SRC)) return (await (await fetch(SRC)).json()).exercises;
  return JSON.parse(await readFile(SRC, "utf8")).exercises;
}

const raw = await load();
const catalog = raw.map((e) => {
  const flat = e.images?.flat ?? {};
  const primary = mapMuscles(e.primary_muscles);
  const entry = {
    id: e.id,
    name: e.name_en,
    primary,
    secondary: mapMuscles(e.secondary_muscles).filter((m) => !primary.includes(m)),
    equipment: equipLabel(e.equipment),
    bodyPart: (e.body_part ?? "").replace(/_/g, " "),
    difficulty: e.difficulty ?? "intermediate",
    mechanic: e.mechanic ?? null,
    force: e.force_type ?? null,
    discipline: e.category ?? null,
    unilateral: e.is_unilateral ?? false,
    bodyweight: e.is_bodyweight ?? false,
    met: typeof e.met === "number" ? e.met : null,
    goals: e.goals ?? [],
    description: e.description_en?.trim() || null,
    instructions: (e.instructions_en ?? []).filter(Boolean),
    tips: (e.tips_en ?? []).filter(Boolean),
    imgStart: (flat.start ?? flat.main)?.replace(/^.*images\/flat\//, "") ?? null,
    imgEnd: flat.peak?.replace(/^.*images\/flat\//, "") ?? null,
  };
  return entry;
});
catalog.sort((a, b) => a.name.localeCompare(b.name));

const meta = { source: "RepDB — repdb.co", license: "free tier (attribution)", count: catalog.length };
await writeFile(OUT, JSON.stringify({ ...meta, exercises: catalog }));

// Tiny name→image index for enriching plan / session rows outside the Library,
// so the main workout screens don't pull the full instruction text.
const index = catalog.map((e) => ({ id: e.id, name: e.name, imgStart: e.imgStart, imgEnd: e.imgEnd }));
await writeFile(OUT_INDEX, JSON.stringify({ ...meta, exercises: index }));

console.log(`wrote ${catalog.length} exercises → ${OUT}\n            + slim index → ${OUT_INDEX}`);
