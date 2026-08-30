import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { auth } from "../api/client";
import { useAction } from "../api/hooks";
import { AuthShell, Field, SubmitButton, FormError } from "./auth-shared";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | undefined>();
  const { run, pending, error } = useAction((e: string) => auth.forgotPassword(e));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await run(email.trim());
    if (res) {
      setSent(true);
      setDevToken(res.devToken);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send a reset link."
      footer={<Link className="text-content-primary underline underline-offset-4" to="/login">Back to sign in</Link>}
    >
      {sent ? (
        <div className="space-y-3 text-[0.86rem] text-content-secondary">
          <p>If an account exists for <span className="text-content-primary">{email}</span>, a reset link is on its way.</p>
          {devToken && (
            <p className="rounded-xl bg-white/[0.04] px-3 py-2 text-[0.8rem]">
              Dev: <Link className="text-content-primary underline underline-offset-4" to={`/reset-password?token=${devToken}`}>continue to reset</Link>
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3.5">
          <Field label="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <SubmitButton pending={pending}>Send reset link</SubmitButton>
          <FormError error={error} />
        </form>
      )}
    </AuthShell>
  );
}
