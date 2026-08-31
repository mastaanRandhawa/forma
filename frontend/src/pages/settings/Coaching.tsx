import { Sparkles } from "lucide-react";
import { useSettings, useProgression, usePrefs } from "../../api/settings";
import { Section } from "../../components/settings/ui";
import { Toggle } from "../../components/settings/Toggle";

function RadioRow({
  active,
  onClick,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`focus-ring tactile flex w-full gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
        active
          ? "border-[var(--accent-pink)] bg-[color-mix(in_srgb,var(--accent-pink)_12%,transparent)]"
          : "border-white/[0.08] bg-white/[0.03] hover:border-white/20"
      }`}
    >
      <span
        aria-hidden
        className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
          active ? "border-[var(--accent-pink)]" : "border-white/25"
        }`}
      >
        {active && <span className="h-2 w-2 rounded-full bg-[var(--accent-pink)]" />}
      </span>
      <span>
        <span className="block text-[0.9rem] lowercase text-content-primary">{title}</span>
        <span className="mt-0.5 block text-[0.82rem] leading-snug text-content-tertiary">{body}</span>
      </span>
    </button>
  );
}

export default function Coaching() {
  const { bundle, update, setGating } = useSettings();
  const prog = useProgression();
  const prefs = usePrefs();
  const onInteraction = bundle.disclosure.mode === "on_interaction";

  return (
    <div className="space-y-5">
      <Section
        title="interface complexity"
        description="forma can start with the essentials and reveal more as you train, or show everything from day one."
      >
        <div className="flex flex-col gap-2">
          <RadioRow
            active={prog.gatingEnabled}
            onClick={() => setGating(true)}
            title="simple"
            body="show the essentials and unlock more screens as I train."
          />
          <RadioRow
            active={!prog.gatingEnabled}
            onClick={() => setGating(false)}
            title="full"
            body="show all forma features immediately."
          />
        </div>
        {prog.gatingEnabled && prog.nextUnlock && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/[0.04] px-4 py-3 text-[0.82rem] text-content-secondary">
            <Sparkles size={14} strokeWidth={2} className="shrink-0 text-[var(--accent-amber)]" />
            next: {prog.nextUnlock.requirement} ({prog.nextUnlock.progress.current}/
            {prog.nextUnlock.progress.target})
          </div>
        )}
      </Section>

      <Section title="interface details" description="how much detail each widget shows at rest.">
        <div className="flex flex-col gap-2">
          <RadioRow
            active={!onInteraction}
            onClick={() => update({ disclosure: { mode: "always" } })}
            title="always"
            body="every widget shows its full detail all the time."
          />
          <RadioRow
            active={onInteraction}
            onClick={() => update({ disclosure: { mode: "on_interaction" } })}
            title="when interacting"
            body="widgets stay calm and reveal detail on hover or tap."
          />
        </div>
      </Section>

      <Section title="trainer behavior">
        <div className="divide-y divide-[var(--line-soft)]">
          <Toggle
            label="proactive trainer check-ins"
            hint="kai reaches out between sessions with nudges and observations."
            checked={prefs.notifications.trainerCheckins}
            onChange={(v) => update({ prefs: { notifications: { trainerCheckins: v } } })}
          />
          <Toggle
            label="camera form tracking"
            hint="analyze exercise technique using your device's camera. manage details under privacy & data."
            checked={prefs.camera.formTracking}
            onChange={(v) => update({ prefs: { camera: { formTracking: v } } })}
          />
        </div>
      </Section>
    </div>
  );
}
