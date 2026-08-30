import { CSSProperties, useEffect, useRef } from "react";
import { tween, usePrefersReducedMotion } from "../../lib/motion";

/**
 * CountUp — eases a number 0 -> value once on mount, writing straight to the DOM
 * (no React re-render per frame). A hidden sizer holds the final value so the
 * box never resizes and nothing beside it shifts.
 */
export function CountUp({
  value,
  duration = 1,
  className = "",
  style,
  format = (n) => String(Math.round(n)),
}: {
  value: number;
  duration?: number;
  className?: string;
  style?: CSSProperties;
  format?: (n: number) => string;
}) {
  const reduce = usePrefersReducedMotion();
  const out = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = out.current;
    if (!el) return;
    if (reduce) {
      el.textContent = format(value);
      return;
    }
    return tween(0, value, duration * 1000, (v) => {
      el.textContent = format(v);
    });
  }, [value, duration, reduce, format]);

  return (
    <span className={`inline-grid tabular-nums ${className}`} style={style}>
      <span className="invisible col-start-1 row-start-1" aria-hidden>
        {format(value)}
      </span>
      <span ref={out} className="col-start-1 row-start-1">
        {format(0)}
      </span>
    </span>
  );
}
