import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const COLORS = ["#D51A7A", "#FF6B4A", "#FFB661", "#B4DF4C", "#83E9F4", "#B36596"];

/**
 * Celebrate — a single, tasteful particle burst. Fires once when `fire` flips
 * true. Silent under prefers-reduced-motion (the caller still shows a glow /
 * checkmark). Absolutely positioned; place inside a `relative` parent.
 */
export function Celebrate({ fire }: { fire: boolean }) {
  const reduce = useReducedMotion();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (fire && !done) {
      const t = setTimeout(() => setDone(true), 1100);
      return () => clearTimeout(t);
    }
  }, [fire, done]);

  if (!fire || done || reduce) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-visible" aria-hidden>
      {Array.from({ length: 14 }).map((_, i) => {
        const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.5;
        const dist = 42 + Math.random() * 46;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-[1px]"
            style={{ background: COLORS[i % COLORS.length] }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              opacity: 0,
              scale: 0.4,
              rotate: Math.random() * 220 - 110,
            }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        );
      })}
    </div>
  );
}
