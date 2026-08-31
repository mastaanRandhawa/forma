/**
 * Full RepDB display catalog — 601 exercises with descriptions, instructions and
 * form tips. ~640 kB of JSON; import it only from lazily-loaded Library code so
 * it never lands in the main bundle. See `./repdb.ts` for the light helpers.
 */
import catalog from "./repdb.catalog.json";
import type { RepDbCatalogEntry } from "./repdb";

export const REPDB_CATALOG = (catalog as { exercises: RepDbCatalogEntry[] }).exercises;
