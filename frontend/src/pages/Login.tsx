import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { auth } from "../api/client";
import { useAuth } from "../api/auth";
import { useAction } from "../api/hooks";
import { AuthShell, Field, SubmitButton, FormError } from "./auth-shared";

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { run, pending, error } = useAction((e: string, p: string) => auth.login(e, p));

  const from = (loc.state as { from?: string } | null)?.from ?? "/dashboard";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const s = await run(email.trim(), password);
    if (!s) return;
    setUser(s.user);
    nav(s.user.onboardingCompletedAt ? from : "/onboarding", { replace: true });
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footer={<>New here? <Link className="text-content-primary underline underline-offset-4" to="/signup">Create an account</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-3.5">
        <Field label="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="text-right">
          <Link to="/forgot-password" className="text-[0.78rem] text-content-tertiary underline underline-offset-4 hover:text-content-secondary">
            Forgot password?
          </Link>
        </div>
        <SubmitButton pending={pending}>Sign in</SubmitButton>
        <FormError error={error} />
      </form>
    </AuthShell>
  );
}
