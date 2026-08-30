import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AtmosphericBackground } from "../components/layout/AtmosphericBackground";
import { ApiRequestError } from "../api/client";

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

export function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.78rem] lowercase tracking-[0.02em] text-content-tertiary">{label}</span>
      <input
        {...props}
        className="focus-ring block h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-[0.9rem] text-content-primary placeholder:text-content-tertiary/60"
      />
    </label>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="focus-ring tactile surface-raised surface-raised--interactive mt-1 inline-flex h-11 w-full items-center justify-center rounded-pill text-[0.9rem] font-medium lowercase text-content-primary disabled:opacity-60"
    >
      {pending ? "…" : children}
    </button>
  );
}

export function FormError({ error }: { error: Error | null }) {
  if (!error) return null;
  let msg = error.message || "Something went wrong.";
  if (error instanceof ApiRequestError) {
    if (error.status === 401 || error.code === "unauthorized") msg = "Wrong email or password.";
    else if (error.status === 409 || error.code === "conflict") msg = "An account with that email already exists.";
    else if (error.message === "Failed to fetch") msg = "Can't reach the server. Try again.";
  } else if (error.message === "Failed to fetch") {
    msg = "Can't reach the server. Try again.";
  }
  return (
    <p role="alert" className="mt-3 rounded-xl border border-[var(--accent-pink)]/30 bg-[var(--accent-pink)]/10 px-3 py-2 text-[0.82rem] text-content-primary">
      {msg}
    </p>
  );
}
