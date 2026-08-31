import { Check } from "lucide-react";
import { useAppearance, useSettings, PRESETS } from "../../api/settings";
import { Section } from "../../components/settings/ui";
import { Toggle } from "../../components/settings/Toggle";

export default function Appearance() {
  const appearance = useAppearance();
  const { update, applyPreset } = useSettings();

  return (
    <div className="space-y-5">
      <Section
        title="theme"
        description="pick a background — every panel frosts over it as translucent glass."
      >
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
      </Section>

      <Section title="motion">
        <div className="divide-y divide-[var(--line-soft)]">
          <Toggle
            label="reduce motion"
            hint="minimize animation and parallax across the app."
            checked={appearance.reduceMotion}
            onChange={(v) => update({ appearance: { reduceMotion: v } })}
          />
        </div>
      </Section>
    </div>
  );
}
