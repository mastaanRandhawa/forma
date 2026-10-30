# Forma — Architecture Map

Evidence: static, from imports and route tables (2026-10-30). Line references are to the files named.

## 1. System overview

```mermaid
flowchart LR
  subgraph Browser["SPA (frontend/, Vite + React)"]
    Pages --> Hooks["api/hooks.ts<br/>useResource SWR cache"]
    Pages --> Local["lib/localStore.ts<br/>localStorage forma.data.v1"]
    Pages --> Econ["lib/wallet.ts · lib/rewards.ts<br/>lib/customization.ts"]
    Hooks -->|API_ENABLED| Client["api/client.ts<br/>bearer + auto-refresh"]
    Hooks -->|no API| Demo["api/demo.ts<br/>bundled demo data"]
    Lifecycle["lib/lifecycle.ts<br/>workout write-through"] --> Client
    Lifecycle --> Local
    Econ -->|API_ENABLED| Client
  end
  subgraph API["backend/ (Express + Prisma)"]
    Routes["routes.ts /api/v1"] --> Modules["22 modules"]
    Modules --> Services["services/*<br/>ai, readiness, prescription,<br/>progression, achievements…"]
    Modules --> Prisma[(Postgres)]
    Worker["worker.ts / jobs"] --> Prisma
  end
  Client -->|HTTPS JSON| Routes
  Services -->|Anthropic| AI[(Claude API)]
  Modules -->|food| Food[(USDA · OFF · Nutritionix · Edamam)]
  Modules -->|OAuth| Wear[(WHOOP · Oura · Garmin)]
  Mobile["mobile/ (Expo, scaffold)"] -->|POST /me/health/samples| Routes
```

**Build-time mode switch:** `API_ENABLED = Boolean(VITE_API_URL)` (`frontend/src/api/hooks.ts:14`). GitHub Pages builds without it, so production is the no-API path.

## 2. Routes → pages → data sources

| Route | Page | Local data (`localStore`) | API calls (API mode) | No-API fallback |
|---|---|---|---|---|
| `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email` | auth pages | — | `auth.*`, `config.authConfig` | auth disabled; status `anon`, app open |
| `/onboarding` | Onboarding | `saveProfile` | `me.onboarding` | local profile |
| `/dashboard` | Home | sessions, checkins, profile | `dashboard`, `sessions.list` | `buildLocalDashboard` (real local data) |
| `/workouts` | Workouts | sessions, templates, active | `programs.list`, `workouts.generate`, `workouts.list`, `sessions.list` | local templates/presets |
| `/workouts/active` | ActiveWorkout | active session (cache) | `sessions.start/logSet/deleteSet/addPerformance/finish/abandon`, `food.day` | local-only session |
| `/workouts/builder[/:id]` | WorkoutBuilder | local templates | `workouts.create/update` via `lib/templates.ts` | local templates |
| `/trainer` | Trainer | profile | `trainer.get/update`, `chat.history/send/suggestedPrompts`, `programs.generate` | canned replies + **demo history** |
| `/body` (gated `body_map`) | Body | — | `body.muscleMap(range)` | **demo muscle map** |
| `/progress` (gated) | Progress | sessions | `sessions.list`, `progress.trainingLoad/patterns/nutritionCorrelation` | local sessions |
| `/records` | Records | sessions | `progress.cohort` | local PRs |
| `/nutrition` | Nutrition → FoodLog / OfflineNutrition | meals, targets | `food.*` | OfflineNutrition (local) |
| `/goals` (gated) | Goals | — | `goals.list/upsert` | **demo goals**; adds not persisted |
| `/store` (gated) | Store | wallet, challenges (localStorage) | `customization.*`, `store.wallet/earn` | local economy |
| `/exercise-library` | ExerciseLibrary | — | none (bundled RepDB catalog) | same |
| `/settings/*` (8) | Settings pages | profile, prefs | `me.*`, `me.devices/connectDevice/syncDevice` | local prefs |
| `/settings/security` | AccountSecurity | — | `me.sessions/revokeSession/changePassword/changeEmail/connectedAccounts/deleteAccount` | n/a |

## 3. Shared components and their consumers

| Component | Consumers | Notes |
|---|---|---|
| `AppShell`, `layout/TopNav`, `layout/QuickActions`, `RouteProgress` | every authed route | AppShell grants the daily coin bonus on mount (`AppShell.tsx:49`) |
| `layout/TrainingTabs` | Body, Progress | |
| `FeatureGate` + `useProgression()` | `main.tsx` gated routes, TopNav, TrainingTabs, Coaching | |
| `BodyMuscles` | Body (`BodyView` also embedded in Workouts) | draws 10 groups only (see F-07) |
| `MuscleMap` (SVG) | legacy | |
| `ExerciseDetailDrawer`, `ExerciseThumb`, `workout/ExercisePicker` | Library, Builder, ActiveWorkout | RepDB catalog |
| `workout/SessionDetailDrawer`, `TemplateCard`, `WorkoutInProgressBar` | Workouts, Home | |
| `dashboard/*` (RingStat, DetailDrawer, MetricDetailBody, GoalsCard, AchievementStrip, Greeting…) | Home | `WeeklySummary` is unused |
| `health/*` (DailyCheckin, MetricCard, CircularDial…) | Home | DailyCheckin writes local + `progress.checkin` |
| `nutrition/*` | Nutrition | FoodLog = API, OfflineNutrition = local |
| `EmptyState`, `ErrorState`, `skeleton/*`, `PageHeader`, `Reveal`, `primitives` | most pages | shared, consistent |
| `settings/*` (EditRow, Toggle, SettingsNav, ui) | settings pages | |

## 4. Data ownership (single source of truth)

| Entity | API-mode authority | No-API authority | Consumers | Notes |
|---|---|---|---|---|
| User / profile | `User`, `/me` | `localStore.profile` | Onboarding, TrainingProfile, Settings, Home | |
| Workout sessions | `WorkoutSession`/`ExercisePerformance`/`ExerciseSet` | `localStore.sessions` | Home, Progress, Records, Workouts, ActiveWorkout | API mode keeps a local cache; `apiSessionToCompleted` maps server rows to the local shape |
| Templates | `Workout{isTemplate}` | `localStore.localTemplates` | Workouts, Builder | bridged by `lib/templates.ts` |
| PRs | `PersonalRecord` (server-computed) | derived (`lib/fitness.detectPRs`) | Records, summary | |
| Muscle activation | `/body/muscle-map` | **demo** (F-08) | Body | |
| Goals | `Goal`/`GoalEntry` | **demo** + transient state (F-10) | Goals, GoalsCard | sessions auto-increment `weekly_workouts` server-side |
| Achievements | `Achievement`/`UserAchievement` | **demo** | AchievementStrip | server awards coins on unlock |
| Coins / wallet | `Wallet`/`WalletTransaction` | `localStorage forma.wallet.v2` | Store, CoinBalance, Customization | client computes rewards and mirrors (F-02) |
| Cosmetics | `UserCustomization` + server price map | local store | Store, Customization, TopNav, KaiOrb | catalogue duplicated FE/BE (in sync) |
| Food / nutrition | `FoodLog`, `NutritionGoal` | `localStore.meals` | Nutrition, ActiveWorkout (protein nudge) | |
| Check-ins / readiness | `RecoveryCheckin` → `readiness.ts` | `localStore.checkins` | Home, session start adjustment | |
| Chat / Kai memory | `ChatMessage`, `KaiMemory` | **demo history** | Trainer | |

## 5. Change-impact notes for planned work

| Change | Touches | Consumers to re-check | Regression risk |
|---|---|---|---|
| Receipt endpoint hardening | `subscription.ts` | none in frontend; mobile doesn't call it | none |
| Body map fixes | `Body.tsx`, `BodyMuscles.tsx`, `lib/fitness.ts` | `BodyView` embedded in Workouts | visual only |
| Demo data behind a flag | `api/hooks.ts`, Greeting | Goals, AchievementStrip, Trainer, Body; all have empty states | screens now show empty states in the no-API build |
| Wallet seed removal | `lib/wallet.ts` | Store, CoinBalance, Customization | existing users keep stored balances; only fresh installs change |
| Server-authoritative rewards (future) | `store.ts`, `sessions.ts`, `goals.ts`, schema, `wallet.ts`, `rewards.ts` | Store, ActiveWorkout summary, AppShell | economy rules — needs approval |
