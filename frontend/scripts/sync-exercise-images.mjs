/**
 * sync-exercise-images — builds the exercise images the app serves itself.
 *
 *   npm run images:sync                    official RepDB free pack
 *   npm run images:sync -- --source x.zip  a pack you already have (zip, folder or URL)
 *   npm run images:sync -- --no-cutout     for art that is already transparent
 *   npm run images:sync -- --style classic reads images/classic/ rather than images/flat/
 *   npm run images:sync -- --force         rebuild even if nothing changed
 *
 * Output: public/exercise-img/{thumb,full}/<frame>.webp, with file names matching
 * `imgStart` / `imgEnd` in src/lib/repdb.catalog.json. Vite copies them into the
 * build. They are gitignored on purpose: this repo is public and the RepDB licence
 * forbids republishing the images as a dataset. See docs/EXERCISE_IMAGES.md.
 *
 * Packs are untrusted input: only entries whose names look like an image frame
 * are read, and each is written under a name we validate, so nothing in an
 * archive can choose its own path.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { availableParallelism } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";
import sharp from "sharp";
import { cutoutBackdrop } from "./lib/cutout.mjs";

const DEFAULT_SOURCE = "https://cdn.repdb.co/repdb-assets/site/repdb-free.zip";
const THUMB_PX = 192; // the largest list thumb is 72 CSS px; this covers ~2.7x screens
const FULL_PX = 512;
const FRAME_NAME = /^[a-z0-9][a-z0-9-]*\.webp$/;
// A cut this far from normal means the keying misread the frame: worth a look.
const FLAG_MIN_TRANSPARENT = 0.3;
const FLAG_MAX_TRANSPARENT = 0.93;
const FLAG_MAX_RESIDUAL = 0.01;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/exercise-img");
const CACHE = join(ROOT, ".cache/repdb");
const SCRIPT_FILES = [fileURLToPath(import.meta.url), join(ROOT, "scripts/lib/cutout.mjs")];

function parseArgs(argv) {
  const opts = { source: DEFAULT_SOURCE, style: "flat", cutout: true, force: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--source") opts.source = argv[++i];
    else if (arg === "--style") opts.style = argv[++i];
    else if (arg === "--no-cutout") opts.cutout = false;
    else if (arg === "--force") opts.force = true;
    else throw new Error(`unknown option: ${arg}`);
  }
  if (!opts.source) throw new Error("--source needs a value");
  if (!/^[a-z0-9-]+$/.test(opts.style ?? "")) throw new Error("--style must be a folder name like flat");
  return opts;
}

/** Fetches `url` into the cache, revalidating so an unchanged pack isn't re-downloaded. */
async function download(url) {
  await mkdir(CACHE, { recursive: true });
  const file = join(CACHE, basename(new URL(url).pathname) || "pack.zip");
  const metaFile = `${file}.meta.json`;
  const meta = existsSync(metaFile) && existsSync(file) ? JSON.parse(await readFile(metaFile, "utf8")) : {};
  const headers = {};
  if (meta.url === url && meta.etag) headers["if-none-match"] = meta.etag;
  if (meta.url === url && meta.lastModified) headers["if-modified-since"] = meta.lastModified;

  console.log(`checking ${url}`);
  let res;
  let problem = null;
  try {
    res = await fetch(url, { headers });
    if (res.status === 304) {
      console.log("pack unchanged, using the cached copy");
      return file;
    }
    if (!res.ok) problem = `HTTP ${res.status}`;
  } catch (err) {
    problem = err.message;
  }
  if (problem) {
    if (!existsSync(file)) throw new Error(`download failed (${problem}): ${url}`);
    console.warn(`could not check for a newer pack (${problem}), using the cached copy`);
    return file;
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  await writeFile(file, bytes);
  await writeFile(
    metaFile,
    JSON.stringify({ url, etag: res.headers.get("etag"), lastModified: res.headers.get("last-modified") }),
  );
  console.log(`downloaded ${(bytes.length / 1048576).toFixed(1)} MB`);
  return file;
}

/** Returns Map<frame file name, bytes>. Anything else in the pack is never unpacked. */
async function readPack(source, style) {
  const framePath = new RegExp(`(?:^|/)images/${style}/([^/]+)$`);
  const frames = new Map();

  if ((await stat(source)).isDirectory()) {
    const dir = join(source, "images", style);
    for (const name of await readdir(dir)) {
      if (FRAME_NAME.test(name)) frames.set(name, await readFile(join(dir, name)));
    }
    return frames;
  }

  const entries = unzipSync(await readFile(source), { filter: ({ name }) => framePath.test(name) });
  for (const [path, bytes] of Object.entries(entries)) {
    const frame = path.match(framePath)?.[1];
    if (frame && FRAME_NAME.test(frame)) frames.set(frame, Buffer.from(bytes));
  }
  return frames;
}

async function buildStamp(frames, opts) {
  const hash = createHash("sha256");
  for (const file of SCRIPT_FILES) hash.update(await readFile(file));
  hash.update(JSON.stringify({ style: opts.style, cutout: opts.cutout, THUMB_PX, FULL_PX }));
  for (const name of [...frames.keys()].sort()) hash.update(name).update(frames.get(name));
  return hash.digest("hex");
}

async function buildFrame(name, bytes, cutout) {
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let pixels = data;
  let stats = null;
  if (cutout) {
    ({ rgba: pixels, stats } = cutoutBackdrop(data, info.width, info.height, info.channels));
  }
  const raw = { raw: { width: info.width, height: info.height, channels: 4 } };
  const webp = { alphaQuality: 90, effort: 5, smartSubsample: true };
  await sharp(pixels, raw)
    .resize(FULL_PX, FULL_PX, { fit: "inside", withoutEnlargement: true })
    .webp({ ...webp, quality: 82 })
    .toFile(join(OUT, "full", name));
  await sharp(pixels, raw)
    .resize(THUMB_PX, THUMB_PX, { fit: "inside" })
    .webp({ ...webp, quality: 80 })
    .toFile(join(OUT, "thumb", name));
  return stats;
}

const isOutlier = (s) =>
  s && (s.transparent < FLAG_MIN_TRANSPARENT || s.transparent > FLAG_MAX_TRANSPARENT || s.residual > FLAG_MAX_RESIDUAL);

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const isUrl = /^https?:\/\//.test(opts.source);
  const packPath = isUrl ? await download(opts.source) : resolve(opts.source);
  const frames = await readPack(packPath, opts.style);
  if (frames.size === 0) throw new Error(`no images/${opts.style}/*.webp frames found in ${packPath}`);

  const manifestFile = join(OUT, "manifest.json");
  const stamp = await buildStamp(frames, opts);
  if (!opts.force && existsSync(manifestFile)) {
    const prev = JSON.parse(await readFile(manifestFile, "utf8"));
    if (prev.stamp === stamp) {
      console.log(`exercise images up to date (${prev.frames} frames)`);
      return;
    }
  }

  // Files are replaced in place and strays removed afterwards. Dropping the whole
  // folder fails with EBUSY on Windows if anything (OneDrive, a shell) has it open.
  await mkdir(join(OUT, "full"), { recursive: true });
  await mkdir(join(OUT, "thumb"), { recursive: true });

  const names = [...frames.keys()].sort();
  const results = new Map();
  const failed = [];
  let next = 0;
  const worker = async () => {
    while (next < names.length) {
      const name = names[next++];
      try {
        results.set(name, await buildFrame(name, frames.get(name), opts.cutout));
      } catch (err) {
        failed.push(`${name}: ${err.message}`);
      }
      if (next % 200 === 0) console.log(`  ${next} / ${names.length}`);
    }
  };
  await Promise.all(Array.from({ length: availableParallelism() }, worker));

  for (const size of ["full", "thumb"]) {
    for (const name of await readdir(join(OUT, size))) {
      if (!frames.has(name)) await rm(join(OUT, size, name), { force: true });
    }
  }

  const flagged = [...results].filter(([, s]) => isOutlier(s));
  await mkdir(CACHE, { recursive: true });
  await writeFile(
    join(CACHE, "qa.json"),
    JSON.stringify(
      {
        flagged: flagged.map(([name, s]) => ({ name, ...s })),
        all: [...results].map(([name, s]) => ({ name, ...s })),
      },
      null,
      1,
    ),
  );
  await writeFile(
    manifestFile,
    JSON.stringify({ source: isUrl ? opts.source : basename(packPath), style: opts.style, cutout: opts.cutout, frames: results.size, stamp }),
  );

  console.log(`wrote ${results.size} frames to ${OUT}`);
  if (flagged.length) console.log(`${flagged.length} frames look unusual, listed in .cache/repdb/qa.json`);
  if (failed.length) {
    console.error(`${failed.length} frames failed:\n  ${failed.join("\n  ")}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
