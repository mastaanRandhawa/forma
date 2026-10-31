# Forma — Audit Report

Audit date: 2026-10-30. Repos audited: root `traker-web` (frontend, mobile, docs; branch `feat/workout-system`) and the nested `backend/` repo (`forma-backend`, branch `feat/workout-supersets`).

**Evidence levels used in every doc in this folder**

- **Static** — read in code, not executed.
- **Unit** — covered by a test that ran and passed.
- **Runtime** — exercised in a running app (browser or HTTP).
- **Unverified** — inferred; treat as a hypothesis.

## 1. What this product actually is

Forma is a **single-user AI personal-trainer app** (workout logging, programs, progress analytics, nutrition logging, an AI coach "Kai", cosmetics store), not a gym-management system. There are **no** models, routes or screens for membership plans, gym facilities, class schedules, bookings, check-in/attendance, staff, or an admin console. `Role` has `admin` and `coach` values, but no admin routes exist and coach routes are API-only.

The generic gym-management flows in the audit brief (memberships, classes, bookings, admin) are therefore **new product scope**, listed under "Requires decision" in `IMPLEMENTATION_PLAN.md`, not defects.

## 2. Project health summary

| Area | Health | Evidence |
|---|---|---|
| Frontend type safety | Good — `tsc` clean | Unit (ran) |
| Backend type safety | Good — `tsc` clean | Unit (ran) |
| Backend unit tests | 114/117 pass after Milestone 3; the same 3 fail only because no database is reachable. Tests now load without a `.env` and never call the paid Claude API | Unit (ran) + probe |
| E2E (Playwright, 130 tests) | **Not runnable** here — needs backend + seeded DB | — |
| Deployment | Frontend on GitHub Pages in no-backend mode; **API not deployed**; the Render test DB in `backend/.env` is unreachable (free Render Postgres expires after 30 days) | Probe |
| Security | 1 critical, 1 high issue (below); auth/session model otherwise solid | Static |
| Data integrity | Two persistence modes; no-backend mode mixes real data with fabricated demo data | Static |
| CI | Workflows added for both repos (T-15); not yet run on GitHub | Static |
| Lint | ESLint in both packages, in CI: 0 errors. Frontend keeps 45 React Compiler readiness warnings (T-34) | Unit (ran) |

## 3. Architecture in one paragraph

A Vite/React SPA talks to an Express/Prisma API (`/api/v1`). The SPA runs in one of two modes, decided at build time by `VITE_API_URL` (`frontend/src/api/hooks.ts:14`, `API_ENABLED`):

- **API mode** — resource hooks call the backend; the active workout is mirrored into localStorage as an optimistic cache and written through set by set (`frontend/src/lib/lifecycle.ts`).
- **No-backend mode** (the live GitHub Pages build) — user data lives in localStorage (`frontend/src/lib/localStore.ts`), but several hooks still return a **bundled demo dataset** (`frontend/src/api/demo.ts`).

Coins, challenges and cosmetics are a client-side economy (`lib/wallet.ts`, `lib/rewards.ts`, `lib/customization.ts`) that mirrors to the server in API mode. See `ARCHITECTURE_MAP.md`.

## 4. Critical and high findings

| ID | Severity | Finding | Location |
|---|---|---|---|
| F-01 | **Critical** | `POST /subscription/validate-receipt` grants a Pro subscription for any non-empty string; the receipt is never verified. No frontend caller exists, so the endpoint is pure attack surface. | `backend/src/modules/subscription.ts:36-58` |
| F-02 | **High** | `POST /store/wallet/earn` lets any authenticated user mint up to 1000 coins per call, unlimited calls. The client calls it to mirror locally computed rewards; idempotency keys exist only in the browser. Coins are cosmetic-only (no cash value), so impact is limited to free cosmetics. | `backend/src/modules/store.ts:37-45`, `frontend/src/lib/wallet.ts:143-149` |
| F-03 | High | No-backend build shows **fabricated data next to real data**: Goals, Achievements strip, Trainer chat history, Body map, and Notifications come from `demo.ts` ("New bench PR 195 lb × 3", "14-day streak"), while Home/Progress/Records compute from the user's real localStorage. | `frontend/src/api/hooks.ts:166-211`, `frontend/src/api/demo.ts` |
| F-04 | High | Every new user's wallet is seeded with **720 coins, lifetime 1,960 and a fake ledger** ("14-day streak +80", "5-workout week +60"). | `frontend/src/lib/wallet.ts:69-85`, `frontend/src/lib/data.ts:243-251` |
| F-05 | High | The workout summary passes a hard-coded **streak of 14 days** to reward logic, so streak milestone coins never match reality. | `frontend/src/pages/ActiveWorkout.tsx:509` |
| F-06 | High | Body map **Fatigue mode is inverted**: it plots `1 - score`, so the most-trained muscle renders as "recovered" and lightly trained ones as "fatigued". | `frontend/src/pages/Body.tsx:66` |
| F-07 | High | Body map **drops API muscle groups** `lats`, `traps`, `rear_delts` and `obliques`: the backend returns them, but `BodyMuscles` only draws `chest/shoulders/triceps/biceps/abs/back/quads/glutes/hamstrings/calves`. Back and core work renders blank. | `frontend/src/components/BodyMuscles.tsx:46-82`, `backend/src/data/library.ts:15-27` |
| F-08 | High | Body map falls back to **fake activation** (`muscleActivation`, `rankedMuscles`) when the user has no data, in both modes. | `frontend/src/pages/Body.tsx:63,75` |
| F-09 | Medium | Dashboard greeting falls back to the name **"Alex"** and invented nudges ("3,200 steps left", "18g short of your protein", "bedtime in 40 minutes"). | `frontend/src/components/dashboard/Greeting.tsx:11-23` |
| F-10 | Medium | Goals in no-backend mode are kept only in component state; a new goal disappears on reload. | `frontend/src/pages/Goals.tsx:24-51` |
| F-11 | High | Body page **balance and "undertrained" sections are literals** (62/51/58, "push ~60% ahead of pull", "Hamstrings, Calves, Rear Delts 2× / month"), shown to every user in both modes. Found during implementation. | `frontend/src/pages/Body.tsx` (pre-fix lines 145-190) |
| F-12 | Medium | `apiSessionToCompleted` dropped `isWarmup`, so in API mode warm-up sets counted as working volume in Progress, Records and the strength series. Found during implementation. | `frontend/src/lib/lifecycle.ts:146-169` |

### Found during Milestone 3

| ID | Severity | Finding | Location | Status |
|---|---|---|---|---|
| F-13 | Medium | `walletStore` mutated its state in place, so `useWallet()` (via `useSyncExternalStore`) never saw a new snapshot: Store, CoinBalance and Customization only refreshed when something else re-rendered them. | `frontend/src/lib/wallet.ts` `emit()` | Fixed (runtime: balance updates on claim) |
| F-14 | High | Weekly challenges started from fake `seed` progress ("so the demo looks lived-in": 2/4 workouts, 61,000 lb, 3/5 groups). "Early sets", "Mix it up" and "Dial it in" could never progress. 4 of 9 "ways to earn" had no payer (form, goal, weekly target; achievements only in API mode). | `frontend/src/lib/rewards.ts` | Fixed (T-37) |
| F-15 | High | CSV data export never worked: `GET /me/export` was registered twice, the JSON handler always won, and `Account.tsx` read the token from `forma_access_token` (the client stores `forma.access`), so the request went out unauthenticated and the error was swallowed. CSV also didn't escape quotes in session/exercise names. | `backend/src/modules/me.ts`, `frontend/src/pages/settings/Account.tsx` | Fixed (T-32) |
| F-16 | High | Live Kai replies read only `content[0].text`. On Claude Sonnet 5 thinking is on unless disabled, so a leading thinking block made every reply fall back to canned copy; `max_tokens: 400` also had to cover thinking. The canned copy invented user facts ("bench 1RM trending up about 12% over the last 8 weeks"). | `backend/src/services/ai.ts` | Fixed (T-33), unit-tested; no live call made |
| F-18 | Low | Signed out, the login page polls `/store/wallet`, `/customization` and `/me/settings` and gets 401s (about 20 before sign-in in one session). Noise only; data loads correctly after sign-in. Found running the app in API mode. | wallet / customization / settings providers | Open |
| F-17 | High | Dependency advisories. Backend: 18 (3 critical). The ones on the request path are `proxy-addr` (critical) and `body-parser`/`qs` via Express, plus `nodemailer` and `zod`; the `vitest`/`tinypool` criticals are dev-only. Frontend: 6 (`vite` high, dev server; `react-router-dom` moderate, runtime). | `npm audit` in each package | Open (T-39) |

### Found during the workout templates / builder pass (2026-10-30)

Full register with steps, evidence and fixes: `docs/Workout_App_QA_Audit_and_Bug_Report.pdf`.

| ID | Severity | Finding | Location | Status |
|---|---|---|---|---|
| F-19 | High | The builder's save action always submitted the blank draft from its first render (`useAction` memoises its first callback), so API saves failed with "name required" and local saves created empty templates. | `frontend/src/pages/WorkoutBuilder.tsx`, `api/hooks.ts` `useAction` | Fixed (draft passed as an argument); the `useAction` pattern itself is open (QA-06) |
| F-20 | High | "Add a warm-up set" flagged every set as a warm-up, so the exercise vanished from volume and PRs. | `frontend/src/lib/lifecycle.ts`, `lib/workoutTemplates.ts` | Fixed |
| F-21 | High | In API mode six common exercises (e.g. Barbell Deadlift) were saved as a different variant: name search plus a "first fuzzy hit" fallback. RPE / warm-up flags were dropped. | `frontend/src/lib/templates.ts`, `backend/src/modules/library.ts` | Fixed (resolve via RepDB id; flags in a notes suffix) |
| F-22 | High | Starting a workout while another was open silently replaced it and orphaned the API session. | `frontend/src/pages/Workouts.tsx` | Fixed (asks: resume / discard / cancel) |
| F-23 | Medium | Light-theme tertiary text is 3.45:1 on the page background (AA needs 4.5:1); axe flags it on 7 of 10 routes. | `frontend/src/lib/themes.ts` `--text-tertiary` | Open — suggested `#776E7C` (4.62:1) |
| F-25 | High | `POST /chat` returns 500 on any database built with `prisma migrate deploy`: `KaiMemory` is in `schema.prisma` but none of the 13 migrations create it (P2021). `trainer.spec.ts` accepts 500 (and checks the body only on 200, while success is 201), so the suite never caught it. Pre-existing; outside the workout scope. | `backend/prisma/schema.prisma`, `backend/src/services/memory.ts` `recallMemories`, `frontend/tests/e2e/trainer.spec.ts` | Open — needs an additive migration (approval) |
| F-24 | Medium | `/body`: the body-muscles library renders each muscle as `role=button tabindex=0`: nested-interactive, aria-hidden-focus and ~70 tab stops. | `frontend/src/components/BodyMuscles.tsx` | Open |

## 5. Other findings

### Security / auth (static)

- **Good:** `requireAuth` re-checks the session row, revocation, expiry and soft-deletion on every request; the role comes from the DB, never the client (`backend/src/middleware/auth.ts`). Every user-scoped query I sampled filters by `userId`, including sessions via `ownSession()`, workouts, goals, programs, food and set-level writes (`sessions.ts:223-245`). 500 details are hidden in production (`middleware/error.ts`). CORS allows localhost only outside production.
- **Medium — store purchase TOCTOU:** the balance check and decrement are separate statements (`store.ts:76-87`, `customization.ts:62-73`). Two concurrent buys can drive the balance negative. Fix: conditional `updateMany({ where: { balance: { gte: price } } })`.
- **Low — subscription plan prices hard-coded** in the API (`subscription.ts:12-16`). The real prices will be the store prices; this needs a product decision.
- `AI_MODEL` defaults to `claude-sonnet-5` (`backend/src/env.ts:26`). Verified in Milestone 3: a valid, still-served model (the previous Sonnet generation). `claude-sonnet-5-5` is its same-price successor; changing the default is a cost/product call, so it is left as is (T-40).

### Functional

- **Dead code (removed in T-30):** 8 hooks with no consumers (`useNotifications`, `useMuscleBalance`, `useProgressOverview`, `useReadiness`, the API `useWallet`, `useStoreItems`, `useWorkoutTemplates`, `useConsistency`), 6 demo builders, `WeeklySummary.tsx`, 23 unused `lib/data.ts` declarations (633 → 292 lines), and `MetricDetailBody`'s unreachable mock-trend fallback.
- **Duplicate API base URL:** `pages/settings/Account.tsx:8-10` re-derived the base URL and called `fetch` directly for export, bypassing the client's token refresh. Fixed in T-32 (see F-15).
- **Duplicated catalogue:** cosmetic prices exist in both `frontend/src/lib/data.ts` and `backend/src/data/customization.ts`. I diffed them by script: they are in sync (71 vs 73 ids; `cloud` and `dusk` are backend-only). This is drift-prone, but the server enforces prices on buy.
- **No-backend Trainer chat** answers with canned replies. That's expected without an AI backend, but it isn't labelled as offline.
- **Feature gating:** onboarding enables gating only for users who choose "calm mode" (`backend/src/modules/me.ts:402`). The schema default is `true` for rows created outside onboarding (`schema.prisma`, `UserProgression.gatingEnabled`). Old `PLAN.md` asked for gating default OFF; the onboarding path already does that.

### Testing / tooling

- Backend tests called `process.exit(1)` at import time unless `DATABASE_URL` and the JWT secrets were set (`backend/src/env.ts:60-63`). Fixed in T-35: `src/test-setup.ts` loads `.env`, fills placeholders for what's missing (the DB placeholder is deliberately unreachable), and clears `ANTHROPIC_API_KEY`.
- The 3 failing auth tests do DB lookups (unknown refresh token, verify token, forgot-password) and fail with `PrismaClientInitializationError` when no DB is reachable.
- The E2E suite assumes a running API on `:4000` and a seeded `alex@forma.app` user (`frontend/tests/e2e/helpers.ts`). T-36 adds `npm run test:e2e:stack` (frontend): migrates and seeds a **local** database from `DATABASE_URL`, then Playwright starts the API and Vite itself.

## 6. Blockers to full verification

1. **No reachable database.** The Render test DB is unreachable. A local PostgreSQL 16 service is running on this machine, but its credentials aren't in the repo; probing it with guessed credentials was correctly blocked. Provide a `DATABASE_URL` for a disposable local DB to unlock: backend integration tests, migrations, seed, API-mode browser checks and the Playwright suite.
2. **Docker daemon not running**, so `backend/docker-compose.yml` can't start its Postgres.
3. **External accounts** (Apple/Google developer, WHOOP/Oura approval, hosting) for IAP, mobile and wearables. See `IMPLEMENTATION_PLAN.md` § Blocked.
