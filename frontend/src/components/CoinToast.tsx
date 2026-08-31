import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Coins } from "lucide-react";

/**
 * CoinToast — global listener for `forma:coin-earn`. Every `walletStore.earn`
 * that isn't marked `silent` fans one of these out. Stacks bottom-centre, each
 * pill self-dismisses after ~2.6s. Purely cosmetic feedback for the economy.
 */
type Toast = { id: number; amount: number; label: string };

export function CoinToast() {
  const reduce = useReducedMotion();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let seq = 0;
    const onEarn = (e: Event) => {
      const detail = (e as CustomEvent).detail as { amount: number; label: string };
      const id = ++seq;
      setToasts((t) => [...t, { id, amount: detail.amount, label: detail.label }].slice(-4));
      window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
    };
    window.addEventListener("forma:coin-earn", onEarn as EventListener);
    return () => window.removeEventListener("forma:coin-earn", onEarn as EventListener);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex flex-col items-center gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className="flex items-center gap-2.5 rounded-pill border border-[var(--accent-amber)]/30 bg-[color-mix(in_oklab,var(--background)_88%,transparent)] px-4 py-2.5 shadow-[0_18px_46px_-16px_rgba(0,0,0,0.7)] backdrop-blur-md"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--accent-amber)]/15">
              <Coins size={13} strokeWidth={2.4} className="text-[var(--accent-amber)]" />
            </span>
            <span className="num text-[0.95rem] font-semibold tabular-nums text-[var(--accent-amber)]">
              +{t.amount}
            </span>
            <span className="text-[0.82rem] lowercase text-content-secondary">{t.label}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
