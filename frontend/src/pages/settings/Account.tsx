import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, ShieldCheck } from "lucide-react";
import { API_ENABLED } from "../../api/hooks";
import { useAuth } from "../../api/auth";
import { Section } from "../../components/settings/ui";

export default function Account() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-5">
      {API_ENABLED && (
        <Section title="account & security">
          {user && (
            <p className="mb-3 text-[0.85rem] text-content-secondary">
              signed in as <span className="text-content-primary">{user.email}</span>
              {!user.emailVerified && (
                <span className="label-instrument" style={{ color: "var(--accent-amber)" }}>
                  {" "}
                  · email unverified
                </span>
              )}
              .
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Link
              to="/settings/security"
              className="focus-ring tactile inline-flex items-center gap-2 rounded-pill bg-white/[0.06] px-4 py-2 text-[0.82rem] lowercase text-content-primary transition-colors hover:bg-white/[0.12]"
            >
              <ShieldCheck size={13} strokeWidth={2.25} /> email, password, sessions
            </Link>
            <button
              onClick={async () => {
                setBusy(true);
                await signOut();
                nav("/login", { replace: true });
              }}
              disabled={busy}
              className="focus-ring tactile inline-flex items-center gap-2 rounded-pill bg-white/[0.06] px-4 py-2 text-[0.82rem] lowercase text-content-primary transition-colors hover:bg-white/[0.12] disabled:opacity-50"
            >
              <LogOut size={13} strokeWidth={2.25} /> {busy ? "signing out…" : "sign out"}
            </button>
          </div>
        </Section>
      )}

      <Section title="subscription">
        <div className="flex items-center justify-between text-[0.9rem]">
          <span className="text-content-tertiary lowercase">plan</span>
          <span className="text-content-primary lowercase">free</span>
        </div>
      </Section>

      <Section title="about">
        <ul className="space-y-2 text-[0.9rem] text-content-secondary lowercase">
          <li>forma web v1.0.0</li>
          <li>privacy policy</li>
          <li>terms of service</li>
          <li>help &amp; support</li>
          <li className="normal-case">
            Exercise data &amp; illustrations by{" "}
            <a
              href="https://repdb.co"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-content-primary"
            >
              RepDB (repdb.co)
            </a>
          </li>
        </ul>
      </Section>
    </div>
  );
}
