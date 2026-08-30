import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Reveal } from "../components/Reveal";
import { useSettings, useAppearance, useProgression, PRESETS } from "../api/settings";
import { addCheckin, latestCheckin, useFormaData } from "../lib/localStore";
import { API_ENABLED } from "../api/hooks";
import { api } from "../api/client";
import { useAuth } from "../api/auth";

function Toggle({
  label,
  defaultOn = false,
  checked,
  onChange,
}: {
  label: string;
  defaultOn?: boolean;
  checked?: boolean;
  onChange?: (v: boolean) => void;
}) {
  const [internal, setInternal] = useState(defaultOn);
  const on = checked ?? internal;
  const toggle = () => {
    if (onChange) onChange(!on);
    else setInternal(!on);
  };
  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className="focus-ring flex w-full items-center justify-between py-3.5"
    >
      <span className="text-[0.92rem] text-content-primary lowercase">{label}</span>
      <span
        className="relative h-6 w-11 rounded-pill transition-colors surface-recessed"
        style={on ? { background: "var(--accent-pink)", boxShadow: "0 0 16px -2px rgba(213,26,122,0.6)" } : undefined}
      >
        <span
          className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full surface-float"
          style={{
            transform: on ? "translateX(20px)" : "translateX(0)",
            transition: "transform 200ms var(--ease-luxury)",
          }}
        />
      </span>
    </button>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Reveal as="section" onView className="surface-soft p-5 sm:p-6">
      <h2 className="label-soft lowercase">{title}</h2>
      <div className="mt-3">{children}</div>
    </Reveal>
  );
}

function AppearanceGroup() {
  const appearance = useAppearance();
  const { update, applyPreset } = useSettings();
  return (
    <Group title="appearance">
      <p className="mb-4 text-[0.85rem] leading-relaxed text-content-secondary">
        Pick a background. Every panel frosts over it as translucent glass.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((p) => {
          const active = appearance.presetId === p.id;
          const bg =
            p.appearance.backgroundMode === "gradient" && p.appearance.backgroundGradient
              ? `linear-gradient(${p.appearance.backgroundGradient.angle}deg, ${p.appearance.backgroundGradient.stops
                  .map((s) => s.color)
                  .join(", ")})`
              : p.appearance.backgroundColor;
          return (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className={`focus-ring tactile relative overflow-hidden rounded-2xl border p-3 text-left transition-colors ${
                active ? "border-white/35" : "border-white/10 hover:border-white/25"
              }`}
              style={{ background: bg }}
            >
              <span
                className="block h-8 w-full rounded-lg border border-white/10"
                style={{
                  background: `rgba(255,255,255,${(p.appearance.glass?.opacity ?? 0.7) * 0.14})`,
                  backdropFilter: "blur(4px)",
                }}
              />
              <span className="mt-2 block text-[0.74rem] lowercase text-white/90">{p.name}</span>
              {p.premium && (
                <span className="label-instrument mt-0.5 block !text-[0.58rem] text-[var(--accent-amber)]">
                  premium
                </span>
              )}
              {active && (
                <Check size={13} strokeWidth={3} className="absolute right-2 top-2 text-white" />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-4 divide-y divide-[var(--line-soft)]">
        <Toggle
          label="Reduce motion"
          checked={appearance.reduceMotion}
          onChange={(v) => update({ appearance: { reduceMotion: v } })}
        />
      </div>
    </Group>
  );
}

const GOAL_LABELS: Record<string, string> = {
  lose: "lose fat",
  muscle: "build muscle",
  strength: "get stronger",
  fitness: "general fitness",
  sleep: "sleep & recovery",
  maintain: "maintain",
};

function ProfileGroup() {
  const { profile } = useFormaData();
  const rows: [string, string][] = [
    ["goal", profile.goal ? GOAL_LABELS[profile.goal] ?? profile.goal : "not set"],
    ["experience", profile.experience ?? "not set"],
    ["training days / week", profile.daysPerWeek ? String(profile.daysPerWeek) : "not set"],
    ["session length", profile.sessionMin ? `${profile.sessionMin} min` : "not set"],
    ["units", profile.units],
    ["bodyweight", profile.bodyweight ? `${profile.bodyweight} ${profile.units}` : "not logged"],
  ];
  return (
    <Group title="profile">
      <p className="mb-3 text-[0.85rem] leading-relaxed text-content-secondary">
        {profile.onboardedAt
          ? "From your setup. Re-run setup to change any of it."
          : "You haven't completed setup yet — the app is running on template defaults."}
      </p>
      {rows.map(([k, v]) => (
        <div
          key={k}
          className="flex items-center justify-between border-t border-[var(--line-soft)] py-3.5 text-[0.9rem] first:border-t-0"
        >
          <span className="text-content-tertiary lowercase">{k}</span>
          <span className="text-content-primary lowercase">{v}</span>
        </div>
      ))}
      <Link
        to="/onboarding"
        className="focus-ring tactile mt-4 inline-flex items-center gap-2 rounded-pill bg-white/[0.06] px-4 py-2 text-[0.82rem] lowercase text-content-primary transition-colors hover:bg-white/[0.12]"
      >
        {profile.onboardedAt ? "re-run setup" : "complete setup"}
      </Link>
    </Group>
  );
}

function RecoveryGroup() {
  const data = useFormaData();
  const last = latestCheckin(data);
  const [sleepH, setSleepH] = useState(7);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [fatigue, setFatigue] = useState(3);
  const [soreness, setSoreness] = useState(3);
  const [saved, setSaved] = useState(false);

  const Slider = ({ label, value, set, min, max, step = 1, suffix = "" }: {
    label: string; value: number; set: (v: number) => void; min: number; max: number; step?: number; suffix?: string;
  }) => (
    <div className="py-2.5">
      <div className="mb-1.5 flex items-center justify-between text-[0.85rem]">
        <span className="text-content-primary lowercase">{label}</span>
        <span className="num text-content-secondary">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="focus-ring w-full accent-[var(--accent-pink)]"
      />
    </div>
  );

  return (
    <Group title="recovery check-in">
      <p className="mb-2 text-[0.83rem] leading-relaxed text-content-secondary">
        Health sync (Apple Health, Health Connect, WHOOP, Oura) runs in the mobile
        companion — it isn't available in the web build. Until then, a manual
        check-in gives Forma a readiness signal.
      </p>
      {last && (
        <div className="mb-2 label-instrument">
          last check-in {last.date} · {last.sleepH}h sleep
        </div>
      )}
      <div className="divide-y divide-[var(--line-soft)]">
        <Slider label="hours slept" value={sleepH} set={setSleepH} min={3} max={11} step={0.5} suffix="h" />
        <Slider label="sleep quality" value={sleepQuality} set={setSleepQuality} min={1} max={5} />
        <Slider label="fatigue" value={fatigue} set={setFatigue} min={1} max={5} />
        <Slider label="muscle soreness" value={soreness} set={setSoreness} min={1} max={5} />
      </div>
      <button
        onClick={async () => {
          addCheckin({ sleepH, sleepQuality, fatigue, soreness });
          if (API_ENABLED) {
            await api.progress.checkin({ sleepH, sleepQuality, fatigue, soreness }).catch(() => {});
          }
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }}
        className="focus-ring tactile mt-4 inline-flex items-center gap-2 rounded-pill px-5 py-2.5 text-[0.86rem] font-medium text-[var(--fill-on-color)]"
        style={{ background: "var(--fill-coral)" }}
      >
        <Check size={15} strokeWidth={2.5} /> {saved ? "saved" : "save check-in"}
      </button>
    </Group>
  );
}

function GettingStartedGroup() {
  const { bundle, update, setGating } = useSettings();
  const prog = useProgression();
  const calm = bundle.disclosure.mode === "on_interaction";
  return (
    <Group title="getting started">
      <p className="mb-3 text-[0.85rem] leading-relaxed text-content-secondary">
        Forma starts small and opens up as you train, so there's less to take in
        on day one.
      </p>
      <div className="divide-y divide-[var(--line-soft)]">
        <Toggle
          label="Calm mode — hide widget details until I hover"
          checked={calm}
          onChange={(v) => update({ disclosure: { mode: v ? "on_interaction" : "always" } })}
        />
        <Toggle
          label="Ease me in (lock advanced screens until unlocked)"
          checked={prog.gatingEnabled}
          onChange={(v) => setGating(v)}
        />
      </div>
      {prog.gatingEnabled && prog.nextUnlock && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/[0.04] px-4 py-3 text-[0.82rem] text-content-secondary">
          <Sparkles size={14} strokeWidth={2} className="shrink-0 text-[var(--accent-amber)]" />
          next: {prog.nextUnlock.requirement} ({prog.nextUnlock.progress.current}/
          {prog.nextUnlock.progress.target})
        </div>
      )}
    </Group>
  );
}

const WEARABLES = [
  { key: "whoop", name: "WHOOP" },
  { key: "oura", name: "Oura" },
  { key: "garmin", name: "Garmin" },
] as const;

function timeAgo(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

function DevicesGroup() {
  const [conns, setConns] = useState<import("../api/types").DeviceConnection[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => {
    if (!API_ENABLED) return;
    api.me.devices().then(setConns).catch(() => {});
  };
  useEffect(() => {
    load();
    const p = new URLSearchParams(window.location.search);
    if (p.get("device_connected")) setMsg(`${p.get("device_connected")} connected.`);
    if (p.get("device_error")) setMsg(`Couldn't connect: ${p.get("device_error")}`);
    if (p.get("device_connected") || p.get("device_error"))
      window.history.replaceState({}, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!API_ENABLED) {
    return (
      <Group title="connected devices">
        <p className="text-[0.83rem] leading-relaxed text-content-secondary">
          Health sync connects to a running backend. This build has none — use the
          recovery check-in above for a manual readiness signal.
        </p>
      </Group>
    );
  }

  const byProvider = Object.fromEntries(conns.map((c) => [c.provider, c]));

  async function connect(key: string) {
    setBusy(key);
    setMsg(null);
    try {
      const r = await api.me.connectDevice(key as "whoop" | "oura" | "garmin");
      if (r.authorizeUrl) window.location.href = r.authorizeUrl;
      else setMsg(r.message ?? `${key} isn't configured on this deployment.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : `${key} isn't available.`);
    } finally {
      setBusy(null);
    }
  }
  async function sync(key: string) {
    setBusy(key);
    try {
      const r = await api.me.syncDevice(key);
      setMsg(`${key}: ${r.ingested} new reading${r.ingested === 1 ? "" : "s"}.`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "sync failed");
    } finally {
      setBusy(null);
    }
  }
  async function disconnect(key: string) {
    setBusy(key);
    await api.me.disconnectDevice(key).catch(() => {});
    setBusy(null);
    load();
  }

  return (
    <Group title="connected devices">
      <p className="mb-3 text-[0.83rem] leading-relaxed text-content-secondary">
        Apple Health &amp; Health Connect sync through the mobile companion app.
        WHOOP, Oura and Garmin connect here over OAuth.
      </p>

      <div className="divide-y divide-[var(--line-soft)]">
        {WEARABLES.map(({ key, name }) => {
          const c = byProvider[key];
          const connected = c?.oauthConnected;
          return (
            <div key={key} className="flex items-center justify-between py-3 text-[0.88rem]">
              <div>
                <div className="text-content-primary">{name}</div>
                <div className="label-instrument mt-0.5">
                  {c?.status === "error"
                    ? `last sync failed${c.lastErrorAt ? ` ${timeAgo(c.lastErrorAt)}` : ""}`
                    : connected
                    ? c?.lastSyncAt
                      ? `synced ${timeAgo(c.lastSyncAt)}`
                      : "connected"
                    : "not connected"}
                </div>
              </div>
              <div className="flex gap-1.5">
                {connected ? (
                  <>
                    <button
                      onClick={() => sync(key)}
                      disabled={busy === key}
                      className="focus-ring rounded-pill bg-white/[0.06] px-3 py-1.5 text-[0.76rem] lowercase text-content-primary hover:bg-white/[0.12] disabled:opacity-50"
                    >
                      sync
                    </button>
                    <button
                      onClick={() => disconnect(key)}
                      disabled={busy === key}
                      className="focus-ring rounded-pill px-3 py-1.5 text-[0.76rem] lowercase text-content-tertiary hover:text-content-secondary disabled:opacity-50"
                    >
                      disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => connect(key)}
                    disabled={busy === key}
                    className="focus-ring rounded-pill bg-white/[0.06] px-3 py-1.5 text-[0.76rem] lowercase text-content-primary hover:bg-white/[0.12] disabled:opacity-50"
                  >
                    {busy === key ? "…" : "connect"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {msg && <p className="mt-3 text-[0.8rem] text-content-secondary">{msg}</p>}
    </Group>
  );
}

function AccountGroup() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  if (!API_ENABLED) return null;
  return (
    <Group title="account & security">
      {user && (
        <p className="mb-3 text-[0.85rem] text-content-secondary">
          Signed in as <span className="text-content-primary">{user.email}</span>
          {!user.emailVerified && (
            <span className="label-instrument" style={{ color: "var(--accent-amber)" }}> · email unverified</span>
          )}
          .
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Link to="/settings/security" className="focus-ring tactile inline-flex items-center gap-2 rounded-pill bg-white/[0.06] px-4 py-2 text-[0.82rem] lowercase text-content-primary transition-colors hover:bg-white/[0.12]">
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
    </Group>
  );
}

export default function Settings() {
  return (
    <div className="mx-auto max-w-[1120px]">
      <PageHeader eyebrow="account" title="settings" />

      <div className="grid gap-6 lg:grid-cols-2">
        <AppearanceGroup />
        <GettingStartedGroup />
        <ProfileGroup />
        <RecoveryGroup />
        <AccountGroup />

        <Group title="camera & privacy">
          <p className="mb-2 text-[0.85rem] leading-relaxed text-content-secondary">
            Pose estimation runs on-device. Raw video is never uploaded or stored. Only
            form scores and rep counts are saved.
          </p>
          <div className="divide-y divide-[var(--line-soft)]">
            <Toggle label="Allow camera form-tracking" defaultOn />
            <Toggle label="Save form highlight clips" />
            <Toggle label="Share anonymized form data for research" />
          </div>
        </Group>

        <Group title="notifications">
          <div className="divide-y divide-[var(--line-soft)]">
            <Toggle label="Workout reminders" defaultOn />
            <Toggle label="Trainer proactive check-ins" defaultOn />
            <Toggle label="Milestone & PR celebrations" defaultOn />
            <Toggle label="Weekly progress digest (email)" defaultOn />
          </div>
        </Group>

        <DevicesGroup />

        <Group title="about">
          <Link
            to="/onboarding"
            className="focus-ring tactile mb-3 inline-flex items-center gap-2 rounded-pill bg-white/[0.06] px-4 py-2 text-[0.82rem] lowercase text-content-primary transition-colors hover:bg-white/[0.12]"
          >
            <Check size={13} strokeWidth={2.25} /> re-run setup
          </Link>
          <ul className="space-y-2 text-[0.9rem] text-content-secondary lowercase">
            <li>Forma Web v1.0.0</li>
            <li>Privacy Policy</li>
            <li>Terms of Service</li>
            <li>Help & Support</li>
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
        </Group>
      </div>
    </div>
  );
}
