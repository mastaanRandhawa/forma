/**
 * Reflex — wait for the pad to turn green, then tap. Five clean rounds; a tap
 * before green is a false start and that round is re-run. Score is the
 * average reaction time in milliseconds (lower is better). ~20 seconds.
 */
import { useEffect, useRef, useState } from "react";
import { buzz } from "../../lib/games";
import type { GameProps } from "./GameHost";

const ROUNDS = 5;
type Phase = "ready" | "wait" | "go" | "hit" | "early";

export function Reflex({ onDone }: GameProps) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [times, setTimes] = useState<number[]>([]);
  const [falseStarts, setFalseStarts] = useState(0);
  const goAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clear, []);

  const arm = () => {
    clear();
    setPhase("wait");
    timer.current = setTimeout(() => {
      goAt.current = performance.now();
      setPhase("go");
    }, 1200 + Math.random() * 2300);
  };

  const tap = () => {
    if (phase === "ready" || phase === "hit" || phase === "early") return arm();
    if (phase === "wait") {
      clear();
      buzz([30, 40, 30]);
      setFalseStarts((n) => n + 1);
      return setPhase("early");
    }
    const ms = Math.round(performance.now() - goAt.current);
    buzz(12);
    const next = [...times, ms];
    setTimes(next);
    if (next.length < ROUNDS) return setPhase("hit");
    const avg = Math.round(next.reduce((s, t) => s + t, 0) / next.length);
    onDone(avg, `Rounds: ${next.join(" · ")} ms${falseStarts ? ` · ${falseStarts} false start${falseStarts > 1 ? "s" : ""}` : ""}`);
  };

  const avg = times.length ? Math.round(times.reduce((s, t) => s + t, 0) / times.length) : 0;
  const last = times[times.length - 1];
  const pad: Record<Phase, { bg: string; title: string; sub: string; ink: string }> = {
    ready: { bg: "rgba(255,255,255,0.08)", title: "tap to begin", sub: `round 1 of ${ROUNDS}`, ink: "var(--text-primary)" },
    wait: { bg: "#7A1F2B", title: "wait for green…", sub: "don't jump the gun", ink: "#fff" },
    go: { bg: "#3FBF5A", title: "TAP!", sub: "", ink: "#0B2410" },
    hit: { bg: "rgba(255,255,255,0.08)", title: `${last ?? 0} ms`, sub: `tap for round ${times.length + 1} of ${ROUNDS}`, ink: "var(--text-primary)" },
    early: { bg: "rgba(255,255,255,0.08)", title: "false start", sub: "too soon — tap to retry this round", ink: "var(--accent-coral)" },
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div>
          <div className="label-soft lowercase">round</div>
          <div className="metric-numeral text-[1.5rem] tabular-nums">{Math.min(times.length + 1, ROUNDS)}/{ROUNDS}</div>
        </div>
        <div className="text-right">
          <div className="label-soft lowercase">average</div>
          <div className="metric-numeral text-[1.5rem] tabular-nums">{times.length ? `${avg} ms` : "—"}</div>
        </div>
      </div>
      <button
        onPointerDown={tap}
        aria-label={pad[phase].title}
        className="focus-ring flex min-h-[300px] w-full select-none flex-col items-center justify-center gap-2 rounded-[var(--radius-large)] transition-colors duration-150"
        style={{ background: pad[phase].bg, color: pad[phase].ink, touchAction: "manipulation" }}
      >
        <span className="text-[2rem] font-medium lowercase leading-tight">{pad[phase].title}</span>
        {pad[phase].sub ? <span className="text-[0.95rem] opacity-75">{pad[phase].sub}</span> : null}
      </button>
    </div>
  );
}
