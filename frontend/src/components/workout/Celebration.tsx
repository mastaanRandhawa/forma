import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";

const COLORS = ["var(--accent-pink)", "var(--accent-lime)", "var(--accent-amber)", "var(--accent-cyan)", "var(--accent-mauve)"];

/**
 * A one-shot confetti burst for moments that earned it (a PR, a weekly goal,
 * a streak milestone). Decorative only: hidden from assistive tech, skipped
 * entirely for reduced-motion users, and it never blocks pointer events.
 */
export function Celebration({ pieces = 42 }: { pieces?: number }) {
  const reduce = useReducedMotion();
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => {
        const angle = (i / pieces) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 120 + Math.random() * 180;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 60,
          rotate: Math.random() * 540 - 270,
          size: 6 + Math.random() * 6,
          round: Math.random() > 0.6,
          color: COLORS[i % COLORS.length],
          delay: Math.random() * 0.12,
        };
      }),
    [pieces],
  );
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-24 z-10 flex justify-center">
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute block"
          style={{
            width: b.size,
            height: b.round ? b.size : b.size * 0.45,
            borderRadius: b.round ? 999 : 2,
            background: b.color,
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
          animate={{ x: b.x, y: [0, b.y, b.y + 220], opacity: [1, 1, 0], rotate: b.rotate, scale: 1 }}
          transition={{ duration: 1.6, delay: b.delay, ease: [0.16, 1, 0.3, 1], times: [0, 0.45, 1] }}
        />
      ))}
    </div>
  );
}
