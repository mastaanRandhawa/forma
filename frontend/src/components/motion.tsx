import { ReactNode } from "react";

/**
 * Stagger / Stagger.Item — a quiet mount cross-fade with a per-child delay,
 * driven entirely by CSS (no Framer Motion components, no IntersectionObserver).
 * See `.stg` in motion.css.
 */
export function Stagger({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
  /** kept for API compatibility; CSS handles the trigger */
  trigger?: "mount" | "view";
}) {
  return <div className={className}>{children}</div>;
}

function Item({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`stg ${className}`}>{children}</div>;
}
Stagger.Item = Item;

/**
 * Tactile — press feedback only, via the `.tactile` CSS class. No hover lift,
 * no JS. Passes through untouched otherwise.
 */
export function Tactile({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`tactile ${className}`}>{children}</div>;
}
