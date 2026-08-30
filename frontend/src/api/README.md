# Forma API client

Typed wrapper over the backend (`../../../backend`). The authoritative contract is
`backend/openapi.yaml` — served at `GET /api/v1/docs` when the server runs.
This folder is hand-kept in sync with it.

```
types.ts              DTOs — one interface per response / request shape
client.ts             fetch wrapper: bearer auth, auto-refresh on 401, error envelope, 204s
hooks.ts              React hooks — useDashboard(), useGoals(), … → { data, error, loading, refetch }
demo.ts               demo dataset in DTO shape; served by the hooks when no VITE_API_URL
adapt.ts              DTO → presentational-component shapes (goalToWidget, insightToCard, …)
dashboard-context.tsx <DashboardProvider> so dashboard cards read one shared aggregate
index.ts              re-exports
```

## Setup — demo mode vs. live

**No env var → demo mode.** The hooks resolve `demo.ts` and the whole app is
usable with no server (this is how the GitHub Pages build runs). `API_ENABLED`
from `hooks.ts` is `false`.

**Point it at a backend:**

```
# frontend/.env
VITE_API_URL=http://localhost:4000/api/v1
```

Now the hooks call the real API, surface `ApiRequestError`s as an `<ErrorState>`,
and write actions (`api.goals.upsert`, `api.chat.send`, `api.store.buy`, …) hit
the server. Auth tokens are stored + refreshed by `client.ts`.

## Hooks

```tsx
const { data, error, initialLoading, refetch } = useDashboard();
if (initialLoading) return <Skel />;
if (error) return <ErrorState message={errorMessage(error)} onRetry={refetch} />;
// data is T.Dashboard

const add = useAction(api.goals.upsert);  // { run, pending, error }
```

Wired screens: Home dashboard, Goals, Trainer chat, Store, Progress summary,
Body muscle-map, achievements strip. Each has loading / error / empty states.

## Usage

```ts
import { api, auth, session, ApiRequestError } from "@/api";

// auth — tokens are stored + refreshed automatically
await auth.login("alex@forma.app", "forma1234");
session.isAuthenticated();          // true
const unsub = session.onChange((authed) => { if (!authed) router.push("/login"); });

// reads
const dash = await api.dashboard();
const { items } = await api.library.exercises({ muscle: "chest", camera: "true" });
const map = await api.body.muscleMap("week");

// settings bundle — one call drives theme + quiet widgets + unlock state
const s = await api.me.settings();
document.documentElement.style.setProperty("--app-bg", s.appearance.backgroundColor);
document.documentElement.style.setProperty("--glass-opacity", String(s.appearance.glass.opacity));
const showReadiness = s.disclosure.widgetOverrides["readiness-ring"] ?? s.disclosure.mode;
const canSeeBody = s.progression.unlockedFeatures.includes("body_map");

await api.me.updateSettings({ appearance: { presetId: "slate-calm" } });
const presets = await api.config.appearancePresets();
await api.me.progression.setGating(false); // "show me everything"

// active-workout write path
const s = await api.sessions.start({ workoutId });
await api.sessions.logSet(s.id, perfId, 1, { weightKg: 80, reps: 8, rpe: 8, completed: true });
const summary = await api.sessions.finish(s.id, { durationSeconds: 2400 });

// errors
try {
  await api.workouts.generate({ focus: [] });
} catch (e) {
  if (e instanceof ApiRequestError && e.code === "bad_request") console.log(e.details);
}

await auth.logout();
```

## With React Query

```ts
const { data } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });

const finish = useMutation({
  mutationFn: (id: string) => api.sessions.finish(id),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
});
```

## Method map

| Namespace | Covers |
|---|---|
| `auth.*` | register, login, social, refresh (automatic), forgot/reset password, logout, me |
| `session.*` | local token state — `isAuthenticated`, `onChange`, `getRefreshToken`, `clear` |
| `api.config.*` | `appearancePresets` (curated background/glass presets) |
| `api.me.*` | profile, onboarding, **settings bundle** (camera / units / appearance / disclosure / progression), `progression.evaluate` / `progression.setGating`, export, delete, injuries, equipment, devices |
| `api.trainer.*` | config, personality, insights, check-in, catalogue |
| `api.library.*` | muscle groups, exercise search / detail / history |
| `api.workouts.*` | CRUD, duplicate, generate, swap-suggestions |
| `api.programs.*` | list/detail/week, generate, activate, schedule |
| `api.sessions.*` | start, logSet, deleteSet, addPerformance, formAnalysis, finish, abandon, history |
| `api.body.*` | muscleMap, balance, muscle detail |
| `api.progress.*` | metrics, measurements, PRs, strength, overview, readiness, consistency, formTrends, photos, report |
| `api.goals.*` | list, upsert, log, remove |
| `api.store.*` | wallet, earn, items, buy, equip |
| `api.chat.*` | history, send, sendVoice, applyAction, clear, suggestedPrompts |
| `api.notifications.*` | list, markRead, markAllRead, remove, preferences |
| `api.achievements.*` | list, evaluate |
| `api.subscription.*` | plans, get, validateReceipt, cancel |
| `api.dashboard()` | Home aggregate |
