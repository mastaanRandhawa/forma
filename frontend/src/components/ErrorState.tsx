import { CloudOff, RotateCw } from "lucide-react";

/**
 * ErrorState — a load failure with a retry. Distinct from EmptyState (no data)
 * and the skeletons (still loading). Kept calm and small.
 */
export function ErrorState({
  message = "Something went wrong.",
  onRetry,
  className = "",
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`surface-recessed flex flex-col items-center rounded-[var(--radius-large)] px-6 py-10 text-center ${className}`}
      role="alert"
    >
      <span className="grid h-11 w-11 place-items-center rounded-pill bg-white/[0.05] text-content-tertiary">
        <CloudOff size={18} strokeWidth={1.75} />
      </span>
      <div className="mt-4 text-[0.98rem] lowercase text-content-primary">couldn't load this</div>
      <p className="mt-1.5 max-w-[34ch] text-[0.85rem] leading-relaxed text-content-secondary">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="focus-ring tactile mt-5 inline-flex items-center gap-2 rounded-pill bg-white/[0.08] px-4 py-2 text-[0.82rem] lowercase text-content-primary transition-colors hover:bg-white/[0.14]"
        >
          <RotateCw size={13} strokeWidth={2} /> try again
        </button>
      )}
    </div>
  );
}
