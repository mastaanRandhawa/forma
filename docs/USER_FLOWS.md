# Forma — User Flows

Status: **Complete** (all steps implemented and wired) · **Partial** · **Broken** · **Missing**.
Verification: **S** = static trace · **U** = unit test · **R** = runtime (browser/HTTP). API-mode flows are static-only this session: no reachable database (see `AUDIT_REPORT.md` §6).

## Member flows (exist in product)

| Flow | Entry | Steps | Key components | APIs | Data | Status | Verified | Issues / action |
|---|---|---|---|---|---|---|---|---|
| Sign up + verify email | `/signup` | form → `auth.register` → `/verify-email` (code/link, resend cooldown) → onboarding | Signup, VerifyEmail, auth-shared | `/auth/register`, `/auth/verify-email`, `/auth/resend-verification` | User, VerificationToken | Complete (API) | S | No-API build skips auth entirely, by design |
| Login / logout | `/login` | credentials or social → tokens stored → `/dashboard`; logout revokes session | Login, `api/auth.tsx` | `/auth/login`, `/auth/social`, `/auth/logout` | Session, RefreshToken | Complete (API) | S | |
| Password reset | `/forgot-password` | email → link → `/reset-password` → login | ForgotPassword, ResetPassword | `/auth/forgot-password`, `/auth/reset-password` | PasswordReset | Complete (API) | S | Needs SMTP configured, otherwise mail is a no-op |
| Session management | `/settings/security` | list sessions, revoke one or others, change password/email, unlink social, delete account | AccountSecurity | `/me/sessions…`, `/me/password`, `/me/email` | Session, User | Complete (API) | S | |
| Onboarding | `/onboarding` | goal → experience → schedule → equipment → injuries → trainer style | Onboarding | `/me/onboarding` | User, Trainer, InjuryNote, UserEquipment, UserProgression | Complete | S | |
| Dashboard | `/dashboard` | readiness ring, streak, weekly ring, check-in, goals card, achievements, metric drawers | Home + `dashboard/*`, `health/*` | `/dashboard`, `/sessions`, `/goals`, `/achievements` | many | Partial | S, R (no-API) | No-API: goals/achievements were demo data (fixed T-13); greeting fallbacks invented (fixed T-14) |
| Daily check-in | Home | sleep, fatigue, soreness → readiness | DailyCheckin | `/progress/checkin` | RecoveryCheckin | Complete | S | |
| Start / log / finish workout | `/workouts` → `/workouts/active` | pick template/program/quick start → log sets (weight, reps, RPE, warmup, AMRAP) → rest timer → defer/swap/superset → finish → summary + coins + PRs + protein nudge | Workouts, ActiveWorkout, `lib/session.ts`, `lib/lifecycle.ts` | `/sessions/start`, `PUT …/sets/:n`, `/sessions/:id/finish`, `/abandon`, `/performances` | WorkoutSession, ExercisePerformance, ExerciseSet, PersonalRecord, GoalEntry | Partial | S, R (no-API) | Summary used a fake 14-day streak (fixed T-11). No-API finish run in the browser: workout, PR and challenge coins matched the rules (+288), summary muscles came from the shared lookup. Set sync is best-effort with silent failure: offline sets are never retried after reload (T-24) |
| Template builder | `/workouts/builder` | name → add exercises (picker) → sets/reps/rest/superset → save → edit/duplicate/delete | WorkoutBuilder, ExercisePicker, `lib/templates.ts` | `/workouts` CRUD | Workout(isTemplate) | Complete | S | |
| Programs | Workouts, Trainer | generate (AI/plan) → activate → schedule → week view | Workouts, Trainer | `/programs/*`, `/workouts/generate` | TrainingProgram, ProgramDay | Partial | S | No program detail/edit screen; generation needs the API |
| Exercise library | `/exercise-library` | search/filter → detail drawer (instructions, frames) | ExerciseLibrary, ExerciseDetailDrawer | none (bundled catalog) | RepDB catalog | Complete | S | |
| Records | `/records` | all-time bests per exercise, cohort percentile | Records | `/progress/cohort` | PersonalRecord | Complete | S | Cohort only in API mode |
| Progress analytics | `/progress` | range → strength series, volume, muscle volume, consistency, training load, patterns, nutrition correlation | Progress | `/sessions`, `/progress/*` | sessions, food logs | Complete | S | Server insights only in API mode |
| Body map | `/body`, Workouts tab | range + Activation/Fatigue → heatmap → ranked muscles | Body, BodyMuscles | `/body/muscle-map` | MuscleActivation | **Broken** → fixed | S, R (no-API) | Fatigue inverted (F-06), back/core groups dropped (F-07), fake fallback (F-08): all fixed in T-10 |
| Nutrition logging | `/nutrition` | search (USDA etc.) / barcode / custom → log to meal → daily totals vs goal | FoodLog, AddFoodSheet, BarcodeScanner | `/food/*` | Food, FoodLog, NutritionGoal | Complete (API) | S | No-API uses a simpler OfflineNutrition logger |
| Goals | `/goals` | pick template → track → complete (coins) | Goals, GoalWidget | `/goals` | Goal, GoalEntry | Partial | S | No-API: added goals not persisted (T-23). No edit/log UI for manual goals (steps, sleep) |
| Kai chat | `/trainer` | prompt chips / free text → AI reply → save program from reply | Trainer | `/chat/*`, `/programs/generate` | ChatMessage, KaiMemory | Partial → fixed (API) | S, U | Live replies were read from `content[0]` only, so a leading thinking block on Sonnet 5 dropped them to canned copy; canned copy invented user stats. Both fixed in T-33 (unit-tested; **no live call made**). No-API: canned replies; demo history removed (T-13) |
| Store / cosmetics | `/store`, settings/customization | earn coins → buy → equip | Store, Customization, `lib/wallet.ts` | `/customization/*`, `/store/wallet*` | Wallet, UserCustomization | Partial | S, R (no-API) | Fake starting balance (fixed T-12); fake challenge progress and unreachable rewards (fixed T-37, claim + finish payout run in the browser); client-trusted earn (T-20) |
| Wearables | settings/connections | connect (OAuth) → sync → readiness inputs | Connections | `/me/devices/*`, `/oauth/:provider/callback` | DeviceConnection | Partial | S | Needs provider approval + deployed API |
| Data export / delete | settings/privacy, account | export JSON/CSV; delete account | Privacy, Account | `/me/export`, `/me/export.csv`, `DELETE /me` | all | **Broken** → fixed | S, U | CSV export never worked: its route was shadowed by the JSON export and Account read a token key that doesn't exist (F-15). Fixed in T-32; CSV writer unit-tested, route reachable (401 unauthenticated). Not run end to end (no DB) |
| Subscription | none (API only) | — | — | `/subscription/*` | Subscription | Missing UI; endpoint unsafe | S, U | Receipt grant disabled in production (T-01) |
| Coach ↔ athlete | none (API only) | invite → accept → summary | — | `/coach/*` | CoachAthlete | Partial (API only) | S | Needs product decision on a coach UI |
| Mobile health sync | Expo app | grant HealthKit → background push samples | `mobile/` | `/me/health/samples` | ProgressMetric | Partial (scaffold) | S | Never run on a device |

## Gym-management flows from the audit brief (not in product)

| Flow | Status | Note |
|---|---|---|
| Public site: facilities, hours, contact, trainer profiles | Missing | Forma has an app landing only; no gym entity exists |
| Membership plans, purchase, renewals, billing history | Missing | Closest: `/subscription` (app subscription, not a gym membership) |
| Class schedules, bookings, cancellations, capacity | Missing | No Class/Booking models |
| Attendance / check-in | Missing | "Check-in" in Forma is a recovery questionnaire, not gym entry |
| Staff/admin console (members, trainers, classes, reports, CMS) | Missing | `Role.admin` exists, no admin routes |

These are new product scope, listed under "Requires decision" in `IMPLEMENTATION_PLAN.md`.
