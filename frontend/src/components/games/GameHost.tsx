/**
 * GameHost runs one mini-game: intro → play → result. In rest mode (opened
 * from the rest timer during a workout) it skips the intro, shows the rest
 * countdown above the game, and the moment rest ends it freezes the game and
 * sends you back to your set. A run cut off by the end of rest isn't scored.
 */
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { Dumbbell, Star, Timer } from "lucide-react";
import { useFormaData } from "../../lib/localStore";
import { addRestSeconds, buzz, dailyChallenge, GAME_MAP, recordRun, useGameStats, type GameId, type PlayResult } from "../../lib/games";
import { Breathe } from "./Breathe";
import { MuscleMatch } from "./MuscleMatch";
import { PlateRush } from "./PlateRush";
import { Reflex } from "./Reflex";

/** A game unmounts the moment rest runs out, which stops its timers. */
export interface GameProps {
  onDone: (score: number, detail?: string) => void;
}

const PLAY: Record<GameId, ComponentType<GameProps>> = { plates: PlateRush, reflex: Reflex, muscles: MuscleMatch, breathe: Breathe };

/** Seconds of rest left for the active workout, ticking 4×/s; null when there is no workout. */
export function useRestLeft(): { left: number | null; total: number } {
  const active = useFormaData().active;
  const restEndsAt = active?.restEndsAt ?? null;
  const [now, setNow] = useState(() => Date.now());
  const [total, setTotal] = useState(0);
  useEffect(() => {
    if (!restEndsAt) {
      setTotal(0);
      return;
    }
    setTotal((t) => Math.max(t, (restEndsAt - Date.now()) / 1000));
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [restEndsAt]);
  if (!active) return { left: null, total: 0 };
  return { left: restEndsAt ? Math.max(0, (restEndsAt - now) / 1000) : 0, total: Math.max(1, total) };
}

const fmt = (sec: number) => `${Math.floor(Math.ceil(sec) / 60)}:${String(Math.ceil(sec) % 60).padStart(2, "0")}`;

export function RestStrip({ left, total, onBack }: { left: number; total: number; onBack: () => void }) {
  const low = left <= 10;
  const tone = low ? "var(--accent-coral)" : "var(--accent-lime)";
  return (
    <div className="mb-5 space-y-2">
      <div className="flex items-center gap-2.5">
        <Timer size={15} style={{ color: tone }} />
        <span className="label-instrument flex-1" style={{ color: tone }}>
          {low ? "rest ending — get ready" : "rest"}
        </span>
        <span className="text-[1.2rem] tabular-nums text-content-primary" aria-label={`${Math.ceil(left)} seconds of rest left`}>
          {fmt(left)}
        </span>
        <button onClick={onBack} className="focus-ring tactile rounded-pill bg-white/[0.08] px-4 py-2 text-[0.82rem] lowercase text-content-primary hover:bg-white/[0.14]">
          back to set
        </button>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
        <div className="h-full rounded-full" style={{ width: `${(left / Math.max(1, total)) * 100}%`, background: tone, transition: "width 0.25s linear" }} />
      </div>
    </div>
  );
}

type Props = {
  id: GameId;
  /** set when playing during a workout rest */
  rest?: { onBack: () => void; onPickAnother: () => void };
};

export function GameHost({ id, rest }: Props) {
  const g = GAME_MAP[id];
  const Play = PLAY[id];
  const [phase, setPhase] = useState<"intro" | "play" | "done">(rest ? "play" : "intro");
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<{ score: number; detail?: string; outcome: PlayResult | null } | null>(null);
  const { left, total } = useRestLeft();
  const restOver = !!rest && left !== null && left <= 0;

  // rest time spent here: from opening until rest ends or you leave, whichever comes first
  const openedAt = useRef(Date.now());
  const counted = useRef(false);
  const countRest = useCallback(() => {
    if (!rest || counted.current) return;
    counted.current = true;
    addRestSeconds((Date.now() - openedAt.current) / 1000);
  }, [rest]);
  useEffect(() => countRest, [countRest]);
  useEffect(() => {
    if (!restOver) return;
    countRest();
    buzz([40, 30, 40]);
  }, [restOver, countRest]);

  const duringRest = !!rest;
  const done = useCallback(
    (score: number, detail?: string) => {
      const outcome = recordRun(id, score, duringRest);
      setResult({ score, detail, outcome });
      setPhase("done");
      buzz(outcome.best || outcome.challenge ? [20, 40, 20] : 12);
    },
    [id, duringRest],
  );

  const again = () => {
    setResult(null);
    setRun((r) => r + 1);
    setPhase("play");
  };

  const canReplay = !rest || (left ?? 0) >= g.fit;

  return (
    <div>
      {rest && left !== null && !restOver ? <RestStrip left={left} total={total} onBack={rest.onBack} /> : null}

      {restOver ? (
        <RestOver onBack={rest!.onBack} />
      ) : phase === "intro" ? (
        <Intro id={id} onStart={() => setPhase("play")} />
      ) : phase === "done" && result ? (
        <Result
          id={id}
          score={result.score}
          detail={result.detail}
          outcome={result.outcome}
          primary={rest ? { label: "back to set", onPress: rest.onBack } : { label: "play again", onPress: again }}
          secondary={rest ? (canReplay ? { label: "play again", onPress: again } : { label: "something shorter", onPress: rest.onPickAnother }) : undefined}
        />
      ) : (
        <Play key={run} onDone={done} />
      )}
    </div>
  );
}

function Intro({ id, onStart }: { id: GameId; onStart: () => void }) {
  const g = GAME_MAP[id];
  const { bests } = useGameStats();
  const best = bests[id];
  const ch = dailyChallenge();
  return (
    <div className="surface-soft flex flex-col items-center gap-4 p-6 text-center">
      <p className="max-w-[34ch] text-[0.95rem] text-content-secondary">{g.blurb}</p>
      {g.scored !== false ? <div className="label-instrument">{best != null ? `your best · ${g.format(best)}` : "no score yet"}</div> : null}
      {ch.id === id ? <p className="text-[0.82rem]" style={{ color: "var(--accent-amber)" }}>today's challenge: {ch.label}</p> : null}
      <button onClick={onStart} className="btn-primary w-full px-6 py-3.5 text-[0.95rem]">
        start
      </button>
    </div>
  );
}

type Action = { label: string; onPress: () => void };

function Result({ id, score, detail, outcome, primary, secondary }: { id: GameId; score: number; detail?: string; outcome: PlayResult | null; primary: Action; secondary?: Action }) {
  const g = GAME_MAP[id];
  const best = !!outcome?.best;
  return (
    <div className="surface-soft flex flex-col items-center gap-3 p-6 text-center">
      <div className="label-instrument">{best ? "new best" : g.scored === false ? "done" : "final score"}</div>
      <div className="metric-numeral text-[3.2rem] leading-none tabular-nums" style={{ color: best ? "var(--accent-lime)" : undefined }}>
        {g.format(score)}
      </div>
      {detail ? <p className="max-w-[40ch] text-[0.9rem] text-content-secondary">{detail}</p> : null}
      {outcome?.challenge ? (
        <div className="flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[0.8rem]" style={{ background: "rgba(255,182,97,0.16)", color: "var(--accent-amber)" }}>
          <Star size={14} /> daily challenge complete
        </div>
      ) : null}
      <div className="mt-2 w-full space-y-2">
        <button onClick={primary.onPress} className="btn-primary w-full px-6 py-3.5 text-[0.95rem]">
          {primary.label}
        </button>
        {secondary ? (
          <button onClick={secondary.onPress} className="focus-ring tactile w-full rounded-pill bg-white/[0.08] px-6 py-3 text-[0.9rem] lowercase text-content-primary hover:bg-white/[0.14]">
            {secondary.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function RestOver({ onBack }: { onBack: () => void }) {
  return (
    <div className="surface-soft flex flex-col items-center gap-3 p-7 text-center">
      <Dumbbell size={40} style={{ color: "var(--accent-lime)" }} />
      <h2 className="text-title text-content-primary lowercase">rest's over</h2>
      <p className="text-[0.9rem] text-content-secondary">Time for your next set. The game will be here next rest.</p>
      <button onClick={onBack} className="btn-primary mt-1 w-full px-6 py-3.5 text-[0.95rem]">
        back to set
      </button>
    </div>
  );
}
