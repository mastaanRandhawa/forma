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
  /** true only on the very first load (not on refetch) */
  initialLoading: boolean;
  refetch: () => void;
}

/** Run `fetcher` on mount and whenever `key` changes; expose load state. */
export function useResource<D>(key: string, fetcher: () => Promise<D>): Resource<D> {
  const [data, setData] = useState<D | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const seenRef = useRef(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.resolve()
      .then(fetcherRef.current)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        seenRef.current = true;
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cancel = run();
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    data,
    error,
    loading,
    initialLoading: loading && !seenRef.current,
    refetch: run,
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
