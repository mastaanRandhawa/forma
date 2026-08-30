/**
 * Auth boundary for the web app.
 *
 * - No-backend build (`VITE_API_URL` unset): auth is a no-op. `status` is
 *   immediately "anon" and <RequireAuth> renders its children — the local
 *   build keeps working exactly as before.
 * - Backend build: the access token lives only in memory, so on every load we
 *   silently `session.restore()` (POST /auth/refresh via the httpOnly cookie)
 *   behind a splash, then render the app, bounce to /login, or — when the email
 *   isn't verified yet — send the user to /verify-email.
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

type Status = "loading" | "authed" | "unverified" | "anon";

const REDIRECT_KEY = "forma.postLoginRedirect";

/** Remember where an unauthenticated user was trying to go. */
export function rememberRedirect(path: string) {
  try {
    if (path && path !== "/login" && !path.startsWith("/login")) sessionStorage.setItem(REDIRECT_KEY, path);
  } catch {
    /* private mode */
  }
}
export function takeRedirect(): string | null {
  try {
    const v = sessionStorage.getItem(REDIRECT_KEY);
    if (v) sessionStorage.removeItem(REDIRECT_KEY);
    return v;
  } catch {
    return null;
  }
}

interface AuthValue {
  status: Status;
  user: User | null;
  /** true when this build talks to a real backend and therefore needs auth. */
  required: boolean;
  setUser: (u: User | null) => void;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
  signOutEverywhere: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

function statusFor(u: User | null): Status {
  if (!u) return "anon";
  return u.emailVerified ? "authed" : "unverified";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(API_ENABLED ? "loading" : "anon");
  const [user, setUserState] = useState<User | null>(null);

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    setStatus(statusFor(u));
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await authClient.me();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, [setUser]);

  useEffect(() => {
    if (!API_ENABLED) return;
    let alive = true;
    (async () => {
      const ok = await tokenStore.restore();
      if (!alive) return;
      if (!ok) {
        setUser(null);
        return;
      }
      try {
        const me = await authClient.me();
        if (alive) setUser(me);
      } catch {
        if (alive) setUser(null);
      }
    })();
    // react to logout / refresh-failure from the client
    const off = tokenStore.onChange((authed) => {
      if (!authed) {
        // distinguish "session dropped under us" from an explicit sign-out
        if (tokenStore.hasRestored()) {
          try {
            sessionStorage.setItem("forma.sessionExpired", "1");
          } catch {
            /* private mode */
          }
        }
        setUser(null);
      }
    });
    return () => {
      alive = false;
      off();
    };
  }, [setUser]);

  const clearLocal = () => {
    try {
      localStorage.removeItem("forma.data.v1");
      sessionStorage.removeItem("forma.sessionExpired"); // explicit sign-out, not an expiry
    } catch {
      /* private mode */
    }
  };

  const signOut = useCallback(async () => {
    await authClient.logout().catch(() => {});
    clearLocal();
    setUser(null);
  }, [setUser]);

  const signOutEverywhere = useCallback(async () => {
    await authClient.logoutAll().catch(() => {});
    clearLocal();
    setUser(null);
  }, [setUser]);

  const value = useMemo<AuthValue>(
    () => ({ status, user, required: API_ENABLED, setUser, refreshUser, signOut, signOutEverywhere }),
    [status, user, setUser, refreshUser, signOut, signOutEverywhere],
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
 * Wrap the authenticated app. Redirects anonymous users to /login, users with an
 * unverified email to /verify-email, and users who haven't finished onboarding to
 * /onboarding.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, user, required } = useAuth();
  const location = useLocation();

  if (!required) return <>{children}</>;
  if (status === "loading") return <Splash />;

  if (status === "anon") {
    const from = location.pathname + location.search;
    rememberRedirect(from);
    let expired = false;
    try {
      expired = sessionStorage.getItem("forma.sessionExpired") === "1";
    } catch {
      /* ignore */
    }
    return <Navigate to={expired ? "/login?expired=1" : "/login"} replace state={{ from }} />;
  }
  if (status === "unverified" && location.pathname !== "/verify-email") {
    return <Navigate to="/verify-email" replace />;
  }
  if (
    status === "authed" &&
    user &&
    !user.onboardingCompletedAt &&
    location.pathname !== "/onboarding"
  ) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

/** Inverse guard for /login, /signup, … — send already-authed users onward. */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { status, required } = useAuth();
  if (!required) return <>{children}</>;
  if (status === "loading") return <Splash />;
  if (status === "authed") return <Navigate to={takeRedirect() ?? "/dashboard"} replace />;
  if (status === "unverified") return <Navigate to="/verify-email" replace />;
  return <>{children}</>;
}
