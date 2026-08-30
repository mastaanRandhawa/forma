import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Moon, Activity, Sparkles, X, HelpCircle } from "lucide-react";
import type { CardTone } from "../health/MetricCard";

const ICONS = {
  moon: Moon,
  activity: Activity,
  sparkles: Sparkles,
} as const;

const EASE = [0.22, 1, 0.36, 1] as const;

type Insight = {
  id: string;
  tone: CardTone;
  icon: keyof typeof ICONS;
  text: string;
  actions?: string[];
};

/**
 * InsightCard — a personalised, actionable observation. Deliberately styled
 * apart from the metric cards: a lit left rail, a small tinted glyph, plain
 * language, and action chips. Dismissable.
 */
export function InsightCard({ insight }: { insight: Insight }) {
  const reduce = useReducedMotion();
  const [dismissed, setDismissed] = useState(false);
  const Icon = ICONS[insight.icon] ?? Sparkles;

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          layout
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.32, ease: EASE }}
          data-tone={insight.tone}
          data-variant="glow"
          className="metric-card group relative flex gap-3.5 !rounded-[24px] !p-4"
        >
          <span
            aria-hidden
            className="absolute inset-y-3 left-0 w-[3px] rounded-full"
            style={{ background: "var(--tone-color)" }}
          />
          <span
            className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl"
            style={{
              background: "color-mix(in srgb, var(--tone-color) 20%, transparent)",
              color: "var(--tone-color)",
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
