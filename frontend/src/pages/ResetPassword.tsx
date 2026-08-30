import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { auth } from "../api/client";
import { useAction } from "../api/hooks";
import { AuthShell, Field, SubmitButton, FormError } from "./auth-shared";

export default function ResetPassword() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const { run, pending, error } = useAction((t: string, p: string) => auth.resetPassword(t, p));

  const weak = password.length > 0 && password.length < 8;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (weak || !token) return;
    const res = await run(token, password);
    if (res?.ok) setDone(true);
  }

  return (
    <AuthShell
      title="Choose a new password"
      footer={<Link className="text-content-primary underline underline-offset-4" to="/login">Back to sign in</Link>}
    >
      {!token ? (
        <p className="text-[0.86rem] text-content-secondary">
          This reset link is missing its token. Request a new one from{" "}
          <Link className="text-content-primary underline underline-offset-4" to="/forgot-password">Forgot password</Link>.
        </p>
      ) : done ? (
        <div className="space-y-4 text-[0.86rem] text-content-secondary">
          <p>Your password has been updated.</p>
          <button
            onClick={() => nav("/login", { replace: true })}
            className="focus-ring tactile surface-raised surface-raised--interactive inline-flex h-11 w-full items-center justify-center rounded-pill text-[0.9rem] font-medium lowercase text-content-primary"
          >
            Sign in
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3.5">
          <Field label="new password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          {weak && <p className="text-[0.78rem] text-content-tertiary">At least 8 characters.</p>}
          <SubmitButton pending={pending}>Update password</SubmitButton>
          <FormError error={error} />
        </form>
      )}
    </AuthShell>
  );
}
