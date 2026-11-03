import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useEquippedItem } from "../../lib/customization";

const COLORS = ["var(--accent-pink)", "var(--accent-lime)", "var(--accent-amber)", "var(--accent-cyan)", "var(--accent-mauve)"];
const GOLD = ["#F5C63C", "#FFD966", "#E0A820", "#FFEFA8"];
const SPARK = ["#FFF3C4", "#FFD166", "#FF9F40", "#FFFFFF"];

type Bit = {
  x: number;
  y: number;
  size: number;
  round: boolean;
  rotate: number;
  color: string;
  delay: number;
  duration: number;
  /** how far the piece falls after it peaks */
  fall: number;
  coin?: boolean;
};

/** Where every piece of each store celebration goes. */
const VARIANTS: Record<string, (i: number, pieces: number) => Bit> = {
  // the classic burst
  "cl-confetti": (i, pieces) => {
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
      duration: 1.6,
      fall: 220,
    };
  },
  // fast, small and hot, thrown up and burning out quickly
  "cl-sparks": (i) => {
    const spread = (Math.random() - 0.5) * 1.6;
    const dist = 170 + Math.random() * 220;
    return {
      x: Math.sin(spread) * dist,
      y: -Math.cos(spread) * dist,
      rotate: 0,
      size: 2.5 + Math.random() * 3,
      round: true,
      color: SPARK[i % SPARK.length],
      delay: Math.random() * 0.25,
      duration: 1,
      fall: 60,
    };
  },
  // coins pour down across the full width
  "cl-coins": (i) => ({
    x: (Math.random() - 0.5) * 460,
    y: -40 - Math.random() * 60,
    rotate: Math.random() * 720 - 360,
    size: 11 + Math.random() * 7,
    round: true,
    color: GOLD[i % GOLD.length],
    delay: Math.random() * 0.9,
    duration: 1.8,
    fall: 460,
    coin: true,
  }),
  // three separate rings of light going off overhead
  "cl-fireworks": (i, pieces) => {
    const shells = [
      { x: -130, y: -90, color: "var(--accent-cyan)", delay: 0 },
      { x: 130, y: -130, color: "var(--accent-pink)", delay: 0.35 },
      { x: 10, y: -30, color: "#F5C63C", delay: 0.7 },
    ];
    const shell = shells[i % shells.length];
    const perShell = Math.ceil(pieces / shells.length);
    const angle = ((i % perShell) / perShell) * Math.PI * 2;
    const dist = 80 + Math.random() * 28;
    return {
      x: shell.x + Math.cos(angle) * dist,
      y: shell.y + Math.sin(angle) * dist,
      rotate: 0,
      size: 3.5 + Math.random() * 2.5,
      round: true,
      color: shell.color,
      delay: shell.delay,
      duration: 1.4,
      fall: 70,
    };
  },
};

/**
 * A one-shot burst for moments that earned it (a PR, a weekly goal, a streak
 * milestone), in whichever style is equipped from the store. Decorative only:
 * hidden from assistive tech, skipped entirely for reduced-motion users, and it
 * never blocks pointer events.
 */
export function Celebration({ pieces = 42, variant }: { pieces?: number; variant?: string }) {
  const reduce = useReducedMotion();
  const equipped = useEquippedItem("celebration")?.id;
  const style = variant ?? equipped ?? "cl-confetti";
  const bits = useMemo(() => {
    const make = VARIANTS[style] ?? VARIANTS["cl-confetti"];
    return Array.from({ length: pieces }, (_, i) => make(i, pieces));
  }, [pieces, style]);
  if (reduce) return null;
  return (
    <div aria-hidden data-celebration={style} className="pointer-events-none absolute inset-x-0 top-24 z-10 flex justify-center">
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute block"
          style={{
            width: b.size,
            height: b.round ? b.size : b.size * 0.45,
            borderRadius: b.round ? 999 : 2,
            background: b.color,
            boxShadow: b.coin ? "inset 0 0 0 1.5px rgba(138,106,24,0.7)" : style === "cl-confetti" ? undefined : `0 0 8px ${b.color}`,
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
          animate={{ x: b.x, y: [0, b.y, b.y + b.fall], opacity: [1, 1, 0], rotate: b.rotate, scale: 1 }}
          transition={{ duration: b.duration, delay: b.delay, ease: [0.16, 1, 0.3, 1], times: [0, 0.45, 1] }}
        />
      ))}
    </div>
  );
}
