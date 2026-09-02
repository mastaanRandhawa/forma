import AIOrbFace from "./smoothui/ai-orb-face";
import type { AIState } from "./smoothui/ai-core";
import type { Dashboard } from "../api/types";

/** Forma-tinted SmoothUI orb-face — the face of the coach, "kai". */
const KAI_COLORS = {
  body: "oklch(77% 0.17 349)",
  bodyEdge: "oklch(56% 0.19 6)",
  feature: "oklch(23% 0.05 330)",
};

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
}: {
  size?: number;
  state?: AIState;
  gaze?: boolean;
  label?: string;
  className?: string;
  breathe?: boolean;
}) {
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
          background:
            "radial-gradient(circle at 50% 45%, rgba(240,108,176,0.45), transparent 70%)",
          filter: "blur(6px)",
        }}
      />
      <AIOrbFace
        aria-label={label}
        size={size}
        state={state}
        gaze={gaze}
        colors={KAI_COLORS}
        className="relative"
      />
    </span>
  );
}
