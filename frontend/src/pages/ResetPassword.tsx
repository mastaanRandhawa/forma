import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { auth } from "../api/client";
import { useAction } from "../api/hooks";
import { ApiRequestError } from "../api/client";
import {
  AuthShell,
  PasswordField,
  PasswordStrength,
  SubmitButton,
  AuthNotice,
  mapAuthError,
  passwordMeetsPolicy,
} from "./auth-shared";

export default function ResetPassword() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const { run, pending, error } = useAction((t: string, p: string) => auth.resetPassword(t, p));

  const weak = password.length > 0 && !passwordMeetsPolicy(password);
  const mismatch = confirm.length > 0 && confirm !== password;
  const linkDead =
    error instanceof ApiRequestError &&
    ["reset_link_expired", "token_invalid", "token_expired"].includes(error.code);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (weak || mismatch || !token) return;
    const res = await run(token, password);
    if (res?.ok) setDone(true);
  }

  return (
    <AuthShell
      title="Choose a new password"
      footer={
        <Link className="text-content-primary underline underline-offset-4" to="/login">
          Back to sign in
        </Link>
      }
    >
      {!token ? (
        <AuthNotice variant="warn">
          This reset link is missing its token. Request a new one from{" "}
          <Link className="underline underline-offset-4" to="/forgot-password">
            Forgot password
          </Link>
          .
        </AuthNotice>
      ) : linkDead ? (
        <div className="space-y-3">
          <AuthNotice variant="error">{mapAuthError(error).message}</AuthNotice>
          <Link
            to="/forgot-password"
            className="focus-ring tactile surface-raised surface-raised--interactive inline-flex h-11 w-full items-center justify-center rounded-pill text-[0.9rem] font-medium lowercase text-content-primary"
          >
            Request a new link
          </Link>
        </div>
      ) : done ? (
        <div className="space-y-4 text-[0.86rem] text-content-secondary">
          <AuthNotice variant="success">
            Your password has been updated and every other session was signed out.
          </AuthNotice>
          <button
            onClick={() => nav("/login", { replace: true })}
            className="focus-ring tactile surface-raised surface-raised--interactive inline-flex h-11 w-full items-center justify-center rounded-pill text-[0.9rem] font-medium lowercase text-content-primary"
          >
            Sign in
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3.5" noValidate>
          <PasswordField
            label="new password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordStrength value={password} />
          <PasswordField
            label="confirm password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {mismatch && <p className="text-[0.75rem] text-[var(--accent-pink)]">Passwords don't match.</p>}
          <SubmitButton pending={pending} disabled={weak || mismatch}>
            Update password
          </SubmitButton>
          {error && !linkDead && <AuthNotice variant="error">{mapAuthError(error).message}</AuthNotice>}
        </form>
      )}
    </AuthShell>
  );
}
