import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { AtmosphericBackground } from "../components/layout/AtmosphericBackground";
import { ApiRequestError, api } from "../api/client";
import { API_ENABLED } from "../api/hooks";
import type { AuthConfig } from "../api/types";

// ── shell ───────────────────────────────────────────────────────────────────
export function AuthShell({ title, subtitle, children, footer }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative grid min-h-[100dvh] place-items-center px-5 py-12">
      <AtmosphericBackground />
      <div className="relative w-full max-w-[26rem]">
        <Link to="/dashboard" className="focus-ring mb-8 block text-center text-[1.4rem] font-semibold lowercase tracking-[0.02em] text-content-primary">
          forma
        </Link>
        <div className="surface-raised rounded-3xl px-6 py-7 sm:px-8">
          <h1 className="text-[1.15rem] font-semibold text-content-primary">{title}</h1>
          {subtitle && <p className="mt-1 text-[0.85rem] leading-snug text-content-secondary">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-5 text-center text-[0.82rem] text-content-secondary">{footer}</div>}
      </div>
    </div>
  );
}

// ── fields ──────────────────────────────────────────────────────────────────
export function Field({
  label,
  hint,
  error,
  ...props
}: { label: string; hint?: ReactNode; error?: string | null } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.78rem] lowercase tracking-[0.02em] text-content-tertiary">{label}</span>
      <input
        {...props}
        aria-invalid={!!error}
        className={`focus-ring block h-11 w-full rounded-xl border bg-white/[0.04] px-3.5 text-[0.9rem] text-content-primary placeholder:text-content-tertiary/60 ${
          error ? "border-[var(--accent-pink)]/60" : "border-white/10"
        }`}
      />
      {error ? (
        <span className="mt-1 block text-[0.75rem] text-[var(--accent-pink)]">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[0.75rem] text-content-tertiary">{hint}</span>
      ) : null}
    </label>
  );
}

export function PasswordField({
  label = "password",
  ...props
}: { label?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.78rem] lowercase tracking-[0.02em] text-content-tertiary">{label}</span>
      <span className="relative block">
        <input
          {...props}
          type={show ? "text" : "password"}
          className="focus-ring block h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-3.5 pr-11 text-[0.9rem] text-content-primary placeholder:text-content-tertiary/60"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="focus-ring absolute inset-y-0 right-0 grid w-11 place-items-center text-content-tertiary hover:text-content-secondary"
        >
          {show ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
        </button>
      </span>
    </label>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  children,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-[0.82rem] text-content-secondary">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="focus-ring mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-white/[0.04] accent-[var(--accent-pink)]"
      />
      <span>
        {label}
        {children}
      </span>
    </label>
  );
}

// ── password strength ───────────────────────────────────────────────────────
export interface PasswordRule {
  label: string;
  test: (v: string) => boolean;
}
export const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "An uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "A lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "A number", test: (v) => /\d/.test(v) },
  { label: "A symbol", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

/** Backend policy: min 8 chars AND at least 3 of the 5 classes. */
export function passwordMeetsPolicy(v: string): boolean {
  if (v.length < 8) return false;
  return PASSWORD_RULES.slice(1).filter((r) => r.test(v)).length >= 3;
}

export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  const passed = PASSWORD_RULES.filter((r) => r.test(value)).length;
  const ok = passwordMeetsPolicy(value);
  const tone = ok ? "var(--accent-cyan)" : passed >= 3 ? "var(--accent-amber, #f0b429)" : "var(--accent-pink)";
  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {PASSWORD_RULES.map((_, i) => (
          <span
            key={i}
            className="h-1 flex-1 rounded-full"
            style={{ background: i < passed ? tone : "rgba(255,255,255,0.1)" }}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[0.72rem]">
        {PASSWORD_RULES.map((r) => {
          const hit = r.test(value);
          return (
            <li key={r.label} className={hit ? "text-content-secondary" : "text-content-tertiary/70"}>
              {hit ? "✓" : "·"} {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── buttons ─────────────────────────────────────────────────────────────────
export function SubmitButton({
  pending,
  disabled,
  children,
}: {
  pending: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="focus-ring tactile surface-raised surface-raised--interactive mt-1 inline-flex h-11 w-full items-center justify-center rounded-pill text-[0.9rem] font-medium lowercase text-content-primary disabled:opacity-60"
    >
      {pending ? "…" : children}
    </button>
  );
}

// ── notices ─────────────────────────────────────────────────────────────────
type NoticeVariant = "info" | "success" | "warn" | "error";
const NOTICE_STYLES: Record<NoticeVariant, string> = {
  info: "border-white/12 bg-white/[0.04] text-content-secondary",
  success: "border-[var(--accent-cyan)]/30 bg-[var(--accent-cyan)]/10 text-content-primary",
  warn: "border-[var(--accent-amber,#f0b429)]/30 bg-[var(--accent-amber,#f0b429)]/10 text-content-primary",
  error: "border-[var(--accent-pink)]/30 bg-[var(--accent-pink)]/10 text-content-primary",
};

export function AuthNotice({
  variant = "info",
  children,
}: {
  variant?: NoticeVariant;
  children: ReactNode;
}) {
  return (
    <p
      role={variant === "error" ? "alert" : "status"}
      className={`mt-3 rounded-xl border px-3 py-2 text-[0.82rem] leading-snug ${NOTICE_STYLES[variant]}`}
    >
      {children}
    </p>
  );
}

/** Human-readable message + machine code for an error from the auth API. */
export function mapAuthError(error: unknown): { message: string; code: string } {
  if (!error) return { message: "", code: "" };
  if (error instanceof ApiRequestError) {
    const code = error.code;
    const byCode: Record<string, string> = {
      invalid_credentials: "That email and password don't match.",
      account_locked: error.message || "Too many attempts. Try again later or reset your password.",
      account_inactive: "This account is no longer active.",
      email_not_verified: "Verify your email address to continue.",
      session_expired: "Your session expired. Sign in again.",
      csrf_failed: "Your session got out of sync. Refresh the page and try again.",
      too_many_requests: "Too many attempts. Wait a few minutes and try again.",
      rate_limited: "Too many attempts. Wait a few minutes and try again.",
      token_invalid: "This link is invalid. Request a new one.",
      token_expired: "This link has expired. Request a new one.",
      reset_link_expired: "This reset link has expired. Request a new one.",
      no_password: "This account uses Google or Apple sign-in. Use “forgot password” to set a password.",
      last_credential: "Set a password before unlinking your only sign-in method.",
      conflict: "An account with that email already exists.",
    };
    if (byCode[code]) return { message: byCode[code], code };
    if (error.status === 429) return { message: byCode.too_many_requests, code: "too_many_requests" };
    if (error.message === "Failed to fetch") return { message: "Can't reach the server. Try again.", code: "network" };
    return { message: error.message || "Something went wrong.", code: code || "error" };
  }
  if (error instanceof Error && error.message === "Failed to fetch") {
    return { message: "Can't reach the server. Try again.", code: "network" };
  }
  return { message: error instanceof Error ? error.message : "Something went wrong.", code: "error" };
}

/** Back-compat: the old <FormError error={...} /> API, now routed through mapAuthError. */
export function FormError({ error }: { error: Error | null }) {
  if (!error) return null;
  return <AuthNotice variant="error">{mapAuthError(error).message}</AuthNotice>;
}

// ── resend cooldown ─────────────────────────────────────────────────────────
export function useResendCooldown(seconds = 60) {
  const [left, setLeft] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  const start = () => {
    setLeft(seconds);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setLeft((v) => {
        if (v <= 1 && timer.current) clearInterval(timer.current);
        return Math.max(0, v - 1);
      });
    }, 1000);
  };
  return { left, start, ready: left === 0 };
}

// ── social sign-in ──────────────────────────────────────────────────────────
let authConfigCache: AuthConfig | null = null;
export function useAuthConfig(): AuthConfig | null {
  const [cfg, setCfg] = useState<AuthConfig | null>(authConfigCache);
  useEffect(() => {
    if (!API_ENABLED || authConfigCache) return;
    let alive = true;
    api.config
      .auth()
      .then((c) => {
        authConfigCache = c;
        if (alive) setCfg(c);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return cfg;
}

/**
 * Google / Apple buttons. Rendered only when the deployment has the provider
 * configured. The actual native SDK handshake is out of scope here — the button
 * is wired to call `onProvider(provider)` which the page can implement once an
 * SDK is added; today it surfaces a friendly "coming soon" if unimplemented.
 */
export function OAuthButtons({
  onProvider,
}: {
  onProvider?: (p: "google" | "apple") => void;
}) {
  const cfg = useAuthConfig();
  if (!cfg || (!cfg.providers.google && !cfg.providers.apple)) return null;
  const Btn = ({ p, label }: { p: "google" | "apple"; label: string }) => (
    <button
      type="button"
      onClick={() => onProvider?.(p)}
      className="focus-ring tactile flex h-11 w-full items-center justify-center gap-2 rounded-pill border border-white/12 bg-white/[0.04] text-[0.85rem] text-content-primary hover:bg-white/[0.08]"
    >
      Continue with {label}
    </button>
  );
  return (
    <div className="space-y-2">
      <div className="my-4 flex items-center gap-3 text-[0.72rem] uppercase tracking-wider text-content-tertiary">
        <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
      </div>
      {cfg.providers.google && <Btn p="google" label="Google" />}
      {cfg.providers.apple && <Btn p="apple" label="Apple" />}
    </div>
  );
}
