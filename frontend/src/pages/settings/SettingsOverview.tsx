import { Link } from "react-router-dom";
import { useAuth } from "../../api/auth";
import { usePrefs, useProgression, useAppearance } from "../../api/settings";
import { useCustomization } from "../../lib/customization";
import { THEME_MAP } from "../../lib/themes";
import { customizationItems } from "../../lib/data";
import { useFormaData } from "../../lib/localStore";
import { GOAL_LABELS } from "../../lib/profileOptions";
import { Section, Row } from "../../components/settings/ui";
import { SETTINGS_CATEGORIES } from "../../components/settings/SettingsNav";

export default function SettingsOverview() {
  const { user } = useAuth();
  const { profile } = useFormaData();
  const prog = useProgression();
  const prefs = usePrefs();
  const appearance = useAppearance();

  const name = profile.name || user?.name || "athlete";
  const goal = profile.goal ? GOAL_LABELS[profile.goal] ?? profile.goal : null;
  const summary = [profile.experience, goal, profile.daysPerWeek ? `${profile.daysPerWeek} days/week` : null]
    .filter(Boolean)
    .join(" · ");
  const cz = useCustomization();
  const notifCount = Object.values(prefs.notifications).filter(Boolean).length;
  const themeName = THEME_MAP[cz.equippedId("theme")]?.name ?? "default";
  const ownedCount = customizationItems.filter((i) => cz.isOwned(i.id)).length;

  const subtitle: Record<string, string> = {
    "/settings/training": summary || "set up your training profile",
    "/settings/coaching": prog.gatingEnabled ? "simple — reveal features as I train" : "full experience",
    "/settings/connections": "not connected",
    "/settings/notifications": `${notifCount} enabled`,
    "/settings/appearance": appearance.reduceMotion ? "reduced motion" : "standard motion",
    "/settings/customization": `${themeName} · ${ownedCount} unlocked`,
    "/settings/privacy": prefs.camera.formTracking ? "form tracking on" : "form tracking off",
    "/settings/account": user?.email ?? "forma web v1.0.0",
  };

  return (
    <div className="space-y-5">
      <Section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[1.05rem] lowercase text-content-primary">{name}</div>
            <div className="mt-0.5 text-[0.84rem] lowercase text-content-tertiary">
              {summary || "no training profile yet"}
            </div>
          </div>
          <Link
            to="/settings/training"
            className="focus-ring tactile rounded-pill bg-white/[0.06] px-4 py-2 text-[0.82rem] lowercase text-content-primary transition-colors hover:bg-white/[0.12]"
          >
            edit profile
          </Link>
        </div>
      </Section>

      <Section>
        {SETTINGS_CATEGORIES.map((c) => (
          <Row key={c.to} label={c.label} value={subtitle[c.to]} to={c.to} icon={c.icon} />
        ))}
      </Section>
    </div>
  );
}
