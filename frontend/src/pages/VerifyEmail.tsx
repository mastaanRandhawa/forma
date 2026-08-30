import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { auth, ApiRequestError } from "../api/client";
import { useAuth } from "../api/auth";
import { AuthShell, AuthNotice, useResendCooldown, mapAuthError } from "./auth-shared";

type Phase = "idle" | "verifying" | "verified" | "expired" | "invalid";

export default function VerifyEmail() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");
  const { status, user, refreshUser, signOut } = useAuth();
  const [phase, setPhase] = useState<Phase>(token ? "verifying" : "idle");
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendErr, setResendErr] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const { left, start, ready } = useResendCooldown(60);
  const ran = useRef(false);

  // If we're already fully verified (e.g. landed here by mistake), move on.
  useEffect(() => {
    if (!token && status === "authed") nav("/dashboard", { replace: true });
  }, [token, status, nav]);

  // Consume a token from the email link exactly once.
  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    (async () => {
      try {
        await auth.verifyEmail(token);
        setPhase("verified");
        if (status === "authed" || status === "unverified") await refreshUser();
      } catch (e) {
        if (e instanceof ApiRequestError && e.code === "token_expired") setPhase("expired");
        else setPhase("invalid");
      }
    })();
  }, [token, status, refreshUser]);

  async function resend() {
    setResending(true);
    setResendMsg(null);
    setResendErr(null);
    try {
      const r = await auth.resendVerification();
      if (r.alreadyVerified) {
        await refreshUser();
        nav("/dashboard", { replace: true });
        return;
      }
      setResendMsg(
        r.throttled
          ? "A link was just sent — check your inbox (and spam)."
          : "New verification link sent. Check your inbox.",
      );
      start();
    } catch (e) {
      setResendErr(mapAuthError(e).message);
    } finally {
      setResending(false);
    }
  }

  // ── token flow ──
  if (token) {
    if (phase === "verifying") {
      return (
        <AuthShell title="Verifying your email…">
          <div className="flex justify-center py-4">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-[var(--accent-pink)]" />
          </div>
        </AuthShell>
      );
    }
    if (phase === "verified") {
      return (
        <AuthShell title="Email verified" subtitle="Your account is confirmed.">
          <AuthNotice variant="success">You're all set.</AuthNotice>
          <button
            onClick={() => nav(status === "anon" ? "/login" : user?.onboardingCompletedAt ? "/dashboard" : "/onboarding", { replace: true })}
            className="focus-ring tactile surface-raised surface-raised--interactive mt-4 inline-flex h-11 w-full items-center justify-center rounded-pill text-[0.9rem] font-medium lowercase text-content-primary"
          >
            Continue
          </button>
        </AuthShell>
      );
    }
    // expired / invalid
    return (
      <AuthShell
        title={phase === "expired" ? "Link expired" : "Link not valid"}
        subtitle={
          phase === "expired"
            ? "Verification links are good for 24 hours."
            : "This verification link can't be used."
        }
      >
        <AuthNotice variant="error">
          {phase === "expired"
            ? "Request a fresh link below."
            : "It may have already been used. Request a new one below."}
        </AuthNotice>
        {status === "anon" ? (
          <p className="mt-4 text-[0.84rem] text-content-secondary">
            <Link to="/login" className="text-content-primary underline underline-offset-4">
              Sign in
            </Link>{" "}
            to request another verification email.
          </p>
        ) : (
          <>
            <button
              onClick={resend}
              disabled={resending || !ready}
              className="focus-ring tactile surface-raised surface-raised--interactive mt-4 inline-flex h-11 w-full items-center justify-center rounded-pill text-[0.9rem] font-medium lowercase text-content-primary disabled:opacity-60"
            >
              {resending ? "…" : ready ? "Send a new link" : `Resend in ${left}s`}
            </button>
            {resendMsg && <AuthNotice variant="success">{resendMsg}</AuthNotice>}
            {resendErr && <AuthNotice variant="error">{resendErr}</AuthNotice>}
          </>
        )}
      </AuthShell>
    );
  }

  // ── inbox flow (authed but unverified) ──
  return (
    <AuthShell
      title="Verify your email"
      subtitle={
        user?.email
          ? `We sent a link to ${user.email}. Click it to activate your account.`
          : "We sent you a verification link. Click it to activate your account."
      }
      footer={
        <button onClick={() => signOut().then(() => nav("/login"))} className="underline underline-offset-4">
          Use a different account
        </button>
      }
    >
      <div className="space-y-3">
        <p className="text-[0.84rem] leading-relaxed text-content-secondary">
          Didn't get it? Check your spam folder, or send a new link.
        </p>
        <button
          onClick={resend}
          disabled={resending || !ready}
          className="focus-ring tactile surface-raised surface-raised--interactive inline-flex h-11 w-full items-center justify-center rounded-pill text-[0.9rem] font-medium lowercase text-content-primary disabled:opacity-60"
        >
          {resending ? "…" : ready ? "Resend verification email" : `Resend in ${left}s`}
        </button>
        {resendMsg && <AuthNotice variant="success">{resendMsg}</AuthNotice>}
        {resendErr && <AuthNotice variant="error">{resendErr}</AuthNotice>}
        <button
          onClick={() => refreshUser().then(() => nav("/dashboard"))}
          className="focus-ring w-full text-center text-[0.8rem] text-content-tertiary underline underline-offset-4 hover:text-content-secondary"
        >
          I've verified — continue
        </button>
      </div>
    </AuthShell>
  );
}
