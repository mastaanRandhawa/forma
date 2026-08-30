import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";

/**
 * ScrollProgress — a hairline bar pinned to the very top of the viewport that
 * fills left-to-right as the page scrolls. Driven entirely by a motion value
 * (no React re-renders per frame); the spring gives it a little weight.
 * Distinct from RouteProgress, which is the route-loading trickle bar.
 */
export function ScrollProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] origin-left"
      style={{
        scaleX: reduce ? scrollYProgress : scaleX,
        background:
          "linear-gradient(90deg, var(--accent-purple), var(--accent-pink) 55%, var(--accent-coral))",
        boxShadow: "0 0 12px -1px rgba(213,26,122,0.55)",
      }}
    />
  );
}
