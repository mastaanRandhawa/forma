# Forma — Implementation Progress

States: Not started · In progress · Implemented — not verified · **Verified** · Blocked · Requires approval.
"Verified" names the check that ran. Resume from the first row that isn't Verified, Blocked or Requires approval.

Last updated: 2026-10-30 (after the workout templates / builder QA pass).

## Milestone 1

| ID | Task | State | Changed files | Checks run | Result | Outstanding risk |
|---|---|---|---|---|---|---|
| T-01 | Refuse unverified receipts in production | **Verified** (unit) | `backend/src/modules/subscription.ts`, `backend/src/modules/subscription.test.ts` (new) | `tsc --noEmit`; vitest: 2 new tests | pass | Not exercised over HTTP (route needs a DB-backed session) |
| T-10 | Body map: real activation and fatigue, API key folding, real balance/undertrained, no fake fallback | **Verified** (offline-mode runtime) | `frontend/src/pages/Body.tsx`, `frontend/src/components/BodyMuscles.tsx` (`normalize` prop), `frontend/src/lib/fitness.ts` (body-map helpers), `frontend/src/lib/muscleLookup.ts` (new), `frontend/src/pages/Progress.tsx` (uses shared lookup), `frontend/src/lib/lifecycle.ts` (F-12 warm-up flag) | `tsc`, `vite build`; browser at `:5179` with 3 seeded sessions: Today empty (correct, session was before midnight); Week ranks back 100 / chest 67…; Fatigue counts only the 10-hour-old session; balance sentence computed; no console errors | pass | API-mode path (`foldToBodyGroups` over `/body/muscle-map`) is static-only, no DB. Name matching gap (T-38) |
| T-11 | Real streak in workout rewards | **Verified** (offline-mode runtime, Milestone 3) | `frontend/src/pages/ActiveWorkout.tsx`, then `lib/rewards.ts` (streak now computed inside `grantWorkoutRewards`) | full workout finished in the browser: 2-day streak, no milestone paid (correct) | pass | In API mode the streak counts sessions cached on this device only |
| T-12 | Empty starting wallet | **Verified** (offline-mode runtime) | `frontend/src/lib/wallet.ts` | fresh origin: wallet = 15 (today's real daily bonus), ledger has 1 entry | pass | Existing installs keep their stored balance, which may include the old 720 seed; deliberately not migrated |
| T-13 | Demo data opt-in only (`VITE_DEMO_DATA=true`) | **Verified** (offline-mode runtime) | `frontend/src/api/hooks.ts`, `frontend/src/pages/Trainer.tsx` (prop type) | Goals → "no goals yet"; Trainer → empty thread + prompt chips; Store → 15 coins; scan for "195 lb / 14-day streak / bench PR / 720" → none | pass | The GitHub Pages showcase no longer shows sample data unless the variable is set at build time (product call) |
| T-14 | Greeting without invented facts | **Verified** (offline-mode runtime) | `frontend/src/components/dashboard/Greeting.tsx` | dashboard shows "Good morning, Tester" + the real local trainer message | pass | — |
| T-15 | CI workflows | Implemented — not verified | `.github/workflows/ci.yml` (new), `backend/.github/workflows/ci.yml` (new) | files written; same commands pass locally (frontend build; backend typecheck) | — | Needs a GitHub run. Backend CI expects the 3 DB tests to pass against a fresh Postgres; unconfirmed |
| T-16 | `npm run dev:offline` | **Verified** (runtime) | `frontend/vite.config.ts`, `frontend/package.json`, `.claude/launch.json` (local, gitignored) | offline dev server ran with `.env` pointing at `:4000`; app used localStorage, no auth redirect | pass | — |

## Milestone 3

| ID | Task | State | Changed files | Checks run | Result | Outstanding risk |
|---|---|---|---|---|---|---|
| T-38 | Shared exercise-name matching | **Verified** (script + offline runtime) | `frontend/src/lib/repdb.ts` (exported `normExerciseName`, `aliasExerciseId`; fixed `hammer curl` → `hammer-curl`, `overhead press` → `ohp`), `frontend/src/lib/muscleLookup.ts`, `frontend/src/pages/ActiveWorkout.tsx` | script: all 57 template names + 17 short forms resolve, nonsense names don't; browser: Body ranks "Deadlift" as back, summary lists back/glutes/hamstrings/chest; "Deadlift" thumbnail is the barbell deadlift | pass | Better matches move some historic sets to different muscles (intended) |
| T-35 | Backend tests load without `.env` | **Verified** (unit) | `backend/src/test-setup.ts` (new), `backend/vitest.config.ts`, `backend/tsconfig.json` | moved `.env` aside: 104 pass / same 3 DB fails, DB fails fast at `127.0.0.1:1`; `.env` restored | pass | — |
| T-37 | Honest rewards and challenges | **Verified** (offline-mode runtime) | `frontend/src/lib/rewards.ts`, `frontend/src/lib/wallet.ts` (F-13), `frontend/src/pages/Store.tsx`, `frontend/src/pages/ActiveWorkout.tsx` | seeded 3 sessions: Store lists 5 payable ways; challenges 2/4, 11,805 lb, 1/2, 5/5 (last week excluded); claim paid 160 and header updated at once; finishing a workout paid +288 (88 base, 50 PR, 150 early-sets) | pass | Progress stored under `forma.challenges.v1` is ignored now (payout keys unchanged, so nothing pays twice) |
| T-32 | Working CSV export via the API client | **Implemented — not verified** end to end | `backend/src/modules/me.ts`, `backend/src/services/exportCsv.ts` (+ test), `backend/openapi.yaml`, `frontend/src/api/client.ts`, `frontend/src/lib/download.ts` (new), `frontend/src/pages/settings/Account.tsx`, `frontend/src/pages/settings/Privacy.tsx` | 4 CSV unit tests; Express routing check (`/me/export` → JSON, `/me/export.csv` → CSV); running API: `/me/export.csv` → 401 unauthenticated | pass | Authenticated download not run (needs DB) |
| T-30 | Remove dead code | **Verified** (typecheck, build, runtime) | `frontend/src/api/hooks.ts`, `frontend/src/api/demo.ts`, `frontend/src/lib/data.ts`, `frontend/src/components/dashboard/MetricDetailBody.tsx`, `frontend/src/pages/Home.tsx`, `WeeklySummary.tsx` (deleted) | import-parse script shows every remaining `lib/data.ts` export has an importer; metric drawer opens with real data | pass | — |
| T-33 | Verify `AI_MODEL`; fix live Kai replies | **Implemented — not verified** live | `backend/src/services/ai.ts` (+ test), `backend/package.json` (`@anthropic-ai/sdk` 1.3.0) | model id checked against the current list; 6 unit tests (thinking block skipped, refusal → fallback, canned copy has no numbers, keyless path); `tsc` | pass | No live API call made (it would bill the key in `backend/.env`); model choice is T-40 |
| T-36 | One-command E2E stack | **Implemented — not verified** end to end | `frontend/scripts/e2e-stack.mjs` (new), `frontend/playwright.config.ts`, `frontend/package.json` | guards refuse missing / remote / invalid `DATABASE_URL`; config lists 130 tests with and without `E2E_START_STACK`; API boots and `/health` → 200 without a DB | pass | Full run needs a local Postgres |
| T-34 | ESLint + CI | **Verified** (lint ran) | `frontend/eslint.config.js`, `backend/eslint.config.js` (new), both `package.json`, both CI workflows, fixes in `auth-shared.tsx`, `ai-orb-face.tsx`, `Connections.tsx`, `CircularDial.tsx`, `client.ts`, `templates.ts`, `Workouts.tsx`, `FoodLog.tsx`, `Home.tsx`, `ActiveWorkout.tsx`, `dashboard.spec.ts`, backend `coach.ts`, `programs.ts`, `progress.ts`, `notify.ts`, `food/index.ts`, `food/ocr.ts` | `npm run lint` both: 0 errors (frontend 45 compiler-readiness warnings); typecheck, build, tests; fresh-tab browser pass over Trainer, Dashboard, Store, Account, Body, quick start: no console errors | pass | CI lint step not yet run on GitHub |
| T-31 | Single cosmetic catalogue | **Blocked** by T-23 | — | re-diffed FE/BE: prices and slots match (backend adds `cloud`, `dusk`) | — | Drift still possible until T-23 is decided |

## With a database (2026-10-30, disposable Render Postgres supplied by the user)

The database was empty; `prisma migrate deploy` applied all 13 migrations and the seed created reference data plus the demo user.

| ID | Task | State | Changed files | Checks run | Result | Outstanding risk |
|---|---|---|---|---|---|---|
| — | Backend suite against a real DB | **Verified** | — | `npm test` with `DATABASE_URL` | 117/117 pass, including the 3 auth tests that had only failed for lack of a DB | — |
| T-25 | Purchases can't overdraw or double-charge | **Verified** (DB integration test) | `backend/src/modules/customization.ts`, `backend/src/modules/store.ts`, `backend/src/modules/purchase.test.ts` (new) | new test registers a user, fires concurrent buys. **Old code: both buys succeed (201, 201)**, overdrawing and charging twice. Fixed code: [201, 400] and [201, 409], balance 0 / 120, one spend row; 3 runs in a row | pass | Also fixed: two first-touch requests raced to create the customization row (unique-key 409). `/store/items/:id/buy` got the same guarded decrement; its test is not written (legacy store, no UI) |
| — | Playwright E2E suite | **Verified** | — | `E2E_ALLOW_DB_HOST=… DATABASE_URL=… npm run test:e2e:stack` | **130/130 pass** (6.1 min) against the real API + DB, chat on canned replies | — |
| T-32 | Signed-in CSV export | **Verified** (runtime, API mode) | — | signed in as the demo user in the browser; `GET /me/export.csv` with the stored token → 200 `text/csv`, both sections | pass | Row-level check is in `frontend/tests/e2e/export.spec.ts` (new, not yet run: port 5178 was held by another Vite server) |
| T-36 | E2E script accepts a named disposable host | **Verified** (guard) | `frontend/scripts/e2e-stack.mjs` | refuses remote hosts unless `E2E_ALLOW_DB_HOST` names that exact host; clears `ANTHROPIC_API_KEY` for the run | pass | — |

## Workout templates, builder and workout UX (2026-10-30)

Scope: the "Workout App Enhancement" QA brief plus "make the workout part more fun and intuitive, better exercise images". Full register: `docs/Workout_App_QA_Audit_and_Bug_Report.pdf` (findings QA-01…09, fixes FX-01…16).

| Area | State | Changed files | Checks run | Result | Outstanding risk |
|---|---|---|---|---|---|
| Template library + training plans | **Verified** (E2E) | `lib/workoutTemplates.ts`, `lib/workoutPlans.ts` (new), `components/workout/TemplateLibrary.tsx`, `TemplatePreview.tsx`, `PlanViews.tsx` (new), `TemplateCard.tsx`, `pages/Workouts.tsx` | `workout-library.spec.ts` (10) | pass | Level / length filters and the my-workout menu have no automated test |
| Custom builder rewrite | **Verified** (E2E, desktop + Pixel 7) | `pages/WorkoutBuilder.tsx`, `components/workout/ExercisePicker.tsx`, `Stepper.tsx`, `layout/QuickActions.tsx`, `lib/templates.ts`, `lib/lifecycle.ts` | `workout-builder.spec.ts` (7) | pass | Custom exercises can't be stored in API mode (QA-03); builder warns |
| Exercise resolution by RepDB id | **Verified** (script + E2E) | `lib/templates.ts`, `lib/repdb.ts`, `backend/src/modules/library.ts` | all 95 template exercises resolve via the id path | pass | Templates saved before this keep their old match |
| Start-while-active guard, finish-screen payoff, week strip | **Verified** (E2E + screenshots) | `pages/Workouts.tsx`, `pages/ActiveWorkout.tsx`, `components/workout/WeekStrip.tsx`, `Celebration.tsx` (new), `lib/fitness.ts` | `workout-session.spec.ts` (2, incl. axe on the summary); evidence screenshots | pass | Share action itself not exercised |
| Exercise images | **Verified** (E2E) | `components/ExerciseThumb.tsx`, `lib/repdb.ts`, Library / Session drawer | thumbnail motion spec (allowed + reduced motion) | pass | Animated media needs the paid RepDB tier (decision) |
| App-wide smoke + a11y | **Verified** (E2E) | `tests/e2e/smoke.spec.ts`, `export.spec.ts`, `evidence.spec.ts` (new), `playwright.config.ts`, `helpers.ts` | 21 routes, reload, CSV / JSON export, 7 phone layouts, axe | pass; app-wide axe reports QA-01 (contrast) and QA-09 (/body) | Both open, pre-existing |
| Full suite | **Verified** | — | `E2E_ALLOW_DB_HOST=… DATABASE_URL=… E2E_WEB_PORT=5180 E2E_API_PORT=4100 npm run test:e2e:stack` | **192 passed, 0 failed**, 5 skipped (opt-in screenshot specs), 8.7 min, desktop + Pixel 7. Also: frontend lint 0 errors / 57 warnings, build pass; backend typecheck, lint pass, Vitest 119/119 | Server log showed `POST /chat` failing (F-25); the test accepts 500 |

## Whole-project checks after Milestone 3

| Check | Command | Result |
|---|---|---|
| Frontend lint | `npm run lint` | 0 errors, 45 warnings (React Compiler readiness) |
| Frontend typecheck + build | `npm run build` | pass (same catalogue chunk-size warning) |
| Backend lint | `npm run lint` | 0 errors |
| Backend typecheck | `npm run typecheck` | pass |
| Backend tests | `npm test` | 114 pass / 3 fail: the same DB-dependent auth tests |
| Offline-mode browser pass | `npm run dev:offline` | Body, Store, workout finish, dashboard drawer, quick start, Trainer, Account: no console errors in a fresh tab. Test data cleared afterwards |
| Playwright E2E / API-mode flows | `npm run test:e2e:stack` | **Not run.** Needs a local Postgres (Blocked) |

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
| E2E / API verification | Blocked | DB credentials: a local PostgreSQL 16 service is running, but its credentials aren't in the repo. With one: `DATABASE_URL=… npm run test:e2e:stack` (frontend) |
| T-31 | Blocked | Waits on T-23 |
| T-39 | Blocked | Dependency upgrades need the API-mode suite to verify |
| T-40 | Requires approval | Kai model choice (cost) |
| T-41 | Requires approval | Goal / weekly-target / form payouts, part of T-20 |

## Next unfinished task

Milestones 1 and 3 are done apart from the blocked items above. Everything left needs either a database or a decision:
1. With a local `DATABASE_URL`: run `npm run test:e2e:stack`, then verify T-32 (authenticated CSV download), T-24, T-25, T-28, then start T-39.
2. Decisions: T-23 (unblocks T-31), T-20 (+T-41), T-40, T-21, T-22, T-26/T-27.
3. From the workout QA pass: add the missing `KaiMemory` migration — coach chat 500s on a migrated DB (F-25 / QA-10, needs approval); fix the tertiary text token (QA-01, `#776E7C`), the `/body` chart accessibility (QA-09), `useAction` stale callbacks (QA-06); decide on custom exercises in API mode (QA-03, needs a migration) and the paid RepDB tier for animated media (QA-04).
