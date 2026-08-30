/**
 * Auth boundary for the web app (§1 of backend/BACKEND-REQUIREMENTS.md).
 *
 * - No-backend build (`VITE_API_URL` unset): auth is a no-op. `status` is
 *   immediately "anon" and <RequireAuth> renders its children — the local
 *   build keeps working exactly as before.
 * - Backend build: on first paint we restore the session (`auth.me()`, falling
 *   back to a refresh) behind a splash, then either render the app or bounce to
 *   /login.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Navigate, useLocation } from "react-router-dom";
import { auth as authClient, session as tokenStore } from "./client";
import { API_ENABLED } from "./hooks";
import type { User } from "./types";

type Status = "loading" | "authed" | "anon";

interface AuthValue {
  status: Status;
  user: User | null;
  /** true when this build talks to a real backend and therefore needs auth. */
  required: boolean;
  setUser: (u: User | null) => void;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(API_ENABLED ? "loading" : "anon");
  const [user, setUserState] = useState<User | null>(null);

  /** Setting a user signs in; clearing it signs out. */
  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    setStatus(u ? "authed" : "anon");
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await authClient.me();
      setUser(me);
      setStatus("authed");
    } catch {
      setUser(null);
      setStatus("anon");
    }
  }, []);

  useEffect(() => {
    if (!API_ENABLED) return;
    let alive = true;
    (async () => {
      if (!tokenStore.isAuthenticated() && !tokenStore.getRefreshToken()) {
        if (alive) setStatus("anon");
        return;
      }
      try {
        const me = await authClient.me();
        if (alive) {
          setUser(me);
          setStatus("authed");
        }
      } catch {
        if (alive) {
          setUser(null);
          setStatus("anon");
        }
      }
    })();
    // react to logout / refresh-failure from the client
    const off = tokenStore.onChange((authed) => {
      if (!authed) {
        setUser(null);
        setStatus("anon");
      }
    });
    return () => {
      alive = false;
      off();
    };
  }, []);

  const signOut = useCallback(async () => {
    await authClient.logout().catch(() => {});
    try {
      localStorage.removeItem("forma.data.v1");
    } catch {
      /* private mode */
    }
    setUser(null);
    setStatus("anon");
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ status, user, required: API_ENABLED, setUser, refreshUser, signOut }),
    [status, user, refreshUser, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within <AuthProvider>");
  return v;
}

function Splash() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-background-deep">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-[var(--accent-pink)]" />
    </div>
  );
}

/**
 * Wrap the authenticated app. Redirects anonymous users to /login and users who
 * haven't finished onboarding to /onboarding.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, user, required } = useAuth();
  const location = useLocation();

  if (!required) return <>{children}</>;
  if (status === "loading") return <Splash />;
  if (status === "anon") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (user && !user.onboardingCompletedAt && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

/** Inverse guard for /login, /signup, … — send already-authed users home. */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { status, required } = useAuth();
  if (!required) return <>{children}</>;
  if (status === "loading") return <Splash />;
  if (status === "authed") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
