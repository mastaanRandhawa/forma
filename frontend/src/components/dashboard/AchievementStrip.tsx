import { motion, useReducedMotion } from "motion/react";
import { Trophy, Flame, Calendar, Dumbbell } from "lucide-react";
import { achievements } from "../../lib/data";

const ICONS = { trophy: Trophy, flame: Flame, calendar: Calendar, dumbbell: Dumbbell } as const;
const EASE = [0.22, 1, 0.36, 1] as const;

/** Horizontally-scrolling achievement cards. Unlocked ones get a shimmer sweep. */
export function AchievementStrip() {
  const reduce = useReducedMotion();
  return (
    <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
      {achievements.map((a, i) => {
        const Icon = ICONS[a.icon];
        return (
          <motion.div
            key={a.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: EASE, delay: i * 0.05 }}
            className={`relative w-[168px] shrink-0 overflow-hidden rounded-2xl border p-4 ${
              a.unlocked
                ? "border-white/10 bg-white/[0.04]"
                : "border-white/[0.06] bg-white/[0.02]"
            }`}
          >
            {a.unlocked && !reduce && (
              <motion.span
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.14) 50%, transparent 70%)",
                }}
                initial={{ x: "-120%" }}
                whileInView={{ x: "120%" }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, ease: EASE, delay: 0.3 + i * 0.05 }}
              />
            )}
            <span
              className="grid h-8 w-8 place-items-center rounded-xl"
              style={{
                background: a.unlocked
                  ? "color-mix(in srgb, var(--accent-amber) 20%, transparent)"
                  : "rgba(255,255,255,0.05)",
                color: a.unlocked ? "var(--accent-amber)" : "var(--text-tertiary)",
              }}
            >
              <Icon size={15} strokeWidth={2} />
            </span>
            <div className="mt-3 text-[0.86rem] lowercase text-content-primary">{a.title}</div>
            <div className="num mt-0.5 text-[0.72rem] text-content-tertiary">{a.detail}</div>
            <div
              className="label-instrument mt-2 !text-[0.6rem]"
              style={{ color: a.unlocked ? "var(--accent-lime)" : "var(--text-tertiary)" }}
            >
              {a.unlocked ? `unlocked ${a.date}` : a.date}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
