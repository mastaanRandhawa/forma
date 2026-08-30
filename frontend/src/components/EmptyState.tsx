import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Inbox } from "lucide-react";

type Props = {
  title: string;
  body?: string;
  icon?: ReactNode;
  action?: { label: string; to: string } | { label: string; onClick: () => void };
  className?: string;
};

/**
 * EmptyState — a calm placeholder for lists/sections with no data yet.
 * Not an error, not a spinner: a soft recessed panel with one clear next step.
 */
export function EmptyState({ title, body, icon, action, className = "" }: Props) {
  return (
    <div
      className={`surface-recessed flex flex-col items-center rounded-[var(--radius-large)] px-6 py-10 text-center ${className}`}
    >
      <span className="grid h-11 w-11 place-items-center rounded-pill bg-white/[0.05] text-content-tertiary">
        {icon ?? <Inbox size={18} strokeWidth={1.75} />}
      </span>
      <div className="mt-4 text-[0.98rem] lowercase text-content-primary">{title}</div>
      {body && (
        <p className="mt-1.5 max-w-[34ch] text-[0.85rem] leading-relaxed text-content-secondary">
          {body}
        </p>
      )}
      {action &&
        ("to" in action ? (
          <Link
            to={action.to}
            className="focus-ring tactile mt-5 rounded-pill bg-white/[0.08] px-4 py-2 text-[0.82rem] lowercase text-content-primary transition-colors hover:bg-white/[0.14]"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="focus-ring tactile mt-5 rounded-pill bg-white/[0.08] px-4 py-2 text-[0.82rem] lowercase text-content-primary transition-colors hover:bg-white/[0.14]"
          >
            {action.label}
          </button>
        ))}
    </div>
  );
}
