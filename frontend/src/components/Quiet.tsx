import { ReactNode, useState } from "react";
import { useWidgetMode } from "../api/settings";

/**
 * Quiet — progressive disclosure for a dashboard widget.
 *
 * When the widget's effective disclosure mode is `on_interaction` the *text*
 * (labels, numbers, copy) is hidden — the rings, bars, charts and shapes stay
 * on screen, just without words. Hover / focus / tap brings the text back.
 * `always` renders straight through.
 */
export function Quiet({
  widgetKey,
  label,
  children,
  className = "",
}: {
  widgetKey: string;
  /** tiny corner tag so the widget is still identifiable while quiet */
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const mode = useWidgetMode(widgetKey);
  const [revealed, setRevealed] = useState(false);

  if (mode === "always") return <>{children}</>;

  return (
    <div
      className={`quiet group relative ${className}`}
      data-quiet={revealed ? "shown" : "hidden"}
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => setRevealed(false)}
      onFocusCapture={() => setRevealed(true)}
      onBlurCapture={() => setRevealed(false)}
      onClick={() => setRevealed((v) => v || true)}
    >
      {children}
      {!revealed && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-3 z-20 rounded-full bg-white/[0.06] px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.12em] text-content-tertiary"
        >
          {label}
        </span>
      )}
    </div>
  );
}
