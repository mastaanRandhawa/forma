import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Sparkles } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Reveal } from "../components/Reveal";
import { useSettings, useAppearance, useProgression, PRESETS } from "../api/settings";
import { addCheckin, latestCheckin, useFormaData } from "../lib/localStore";

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
        onClick={() => {
          addCheckin({ sleepH, sleepQuality, fatigue, soreness });
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

export default function Settings() {
  return (
    <div className="mx-auto max-w-[1120px]">
      <PageHeader eyebrow="account" title="settings" />

      <div className="grid gap-6 lg:grid-cols-2">
        <AppearanceGroup />
        <GettingStartedGroup />
        <ProfileGroup />
        <RecoveryGroup />

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

        <Group title="connected devices">
          <p className="text-[0.83rem] leading-relaxed text-content-secondary">
            Apple Health, Health Connect, WHOOP, Garmin, Oura and Strava sync
            through the mobile companion app. There's no device connection in the
            web build — use the recovery check-in above for a manual signal.
          </p>
        </Group>

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
          </ul>
        </Group>
      </div>
    </div>
  );
}
