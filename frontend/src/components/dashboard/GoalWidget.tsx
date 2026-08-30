import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, Flame } from "lucide-react";
import { RingProgress } from "../health/ProgressIndicator";
import { Celebrate } from "./Celebrate";
import type { Goal, GoalTone } from "../../lib/data";

const TONE_COLOR: Record<GoalTone, string> = {
  pink: "var(--accent-pink)",
  cyan: "var(--accent-cyan)",
  lime: "var(--accent-lime)",
  amber: "var(--accent-amber)",
  mauve: "var(--accent-mauve)",
  violet: "var(--accent-blue)",
};

const EASE = [0.22, 1, 0.36, 1] as const;

function fmt(n: number) {
  return n >= 1000 ? n.toLocaleString() : n % 1 === 0 ? String(n) : n.toFixed(1);
}

/** One goal — ring + progress + ETA + streak, with a completion state. */
export function GoalWidget({ goal }: { goal: Goal }) {
  const reduce = useReducedMotion();
  const fraction = Math.min(1, goal.value / goal.max);
  const complete = goal.value >= goal.max;
  const color = complete ? "var(--accent-lime)" : TONE_COLOR[goal.tone];

  // fire the burst once, the first time a complete goal is rendered this session
  const [fire, setFire] = useState(false);
  const firedRef = useRef(false);
  useEffect(() => {
    if (complete && !firedRef.current) {
      firedRef.current = true;
      const t = setTimeout(() => setFire(true), 250);
      return () => clearTimeout(t);
    }
  }, [complete]);

  return (
    <div className="relative flex items-center gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5">
      <Celebrate fire={fire} />
      <div className="relative shrink-0">
        <RingProgress fraction={fraction} size={44} color={color} ariaLabel={`${goal.label} ${Math.round(fraction * 100)}%`} />
        {complete && (
          <motion.span
            className="absolute inset-0 grid place-items-center"
            initial={reduce ? { opacity: 1 } : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: EASE, delay: 0.2 }}
          >
            <Check size={16} strokeWidth={3} color="var(--accent-lime)" />
          </motion.span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[0.88rem] lowercase text-content-primary">{goal.label}</span>
          <span className="num text-[0.78rem] text-content-secondary">
            {fmt(goal.value)}
            <span className="opacity-55"> / {fmt(goal.max)} {goal.unit}</span>
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-2.5">
          <span
            className="num text-[0.72rem]"
            style={{ color: complete ? "var(--accent-lime)" : "var(--text-tertiary)" }}
          >
            {goal.eta}
          </span>
          <span className="flex items-center gap-0.5 text-[0.72rem] text-content-tertiary">
            <Flame size={11} strokeWidth={2} className="text-[var(--accent-amber)]" />
            {goal.streak}
          </span>
        </div>
      </div>
    </div>
  );
}
