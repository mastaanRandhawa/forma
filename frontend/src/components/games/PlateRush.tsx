/**
 * Plate Rush — load the bar to the target weight. Tap a plate to add a pair;
 * tap a loaded plate to strip it and everything outside it. 40 seconds, so a
 * run fits inside one rest; every solved bar scores one.
 */
import { useEffect, useRef, useState } from "react";
import { buzz, shuffle } from "../../lib/games";
import { useFormaData } from "../../lib/localStore";
import type { GameProps } from "./GameHost";

const DURATION = 40_000;

const SETS = {
  kg: { bar: 20, plates: [25, 20, 15, 10, 5, 2.5, 1.25] },
  lb: { bar: 45, plates: [45, 35, 25, 10, 5, 2.5] },
} as const;

/** A solvable target that gets harder as you score: more plates per side. */
function makeTarget(unit: "kg" | "lb", level: number, prev?: number): number {
  const { bar, plates } = SETS[unit];
  const max = Math.min(5, 2 + Math.floor(level / 2));
  for (;;) {
    const n = 1 + Math.floor(Math.random() * max);
    const total = bar + shuffle(plates).slice(0, n).reduce((s, p) => s + p, 0) * 2;
    if (total !== prev) return total;
  }
}

/** Competition-style plate colours, so plates read at a glance. */
function plateColor(p: number, unit: "kg" | "lb"): string {
  const kg = unit === "kg" ? p : p / 2.2;
  if (kg >= 24) return "#C8323C";
  if (kg >= 19) return "#2F5FD0";
  if (kg >= 14) return "#C9A227";
  if (kg >= 9) return "#2E9E5B";
  if (kg >= 4) return "#6B6F7A";
  return "#3A3D45";
}

export function PlateRush({ onDone }: GameProps) {
  const unit: "kg" | "lb" = useFormaData().profile.units === "kg" ? "kg" : "lb";
  const { bar, plates } = SETS[unit];
  const [target, setTarget] = useState(() => makeTarget(unit, 0));
  const [side, setSide] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(DURATION);
  const deadline = useRef(0);
  const scoreRef = useRef(0);
  const finished = useRef(false);

  useEffect(() => {
    if (!deadline.current) deadline.current = Date.now() + DURATION;
    const t = setInterval(() => {
      const ms = Math.max(0, deadline.current - Date.now());
      setLeft(ms);
      if (ms === 0 && !finished.current) {
        finished.current = true;
        const s = scoreRef.current;
        onDone(s, `${s} ${s === 1 ? "bar" : "bars"} loaded in ${DURATION / 1000} seconds.`);
      }
    }, 100);
    return () => clearInterval(t);
  }, [onDone]);

  const loaded = bar + side.reduce((s, p) => s + p, 0) * 2;
  const over = loaded > target;

  // solved → score and roll the next (slightly harder) bar
  useEffect(() => {
    if (loaded !== target) return;
    buzz([20, 30, 20]);
    const t = setTimeout(() => {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setSide([]);
      setTarget((prev) => makeTarget(unit, scoreRef.current, prev));
    }, 200);
    return () => clearTimeout(t);
  }, [loaded, target, unit]);

  const add = (p: number) => side.length < 8 && setSide((s) => [...s, p]);
  const strip = (i: number) => {
    buzz(8);
    setSide((s) => s.slice(0, i));
  };
  const maxPlate = plates[0];
  const low = left < 10_000;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="label-soft lowercase">bars</div>
          <div className="metric-numeral text-[1.8rem] tabular-nums">{score}</div>
        </div>
        <div className="text-right">
          <div className="label-soft lowercase">time</div>
          <div className="metric-numeral text-[1.8rem] tabular-nums" style={{ color: low ? "var(--accent-coral)" : undefined }}>
            {Math.ceil(left / 1000)}
          </div>
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <div className="h-full rounded-full" style={{ width: `${(left / DURATION) * 100}%`, background: low ? "var(--accent-amber)" : "var(--accent-cyan)", transition: "width 0.1s linear" }} />
      </div>

      <div className="surface-soft flex flex-col items-center gap-3 p-5">
        <div className="text-center">
          <div className="label-soft lowercase">target</div>
          <div className="metric-numeral text-[3rem] tabular-nums leading-none" style={{ color: "var(--accent-lime)" }}>
            {target}
          </div>
          <div className={`label-instrument mt-1 ${over ? "text-[var(--accent-coral)]" : ""}`}>
            loaded {loaded} {unit}
            {over ? " · too heavy, tap a plate to strip it" : ""}
          </div>
        </div>

        {/* one side of the bar: collar + plates (tap to strip) + sleeve */}
        <div className="flex h-[120px] w-full items-center justify-center">
          <div className="h-[34px] w-[14px] rounded-[4px] bg-content-tertiary" />
          <div className="ml-[3px] flex items-center gap-[3px]">
            {side.map((p, i) => (
              <button
                key={i}
                onClick={() => strip(i)}
                aria-label={`strip ${p} ${unit} plate`}
                className="focus-ring rounded-[5px] border border-white/10"
                style={{ width: 16, height: 40 + (p / maxPlate) * 76, background: plateColor(p, unit) }}
              />
            ))}
          </div>
          <div className="h-[10px] max-w-[120px] flex-1 rounded-r-[5px] bg-content-tertiary" />
        </div>
        <div className="label-instrument">
          per side: {side.length ? side.join(" · ") : "empty"} · {bar} {unit} bar
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        {plates.map((p) => (
          <button
            key={p}
            onClick={() => {
              buzz(6);
              add(p);
            }}
            aria-label={`add a pair of ${p} ${unit} plates`}
            className="focus-ring tactile grid aspect-[1.25] max-h-[84px] place-items-center rounded-[var(--radius-small)] text-[1.2rem] font-semibold tabular-nums text-white active:scale-95"
            style={{ background: plateColor(p, unit) }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
