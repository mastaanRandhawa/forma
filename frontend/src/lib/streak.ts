/**
 * streak — day arithmetic and streak protection maths. Matches
 * backend/src/services/streak.ts, which decides in API mode.
 *
 * Protected days live here too (a tiny store, filled by lib/economy) so every
 * screen that shows a streak agrees without passing them around.
 */
import { useSyncExternalStore } from "react";
import { FREEZE_MIN_STREAK, STREAK_REPAIR } from "./economyConfig";

// ── calendar ────────────────────────────────────────────────────────────────
/** "YYYY-MM-DD" for this device's calendar day. */
export function todayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const localDayOf = (iso: string): string => todayKey(new Date(iso));

export const shiftDay = (day: string, delta: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + delta * 86_400_000).toISOString().slice(0, 10);

/** Local midnight on the Monday of `d`'s week, in ms. */
export function weekStart(d = new Date()): number {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); // Monday = 0
  return t.getTime();
}

/** "w2026-11-02", the same format the server uses. */
export const weekKey = (d = new Date()): string => `w${todayKey(new Date(weekStart(d)))}`;

// ── streak maths ────────────────────────────────────────────────────────────
type Days = ReadonlySet<string>;

/**
 * Consecutive trained days ending today, or yesterday when today isn't trained
 * yet. A protected day bridges the run but doesn't add to it.
 */
export function streakLength(trained: Days, protectedDays: Days, today = todayKey()): number {
  let cursor = trained.has(today) ? today : shiftDay(today, -1);
  let n = 0;
  for (let i = 0; i < 1000; i++) {
    if (trained.has(cursor)) n++;
    else if (!protectedDays.has(cursor)) break;
    cursor = shiftDay(cursor, -1);
  }
  return n;
}

/**
 * The missed days a freeze should cover right now. Empty when the streak is too
 * short to be worth a freeze, or when the freezes on hand can't cover the whole
 * gap (spending them on a streak that dies anyway would just waste them).
 */
export function daysToFreeze(trained: Days, protectedDays: Days, today: string, freezes: number): string[] {
  if (freezes <= 0) return [];
  const gap: string[] = [];
  let cursor = shiftDay(today, -1);
  while (!trained.has(cursor) && !protectedDays.has(cursor)) {
    gap.push(cursor);
    if (gap.length > freezes) return [];
    cursor = shiftDay(cursor, -1);
  }
  if (gap.length === 0) return [];
  if (streakLength(trained, protectedDays, cursor) < FREEZE_MIN_STREAK) return [];
  return gap.reverse();
}

export interface RepairOption {
  /** the missed days a repair would cover, oldest first */
  days: string[];
  /** the streak length once repaired */
  restoresTo: number;
}

/** Whether a recent gap can be repaired: 1–3 missed days, ended within the last 3 days, with a real streak behind it. */
export function repairOption(trained: Days, protectedDays: Days, today: string): RepairOption | null {
  const covered = (d: string) => trained.has(d) || protectedDays.has(d);
  let cursor = trained.has(today) ? today : shiftDay(today, -1);
  let sinceGap = 0;
  while (covered(cursor)) {
    sinceGap++;
    if (sinceGap > STREAK_REPAIR.windowDays) return null;
    cursor = shiftDay(cursor, -1);
  }
  const gap: string[] = [];
  while (!covered(cursor)) {
    gap.push(cursor);
    if (gap.length > STREAK_REPAIR.maxGapDays) return null;
    cursor = shiftDay(cursor, -1);
  }
  if (streakLength(trained, protectedDays, cursor) < STREAK_REPAIR.minPriorRun) return null;
  const days = gap.reverse();
  return { days, restoresTo: streakLength(trained, new Set([...protectedDays, ...days]), today) };
}

// ── protected days ──────────────────────────────────────────────────────────
let protectedDays: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();

export const streakProtection = {
  get: () => protectedDays,
  set(days: Iterable<string>) {
    const next = new Set(days);
    if (next.size === protectedDays.size && [...next].every((d) => protectedDays.has(d))) return;
    protectedDays = next;
    listeners.forEach((l) => l());
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};

/** Re-render when a freeze or repair changes which days are covered. */
export function useProtectedDays(): ReadonlySet<string> {
  return useSyncExternalStore(streakProtection.subscribe, streakProtection.get, streakProtection.get);
}
