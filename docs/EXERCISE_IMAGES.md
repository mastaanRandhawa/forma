# Exercise images

The app serves its own copies of the exercise images from `/exercise-img/`.
They are generated, not committed.

## Getting the images

```bash
cd frontend
npm run images:sync
```

This downloads RepDB's official free pack (about 30 MB), cuts the pale-blue
background out of each of its 1,217 frames, and writes about 43 MB of WebP files
to `public/exercise-img/`:

| Folder | Size | Used for |
|---|---|---|
| `thumb/` | 192 px | list rows, cards |
| `full/` | 512 px | exercise detail, the workout screen |

A re-run does nothing unless the pack or the script changed. The first full run
takes a minute or two. The deploy workflow runs it before each build.

Without this step the app still works: `ExerciseThumb` falls back to RepDB's
hosted originals, which keep their pale-blue background.

## Updating to a newer RepDB release

```bash
npm run images:sync
npm run catalog:sync
```

`images:sync` updates the images. `catalog:sync` rewrites
`src/lib/repdb.catalog.json` and `repdb.index.json`, which are committed. The
backend keeps its own copy of the exercises, updated with `npm run db:import-repdb`
in `backend/`.

## Using a different pack

Frames are matched to exercises by file name (`imgStart` / `imgEnd` in the
catalog), so a replacement pack only needs an `images/<style>/` folder with the
same names.

```bash
npm run images:sync -- --source ./my-pack.zip --style classic --no-cutout
```

- `--source` takes a zip, a folder or a URL.
- `--style` picks the folder inside `images/`. The default is `flat`.
- `--no-cutout` skips background removal, for art that is already transparent.
- `--force` rebuilds even if nothing changed.

These flags were only run against the free pack. A paid RepDB pack may be laid out
differently, and animations would also need `ExerciseThumb` changes, because the
script only handles still WebP frames today.

## Licence rules

From RepDB's free-tier licence (`LICENSE.md` in the pack). This is our reading of
it, not legal advice; `support@repdb.co` answers licence questions.

- **Keep the credit.** A visible "Exercise data by RepDB (repdb.co)" link is
  required. It is in the Library footer, Settings ▸ About and the README.
- **Never commit the images.** This repo is public and the licence forbids
  republishing them as a dataset, including modified copies. `.gitignore` covers
  `public/exercise-img/` and `.cache/`.
- **No generative AI on the images,** whether restyling, upscaling with a model or
  training. The cut-out is plain colour keying for that reason.
- **Don't ship `premium-samples/`.** That folder in the pack is evaluation-only, and
  the script never unpacks it.

## Checking the cut-outs

Each run writes `.cache/repdb/qa.json` with the share of each frame that was
cleared, and flags unusual frames. The thresholds live in `scripts/lib/cutout.mjs`.

Known rough spots in the free pack:

- `banded-standing-hip-adduction-start` keeps a pale strip of wall on its left edge.
- `wall-sit-main` keeps its wall, which the exercise needs, with a slightly jagged
  edge where the shadow met it.
