import { useSyncExternalStore } from "react";
import { wallet as seed } from "./data";
import { API_ENABLED } from "../api/hooks";
import { api } from "../api/client";

/**
 * Forma coin wallet — a persisted client-side economy.
 *
 * Everything lives in this browser (localStorage). The store keeps a running
 * balance, a lifetime-earned counter (drives the collector level), a ledger of
 * the most recent transactions, and a set of idempotency keys so a one-time
 * reward (an achievement, a milestone, today's check-in) is only ever paid once.
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
function seedState(): WalletState {
  const now = new Date();
  const ledger: LedgerEntry[] = seed.recent.map((r, i) => ({
    id: `seed-${i}`,
    type: "earn" as const,
    amount: r.amount,
    label: r.label,
    kind: "milestone",
    at: new Date(now.getTime() - (i + 1) * 86_400_000).toISOString(),
  }));
  return {
    balance: seed.balance,
    lifetimeEarned: seed.balance + 1240,
    ledger,
    grants: {},
  };
}

function load(): WalletState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return seedState();
    const p = JSON.parse(raw) as Partial<WalletState>;
    return {
      balance: typeof p.balance === "number" ? p.balance : seed.balance,
      lifetimeEarned: typeof p.lifetimeEarned === "number" ? p.lifetimeEarned : seed.balance,
      ledger: Array.isArray(p.ledger) ? p.ledger.slice(0, LEDGER_CAP) : [],
      grants: p.grants && typeof p.grants === "object" ? p.grants : {},
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
  persist();
  listeners.forEach((l) => l());
}

function pushLedger(entry: LedgerEntry) {
  state.ledger = [entry, ...state.ledger].slice(0, LEDGER_CAP);
}

// ── public API ──────────────────────────────────────────────────────────────
export const walletStore = {
  get: () => state.balance,
  snapshot: () => state,

  /** Has this idempotency key already been paid? */
  hasGrant: (key: string) => Boolean(state.grants[key]),

  /**
   * Add coins. Returns false if `key` was already granted (nothing happens).
   * `kind` tags the entry for the ledger UI ("workout" | "streak" | "goal" |
   * "achievement" | "challenge" | "daily" | "milestone" | "bonus").
   */
  earn(amount: number, label: string, opts: { key?: string; kind?: string; silent?: boolean } = {}) {
    if (amount <= 0) return false;
    if (opts.key) {
      if (state.grants[opts.key]) return false;
      state.grants[opts.key] = new Date().toISOString();
    }
    state.balance += amount;
    state.lifetimeEarned += amount;
    if (API_ENABLED) {
      // mirror the credit to the server wallet; reconcile from its response
      api.store
        .earn(amount, label)
        .then((w) => walletStore.setBalance((w as { balance: number }).balance))
        .catch(() => {});
    }
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

  /** pull the authoritative balance from the server wallet (API builds only) */
  hydrateFromServer() {
    if (!API_ENABLED) return;
    api.store
      .wallet()
      .then((w) => {
        walletStore.setBalance(w.balance);
        if (state.lifetimeEarned < w.balance) {
          state.lifetimeEarned = w.balance;
          emit();
        }
      })
      .catch(() => {});
  },

  /** test / settings helper — wipe the economy back to seed */
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
  const weekAgo = Date.now() - 7 * 86_400_000;
  const earnedThisWeek = snap.ledger
    .filter((e) => e.type === "earn" && Date.parse(e.at) >= weekAgo)
    .reduce((n, e) => n + e.amount, 0);
  return {
    balance: snap.balance,
    lifetimeEarned: snap.lifetimeEarned,
    ledger: snap.ledger,
    earnedThisWeek,
    level: levelFor(snap.lifetimeEarned),
  };
}
