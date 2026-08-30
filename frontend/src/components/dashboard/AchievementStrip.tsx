import { motion, useReducedMotion } from "motion/react";
import { Trophy, Flame, Calendar, Dumbbell, Medal } from "lucide-react";
import { Skel } from "../skeleton/Skeleton";
import { EmptyState } from "../EmptyState";
import { ErrorState } from "../ErrorState";
import { useAchievements, errorMessage } from "../../api/hooks";

const ICONS: Record<string, typeof Trophy> = {
  trophy: Trophy, flame: Flame, calendar: Calendar, dumbbell: Dumbbell, medal: Medal,
};
const EASE = [0.22, 1, 0.36, 1] as const;

/** Horizontally-scrolling achievement cards. Unlocked ones get a shimmer sweep. */
export function AchievementStrip() {
  const reduce = useReducedMotion();
  const { data, error, initialLoading, refetch } = useAchievements();

  if (initialLoading) {
    return (
      <div className="flex gap-3">
        {[0, 1, 2].map((i) => (
          <Skel key={i} className="h-[124px] w-[168px] shrink-0 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (error && !data) {
    return <ErrorState message={errorMessage(error)} onRetry={refetch} className="!py-6" />;
  }
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="no badges yet"
        body="finish workouts, hit goals and set PRs — they'll show up here as you go."
        icon={<Medal size={18} strokeWidth={1.75} />}
        className="!py-8"
      />
    );
  }

  return (
    <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
      {data.map((a, i) => {
        const Icon = ICONS[a.icon] ?? Trophy;
        const unlocked = a.unlockedAt != null;
        return (
          <motion.div
            key={a.key}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: EASE, delay: i * 0.05 }}
            className={`relative w-[168px] shrink-0 overflow-hidden rounded-2xl border p-4 ${
              unlocked ? "border-white/10 bg-white/[0.04]" : "border-white/[0.06] bg-white/[0.02]"
            }`}
          >
            {unlocked && !reduce && (
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
                background: unlocked
                  ? "color-mix(in srgb, var(--accent-amber) 20%, transparent)"
                  : "rgba(255,255,255,0.05)",
                color: unlocked ? "var(--accent-amber)" : "var(--text-tertiary)",
              }}
            >
              <Icon size={15} strokeWidth={2} />
            </span>
            <div className="mt-3 text-[0.86rem] lowercase text-content-primary">{a.title}</div>
            <div className="num mt-0.5 text-[0.72rem] text-content-tertiary">{a.detail}</div>
            <div
              className="label-instrument mt-2 !text-[0.6rem]"
              style={{ color: unlocked ? "var(--accent-lime)" : "var(--text-tertiary)" }}
            >
              {unlocked
                ? `unlocked ${new Date(a.unlockedAt as string).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                : a.targetValue
                  ? `${Math.round(a.progress * 100)}% there`
                  : "in progress"}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
