# Forma — Implementation Plan (Master Backlog)

Priorities: **P0** critical · **P1** high · **P2** medium · **P3** low. Complexity: S / M / L / XL.
Ordered by dependency. Live status is tracked in `IMPLEMENTATION_PROGRESS.md`.

## Milestone 1 — Close the open holes (this session)

| ID | Module | Problem | Solution | Files | Deps | P | Size | Acceptance criteria | Tests |
|---|---|---|---|---|---|---|---|---|---|
| T-01 | Subscription | `validate-receipt` grants Pro for any string (F-01) | Refuse in production with `501 receipt_validation_unavailable` until StoreKit/Play verification exists; keep the dev stub outside production | `backend/src/modules/subscription.ts` | — | P0 | S | Production returns 501 and writes nothing; dev behaviour unchanged | Unit: prod-mode request → 501 |
| T-10 | Body map | Fatigue inverted, API back/core groups dropped, fake fallback (F-06/07/08) | Fold API keys (lats/traps → back, rear_delts → shoulders, obliques → abs); compute recency-weighted fatigue and no-API activation from real sessions × RepDB muscles; empty state instead of fake data | `pages/Body.tsx`, `components/BodyMuscles.tsx`, `lib/fitness.ts` | — | P1 | M | Heaviest-trained recent muscle shows hottest in Fatigue; lat work paints the back; no data shows an empty state | Typecheck, build, browser check (no-API) |
| T-11 | Workout summary | Hard-coded 14-day streak (F-05) | Use `currentStreak()` over sessions including the one just finished | `pages/ActiveWorkout.tsx` | — | P1 | S | Streak milestone coins fire only on real milestones | Typecheck |
| T-12 | Wallet | New wallets seeded with 720 coins and a fake ledger (F-04) | Start at 0 with an empty ledger; API mode still hydrates from the server | `lib/wallet.ts` | — | P1 | S | Fresh install shows 0 coins and an empty ledger; existing stored wallets untouched | Browser check |
| T-13 | Data layer | Demo dataset served as live data in the no-API build (F-03) | Serve `demo.ts` only when `VITE_DEMO_DATA=true`; otherwise empty/null so screens show empty states | `api/hooks.ts` | — | P1 | S | Pages build shows no fabricated goals/achievements/chat; demo still available behind the flag | Browser check |
| T-14 | Dashboard | Greeting falls back to "Alex" and invented nudges (F-09) | Use the real profile name; omit the nudge when there's no real message | `components/dashboard/Greeting.tsx` | — | P2 | S | No invented facts on the dashboard | Typecheck |
| T-15 | Tooling | No CI; backend tests hard-exit without env | Root CI: frontend typecheck + build. Backend CI (in backend repo): Postgres service, migrate, typecheck, tests | `.github/workflows/ci.yml`, `backend/.github/workflows/ci.yml` | — | P1 | S | Workflows parse; jobs mirror local commands | Run locally where possible |
| T-16 | Tooling | No way to run the no-backend build locally while `.env` points at an API | `npm run dev:offline` (Vite mode `offline`, empty `VITE_API_URL` via `define`; `.env.*` files are gitignored) | `frontend/package.json`, `frontend/vite.config.ts` | — | P3 | S | Offline dev server serves local-mode app | Browser |

## Milestone 2 — Needs approval or external input

| ID | Module | Problem | Proposed solution | Deps | P | Size | Why approval |
|---|---|---|---|---|---|---|---|
| T-20 | Economy | Client-trusted `/store/wallet/earn` (F-02); reward rules only in the client (H-10) | Server reward table + `WalletTransaction.rewardKey` unique per wallet (additive migration); server awards on session finish, goal completion and daily check-in; retire client-reported earn | DB access | P1 | L | Changes reward rules and needs a migration |
| T-21 | Subscription | Real receipt validation + paywall UI | StoreKit 2 / Play Developer API; entitlement reconciliation; plan prices from store config | Apple/Google accounts, mobile app | P0 before any paid tier | L | Billing |
| T-22 | Deploy | API not deployed; free Render DB expired | Paid Postgres + web service; set `VITE_API_URL` and `WEB_ORIGIN`; run migrations + seed | Hosting decision | P0 | M | Cost + production |
| T-23 | Goals (no-API) | Goals not persisted without a backend (F-10) | Local goals in `localStore`, with progress derived from sessions/meals/quickLogs | — | P2 | M | Decide whether the no-API build is a real product or a demo |
| T-24 | Workout sync | Failed set writes are dropped silently; offline sessions never reconcile | Durable outbox in localStore, retried on reconnect/finish | DB to verify | P1 | M | Needs integration testing against a DB |
| T-25 | Store | Purchase race can overdraw the balance | Conditional `updateMany(balance >= price)` inside the transaction | DB to verify | P2 | S | Needs DB to verify |
| T-26 | Gym-management scope | Memberships, classes, bookings, check-in, admin console (brief) | New domain: Gym, Plan, Membership, Class, Booking, Attendance + admin UI | Product decision | — | XL | New product |
| T-27 | Coach UI | Coach endpoints exist with no UI | Coach dashboard + athlete invite flow | Product decision | P3 | L | New product surface |
| T-28 | Feature gating | Schema default `gatingEnabled=true` for rows created outside onboarding | Flip the default to false (migration) | DB access | P2 | S | Migration |

## Milestone 3 — Maintainability (no approval needed)

Scope grew where the work turned up bugs; the "Solution" column says what was actually done. Status in `IMPLEMENTATION_PROGRESS.md`.

| ID | Problem | Solution | P | Size |
|---|---|---|---|---|
| T-30 | Dead code: `WeeklySummary.tsx`, unused hooks, unused `lib/data.ts` exports | Deleted 8 hooks, 6 demo builders, `WeeklySummary`, 23 `lib/data.ts` declarations, and `MetricDetailBody`'s mock fallback (`detail` now required) | P3 | S |
| T-31 | Cosmetic catalogue duplicated FE/BE | **Blocked by T-23.** The no-API build needs a local catalogue and the backend is a separate repo, so the copy can't go until T-23 decides the no-API build's future. Re-diffed: prices and slots match | P2 | M |
| T-32 | `Account.tsx` CSV export bypassed the API client, and never worked (F-15) | CSV moved to `GET /me/export.csv`; CSV writer extracted to `services/exportCsv.ts` with quoting + formula-injection guard + tests; `api.me.exportCsv` (client `blob` option); Account shows errors; shared `lib/download.ts` | P2 | S |
| T-33 | `AI_MODEL` default not verified; live reply parsing broken (F-16) | Verified `claude-sonnet-5` is valid. `services/ai.ts` moved to `@anthropic-ai/sdk`: text blocks only, refusal → fallback, `effort: low`, `max_tokens` 16000, 30 s timeout / 1 retry; canned copy no longer invents facts | P1 | S |
| T-34 | No lint in either package | ESLint 10 + typescript-eslint (+ react-hooks 7 in the frontend), `npm run lint`, CI step; fixed every error (dead imports/consts, a component created during render, recursive blink callback, useless assignments). React Compiler rules kept as warnings | P2 | M |
| T-35 | Backend tests need env to import | `src/test-setup.ts`: loads `.env`, unreachable DB placeholder, test JWT secrets, clears `ANTHROPIC_API_KEY` | P2 | S |
| T-36 | E2E needs a live stack | `npm run test:e2e:stack` (frontend): refuses non-local DBs, migrates + seeds, Playwright `webServer` starts API + Vite (`E2E_START_STACK=1`) | P1 | M |
| T-37 | Unreachable rewards (H-19) and fake challenge progress (H-20, F-14) | `EarnWay.payout`; Store lists only payable ways. Challenges measured from this week's sessions (form challenge dropped); "claimed" read from wallet grants. Wallet snapshot fix (F-13) | P2 | M |
| T-38 | Exercise-name → RepDB matching picked wrong variants ("Deadlift" → "Banded Romanian Deadlift"); 2 aliases pointed at missing/wrong ids | One alias table + normaliser in `lib/repdb.ts`; `lib/muscleLookup.ts` does alias → exact → closest whole-word match; ActiveWorkout uses it too | P2 | S |

## Milestone 4 — Found in Milestone 3

| ID | Problem | Proposed solution | Deps | P | Size | Why it waits |
|---|---|---|---|---|---|---|
| T-39 | Dependency advisories (F-17): backend 18 incl. `proxy-addr` (critical, runtime), frontend 6 | Move the affected packages (Express and its deps, nodemailer, zod, prisma, vitest, vite, react-router) to patched versions; re-run everything | DB for integration tests | P1 | M | Major-version upgrades; needs the API-mode suite to verify |
| T-40 | Kai model choice | Keep `claude-sonnet-5`, or move to `claude-sonnet-5-5` (same price, current generation) or `claude-opus-5-5` (2× price). Set via `AI_MODEL`; the code works with all three | — | P2 | S | Cost / product decision |
| T-41 | Goal, weekly-target and form rewards have no payer (H-19) | Pay them server-side as part of T-20 | T-20 | P2 | S | Economy rules |
