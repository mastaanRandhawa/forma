/**
 * React data hooks over the API client.
 *
 * Each hook returns `{ data, error, loading, refetch }`. When `VITE_API_URL`
 * is set they call the real backend (`./client`); otherwise they resolve the
 * demo dataset (`./demo`) so the app is fully usable with no server — the
 * GitHub Pages build runs this way.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiRequestError } from "./client";
import type * as T from "./types";
import * as demo from "./demo";

export const API_ENABLED = Boolean(
  (import.meta.env as Record<string, string | undefined>).VITE_API_URL,
);

export interface Resource<D> {
  data: D | null;
  error: Error | null;
  loading: boolean;
  /** true only on the very first load (not on refetch / background revalidation) */
  initialLoading: boolean;
  refetch: () => void;
  /** write a known-fresh value straight into state + cache (e.g. the object a
   *  mutation endpoint returns) so no follow-up GET is needed */
  mutate: (data: D) => void;
}

/**
 * Process-wide stale-while-revalidate cache for `useResource`, keyed by the
 * resource `key`. Navigating away from and back to a screen re-mounts its hooks;
 * seeding `data` from here means the screen paints its last-known content
 * immediately instead of flashing a skeleton and re-fetching every time.
 *
 * A cached entry newer than `STALE_MS` is served as-is with no network call. An
 * older entry is still shown instantly, then refreshed in the background.
 * `refetch()` and `invalidateResource()` force a foreground reload.
 */
const STALE_MS = 30_000;
interface CacheEntry<D> {
  data: D;
  at: number;
}
const resourceCache = new Map<string, CacheEntry<unknown>>();

/** Drop cached resources so their next read re-fetches. Pass a prefix like
 *  `"session-"` to clear a family, or nothing to clear everything (e.g. on
 *  logout / after a mutation that invalidates many screens). */
export function invalidateResource(prefix?: string): void {
  if (!prefix) {
    resourceCache.clear();
    return;
  }
  for (const k of resourceCache.keys()) if (k.startsWith(prefix)) resourceCache.delete(k);
}

/** Run `fetcher` on mount and whenever `key` changes; expose load state. */
export function useResource<D>(key: string, fetcher: () => Promise<D>): Resource<D> {
  const cached = resourceCache.get(key) as CacheEntry<D> | undefined;
  const [data, setData] = useState<D | null>(cached ? cached.data : null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(!cached);
  const seenRef = useRef(!!cached);
  const keyRef = useRef(key);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // `key` changed between renders (e.g. a range switch) — re-seed synchronously
  // from that key's cache so we never render another key's data or a stale null.
  if (keyRef.current !== key) {
    keyRef.current = key;
    const next = resourceCache.get(key) as CacheEntry<D> | undefined;
    setData(next ? next.data : null);
    setLoading(!next);
    setError(null);
    seenRef.current = !!next;
  }

  const run = useCallback((background: boolean) => {
    const k = keyRef.current;
    let cancelled = false;
    if (!background) setLoading(true);
    setError(null);
    Promise.resolve()
      .then(fetcherRef.current)
      .then((d) => {
        if (cancelled) return;
        resourceCache.set(k, { data: d, at: Date.now() });
        setData(d);
        seenRef.current = true;
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled && !background) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const entry = resourceCache.get(key) as CacheEntry<D> | undefined;
    // Fresh cache hit — nothing to do, the seeded state is already correct.
    if (entry && Date.now() - entry.at < STALE_MS) return;
    // Stale hit → revalidate quietly; miss → foreground load with a skeleton.
    return run(!!entry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const mutate = useCallback((d: D) => {
    resourceCache.set(keyRef.current, { data: d, at: Date.now() });
    seenRef.current = true;
    setData(d);
    setError(null);
  }, []);

  return {
    data,
    error,
    loading,
    initialLoading: loading && !seenRef.current,
    refetch: () => run(false),
    mutate,
  };
}

/** Imperative call wrapper — for buttons/forms. `{ run, pending, error }`. */
export function useAction<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const run = useCallback(
    async (...args: A): Promise<R | undefined> => {
      setPending(true);
      setError(null);
      try {
        return await fn(...args);
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        return undefined;
      } finally {
        setPending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  return { run, pending, error };
}

/** Human-readable message for an error surfaced by a hook. */
export function errorMessage(e: Error | null): string {
  if (!e) return "";
  if (e instanceof ApiRequestError) {
    if (e.status === 401) return "Your session expired. Sign in again.";
    if (e.status === 0 || e.message.includes("fetch")) return "Can't reach the server.";
    return e.message;
  }
  if (e.message === "Failed to fetch") return "Can't reach the server.";
  return e.message || "Something went wrong.";
}

const pick = <D>(live: () => Promise<D>, fallback: () => D) =>
  API_ENABLED ? live : () => Promise.resolve(fallback());

// ── resource hooks ──────────────────────────────────────────────────────────

export const useDashboard = () =>
  useResource<T.Dashboard>("dashboard", pick(api.dashboard, demo.demoDashboard));

export const useGoals = () =>
  useResource<T.GoalWithProgress[]>("goals", pick(api.goals.list, demo.demoGoals));

export const useWallet = () =>
  useResource<T.WalletSummary>("wallet", pick(api.store.wallet, demo.demoWallet));

export const useStoreItems = () =>
  useResource<T.StoreItem[]>("store-items", pick(() => api.store.items(), demo.demoStoreItems));

export const useTrainer = () =>
  useResource<T.Trainer>("trainer", pick(api.trainer.get, demo.demoTrainer));

export const useChatHistory = () =>
  useResource<T.ChatMessage[]>("chat", pick(() => api.chat.history(), demo.demoChat));

export const useSuggestedPrompts = () =>
  useResource<string[]>(
    "chat-prompts",
    pick(api.chat.suggestedPrompts, demo.demoSuggestedPrompts),
  );

export const useMuscleMap = (range: T.MuscleMap["range"] = "week") =>
  useResource<T.MuscleMap>(`muscle-map:${range}`, pick(() => api.body.muscleMap(range), () => demo.demoMuscleMap(range)));

export const useMuscleBalance = () =>
  useResource<T.MuscleBalance>("muscle-balance", pick(api.body.balance, demo.demoBalance));

export const useAchievements = () =>
  useResource<T.AchievementProgress[]>("achievements", pick(api.achievements.list, demo.demoAchievements));

export const useProgressOverview = () =>
  useResource<T.ProgressOverview>("progress-overview", pick(api.progress.overview, demo.demoProgressOverview));

export const useReadiness = () =>
  useResource<T.ReadinessBreakdown>("readiness", pick(api.progress.readiness, demo.demoReadiness));

export const useNotifications = () =>
  useResource<T.NotificationList>("notifications", pick(() => api.notifications.list(), demo.demoNotifications));

// ── workout lifecycle (§6) ──────────────────────────────────────────────────
export const usePlannedWorkouts = () =>
  useResource<T.Workout[]>("planned-workouts", pick(() => api.workouts.list({ template: "false" }), () => []));

export const useWorkoutTemplates = () =>
  useResource<T.Workout[]>("workout-templates", pick(() => api.workouts.list({ template: "true" }), () => []));

export const useSessionHistory = () =>
  useResource<T.WorkoutSession[]>(
    "session-history",
    pick(() => api.sessions.list({ status: "completed", take: 40 }), () => []),
  );

export const useConsistency = (weeks = 13) =>
  useResource<T.ConsistencyReport | null>(
    `consistency:${weeks}`,
    pick(() => api.progress.consistency(weeks), () => null),
  );
