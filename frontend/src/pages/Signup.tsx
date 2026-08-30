import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../api/client";
import { useAuth } from "../api/auth";
import { useAction } from "../api/hooks";
import { AuthShell, Field, SubmitButton, FormError } from "./auth-shared";

export default function Signup() {
  const nav = useNavigate();
  const { setUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { run, pending, error } = useAction((e: string, p: string, n: string) => auth.register(e, p, n));

  const weak = password.length > 0 && password.length < 8;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (weak) return;
    const s = await run(email.trim(), password, name.trim());
    if (!s) return;
    setUser(s.user);
    nav("/onboarding", { replace: true });
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Then we'll set up your training in about a minute."
      footer={<>Already have an account? <Link className="text-content-primary underline underline-offset-4" to="/login">Sign in</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-3.5">
        <Field label="name" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field
          label="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {weak && <p className="text-[0.78rem] text-content-tertiary">At least 8 characters.</p>}
        <SubmitButton pending={pending}>Create account</SubmitButton>
        <FormError error={error} />
      </form>
    </AuthShell>
  );
}
