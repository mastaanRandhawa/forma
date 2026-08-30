import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * DetailDrawer — a bottom sheet for card deep-dives. Backdrop-click / Escape /
 * close-button dismiss, focus moves in on open and restores on close, body
 * scroll locked while open. Reduced-motion → fade only.
 */
export function DetailDrawer({
  open,
  onClose,
  title,
  eyebrow,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // focus the panel
    const t = window.setTimeout(() => panelRef.current?.focus(), 20);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-[rgba(8,3,7,0.62)] backdrop-blur-[3px]"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className="focus-ring relative z-10 max-h-[88dvh] w-full overflow-y-auto rounded-t-[28px] border border-white/10 bg-[var(--surface-opaque)] p-6 shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.7)] sm:max-w-[540px] sm:rounded-[28px] sm:p-7"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 48 }}
            transition={{ duration: 0.32, ease: EASE }}
          >
            <span
              aria-hidden
              className="mx-auto mb-4 block h-1 w-9 rounded-full bg-white/15 sm:hidden"
            />
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                {eyebrow && <div className="label-instrument mb-1">{eyebrow}</div>}
                <h2 className="text-[1.35rem] font-light lowercase text-content-primary">{title}</h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="metric-card__action !h-8 !w-8"
              >
                <X size={15} strokeWidth={2.25} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
