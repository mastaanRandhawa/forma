import { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

const TAGS = {
  div: motion.div,
  section: motion.section,
  li: motion.li,
  ul: motion.ul,
  p: motion.p,
  header: motion.header,
  aside: motion.aside,
} as const;

/**
 * Reveal — fade + slight slide-up. Animates on mount by default (reliable for
 * dashboards); pass `onView` for long scroll pages where sections should wait
 * until they enter the viewport. Honours prefers-reduced-motion.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  y = 14,
  as = "div",
  onView = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: keyof typeof TAGS;
  onView?: boolean;
}) {
  const reduce = useReducedMotion();
  const M = TAGS[as];
  const hidden = reduce ? { opacity: 0 } : { opacity: 0, y };
  const shown = { opacity: 1, y: 0 };
  return (
    <M
      className={className}
      initial={hidden}
      {...(onView
        ? { whileInView: shown, viewport: { once: true, margin: "0px 0px -10% 0px" } }
        : { animate: shown })}
      transition={{ duration: 0.5, ease: EASE, delay }}
    >
      {children}
    </M>
  );
}
