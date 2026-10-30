# Forma — Implementation Progress

States: Not started · In progress · Implemented — not verified · **Verified** · Blocked · Requires approval.
"Verified" names the check that ran. Resume from the first row that isn't Verified, Blocked or Requires approval.

Last updated: 2026-10-30.

## Milestone 1

| ID | Task | State | Changed files | Checks run | Result | Outstanding risk |
|---|---|---|---|---|---|---|
| T-01 | Refuse unverified receipts in production | **Verified** (unit) | `backend/src/modules/subscription.ts`, `backend/src/modules/subscription.test.ts` (new) | `tsc --noEmit`; vitest: 2 new tests | pass | Not exercised over HTTP (route needs a DB-backed session) |
| T-10 | Body map: real activation and fatigue, API key folding, real balance/undertrained, no fake fallback | **Verified** (offline-mode runtime) | `frontend/src/pages/Body.tsx`, `frontend/src/components/BodyMuscles.tsx` (`normalize` prop), `frontend/src/lib/fitness.ts` (body-map helpers), `frontend/src/lib/muscleLookup.ts` (new), `frontend/src/pages/Progress.tsx` (uses shared lookup), `frontend/src/lib/lifecycle.ts` (F-12 warm-up flag) | `tsc`, `vite build`; browser at `:5179` with 3 seeded sessions: Today empty (correct, session was before midnight); Week ranks back 100 / chest 67…; Fatigue counts only the 10-hour-old session; balance sentence computed; no console errors | pass | API-mode path (`foldToBodyGroups` over `/body/muscle-map`) is static-only, no DB. Name matching gap (T-38) |
| T-11 | Real streak in workout rewards | Implemented — not verified | `frontend/src/pages/ActiveWorkout.tsx` | `tsc`, build | pass | Not run through a full workout in the browser. In API mode the streak counts sessions cached on this device only |
| T-12 | Empty starting wallet | **Verified** (offline-mode runtime) | `frontend/src/lib/wallet.ts` | fresh origin: wallet = 15 (today's real daily bonus), ledger has 1 entry | pass | Existing installs keep their stored balance, which may include the old 720 seed; deliberately not migrated |
| T-13 | Demo data opt-in only (`VITE_DEMO_DATA=true`) | **Verified** (offline-mode runtime) | `frontend/src/api/hooks.ts`, `frontend/src/pages/Trainer.tsx` (prop type) | Goals → "no goals yet"; Trainer → empty thread + prompt chips; Store → 15 coins; scan for "195 lb / 14-day streak / bench PR / 720" → none | pass | The GitHub Pages showcase no longer shows sample data unless the variable is set at build time (product call) |
| T-14 | Greeting without invented facts | **Verified** (offline-mode runtime) | `frontend/src/components/dashboard/Greeting.tsx` | dashboard shows "Good morning, Tester" + the real local trainer message | pass | — |
| T-15 | CI workflows | Implemented — not verified | `.github/workflows/ci.yml` (new), `backend/.github/workflows/ci.yml` (new) | files written; same commands pass locally (frontend build; backend typecheck) | — | Needs a GitHub run. Backend CI expects the 3 DB tests to pass against a fresh Postgres; unconfirmed |
| T-16 | `npm run dev:offline` | **Verified** (runtime) | `frontend/vite.config.ts`, `frontend/package.json`, `.claude/launch.json` (local, gitignored) | offline dev server ran with `.env` pointing at `:4000`; app used localStorage, no auth redirect | pass | — |

## Whole-project checks after Milestone 1

| Check | Command | Result |
|---|---|---|
| Frontend typecheck + build | `npm run build` (frontend) | pass (catalog chunk-size warning, already present before this work and lazy-loaded) |
| Backend typecheck | `tsc --noEmit` | pass |
| Backend tests | `vitest run` with test env vars | 104 pass / 3 fail. The 3 are the DB-dependent auth tests; they fail with `PrismaClientInitializationError` (no reachable DB) and failed the same way before this work |
| Playwright E2E | `npm run test:e2e` | **Not run.** Needs API + seeded DB (Blocked) |
| API-mode browser flows | — | **Not run.** No DB (Blocked) |

## Blocked / requires approval

| ID | State | Blocker |
|---|---|---|
| T-20 | Requires approval | Economy redesign + migration (server-authoritative coin rewards) |
| T-21 | Requires approval + Blocked | Apple/Google developer accounts; billing |
| T-22 | Requires approval | Hosting spend; the Render free DB has already expired |
| T-23 | Requires approval | Product call: is the no-backend build a real product (persist goals locally) or a demo? |
| T-24, T-25, T-28 | Blocked | Need a reachable Postgres to verify |
| T-26, T-27 | Requires approval | New product scope (gym management, coach UI) |
| E2E / API verification | Blocked | DB credentials: a local PostgreSQL 16 service is running, but its credentials aren't in the repo |

## Next unfinished task

T-30 onward (Milestone 3) needs no approval. Start with T-38 (name aliases, small, and it improves the new Body analytics), then T-35, T-36, T-37.
