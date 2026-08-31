import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { auth } from "../api/client";
import { useAuth, takeRedirect } from "../api/auth";
import { useAction } from "../api/hooks";
import {
  AuthShell,
  Field,
  PasswordField,
  Checkbox,
  SubmitButton,
  AuthNotice,
  OAuthButtons,
  mapAuthError,
} from "./auth-shared";

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation();
  const [params] = useSearchParams();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const { run, pending, error } = useAction((e: string, p: string, r: boolean) => auth.login(e, p, r));

  let expired = params.get("expired") === "1";
  try {
    if (sessionStorage.getItem("forma.sessionExpired") === "1") {
      expired = true;
      sessionStorage.removeItem("forma.sessionExpired");
    }
  } catch {
    /* ignore */
  }
  const from =
    (loc.state as { from?: string } | null)?.from ?? takeRedirect() ?? "/dashboard";
  const mapped = error ? mapAuthError(error) : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const s = await run(email.trim(), password, remember);
    if (!s) return;
    setUser(s.user);
    if (!s.user.emailVerified) nav("/verify-email", { replace: true });
    else nav(s.user.onboardingCompletedAt ? from : "/onboarding", { replace: true });
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footer={
        <>
          New here?{" "}
          <Link className="text-content-primary underline underline-offset-4" to="/signup">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-3.5">
        <Field
          label="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordField
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <Checkbox label="Remember me" checked={remember} onChange={setRemember} />
          <Link
            to="/forgot-password"
            className="text-[0.78rem] text-content-tertiary underline underline-offset-4 hover:text-content-secondary"
          >
            Forgot password?
          </Link>
        </div>
        <SubmitButton pending={pending}>Sign in</SubmitButton>

        {expired && !error && (
          <AuthNotice variant="warn">Your session expired. Please sign in again.</AuthNotice>
        )}
        {mapped && (
          <AuthNotice variant="error">
            {mapped.message}
            {mapped.code === "email_not_verified" && (
              <>
                {" "}
                <Link to="/verify-email" className="underline underline-offset-4">
                  Resend verification
                </Link>
              </>
            )}
          </AuthNotice>
        )}

        <OAuthButtons />
      </form>
    </AuthShell>
  );
}
