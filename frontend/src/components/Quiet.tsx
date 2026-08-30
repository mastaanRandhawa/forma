import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useWidgetMode } from "../api/settings";

/**
 * Quiet — progressive disclosure for a dashboard widget.
 *
 * When the widget's mode is `on_interaction` the *values* are hidden — the
 * widget's title stays put, and the rings / bars / chart shapes stay on
 * screen, just without numbers or copy. Hover / focus / tap eases the text in;
 * it lingers for a second after the pointer leaves before fading back.
 * `always` renders straight through.
 */
const LINGER_MS = 1000;

export function Quiet({
  widgetKey,
  children,
  className = "",
}: {
  widgetKey: string;
  children: ReactNode;
  className?: string;
}) {
  const mode = useWidgetMode(widgetKey);
  const [revealed, setRevealed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const reveal = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setRevealed(true);
  }, []);
  const scheduleHide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setRevealed(false), LINGER_MS);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (mode === "always") return <>{children}</>;

  return (
    <div
      className={`quiet group relative ${className}`}
      data-quiet={revealed ? "shown" : "hidden"}
      onMouseEnter={reveal}
      onMouseLeave={scheduleHide}
      onFocusCapture={reveal}
      onBlurCapture={scheduleHide}
      onPointerDown={reveal}
    >
      {children}
    </div>
  );
}
