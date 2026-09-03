import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Dumbbell, Pause } from "lucide-react";
import { useFormaData } from "../../lib/localStore";
import { sessionElapsedLabel, sessionProgress } from "../../lib/session";

/**
 * Persistent "workout in progress" indicator (§16). The session already
 * survives navigation and reload via localStore — this just keeps it visible
 * and one tap away from anywhere in the app.
 */
export function WorkoutInProgressBar() {
  const { active } = useFormaData();
  const { pathname } = useLocation();
  const nav = useNavigate();
  const reduce = useReducedMotion();
  const [, tick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [active]);

  const hidden =
    !active ||
    pathname.startsWith("/workouts/active") ||
    pathname.startsWith("/onboarding");

  const progress = active ? sessionProgress(active) : null;

  return (
    <AnimatePresence>
      {!hidden && active && (
        <motion.button
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => nav("/workouts/active")}
          className="focus-ring tactile fixed bottom-4 left-4 right-20 z-[65] mx-auto flex max-w-max items-center gap-3 rounded-pill border border-[var(--line-soft)] bg-[var(--surface-opaque)] py-2 pl-3.5 pr-4 text-left shadow-[0_16px_40px_-14px_rgba(20,12,18,0.35)] backdrop-blur-md sm:right-auto sm:left-1/2 sm:-translate-x-1/2"
        >
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
            style={{ background: "color-mix(in srgb, var(--accent-pink) 18%, transparent)" }}
          >
            {active.paused ? (
              <Pause size={14} className="text-[var(--accent-pink)]" />
            ) : (
              <Dumbbell size={14} className="text-[var(--accent-pink)]" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[0.86rem] lowercase text-content-primary">
              {active.paused ? "workout paused" : "workout in progress"}
            </span>
            <span className="label-instrument block truncate tabular-nums">
              {active.name} · {sessionElapsedLabel(active)}
              {progress ? ` · ${progress.setsDone}/${progress.setsTotal} sets` : ""}
            </span>
          </span>
          <span className="shrink-0 rounded-pill bg-[var(--accent-pink)] px-3 py-1 text-[0.76rem] lowercase text-white">
            resume
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
