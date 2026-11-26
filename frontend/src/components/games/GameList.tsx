/** Game cards (hub + rest picker) and the daily-challenge banner. */
import { Activity, Dumbbell, Leaf, Play, Star, Zap } from "lucide-react";
import { dailyChallenge, GAME_MAP, GAMES, today, useGameStats, type GameId } from "../../lib/games";

const TINT: Record<GameId, string> = {
  plates: "var(--accent-lime)",
  reflex: "var(--accent-cyan)",
  muscles: "var(--accent-amber)",
  breathe: "var(--accent-jade)",
};
const ICON: Record<GameId, typeof Dumbbell> = { plates: Dumbbell, reflex: Zap, muscles: Activity, breathe: Leaf };

/** `restLeft` (seconds): games that won't finish in time are dimmed and labelled. */
export function GameList({ onPick, restLeft }: { onPick: (id: GameId) => void; restLeft?: number }) {
  const { bests } = useGameStats();
  return (
    <div className="space-y-3">
      {GAMES.map((g) => {
        const best = bests[g.id];
        const tooLong = restLeft != null && g.fit > restLeft;
        const Icon = ICON[g.id];
        return (
          <button
            key={g.id}
            onClick={() => onPick(g.id)}
            aria-label={`play ${g.title}`}
            className="focus-ring surface-soft lift flex w-full items-center gap-4 p-4 text-left"
            style={{ opacity: tooLong ? 0.5 : 1 }}
          >
            <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full bg-white/[0.06]">
              <Icon size={22} style={{ color: TINT[g.id] }} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="text-heading text-content-primary lowercase">{g.title}</span>
                <span className="label-instrument">{g.fit ? `~${g.fit}s` : "any length"}</span>
              </span>
              <span className="mt-0.5 block text-[0.85rem] text-content-secondary">{g.blurb}</span>
              <span className="label-instrument mt-1.5 block">
                {tooLong ? "not enough rest left" : g.scored === false ? "recovery" : best != null ? `best · ${g.format(best)}` : "not played yet"}
              </span>
            </span>
            <Play size={26} className="shrink-0" style={{ color: TINT[g.id] }} />
          </button>
        );
      })}
    </div>
  );
}

export function ChallengeBanner({ onPlay }: { onPlay: (id: GameId) => void }) {
  const { challenges } = useGameStats();
  const ch = dailyChallenge();
  const done = !!challenges[today()];
  return (
    <button
      onClick={() => onPlay(ch.id)}
      aria-label={`today's challenge: ${ch.label}`}
      className="focus-ring flex w-full items-center gap-3 rounded-[var(--radius-medium)] p-3.5 text-left"
      style={{ background: "rgba(255,182,97,0.12)", border: "1px solid rgba(255,182,97,0.3)" }}
    >
      <Star size={22} style={{ color: "var(--accent-amber)" }} fill={done ? "currentColor" : "none"} />
      <span className="min-w-0 flex-1">
        <span className="label-instrument block" style={{ color: "var(--accent-amber)" }}>
          {done ? "today's challenge · done" : "today's challenge"}
        </span>
        <span className="text-[0.92rem] text-content-primary">{ch.label}</span>
      </span>
      {!done ? <span className="label-instrument">{GAME_MAP[ch.id].title}</span> : null}
    </button>
  );
}
