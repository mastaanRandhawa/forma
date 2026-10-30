# Forma — Hardcoded Data Audit

Scope: `frontend/src`, `backend/src`, configs. Method: grep for literal names, numbers, URLs and static arrays, then traced each one to the screens that render it. Status reflects this session's work; see `IMPLEMENTATION_PROGRESS.md`.

Classification: **Acceptable** constant · **Config** (env/config) · **DB** (persistent data) · **Calculated** (derive from real data) · **Admin** (editable by staff) · **Mock-only** (dev/test only).

| # | File / location | Hardcoded value | Current usage | Problem | Correct source | Class | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| H-01 | `frontend/src/lib/wallet.ts:69-85` + `lib/data.ts:243` | balance 720, lifetime 1,960, 3 fake ledger rows | seed for every new wallet | users start with coins and history they never earned | empty wallet; server wallet in API mode | Calculated | P1 | Fixed (T-12) |
| H-02 | `frontend/src/pages/ActiveWorkout.tsx:509` + `lib/data.ts:519` | `streakDays: 14` | workout reward calculation | streak milestones never match reality | `currentStreak(sessions)` | Calculated | P1 | Fixed (T-11) |
| H-03 | `frontend/src/api/demo.ts` via `api/hooks.ts:166` | demo goals, achievements, chat thread, muscle map, notifications, wallet, trainer | served as live data whenever `VITE_API_URL` is unset, i.e. the production Pages build | fabricated PRs/streaks shown beside the user's real data | empty state, or data derived from localStorage | Mock-only | P1 | Fixed (T-13): behind `VITE_DEMO_DATA=true` |
| H-04 | `frontend/src/pages/Body.tsx:63,75` + `lib/data.ts:111-131` | `muscleActivation`, `rankedMuscles` | Body map fallback when the user has no data | fake heatmap | sessions × RepDB muscles | Calculated | P1 | Fixed (T-10) |
| H-05 | `frontend/src/components/dashboard/Greeting.tsx:11-23` | name "Alex"; nudges "3,200 steps left…", "18g short…", "bedtime in 40 minutes" | dashboard header fallback | invented personal facts | profile name; no nudge when no real message | Calculated | P2 | Fixed (T-14) |
| H-06 | `frontend/src/components/dashboard/WeeklySummary.tsx` + `lib/data.ts:188` | static weekly summary | not rendered anywhere | dead code with fake numbers | delete or derive | Mock-only | P3 | Open (T-30) |
| H-07 | `frontend/src/lib/data.ts:4-235` | `user`, `todayWorkout`, `trainerMessage`, `homeStats`, `recentPRs`, `insights`… | only via `demo.ts` | dead outside demo mode | Mock-only | Mock-only | P3 | Contained by T-13 |
| H-08 | `frontend/src/pages/Trainer.tsx:117` + `lib/data.ts:167` | suggested prompt chips | fallback when API prompts are missing | generic UI copy, not user data | — | Acceptable | — | Keep |
| H-09 | `frontend/src/pages/Goals.tsx:13-20` | goal templates (10k steps, 160g protein…) | "new goal" picker defaults | starter templates, user-chosen | — | Acceptable | — | Keep |
| H-10 | `frontend/src/lib/rewards.ts:40-157` | reward amounts, weekly challenges, streak milestones | client economy | business rules live only in the client; server can't enforce them (F-02) | server reward table | Config/DB | P1 | Requires approval (T-20) |
| H-11 | `frontend/src/lib/data.ts:486` vs `backend/src/data/customization.ts` | cosmetic prices (73 ids) | store display (FE) + purchase validation (BE) | duplicated; diffed in sync today | one shared catalogue served by `/customization/catalog` | DB/Config | P2 | Open (T-31) |
| H-12 | `backend/src/modules/subscription.ts:12-16` | plan prices 12.99 / 99.99 | `GET /subscription/plans` | real prices are set in App Store / Play | store product config | Config | P2 | Requires approval (T-21) |
| H-13 | `frontend/src/pages/settings/Account.tsx:8-10`, `api/client.ts:13-15` | `http://localhost:4000/api/v1` fallback | API base when the env var is unset | duplicated; harmless while `API_ENABLED` guards calls | single export from `api/client.ts` | Config | P3 | Open (T-32) |
| H-14 | `backend/src/env.ts:26` | `AI_MODEL` default `claude-sonnet-5` | Kai model | model ID not verified current | env var per deployment | Config | P2 | Open (T-33) |
| H-15 | `frontend/src/pages/ActiveWorkout.tsx:85` | rest presets 60/90/120/180 s | rest timer chips | fine; adaptive rest already computes suggestions (`adaptiveRest`) | — | Acceptable | — | Keep |
| H-16 | `frontend/tests/e2e/helpers.ts:6-9` | `alex@forma.app` / `forma1234` | E2E test user | seed credentials for a dev DB | `prisma/seed.ts` | Mock-only | — | Keep (test-only) |
| H-17 | `backend/render.yaml` | free plans, `oregon` region | deploy blueprint | free DB expires after 30 days (already happened to the test DB) | paid plan for anything real | Config | P1 | Requires approval (T-22) |

| H-18 | `frontend/src/pages/Body.tsx` (balance + undertrained sections) | push/pull 62, left/right 51, anterior/posterior 58; "Push volume is running ~60% ahead of pull"; undertrained "Hamstrings, Calves, Rear Delts — 2× / month" | Body page, both modes | entirely invented, shown to every user | 4-week hard sets per muscle (`muscleBalance`, `sessionsPerGroup`) | Calculated | P1 | Fixed (T-10); left/right removed (no per-side data exists) |
| H-19 | `frontend/src/lib/rewards.ts` EARN_WAYS "Clean form session +25" | form score ≥ 90% | Store "ways to earn" | the web app never computes a form score, so this reward is unreachable | remove until form analysis ships, or wire it to a real form score | Config | P3 | Open (T-37) |

Secrets: `git grep` for Anthropic/AWS keys, private keys and literal API keys in tracked files found nothing. `backend/.env` and `frontend/.env` are gitignored.
