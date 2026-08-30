import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import type { FeatureKey } from "../api/types";
import { useProgression } from "../api/settings";

const REQUIREMENT: Partial<Record<FeatureKey, string>> = {
  body_map: "Finish your first workout to unlock the muscle map.",
  progress_basic: "Finish your first workout to start tracking progress.",
  goals: "Finish 2 workouts (or train 3 days) to start setting goals.",
  programs: "Finish 3 workouts to build multi-week programs.",
  progress_advanced: "Finish 5 workouts to see strength curves and records.",
  achievements: "Earn your first PR or badge to open achievements.",
  store: "Unlock achievements first — then the Kai store opens.",
  insights: "Finish 4 workouts and Kai starts sending proactive insights.",
  voice_chat: "Send 10 messages to Kai to turn on voice mode.",
};

/** Full-screen "not unlocked yet" state for a gated route. */
export function LockedScreen({ feature }: { feature: FeatureKey }) {
  return (
    <div className="mx-auto grid min-h-[52vh] max-w-[440px] place-items-center text-center">
      <div className="surface-recessed flex flex-col items-center rounded-[var(--radius-large)] px-7 py-12">
        <span className="grid h-12 w-12 place-items-center rounded-pill bg-white/[0.05] text-content-tertiary">
          <Lock size={18} strokeWidth={1.75} />
        </span>
        <div className="mt-4 text-[1.05rem] lowercase text-content-primary">not unlocked yet</div>
        <p className="mt-2 text-[0.88rem] leading-relaxed text-content-secondary">
          {REQUIREMENT[feature] ?? "Keep training — this unlocks as you go."}
        </p>
        <Link
          to="/dashboard"
          className="focus-ring tactile mt-6 rounded-pill bg-white/[0.08] px-4 py-2 text-[0.82rem] lowercase text-content-primary transition-colors hover:bg-white/[0.14]"
        >
          back to home
        </Link>
        <Link
          to="/settings"
          className="mt-3 inline-flex items-center gap-1.5 text-[0.76rem] lowercase text-content-tertiary transition-colors hover:text-content-secondary"
        >
          <Sparkles size={12} strokeWidth={2} /> show me everything instead
        </Link>
      </div>
    </div>
  );
}

/** Wrap a route element; renders <LockedScreen> until `feature` is unlocked. */
export function FeatureGate({ feature, children }: { feature: FeatureKey; children: ReactNode }) {
  const { has } = useProgression();
  return has(feature) ? <>{children}</> : <LockedScreen feature={feature} />;
}
