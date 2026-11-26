import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ChallengeBanner, GameList } from "../components/games/GameList";
import { GameHost, RestStrip, useRestLeft } from "../components/games/GameHost";
import { isGameId, type GameId } from "../lib/games";

/**
 * Rest-time games, opened from the rest bar of the active workout. The rest
 * countdown stays on screen, games that won't finish in the time left are
 * dimmed, and when rest ends the game stops and points you back to your set.
 */
export default function RestPlay() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [game, setGame] = useState<GameId | null>(isGameId(params.get("game")) ? (params.get("game") as GameId) : null);
  const { left, total } = useRestLeft();
  const back = () => nav("/workouts/active");

  if (game) {
    return (
      <div className="mx-auto max-w-[560px]">
        <GameHost key={game} id={game} rest={{ onBack: back, onPickAnother: () => setGame(null) }} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[560px]">
      {left ? <RestStrip left={left} total={total} onBack={back} /> : null}
      <PageHeader title="play while you rest" />
      <p className="mt-2 text-[0.95rem] text-content-secondary">
        {left ? "pick something that fits. it stops when your rest is up." : "your rest is over — time for the next set."}
      </p>
      <div className="mt-6 space-y-4">
        {left ? (
          <>
            <ChallengeBanner onPlay={setGame} />
            <GameList onPick={setGame} restLeft={left} />
          </>
        ) : (
          <button onClick={back} className="btn-primary w-full px-6 py-3.5 text-[0.95rem]">
            back to set
          </button>
        )}
      </div>
    </div>
  );
}
