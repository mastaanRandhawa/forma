import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

/** A titled card that groups related settings on a focused screen. */
export function Section({
  title,
  description,
  children,
  className = "",
}: {
  title?: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`surface-soft p-5 sm:p-6 ${className}`}>
      {title && <h2 className="label-soft lowercase">{title}</h2>}
      {description && (
        <p className="mt-2 text-[0.85rem] leading-relaxed text-content-secondary">{description}</p>
      )}
      <div className={title || description ? "mt-3" : ""}>{children}</div>
    </section>
  );
}

/**
 * A navigation / summary row — label with a current-state subtitle and a
 * chevron. Renders as a link (category navigation) or a button (opens an editor).
 */
export function Row({
  label,
  value,
  to,
  onClick,
  icon,
}: {
  label: string;
  value?: ReactNode;
  to?: string;
  onClick?: () => void;
  icon?: ReactNode;
}) {
  const inner = (
    <>
      <span className="flex min-w-0 items-center gap-3">
        {icon && <span className="shrink-0 text-content-tertiary">{icon}</span>}
        <span className="min-w-0">
          <span className="block text-[0.92rem] lowercase text-content-primary">{label}</span>
          {value != null && (
            <span className="mt-0.5 block truncate text-[0.82rem] lowercase text-content-tertiary">
              {value}
            </span>
          )}
        </span>
      </span>
      <ChevronRight size={16} strokeWidth={2} className="shrink-0 text-content-tertiary" />
    </>
  );
  const cls =
    "focus-ring tactile flex w-full items-center justify-between gap-4 border-t border-[var(--line-soft)] py-3.5 text-left first:border-t-0 hover:bg-white/[0.02]";
  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
