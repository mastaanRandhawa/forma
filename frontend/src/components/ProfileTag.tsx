import type { LucideIcon } from "lucide-react";
import { Gem, Sparkle, Star, Zap } from "lucide-react";
import { useEquippedItem } from "../lib/customization";

const BADGES: Record<string, LucideIcon> = {
  "bd-spark": Sparkle,
  "bd-bolt": Zap,
  "bd-star": Star,
  "bd-diamond": Gem,
};

/** The equipped profile badge, shown right after the user's name. */
export function ProfileBadge({ size = 15 }: { size?: number }) {
  const badge = useEquippedItem("badge");
  const Icon = badge ? BADGES[badge.id] : undefined;
  if (!Icon || !badge) return null;
  return (
    <span title={badge.name} data-testid="profile-badge" className="ml-1.5 inline-flex align-baseline text-[var(--accent-amber)]">
      <Icon size={size} strokeWidth={2} aria-label={badge.name} />
    </span>
  );
}

/** The equipped profile title, shown under the user's name. */
export function ProfileTitle({ className = "" }: { className?: string }) {
  const title = useEquippedItem("title");
  if (!title || title.id === "ti-none") return null;
  return (
    <div data-testid="profile-title" className={`label-instrument text-[var(--accent-amber)] ${className}`}>
      {title.name}
    </div>
  );
}
