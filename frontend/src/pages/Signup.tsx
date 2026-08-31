import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../api/client";
import { useAuth } from "../api/auth";
import { useAction } from "../api/hooks";
import {
  AuthShell,
  Field,
  PasswordField,
  PasswordStrength,
  Checkbox,
  SubmitButton,
  AuthNotice,
  OAuthButtons,
  mapAuthError,
  passwordMeetsPolicy,
} from "./auth-shared";

export default function Signup() {
  const nav = useNavigate();
  const { setUser } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [touched, setTouched] = useState(false);
  const { run, pending, error } = useAction(
    (body: Parameters<typeof auth.register>[0]) => auth.register(body),
  );

  const weak = password.length > 0 && !passwordMeetsPolicy(password);
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = !weak && !mismatch && terms && !!password && !!email;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    const s = await run({
      email: email.trim(),
      password,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
    });
    if (!s) return;
    setUser(s.user);
    nav("/verify-email", { replace: true });
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Then verify your email and we'll set up your training."
      footer={
        <>
          Already have an account?{" "}
          <Link className="text-content-primary underline underline-offset-4" to="/login">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-3.5" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Field label="first name" autoComplete="given-name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <Field label="last name" autoComplete="family-name" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <Field
          label="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordField
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

        <Checkbox label={<>I agree to the </>} checked={terms} onChange={setTerms}>
          <a href="/terms" className="underline underline-offset-4">Terms</a> and{" "}
          <a href="/privacy" className="underline underline-offset-4">Privacy Policy</a>.
        </Checkbox>
        {touched && !terms && (
          <p className="text-[0.75rem] text-[var(--accent-pink)]">Please accept the Terms to continue.</p>
        )}

        <SubmitButton pending={pending} disabled={touched && !canSubmit}>
          Create account
        </SubmitButton>
        {error && <AuthNotice variant="error">{mapAuthError(error).message}</AuthNotice>}

        <OAuthButtons />
      </form>
    </AuthShell>
  );
}
