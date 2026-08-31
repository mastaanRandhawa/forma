import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAppearance, useSettings } from "../../api/settings";
import { Section } from "../../components/settings/ui";
import { Toggle } from "../../components/settings/Toggle";
import { THEME_MAP } from "../../lib/themes";
import { useCustomization } from "../../lib/customization";

export default function Appearance() {
  const appearance = useAppearance();
  const { update } = useSettings();
  const cz = useCustomization();
  const theme = THEME_MAP[cz.equippedId("theme")];

  return (
    <div className="space-y-5">
      <Section
        title="theme & cosmetics"
        description="themes, accent colours, ambient effects, kai's look, chat skins and profile flair all live in customization."
      >
        <Link
          to="/settings/customization"
          className="focus-ring tactile flex items-center gap-3 rounded-2xl border border-white/10 p-3 transition-colors hover:border-white/25"
          style={{ background: theme?.swatch }}
        >
          <span className="grid h-10 w-10 place-items-center rounded-lg border border-white/15 bg-black/25 text-[0.7rem] lowercase text-white/90 backdrop-blur-sm">
            {theme?.rarity === "legendary" ? "★" : ""}
          </span>
          <span className="flex-1">
            <span className="block text-[0.9rem] lowercase text-white">{theme?.name ?? "current theme"}</span>
            <span className="block text-[0.72rem] lowercase text-white/75">open customization</span>
          </span>
          <ArrowRight size={16} className="text-white/80" />
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
