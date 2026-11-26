/**
 * Breathe — box breathing (in 4 · hold 4 · out 4 · hold 4) with a circle that
 * grows and shrinks. Four breaths (~64 s), or until rest runs out.
 */
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { buzz } from "../../lib/games";
import type { GameProps } from "./GameHost";

const STEP = 4;
const BREATHS = 4;
const PHASES = [
  { label: "breathe in", scale: 1 },
  { label: "hold", scale: 1 },
  { label: "breathe out", scale: 0.55 },
  { label: "hold", scale: 0.55 },
] as const;

export function Breathe({ onDone }: GameProps) {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0); // seconds elapsed
  const done = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setTick((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const phaseIdx = Math.floor(tick / STEP) % PHASES.length;
  const breaths = Math.floor(tick / (STEP * PHASES.length));
  const phase = PHASES[phaseIdx];
  const count = STEP - (tick % STEP);

  useEffect(() => {
    if (breaths < BREATHS) buzz(8);
  }, [phaseIdx, breaths]);

  useEffect(() => {
    if (breaths >= BREATHS && !done.current) {
      done.current = true;
      onDone(BREATHS, "Heart rate down, head clear. You're ready.");
    }
  }, [breaths, onDone]);

  return (
    <div className="flex min-h-[460px] flex-col items-center justify-center gap-6">
      <div className="label-soft lowercase">breath {Math.min(breaths + 1, BREATHS)} of {BREATHS}</div>
      <div className="relative grid h-[260px] w-[260px] place-items-center">
        <div className="absolute inset-0 rounded-full border border-[var(--line-soft)]" />
        <div
          className="absolute inset-0 rounded-full border-2"
          style={{
            background: "rgba(131,233,244,0.22)",
            borderColor: "var(--accent-cyan)",
            transform: `scale(${phase.scale})`,
            transition: reduce ? "none" : `transform ${STEP}s ease-in-out`,
          }}
        />
        <div className="metric-numeral relative text-[3.5rem] tabular-nums">{count}</div>
      </div>
      <p className="text-heading text-content-primary lowercase" aria-live="polite">{phase.label}</p>
      <button
        onClick={() => {
          if (done.current) return;
          done.current = true;
          onDone(Math.max(1, breaths), "Good reset.");
        }}
        className="focus-ring tactile rounded-pill bg-white/[0.08] px-8 py-3 text-[0.95rem] lowercase text-content-primary hover:bg-white/[0.14]"
      >
        i'm ready
      </button>
    </div>
  );
}
