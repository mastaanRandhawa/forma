import { ReactNode } from "react";
import { Link } from "react-router-dom";

type Props = {
  label: string;
  to?: string;
  onClick?: () => void;
  /** small nested control shown on the right — defaults to a soft chevron */
  affordance?: ReactNode;
  className?: string;
};

/**
 * FloatingAction — the primary screen action as a sculptural object:
 * a wide molded capsule with a raised inner control on the trailing edge.
 * No default blue rounded button.
 */
export function FloatingAction({ label, to, onClick, affordance, className = "" }: Props) {
  const inner = (
    <>
      <span className="text-[0.98rem] font-medium lowercase tracking-[0.01em] text-content-primary">
        {label}
      </span>
      <span
        className="surface-float grid h-11 w-11 shrink-0 place-items-center text-content-primary"
        aria-hidden
      >
        {affordance ?? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        )}
      </span>
    </>
  );

  const cls = `surface-glass tactile focus-ring flex items-center justify-between gap-4 rounded-pill pl-7 pr-2 py-2 ${className}`;

  if (to) {
    return (
      <Link to={to} className={cls} aria-label={label}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} aria-label={label}>
      {inner}
    </button>
  );
}
