import { NavLink } from "react-router-dom";
import { Bell, Palette, ShieldCheck, Sparkles, UserRound, Watch, CircleUser, Shapes } from "lucide-react";

const ICON = { size: 17, strokeWidth: 1.75 } as const;

export const SETTINGS_CATEGORIES = [
  { to: "/settings/training", label: "profile & training", icon: <UserRound {...ICON} /> },
  { to: "/settings/coaching", label: "forma coach", icon: <Sparkles {...ICON} /> },
  { to: "/settings/connections", label: "connected apps", icon: <Watch {...ICON} /> },
  { to: "/settings/notifications", label: "notifications", icon: <Bell {...ICON} /> },
  { to: "/settings/appearance", label: "appearance", icon: <Palette {...ICON} /> },
  { to: "/settings/customization", label: "customization", icon: <Shapes {...ICON} /> },
  { to: "/settings/privacy", label: "privacy & data", icon: <ShieldCheck {...ICON} /> },
  { to: "/settings/account", label: "account & support", icon: <CircleUser {...ICON} /> },
];

/** Persistent category rail for the settings layout (desktop). */
export function SettingsNav() {
  return (
    <nav aria-label="Settings categories" className="flex flex-col gap-0.5">
      {SETTINGS_CATEGORIES.map((c) => (
        <NavLink
          key={c.to}
          to={c.to}
          className={({ isActive }) =>
            `focus-ring tactile flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-[0.86rem] lowercase transition-colors ${
              isActive
                ? "surface-recessed text-content-primary"
                : "text-content-tertiary hover:text-content-secondary"
            }`
          }
        >
          {c.icon}
          {c.label}
        </NavLink>
      ))}
    </nav>
  );
}
