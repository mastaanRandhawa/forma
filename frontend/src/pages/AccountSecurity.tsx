import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LogOut, Monitor, ShieldCheck, Trash2 } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Reveal } from "../components/Reveal";
import { api, ApiRequestError } from "../api/client";
import { API_ENABLED, useAction } from "../api/hooks";
import { useAuth } from "../api/auth";
import type { ConnectedAccounts, SessionInfo } from "../api/types";
import {
  PasswordField,
  PasswordStrength,
  Field,
  AuthNotice,
  mapAuthError,
  passwordMeetsPolicy,
} from "./auth-shared";

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Reveal as="section" onView className="surface-soft p-5 sm:p-6">
      <h2 className="label-soft lowercase">{title}</h2>
      <div className="mt-3">{children}</div>
    </Reveal>
  );
}

const pillBtn =
  "focus-ring tactile inline-flex items-center gap-2 rounded-pill bg-white/[0.06] px-4 py-2 text-[0.82rem] lowercase text-content-primary transition-colors hover:bg-white/[0.12] disabled:opacity-50";

function timeAgo(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

// ── email ───────────────────────────────────────────────────────────────────
function EmailGroup() {
  const { user, refreshUser } = useAuth();
  const [params, setParams] = useSearchParams();
  const [newEmail, setNewEmail] = useState("");
  const [pw, setPw] = useState("");
  const [notice, setNotice] = useState<{ v: "success" | "error"; msg: string } | null>(null);
  const { run, pending } = useAction((e: string, p: string) => api.me.changeEmail(e, p));

  // Consume ?token= from the confirmation link sent to the new address.
  useEffect(() => {
    const token = params.get("token");
    if (!token) return;
    params.delete("token");
    setParams(params, { replace: true });
    api.me
      .confirmEmailChange(token)
      .then(async (r) => {
        await refreshUser();
        setNotice({ v: "success", msg: `Your email is now ${r.email}. Other sessions were signed out.` });
      })
      .catch((e) => setNotice({ v: "error", msg: mapAuthError(e).message }));
  }, [params, setParams, refreshUser]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    try {
      await run(newEmail.trim(), pw);
      setNotice({ v: "success", msg: `Confirmation link sent to ${newEmail.trim()}. It isn't active until you click it.` });
      setNewEmail("");
      setPw("");
    } catch (err) {
      setNotice({ v: "error", msg: mapAuthError(err).message });
    }
  }

  return (
    <Group title="email">
      <p className="mb-3 text-[0.85rem] text-content-secondary">
        Current: <span className="text-content-primary">{user?.email}</span>{" "}
        {user?.emailVerified ? (
          <span className="label-instrument" style={{ color: "var(--accent-cyan)" }}>· verified</span>
        ) : (
          <span className="label-instrument" style={{ color: "var(--accent-amber)" }}>· unverified</span>
        )}
      </p>
      <form onSubmit={submit} className="space-y-3">
        <Field label="new email" type="email" autoComplete="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
        <PasswordField label="current password" autoComplete="current-password" required value={pw} onChange={(e) => setPw(e.target.value)} />
        <button type="submit" disabled={pending} className={pillBtn}>
          {pending ? "sending…" : "send confirmation link"}
        </button>
        {notice && <AuthNotice variant={notice.v}>{notice.msg}</AuthNotice>}
      </form>
    </Group>
  );
}

// ── password ────────────────────────────────────────────────────────────────
function PasswordGroup() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [notice, setNotice] = useState<{ v: "success" | "error"; msg: string } | null>(null);
  const { run, pending } = useAction((a: string, b: string) => api.me.changePassword(a, b));
  const weak = next.length > 0 && !passwordMeetsPolicy(next);
  const mismatch = confirm.length > 0 && confirm !== next;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (weak || mismatch) return;
    setNotice(null);
    try {
      await run(cur, next);
      setNotice({ v: "success", msg: "Password changed. Other devices were signed out." });
      setCur(""); setNext(""); setConfirm("");
    } catch (err) {
      setNotice({ v: "error", msg: mapAuthError(err).message });
    }
  }

  return (
    <Group title="password">
      <form onSubmit={submit} className="space-y-3" noValidate>
        <PasswordField label="current password" autoComplete="current-password" required value={cur} onChange={(e) => setCur(e.target.value)} />
        <PasswordField label="new password" autoComplete="new-password" required value={next} onChange={(e) => setNext(e.target.value)} />
        <PasswordStrength value={next} />
        <PasswordField label="confirm new password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {mismatch && <p className="text-[0.75rem] text-[var(--accent-pink)]">Passwords don't match.</p>}
        <button type="submit" disabled={pending || weak || mismatch} className={pillBtn}>
          {pending ? "updating…" : "update password"}
        </button>
        {notice && <AuthNotice variant={notice.v}>{notice.msg}</AuthNotice>}
      </form>
    </Group>
  );
}

// ── connected accounts ──────────────────────────────────────────────────────
function ConnectedAccountsGroup() {
  const [data, setData] = useState<ConnectedAccounts | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(() => api.me.connectedAccounts().then(setData).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  if (!data) return <Group title="connected login providers"><p className="text-[0.83rem] text-content-tertiary">loading…</p></Group>;

  const rows: [("google" | "apple"), boolean][] = [["google", data.google], ["apple", data.apple]];
  async function unlink(p: "google" | "apple") {
    setMsg(null);
    try {
      await api.me.unlinkAccount(p);
      await load();
    } catch (e) {
      setMsg(e instanceof ApiRequestError ? mapAuthError(e).message : "Couldn't unlink.");
    }
  }

  return (
    <Group title="connected login providers">
      <div className="divide-y divide-[var(--line-soft)]">
        <div className="flex items-center justify-between py-3 text-[0.88rem]">
          <span className="text-content-primary">Email &amp; password</span>
          <span className="label-instrument">{data.password ? "set" : "not set"}</span>
        </div>
        {rows.map(([p, linked]) => (
          <div key={p} className="flex items-center justify-between py-3 text-[0.88rem]">
            <span className="text-content-primary capitalize">{p}</span>
            {linked ? (
              <button onClick={() => unlink(p)} className="focus-ring rounded-pill px-3 py-1.5 text-[0.76rem] lowercase text-content-tertiary hover:text-content-secondary">
                unlink
              </button>
            ) : (
              <span className="label-instrument">not linked</span>
            )}
          </div>
        ))}
      </div>
      {msg && <AuthNotice variant="error">{msg}</AuthNotice>}
    </Group>
  );
}

// ── active sessions ─────────────────────────────────────────────────────────
function SessionsGroup() {
  const [rows, setRows] = useState<SessionInfo[] | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api.me.sessions().then(setRows).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  async function revoke(id: string) {
    setBusy(true);
    await api.me.revokeSession(id).catch(() => {});
    await load();
    setBusy(false);
  }
  async function revokeOthers() {
    setBusy(true);
    await api.me.revokeOtherSessions().catch(() => {});
    await load();
    setBusy(false);
  }

  return (
    <Group title="active sessions & devices">
      {!rows ? (
        <p className="text-[0.83rem] text-content-tertiary">loading…</p>
      ) : (
        <>
          <div className="divide-y divide-[var(--line-soft)]">
            {rows.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 py-3 text-[0.86rem]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-content-primary">
                    <Monitor size={13} strokeWidth={2} className="shrink-0 text-content-tertiary" />
                    <span className="truncate">{s.userAgent || "Unknown device"}</span>
                    {s.current && (
                      <span className="label-instrument" style={{ color: "var(--accent-cyan)" }}>· this device</span>
                    )}
                  </div>
                  <div className="label-instrument mt-0.5">
                    {s.ip || "—"} · active {timeAgo(s.lastSeenAt)}
                  </div>
                </div>
                {!s.current && (
                  <button
                    onClick={() => revoke(s.id)}
                    disabled={busy}
                    className="focus-ring shrink-0 rounded-pill px-3 py-1.5 text-[0.76rem] lowercase text-content-tertiary hover:text-content-secondary disabled:opacity-50"
                  >
                    revoke
                  </button>
                )}
              </div>
            ))}
          </div>
          {rows.length > 1 && (
            <button onClick={revokeOthers} disabled={busy} className={`${pillBtn} mt-4`}>
              sign out all other devices
            </button>
          )}
        </>
      )}
    </Group>
  );
}

// ── sign out + delete ───────────────────────────────────────────────────────
function DangerGroup() {
  const { user, signOut, signOutEverywhere } = useAuth();
  const nav = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [pw, setPw] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function del() {
    setBusy(true);
    setErr(null);
    try {
      await api.me.deleteAccount(pw || undefined);
      await signOut();
      nav("/signup", { replace: true });
    } catch (e) {
      setErr(mapAuthError(e).message);
      setBusy(false);
    }
  }

  return (
    <>
      <Group title="sign out">
        {user && (
          <p className="mb-3 text-[0.85rem] text-content-secondary">
            Signed in as <span className="text-content-primary">{user.email}</span>.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => signOut().then(() => nav("/login", { replace: true }))} className={pillBtn}>
            <LogOut size={13} strokeWidth={2.25} /> sign out
          </button>
          <button onClick={() => signOutEverywhere().then(() => nav("/login", { replace: true }))} className={pillBtn}>
            sign out everywhere
          </button>
        </div>
      </Group>

      <Group title="delete account">
        <p className="mb-3 text-[0.85rem] leading-relaxed text-content-secondary">
          Your account is deactivated immediately and permanently removed after a short grace
          period. This can't be undone.
        </p>
        {!open ? (
          <button onClick={() => setOpen(true)} className={`${pillBtn} !bg-[var(--accent-pink)]/12 hover:!bg-[var(--accent-pink)]/20`}>
            <Trash2 size={13} strokeWidth={2.25} /> delete my account
          </button>
        ) : (
          <div className="space-y-3">
            <Field
              label={'type "DELETE" to confirm'}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
            <PasswordField label="current password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <div className="flex gap-2">
              <button
                onClick={del}
                disabled={busy || confirmText !== "DELETE"}
                className={`${pillBtn} !bg-[var(--accent-pink)]/15 hover:!bg-[var(--accent-pink)]/25`}
              >
                {busy ? "deleting…" : "permanently delete"}
              </button>
              <button onClick={() => setOpen(false)} className={pillBtn}>cancel</button>
            </div>
            {err && <AuthNotice variant="error">{err}</AuthNotice>}
          </div>
        )}
      </Group>
    </>
  );
}

export default function AccountSecurity() {
  return (
    <div className="mx-auto max-w-[1120px]">
      <PageHeader eyebrow="account" title="security" />
      {!API_ENABLED ? (
        <Reveal as="section" className="surface-soft p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-content-tertiary" />
            <p className="text-[0.88rem] leading-relaxed text-content-secondary">
              Account &amp; security management (email, password, sessions, connected providers,
              account deletion) needs a running backend. This build has none.
            </p>
          </div>
        </Reveal>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <EmailGroup />
          <PasswordGroup />
          <ConnectedAccountsGroup />
          <SessionsGroup />
          <DangerGroup />
        </div>
      )}
    </div>
  );
}
