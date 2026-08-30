import { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

export function PageHeader({
  eyebrow,
  title,
  ghost,
  caret,
  children,
}: {
  eyebrow?: string;
  title: string;
  /** trailing two-tone word(s), rendered in a muted tone (the Notis move) */
  ghost?: string;
  /** show a blinking text caret after the title */
  caret?: boolean;
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, ease: EASE, delay },
        };

  return (
    <header className="mb-10 flex flex-wrap items-end justify-between gap-5">
      <div>
        {eyebrow && (
          <motion.div className="label-instrument mb-2" {...rise(0)}>
            {eyebrow}
          </motion.div>
        )}
        <motion.h1
          className={`text-title text-content-primary lowercase ${caret ? "caret" : ""}`}
          {...rise(0.05)}
        >
          {title}
          {ghost && <span className="ghost"> {ghost}</span>}
        </motion.h1>
      </div>
      {children && <motion.div {...rise(0.12)}>{children}</motion.div>}
    </header>
  );
}
