import { Link } from "react-router-dom";
import { ArrowRight, Monitor, Moon, Sun } from "lucide-react";
import { useAppearance, useSettings } from "../../api/settings";
import { Section } from "../../components/settings/ui";
import { Toggle } from "../../components/settings/Toggle";
import { THEME_MAP, resolveColorMode } from "../../lib/themes";
import { useCustomization } from "../../lib/customization";

const MODES: { id: "cm-light" | "cm-dark" | "cm-system"; label: string; icon: typeof Sun }[] = [
  { id: "cm-light", label: "light", icon: Sun },
  { id: "cm-dark", label: "dark", icon: Moon },
  { id: "cm-system", label: "system", icon: Monitor },
];

export default function Appearance() {
  const appearance = useAppearance();
  const { update } = useSettings();
  const cz = useCustomization();
  const theme = THEME_MAP[cz.equippedId("theme")];
  const mode = (cz.equippedId("colorMode") ?? "cm-system") as "cm-light" | "cm-dark" | "cm-system";
  const light = resolveColorMode(mode) === "light";

  return (
    <div className="space-y-5">
      <Section
        title="light or dark"
        description="a display mode, separate from your theme. your theme's colours apply to both."
      >
        <div className="grid grid-cols-3 gap-2">
          {MODES.map(({ id, label, icon: Icon }) => {
            const active = mode === id;
            return (
              <button
                key={id}
                onClick={() => cz.setColorMode(id)}
                className={`focus-ring tactile flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-3.5 text-center transition-colors ${
                  active ? "border-white/40 bg-white/[0.08]" : "border-white/10 hover:border-white/25"
                }`}
              >
                <Icon
                  size={17}
                  strokeWidth={1.75}
                  className={active ? "text-content-primary" : "text-content-tertiary"}
                />
                <span className="text-[0.78rem] lowercase text-content-primary">{label}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        title="theme & cosmetics"
        description="themes, accent colours, ambient effects, kai's look, chat skins and profile flair all live in customization."
      >
        <Link
          to="/settings/customization"
          className="focus-ring tactile flex items-center gap-3 rounded-2xl border p-3 transition-colors"
          style={{
            background: light ? theme?.swatchLight : theme?.swatch,
            borderColor: light ? "rgba(41,28,45,0.14)" : "rgba(255,255,255,0.14)",
          }}
        >
          <span
            className="grid h-10 w-10 place-items-center rounded-lg backdrop-blur-sm"
            style={{
              background: light ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.25)",
              border: `1px solid ${light ? "rgba(41,28,45,0.14)" : "rgba(255,255,255,0.15)"}`,
            }}
          />
          <span className="flex-1">
            <span
              className="block text-[0.9rem] lowercase"
              style={{ color: light ? "#211A24" : "#fff" }}
            >
              {theme?.name ?? "current theme"}
            </span>
            <span
              className="block text-[0.72rem] lowercase"
              style={{ color: light ? "rgba(33,26,36,0.6)" : "rgba(255,255,255,0.78)" }}
            >
              open customization
            </span>
          </span>
          <ArrowRight size={16} style={{ color: light ? "rgba(33,26,36,0.65)" : "rgba(255,255,255,0.82)" }} />
        </Link>
      </Section>

      <Section title="motion">
        <div className="divide-y divide-[var(--line-soft)]">
          <Toggle
            label="reduce motion"
            hint="minimize animation, parallax and ambient theme effects across the app."
            checked={appearance.reduceMotion}
            onChange={(v) => update({ appearance: { reduceMotion: v } })}
          />
        </div>
      </Section>
    </div>
  );
}
