import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useWidgetMode } from "../api/settings";

/**
 * Quiet — progressive disclosure for a dashboard widget.
 *
 * When the widget's mode is `on_interaction` the *values* are hidden — the
 * widget's title stays put and the rings / bars / chart shapes stay on screen,
 * just without numbers or copy.
 *
 * - pointer devices: hover / focus / tap reveals; it lingers ~1s after leaving.
 * - touch devices: the widget reveals while it sits near the vertical centre of
 *   the screen, and fades back as it scrolls away.
 *
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
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const reveal = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setRevealed(true);
  }, []);
  const scheduleHide = useCallback((ms = LINGER_MS) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setRevealed(false), ms);
  }, []);

  // touch / no-hover: reveal while the widget sits near the vertical centre of
  // the screen, and fade back as it scrolls away
  useEffect(() => {
    if (mode === "always" || !ref.current) return;
    const coarse =
      typeof window !== "undefined" && (window.matchMedia?.("(hover: none)").matches ?? false);
    if (!coarse) return;

    const el = ref.current;
    const check = () => {
      const r = el.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      const near = Math.abs(mid - window.innerHeight / 2) < window.innerHeight * 0.22;
      if (near) reveal();
      else scheduleHide(260);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [mode, reveal, scheduleHide]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  if (mode === "always") return <>{children}</>;

  return (
    <div
      ref={ref}
      className={`quiet group relative ${className}`}
      data-quiet={revealed ? "shown" : "hidden"}
      onMouseEnter={reveal}
      onMouseLeave={() => scheduleHide()}
      onFocusCapture={reveal}
      onBlurCapture={() => scheduleHide()}
      onPointerDown={reveal}
    >
      {children}
    </div>
  );
}
