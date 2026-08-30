import { useSyncExternalStore } from "react";
import { wallet } from "./data";

/**
 * Tiny global wallet store so the coin balance stays in sync between the top-nav
 * pill and the store page. Not persisted (demo data).
 */
let balance = wallet.balance;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export const walletStore = {
  get: () => balance,
  spend(amount: number) {
    if (amount <= balance) {
      balance -= amount;
      emit();
    }
  },
  earn(amount: number) {
    balance += amount;
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function useWalletBalance() {
  return useSyncExternalStore(walletStore.subscribe, walletStore.get, walletStore.get);
}
