/**
 * Muscle Match — eight exercises from the RepDB catalogue; pick the main
 * muscle each one works. Wrong options never include any of the exercise's
 * primary muscles, so every question has exactly one right answer.
 */
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { buzz, shuffle } from "../../lib/games";
import { repdbImage } from "../../lib/repdb";
import { REPDB_CATALOG } from "../../lib/repdb.catalog";
import type { RepDbCatalogEntry } from "../../lib/repdb";
import type { GameProps } from "./GameHost";

const COUNT = 8;
const MUSCLES = ["Chest", "Back", "Lats", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Calves", "Abs", "Traps"];

type Question = { name: string; img: string | null; answer: string; options: string[] };

function buildQuiz(): Question[] {
  // spread questions across muscles rather than drawing eight glute exercises
  const byMuscle = new Map<string, RepDbCatalogEntry[]>();
  for (const e of REPDB_CATALOG) {
    const m = e.primary[0];
    if (m && MUSCLES.includes(m)) byMuscle.set(m, [...(byMuscle.get(m) ?? []), e]);
  }
  const muscles = shuffle([...byMuscle.keys()]);
  const picks: RepDbCatalogEntry[] = [];
  for (let i = 0; picks.length < COUNT && i < COUNT * 3; i++) {
    const list = byMuscle.get(muscles[i % muscles.length])!;
    const e = list[Math.floor(Math.random() * list.length)];
    if (!picks.includes(e)) picks.push(e);
  }
  return picks.map((e) => {
    const answer = e.primary[0];
    const wrong = shuffle(MUSCLES.filter((m) => !e.primary.includes(m))).slice(0, 3);
    return { name: e.name, img: repdbImage(e.imgStart ?? e.imgEnd), answer, options: shuffle([answer, ...wrong]) };
  });
}

export function MuscleMatch({ onDone }: GameProps) {
  const [quiz] = useState(buildQuiz);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const q = quiz[idx];

  // after answering, pause briefly on the feedback, then move on
  useEffect(() => {
    if (!picked) return;
    const t = setTimeout(() => {
      if (idx + 1 >= quiz.length) {
        onDone(score, score >= COUNT - 1 ? "Anatomy expert." : score >= COUNT / 2 ? "Solid — you know your lifts." : "Every rep counts. Go again next rest.");
        return;
      }
      setPicked(null);
      setIdx(idx + 1);
    }, 800);
    return () => clearTimeout(t);
  }, [picked, idx, quiz.length, score, onDone]);

  const choose = (m: string) => {
    if (picked || !q) return;
    setPicked(m);
    const right = m === q.answer;
    if (right) setScore((s) => s + 1);
    buzz(right ? 12 : [30, 40, 30]);
  };

  if (!q) return null;
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="label-soft lowercase">question</div>
          <div className="metric-numeral text-[1.5rem] tabular-nums">{idx + 1}/{quiz.length}</div>
        </div>
        <div className="text-right">
          <div className="label-soft lowercase">score</div>
          <div className="metric-numeral text-[1.5rem] tabular-nums">{score}</div>
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <div className="h-full rounded-full bg-[var(--accent-cyan)] transition-[width] duration-300" style={{ width: `${((idx + (picked ? 1 : 0)) / quiz.length) * 100}%` }} />
      </div>

      <div className="surface-soft flex flex-col items-center gap-3 p-5 text-center">
        {q.img ? (
          <img src={q.img} alt="" className="h-[200px] w-full rounded-[var(--radius-small)] bg-white object-contain" />
        ) : null}
        <h2 className="text-heading text-content-primary lowercase">{q.name}</h2>
        <p className="label-instrument">which muscle does this mainly work?</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {q.options.map((m) => {
          const isAnswer = m === q.answer;
          const isPicked = m === picked;
          const bg = picked && isAnswer ? "rgba(79,214,166,0.22)" : isPicked ? "rgba(255,107,74,0.22)" : "rgba(255,255,255,0.06)";
          const border = picked && isAnswer ? "var(--accent-jade)" : isPicked ? "var(--accent-coral)" : "transparent";
          return (
            <button
              key={m}
              onClick={() => choose(m)}
              disabled={!!picked}
              className="focus-ring tactile flex h-[64px] items-center justify-center gap-1.5 rounded-[var(--radius-small)] border-[1.5px] text-[1rem] lowercase text-content-primary transition-colors"
              style={{ background: bg, borderColor: border }}
            >
              {picked && isAnswer ? <Check size={16} style={{ color: "var(--accent-jade)" }} /> : picked && isPicked ? <X size={16} style={{ color: "var(--accent-coral)" }} /> : null}
              {m}
            </button>
          );
        })}
      </div>
    </div>
  );
}
