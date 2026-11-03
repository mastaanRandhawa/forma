import { useSyncExternalStore } from "react";
import { API_ENABLED } from "../api/hooks";
import { api } from "../api/client";
import type { EconomySnapshot } from "../api/types";
import { EARN_CAPS, type EarnKind } from "./economyConfig";
import { weekStart } from "./streak";

/**
 * Forma coin wallet.
 *
 * Without a backend everything lives in this browser (localStorage): a running
 * balance, a lifetime-earned counter (drives the collector level), a ledger of
 * the most recent transactions, idempotency keys so a one-time reward (an
 * achievement, a milestone, today's check-in) is only ever paid once, and the
 * payout times the daily and weekly caps count.
 *
 * With a backend the server owns all of that. This store only mirrors its
 * balance and ledger (`applyServer`), and `earn()` refuses to run: a client must
 * never decide how many coins it gets.
 *
 * `earn()` / `spend()` emit to subscribers; `useWalletBalance()` /
 * `useWallet()` / `useLedger()` re-render on any change. `earn()` also fans out
 * a DOM `CustomEvent("forma:coin-earn")` that the global CoinToast listens for.
 */

const LS_KEY = "forma.wallet.v2";
const LEDGER_CAP = 40;

export type LedgerEntry = {
  id: string;
  type: "earn" | "spend";
  amount: number;
  label: string;
  /** category tag for grouping / icons in the ledger UI */
  kind?: string;
  at: string;
};

type WalletState = {
  balance: number;
  lifetimeEarned: number;
  ledger: LedgerEntry[];
  /** idempotency: reward key -> ISO timestamp it was granted */
  grants: Record<string, string>;
  /** caps: rule -> when it paid, kept for about a week */
  paid: Record<string, string[]>;
  /** the server's figure in API mode, where the local ledger is only its last 25 rows */
  earnedThisWeek?: number;
};

// ── collector levels ────────────────────────────────────────────────────────
// Lifetime-earned thresholds. Each level bumps the wallet pill accent and
// unlocks a small perk line in the store. Curve is gentle early, steeper later.
export const LEVELS: { level: number; title: string; at: number }[] = [
  { level: 1, title: "Rookie", at: 0 },
  { level: 2, title: "Regular", at: 400 },
  { level: 3, title: "Committed", at: 1000 },
  { level: 4, title: "Dedicated", at: 2000 },
  { level: 5, title: "Relentless", at: 3600 },
  { level: 6, title: "Elite", at: 6000 },
  { level: 7, title: "Legend", at: 9500 },
  { level: 8, title: "Mythic", at: 15000 },
];

export function levelFor(lifetimeEarned: number) {
  let current = LEVELS[0];
  for (const l of LEVELS) if (lifetimeEarned >= l.at) current = l;
  const next = LEVELS.find((l) => l.at > current.at) ?? null;
  const span = next ? next.at - current.at : 1;
  const into = lifetimeEarned - current.at;
  return {
    ...current,
    next,
    progress: next ? Math.min(1, into / span) : 1,
    toNext: next ? Math.max(0, next.at - lifetimeEarned) : 0,
  };
}

// ── persistence ─────────────────────────────────────────────────────────────
/** A new wallet starts empty — every coin in it is one the user earned. */
function seedState(): WalletState {
  return { balance: 0, lifetimeEarned: 0, ledger: [], grants: {}, paid: {} };
}

function load(): WalletState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return seedState();
    const p = JSON.parse(raw) as Partial<WalletState>;
    return {
      balance: typeof p.balance === "number" ? p.balance : 0,
      lifetimeEarned: typeof p.lifetimeEarned === "number" ? p.lifetimeEarned : 0,
      ledger: Array.isArray(p.ledger) ? p.ledger.slice(0, LEDGER_CAP) : [],
      grants: p.grants && typeof p.grants === "object" ? p.grants : {},
      paid: p.paid && typeof p.paid === "object" ? p.paid : {},
      earnedThisWeek: typeof p.earnedThisWeek === "number" ? p.earnedThisWeek : undefined,
    };
  } catch {
    return seedState();
  }
}

let state: WalletState = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* private mode — in-memory only */
  }
}
function emit() {
  // new object each change so useSyncExternalStore(snapshot) sees it
  state = { ...state };
  persist();
  listeners.forEach((l) => l());
}

function pushLedger(entry: LedgerEntry) {
  state.ledger = [entry, ...state.ledger].slice(0, LEDGER_CAP);
}

const startOfToday = () => new Date().setHours(0, 0, 0, 0);
const paidSince = (kind: string, from: number) =>
  (state.paid[kind] ?? []).filter((at) => Date.parse(at) >= from).length;

/** Has this rule hit its daily or weekly cap? */
function capped(kind: string): boolean {
  const caps = EARN_CAPS[kind as EarnKind];
  if (!caps) return false;
  return (
    (caps.daily != null && paidSince(kind, startOfToday()) >= caps.daily) ||
    (caps.weekly != null && paidSince(kind, weekStart()) >= caps.weekly)
  );
}

// ── public API ──────────────────────────────────────────────────────────────
export const walletStore = {
  get: () => state.balance,
  snapshot: () => state,

  /** Has this idempotency key already been paid? */
  hasGrant: (key: string) => Boolean(state.grants[key]),

  /** How often a rule has paid today and this week, for the store's "earn" panel. */
  capUsage: (kind: string) => ({ today: paidSince(kind, startOfToday()), week: paidSince(kind, weekStart()) }),

  /**
   * Add coins (no-backend build only; the server pays in API mode). Returns false
   * if `key` was already granted or the rule is at its cap (nothing happens).
   * `kind` is an earn rule from lib/economyConfig, which sets the caps.
   */
  earn(amount: number, label: string, opts: { key?: string; kind?: string; silent?: boolean } = {}) {
    if (API_ENABLED || amount <= 0) return false;
    if (opts.key && state.grants[opts.key]) return false;
    if (opts.kind && capped(opts.kind)) return false;
    const now = new Date().toISOString();
    if (opts.key) state.grants[opts.key] = now;
    if (opts.kind) {
      const keepFrom = weekStart() - 86_400_000;
      state.paid[opts.kind] = [...(state.paid[opts.kind] ?? []).filter((at) => Date.parse(at) >= keepFrom), now];
    }
    state.balance += amount;
    state.lifetimeEarned += amount;
    pushLedger({
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: "earn",
      amount,
      label,
      kind: opts.kind ?? "bonus",
      at: new Date().toISOString(),
    });
    emit();
    if (!opts.silent && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("forma:coin-earn", { detail: { amount, label, kind: opts.kind } }),
      );
    }
    return true;
  },

  /** Spend coins. Returns false when the balance can't cover it. */
  spend(amount: number, label = "purchase", kind = "purchase") {
    if (amount < 0 || amount > state.balance) return false;
    state.balance -= amount;
    pushLedger({
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: "spend",
      amount,
      label,
      kind,
      at: new Date().toISOString(),
    });
    emit();
    return true;
  },

  /** reconcile the local balance with an authoritative server value */
  setBalance(n: number) {
    if (typeof n === "number" && n >= 0 && n !== state.balance) {
      state.balance = n;
      emit();
    }
  },

  /** mirror the server's wallet: balance, lifetime total, and ledger */
  applyServer(s: Pick<EconomySnapshot, "balance" | "lifetimeEarned" | "earnedThisWeek" | "recent">) {
    state.balance = s.balance;
    state.lifetimeEarned = s.lifetimeEarned;
    state.earnedThisWeek = s.earnedThisWeek;
    state.ledger = s.recent.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      label: t.label,
      kind: t.kind ?? (t.type === "spend" ? "purchase" : "bonus"),
      at: t.createdAt,
    }));
    emit();
  },

  /** pull the authoritative balance from the server wallet (API builds only) */
  hydrateFromServer() {
    if (!API_ENABLED) return;
    api.store
      .wallet()
      .then((w) => walletStore.setBalance(w.balance))
      .catch(() => {});
  },

  /** test / settings helper — wipe the economy back to an empty wallet */
  reset() {
    state = seedState();
    emit();
  },

  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

// keep multiple tabs in sync
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === LS_KEY) {
      state = load();
      listeners.forEach((l) => l());
    }
  });
}

// ── hooks ───────────────────────────────────────────────────────────────────
export function useWalletBalance() {
  return useSyncExternalStore(walletStore.subscribe, walletStore.get, walletStore.get);
}

export function useWallet() {
  const snap = useSyncExternalStore(
    walletStore.subscribe,
    walletStore.snapshot,
    walletStore.snapshot,
  );
  const from = weekStart();
  const earnedThisWeek =
    snap.earnedThisWeek ??
    snap.ledger.filter((e) => e.type === "earn" && Date.parse(e.at) >= from).reduce((n, e) => n + e.amount, 0);
  return {
    balance: snap.balance,
    lifetimeEarned: snap.lifetimeEarned,
    ledger: snap.ledger,
    earnedThisWeek,
    level: levelFor(snap.lifetimeEarned),
  };
}
