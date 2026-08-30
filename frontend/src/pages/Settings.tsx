import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Plus, Sparkles } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Reveal } from "../components/Reveal";
import { useSettings, useAppearance, useProgression, PRESETS } from "../api/settings";

function DeviceRow({ name, connected, sync }: { name: string; connected: boolean; sync?: string }) {
  const [on, setOn] = useState(connected);
  return (
    <div className="flex items-center justify-between border-t border-[var(--line-soft)] py-3.5 first:border-t-0">
      <div>
        <div className="text-[0.9rem] text-content-primary">{name}</div>
        {on ? (
          <div className="num mt-0.5 text-[0.72rem]" style={{ color: "var(--accent-lime)" }}>
            connected · synced {sync}
          </div>
        ) : (
          <div className="label-instrument mt-0.5">not connected</div>
        )}
      </div>
      <button
        onClick={() => setOn(!on)}
        className={`focus-ring tactile inline-flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-[0.78rem] lowercase transition-colors ${
          on
            ? "bg-white/[0.06] text-content-tertiary hover:text-content-secondary"
            : "bg-[color-mix(in_srgb,var(--accent-cyan)_14%,transparent)] text-[var(--accent-cyan)]"
        }`}
      >
        {on ? "disconnect" : <><Plus size={12} strokeWidth={2.5} /> connect</>}
      </button>
    </div>
  );
}

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

        <Group title="profile">
          <div className="mb-4 flex items-center gap-4">
            <div className="h-14 w-14 rounded-full surface-float" />
            <div>
              <div className="text-[0.95rem] text-content-primary">Alex Rivera</div>
              <div className="label-instrument mt-0.5">alex.rivera@example.com</div>
            </div>
          </div>
          {["Height 5'11\"", "Weight 178 lb", "Age 29", "Units, Imperial"].map((r) => (
            <div
              key={r}
              className="flex items-center justify-between border-t border-[var(--line-soft)] py-3.5 text-[0.9rem]"
            >
              <span className="text-content-primary lowercase">{r}</span>
              <span className="label-instrument" style={{ color: "var(--accent-cyan)" }}>
                edit
              </span>
            </div>
          ))}
        </Group>

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
          <p className="mb-2 text-[0.83rem] leading-relaxed text-content-secondary">
            Pull sleep, HRV, resting heart rate and steps in automatically.
          </p>
          <DeviceRow name="Apple Health / Health Connect" connected sync="2 min ago" />
          <DeviceRow name="WHOOP" connected sync="14 min ago" />
          <DeviceRow name="Garmin Connect" connected={false} />
          <DeviceRow name="Oura" connected={false} />
          <DeviceRow name="Strava" connected={false} />
        </Group>

        <Group title="subscription">
          <div className="surface-recessed rounded-hero p-4">
            <div className="text-[0.95rem] text-content-primary">Forma Pro</div>
            <div className="label-instrument mt-0.5">$14.99 / month · renews sep 12, 2026</div>
          </div>
          <button className="label-instrument mt-3" style={{ color: "var(--accent-cyan)" }}>
            manage billing
          </button>
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
