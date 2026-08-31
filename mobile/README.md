# Forma — Mobile companion

The sync agent for **§3.2** of `backend/BACKEND-REQUIREMENTS.md`. The browser
can't read HealthKit / Health Connect, so this small Expo app is what pushes
sleep / HRV / resting-HR / steps into the backend via `POST /me/health/samples`.

It is intentionally minimal: sign in, grant health permissions, sync (manual +
background). No workout logging — the web app owns that.

## Stack

- Expo (SDK 52) + expo-router
- `react-native-health` (iOS HealthKit), `react-native-health-connect` (Android)
- `expo-background-fetch` + `expo-task-manager` for periodic sync
- `expo-secure-store` for tokens

## Run

Health APIs are native modules, so **Expo Go won't work** — you need a dev build.

```bash
cd mobile
npm install
cp .env.example .env          # point EXPO_PUBLIC_API_URL at your API
npx expo prebuild             # generates ios/ + android/
npm run ios                   # or: npm run android
```

For a device build without a Mac, use EAS: `npx eas build --profile development`.

## What it does

| File | Role |
| --- | --- |
| `src/api.ts` | bearer auth + refresh, `ingestSamples()` |
| `src/health.ts` | `runSync()` — read the platform health store → normalize → POST |
| `src/background.ts` | registers the `forma-health-sync` TaskManager task |
| `app/index.tsx` | login |
| `app/sync.tsx` | status, "Sync now", background toggle, sign out |

Idempotency is the backend's job — it dedupes on `(userId, type, recordedAt)`,
so re-running a sync never double-counts.

## Permissions

Declared in `app.json`:

- iOS: `NSHealthShareUsageDescription`, HealthKit entitlement + background delivery
- Android: `health.READ_SLEEP`, `READ_HEART_RATE_VARIABILITY`,
  `READ_RESTING_HEART_RATE`, `READ_STEPS`

## Not done

- Third-party wearables (WHOOP/Oura/Garmin) — those are server-side OAuth (§3.3),
  handled by the backend, not this app.
- Push notifications, deep links into the web app, real design polish.
