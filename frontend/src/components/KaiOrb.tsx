import AIOrbFace from "./smoothui/ai-orb-face";
import type { AIState } from "./smoothui/ai-core";

/** Forma-tinted SmoothUI orb-face — the face of the coach, "kai". */
const KAI_COLORS = {
  body: "oklch(77% 0.17 349)",
  bodyEdge: "oklch(56% 0.19 6)",
  feature: "oklch(23% 0.05 330)",
};

export function KaiOrb({
  size = 40,
  state = "idle",
  gaze = false,
  label,
  className = "",
}: {
  size?: number;
  state?: AIState;
  gaze?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center ${className}`}
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
