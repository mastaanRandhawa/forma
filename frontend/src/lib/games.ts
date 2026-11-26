/**
 * Mini-games for rest periods: catalogue, device-local stats (bests, play
 * days, rest time spent here) and a daily challenge. Everything stays in this
 * browser — the games are a break between sets, not part of progression.
 *
 * Design rule: a game must fit inside a normal rest (60–120 s) and end on its
 * own, so the next set — not the next round — is what comes after it.
 */
import { useSyncExternalStore } from "react";

export type GameId = "plates" | "reflex" | "muscles" | "breathe";

export interface GameInfo {
  id: GameId;
  title: string;
  blurb: string;
  /** rough seconds one run takes — the rest picker greys out games that won't finish */
  fit: number;
  /** how a score reads, e.g. "12 bars" */
  format: (v: number) => string;
  /** true when a lower score is better (reaction time) */
  lowerIsBetter?: boolean;
  /** false for non-competitive modes (breathing) — no best is kept */
  scored?: boolean;
}

export const GAMES: GameInfo[] = [
  { id: "plates", title: "plate rush", blurb: "Load the bar to the target weight. As many bars as you can in 40 seconds.", fit: 45, format: (v) => `${v} ${v === 1 ? "bar" : "bars"}` },
  { id: "reflex", title: "reflex", blurb: "Tap the moment the pad turns green. Five rounds, average wins.", fit: 25, format: (v) => `${v} ms`, lowerIsBetter: true },
  { id: "muscles", title: "muscle match", blurb: "Name the main muscle each exercise works. Eight quick questions.", fit: 40, format: (v) => `${v}/8` },
  { id: "breathe", title: "breathe", blurb: "Box breathing to bring your heart rate down before the next set.", fit: 0, format: (v) => `${v} ${v === 1 ? "breath" : "breaths"}`, scored: false },
];

export const GAME_MAP = Object.fromEntries(GAMES.map((g) => [g.id, g])) as Record<GameId, GameInfo>;
export const isGameId = (v: unknown): v is GameId => typeof v === "string" && v in GAME_MAP;

// ── stats store ─────────────────────────────────────────────────────────────
export interface GameStats {
  bests: Partial<Record<GameId, number>>;
  /** local dates (YYYY-MM-DD) a game was finished, newest last, capped */
  days: string[];
  /** seconds of rest spent in games instead of elsewhere on the phone */
  restSeconds: number;
  /** runs finished during a rest */
  restRuns: number;
  /** date → true once that day's challenge was hit */
  challenges: Record<string, boolean>;
}

const KEY = "forma.games.stats";
const EMPTY: GameStats = { bests: {}, days: [], restSeconds: 0, restRuns: 0, challenges: {} };
const listeners = new Set<() => void>();

function read(): GameStats {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as GameStats) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

// useSyncExternalStore needs a stable snapshot: cache until something is saved
let stats: GameStats = read();

function save(next: GameStats) {
  stats = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode — keep the in-memory copy */
  }
  listeners.forEach((l) => l());
}

export function useGameStats(): GameStats {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
    () => stats,
    () => EMPTY,
  );
}

export const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export interface PlayResult {
  /** beat the previous best */
  best: boolean;
  /** hit today's challenge with this run (first time today) */
  challenge: boolean;
}

/** Record a finished run. Interrupted runs (rest ran out) are never recorded. */
export function recordRun(id: GameId, score: number, duringRest: boolean): PlayResult {
  const g = GAME_MAP[id];
  const day = today();
  const old = stats.bests[id];
  const best = g.scored !== false && (old == null || (g.lowerIsBetter ? score < old : score > old));
  const ch = dailyChallenge(day);
  const challenge = !stats.challenges[day] && ch.id === id && meets(ch, score);
  save({
    ...stats,
    bests: best ? { ...stats.bests, [id]: score } : stats.bests,
    days: stats.days[stats.days.length - 1] === day ? stats.days : [...stats.days, day].slice(-120),
    restRuns: stats.restRuns + (duringRest ? 1 : 0),
    challenges: challenge ? { ...stats.challenges, [day]: true } : stats.challenges,
  });
  return { best, challenge };
}

export function addRestSeconds(sec: number) {
  if (sec < 1) return;
  save({ ...stats, restSeconds: stats.restSeconds + Math.round(sec) });
}

/** Consecutive days with a finished run, counting back from today (or yesterday, so it survives until you train). */
export function streakOf(days: string[]): number {
  const set = new Set(days);
  const d = new Date();
  if (!set.has(today(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(today(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

// ── daily challenge ─────────────────────────────────────────────────────────
export interface Challenge {
  id: GameId;
  target: number;
  label: string;
}

const CHALLENGES: Challenge[] = [
  { id: "plates", target: 5, label: "Load 5 bars in one Plate Rush" },
  { id: "plates", target: 7, label: "Load 7 bars in one Plate Rush" },
  { id: "reflex", target: 330, label: "Average under 330 ms in Reflex" },
  { id: "reflex", target: 290, label: "Average under 290 ms in Reflex" },
  { id: "muscles", target: 6, label: "Score 6/8 or better in Muscle Match" },
  { id: "muscles", target: 8, label: "Get a perfect 8/8 in Muscle Match" },
];

export function dailyChallenge(day = today()): Challenge {
  let h = 0;
  for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CHALLENGES[h % CHALLENGES.length];
}

export function meets(c: Challenge, score: number) {
  return GAME_MAP[c.id].lowerIsBetter ? score <= c.target : score >= c.target;
}

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Soft buzz on phones that have it; a no-op elsewhere. */
export const buzz = (p: number | number[] = 12) => {
  try {
    navigator.vibrate?.(p);
  } catch {
    /* unsupported */
  }
};
