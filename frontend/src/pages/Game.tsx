import { useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { GameHost } from "../components/games/GameHost";
import { GAME_MAP, isGameId } from "../lib/games";

/** One game, outside a workout (free play from the Games hub). */
export default function Game() {
  const { id } = useParams<{ id: string }>();
  if (!isGameId(id)) {
    return (
      <div className="mx-auto max-w-[720px]">
        <PageHeader title="games" />
        <EmptyState title="game not found" body="it may have been removed. pick another from the games list." />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-[560px]">
      <PageHeader title={GAME_MAP[id].title} eyebrow="game" />
      <div className="mt-6">
        <GameHost key={id} id={id} />
      </div>
    </div>
  );
}
