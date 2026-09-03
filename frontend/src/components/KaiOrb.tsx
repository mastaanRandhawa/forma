import AIOrbFace from "./smoothui/ai-orb-face";
import type { AIState } from "./smoothui/ai-core";
import type { Dashboard } from "../api/types";
import { useEquippedItem } from "../lib/customization";

/**
 * Kai's face palette per equipped "look" (customization slot `avatar`, ids from
 * `data.ts` avatarItems). `body`/`bodyEdge` drive the orb gradient, `feature`
 * the eyes + mouth, `glow` the soft halo behind it.
 */
type LookColors = { body: string; bodyEdge: string; feature: string; glow: string };

const LOOKS: Record<string, LookColors> = {
  "l-signature": { body: "oklch(77% 0.17 349)", bodyEdge: "oklch(56% 0.19 6)", feature: "oklch(23% 0.05 330)", glow: "rgba(240,108,176,0.45)" },
  "l-aurora": { body: "oklch(80% 0.13 320)", bodyEdge: "oklch(64% 0.15 230)", feature: "oklch(24% 0.05 300)", glow: "rgba(131,233,244,0.42)" },
  "l-ember": { body: "oklch(80% 0.15 45)", bodyEdge: "oklch(60% 0.18 28)", feature: "oklch(24% 0.05 40)", glow: "rgba(255,140,90,0.44)" },
  "l-frost": { body: "oklch(87% 0.07 235)", bodyEdge: "oklch(66% 0.13 245)", feature: "oklch(28% 0.04 250)", glow: "rgba(120,199,255,0.4)" },
  "l-nebula": { body: "oklch(72% 0.16 300)", bodyEdge: "oklch(48% 0.18 330)", feature: "oklch(22% 0.05 310)", glow: "rgba(156,123,255,0.42)" },
  "l-jade": { body: "oklch(80% 0.14 165)", bodyEdge: "oklch(55% 0.13 168)", feature: "oklch(23% 0.05 170)", glow: "rgba(79,214,166,0.4)" },
  "l-mono": { body: "oklch(84% 0.008 260)", bodyEdge: "oklch(52% 0.015 260)", feature: "oklch(26% 0.01 260)", glow: "rgba(200,200,210,0.34)" },
  "l-gold": { body: "oklch(86% 0.12 92)", bodyEdge: "oklch(62% 0.13 74)", feature: "oklch(26% 0.05 80)", glow: "rgba(245,198,60,0.4)" },
  "l-holo": { body: "oklch(82% 0.13 320)", bodyEdge: "oklch(68% 0.16 200)", feature: "oklch(24% 0.05 300)", glow: "rgba(180,150,255,0.42)" },
};

export const DEFAULT_LOOK = "l-signature";
export const kaiLook = (id?: string): LookColors => LOOKS[id ?? ""] ?? LOOKS[DEFAULT_LOOK];

/**
 * Kai's expression from how the week is going. Happy ("done") when on track;
 * a searching "thinking" look when the user is behind pace, under-recovered or
 * has let the streak lapse.
 */
export function coachMood(d: Dashboard | null | undefined): AIState {
  if (!d) return "done";
  const pace = d.weeklyRing.target ? d.weeklyRing.done / d.weeklyRing.target : 1;
  const behind = pace < 0.4 || d.readiness < 55 || d.streakDays === 0;
  return behind ? "thinking" : "done";
}

export function KaiOrb({
  size = 40,
  state = "done",
  gaze = false,
  label,
  className = "",
  breathe = true,
  look,
}: {
  size?: number;
  state?: AIState;
  gaze?: boolean;
  label?: string;
  className?: string;
  breathe?: boolean;
  /** avatar id override — recolours the whole orb. Defaults to the equipped look. */
  look?: string;
}) {
  const equipped = useEquippedItem("avatar")?.id;
  const c = kaiLook(look ?? equipped);
  const animClass = !breathe
    ? ""
    : state === "thinking"
    ? "kai-thinking"
    : "kai-breathing";

  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center ${animClass} ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${c.glow}, transparent 70%)`,
          filter: "blur(6px)",
        }}
      />
      <AIOrbFace
        aria-label={label}
        size={size}
        state={state}
        gaze={gaze}
        colors={{ body: c.body, bodyEdge: c.bodyEdge, feature: c.feature }}
        className="relative"
      />
    </span>
  );
}
