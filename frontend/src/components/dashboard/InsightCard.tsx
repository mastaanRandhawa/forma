import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Moon, Activity, Sparkles, X, HelpCircle } from "lucide-react";
import type { CardTone } from "../health/MetricCard";

const ICONS = {
  moon: Moon,
  activity: Activity,
  sparkles: Sparkles,
} as const;

const TONE: Record<CardTone, string> = {
  pink: "var(--accent-pink)",
  cyan: "var(--accent-cyan)",
  lime: "var(--accent-lime)",
  amber: "var(--accent-amber)",
  mauve: "var(--accent-mauve)",
  violet: "var(--accent-blue)",
};

const EASE = [0.22, 1, 0.36, 1] as const;

type Insight = {
  id: string;
  tone: CardTone;
  icon: keyof typeof ICONS;
  text: string;
  actions?: string[];
};

/**
 * InsightCard — a personalised, actionable observation. A calm, neutral card:
 * the tone shows only in the left rail and the glyph, never as a coloured edge
 * around the whole card.
 */
export function InsightCard({ insight }: { insight: Insight }) {
  const reduce = useReducedMotion();
  const [dismissed, setDismissed] = useState(false);
  const Icon = ICONS[insight.icon] ?? Sparkles;
  const accent = TONE[insight.tone] ?? "var(--accent-pink)";

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          layout
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.32, ease: EASE }}
          className="group relative flex gap-3.5 overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-4"
        >
          <span
            aria-hidden
            className="absolute inset-y-3 left-0 w-[3px] rounded-full"
            style={{ background: accent }}
          />
          <span
            className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl"
            style={{
              background: `color-mix(in srgb, ${accent} 18%, transparent)`,
              color: accent,
            }}
          >
            <Icon size={16} strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.9rem] leading-relaxed text-content-primary">{insight.text}</p>
            {insight.actions && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {insight.actions.map((a) => {
                  const isDismiss = /dismiss/i.test(a);
                  const isWhy = /why/i.test(a);
                  return (
                    <button
                      key={a}
                      onClick={() => isDismiss && setDismissed(true)}
                      className="focus-ring tactile inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[0.76rem] text-content-secondary transition-colors hover:border-white/20 hover:text-content-primary"
                    >
                      {isWhy && <HelpCircle size={12} strokeWidth={2} />}
                      {isDismiss && <X size={12} strokeWidth={2.25} />}
                      {a}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
