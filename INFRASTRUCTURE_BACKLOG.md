# Forma — Infrastructure Backlog

Items that require external infrastructure, third-party API agreements, or platform capabilities that go beyond pure frontend/backend code. These cannot be shipped from this codebase alone.

---

## 1. Wearable real-time data (WHOOP / Oura / Apple Watch)

**What we want:** Pre-session readiness that auto-populates from last night's HRV, resting HR, and sleep stages — no manual check-in needed.

**Why it can't be built now:**
- WHOOP API is invite-only (enterprise agreement required).
- Oura API requires OAuth app approval.
- Apple Watch companion needs a separate watchOS Xcode target, not a React app.

**What we have today:** Manual recovery check-in (`RecoveryCheckin` model) that drives the same readiness adjustment logic. The backend `readinessAdjustment()` service already consumes whatever score the check-in provides — wiring a wearable would be a data-source swap, not a logic rewrite.

**Action needed:** Apply for WHOOP/Oura developer access. Budget for watchOS contractor.

---

## 2. Push notifications (Kai 3-day gap nudge)

**What we want:** Kai sends a push notification after 3 days of inactivity ("It's been a few days — your {program name} is waiting").

**Why it can't be built now:**
- Requires a registered PWA with a service worker that holds a Web Push subscription token, stored server-side per user.
- iOS Safari push (iOS 16.4+) requires the app to be "Add to Home Screen" installed — not available in a browser tab.
- The backend `notify()` service exists, but it writes to the `Notification` table (in-app only) — there is no Web Push dispatcher.

**What we have today:** In-app notification system (`/notifications` endpoint + `notify()` service). Session-gap detection logic can be added trivially to a cron job once push infrastructure exists.

**Action needed:**
1. Register the PWA manifest and a service worker.
2. Add `pushSubscription` field to the `User` model.
3. Implement a Web Push dispatcher (e.g. `web-push` npm package, VAPID keys in env).
4. Add a nightly cron (e.g. pg_cron or a hosted scheduler) that queries inactive users and fires pushes.

---

## 3. Apple Watch companion app

**What we want:** Wrist-based set logging, heart rate display, and haptic rest-timer countdowns.

**Why it can't be built now:**
- watchOS apps require a Swift/SwiftUI Xcode project with a WatchConnectivity session to the iOS parent app.
- The parent iOS app doesn't exist yet (only Expo mobile scaffold).
- Apple Developer Program membership ($99/yr) + TestFlight + App Store review required.

**Action needed:** Ship the iOS Expo app first, then layer a watchOS extension on top.

---

## 4. Strava import

**What we want:** Existing Strava workout history imported as completed sessions on first sign-up.

**Why it can't be built now:**
- Strava OAuth app must be registered at developers.strava.com and approved (review time 1-2 weeks).
- Activity data from Strava doesn't map 1-to-1 to `WorkoutSession` / `ExercisePerformance` rows — it's GPS/distance, not sets × reps.

**What we could build without infra:** A CSV import from most gym tracker apps (Strong, Hevy) — their export format maps cleanly to our schema. This is buildable now.

**Action needed:** Register Strava OAuth app. Design a mapping layer for cardio → session volume approximation.

---

## 5. MyFitnessPal / Cronometer food import

**What we want:** One-tap import of the user's existing food diary so the macro history back-fills from day 1.

**Why it can't be built now:**
- MFP's official API was shut down in 2020. Only unofficial/scraped APIs exist — terms-of-service risk.
- Cronometer has no public API.

**What we could build without infra:** Manual CSV import from MFP export (Food › Export Data in MFP settings). The CSV format is well-documented and maps to our `FoodLog` schema. This is buildable now.

**Action needed:** Build the CSV importer page (file upload → parse → preview → confirm → batch insert). No external agreement needed.

---

## 6. Injury notes → AI program modification

**What we want:** User types "my left shoulder has been clicking" and Kai removes/substitutes shoulder-dominant exercises in the next planned session.

**Why it's only half-built:**
- The UI can be built (a note field on the trainer profile, a `POST /chat` message).
- The backend prompt injection already exists: `buildSystemPrompt()` in `services/ai.ts` accepts arbitrary facts.
- **What's missing:** A structured injury parser that maps free-text ("left shoulder") to affected muscle groups, which then drives a deterministic swap in `prescribeExercise()`.

**What we have today:** `prescribeExercise()` already handles deload and readiness-based swaps. Injury handling would follow the same pattern.

**Action needed:** Add an `injuries` array to the trainer facts. Build a prompt-driven classifier (`POST /chat` with a system prompt that returns JSON `{ bodyPart, severity, avoid }`) or a hardcoded keyword → muscle-group map. Wire the result into prescription exclusion logic.

---

## Summary table

| Feature | Blocker | Effort once unblocked |
|---|---|---|
| WHOOP/Oura real-time readiness | API access approval | ~1 week backend |
| Oura push | API approval | ~1 week backend |
| Push notifications | PWA service worker + VAPID infra | ~2 weeks full-stack |
| Apple Watch | iOS app + watchOS target | ~6 weeks (external contractor) |
| Strava import | OAuth app registration | ~1 week full-stack |
| MFP import | CSV importer (no agreement needed) | ~3 days frontend |
| Injury → program mod | Structured classifier design | ~1 week backend |
