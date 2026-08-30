import { ReactNode } from "react";

/** A quiet section label for the dashboard story (Today / This week / For you…). */
export function SectionHeading({
  children,
  aside,
  className = "",
}: {
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-4 flex items-center gap-3 ${className}`}>
      <h2 className="label-instrument shrink-0 !text-[0.7rem] !tracking-[0.16em] text-content-secondary">
        {children}
      </h2>
      <span className="h-px flex-1 bg-[var(--line-soft)]" />
      {aside && <span className="shrink-0 text-[0.75rem] text-content-tertiary">{aside}</span>}
    </div>
  );
}
