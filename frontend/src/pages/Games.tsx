import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Reveal } from "../components/Reveal";
import { ChallengeBanner, GameList } from "../components/games/GameList";
import { streakOf, useGameStats, type GameId } from "../lib/games";

/**
 * Games hub — short games for rest periods, so the phone in your hand between
 * sets is doing something that ends with the rest timer instead of a feed.
 * During a workout the rest bar opens these directly (/workouts/play).
 */
export default function Games() {
  const nav = useNavigate();
  const stats = useGameStats();
  const open = (id: GameId) => nav(`/games/${id}`);
  return (
    <div className="mx-auto max-w-[720px]">
      <PageHeader title="games" eyebrow="rest-time breaks" />
      <p className="mt-3 max-w-[52ch] text-[0.95rem] text-content-secondary">
        Quick games that end when your rest does. Start one from the rest bar during a workout.
      </p>

      <Reveal className="mt-6 grid grid-cols-3 gap-2.5">
        {[
          ["day streak", String(streakOf(stats.days))],
          ["rest plays", String(stats.restRuns)],
          ["rest min here", String(Math.round(stats.restSeconds / 60))],
        ].map(([label, value]) => (
          <div key={label} className="surface-soft p-3.5">
            <div className="metric-numeral text-[1.5rem] tabular-nums">{value}</div>
            <div className="label-instrument mt-1.5">{label}</div>
          </div>
        ))}
      </Reveal>

      <Reveal className="mt-4">
        <ChallengeBanner onPlay={open} />
      </Reveal>
      <Reveal className="mt-4">
        <GameList onPick={open} />
      </Reveal>
      <p className="label-instrument mt-5 text-center">
        rest minutes count time spent here during a workout rest instead of somewhere else on your phone. scores stay in this browser.
      </p>
    </div>
  );
}
