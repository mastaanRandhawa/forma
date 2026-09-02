import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { walletStore, useWalletBalance } from "./wallet";
import {
  ACCENT_MAP,
  applyColorModeOverrides,
  applyFont,
  applyTheme,
  DEFAULT_THEME_ID,
  THEME_MAP,
  type ThemeEffect,
} from "./themes";
import { customizationItems, type CustomizationItem, type CustomizationSlot } from "./data";
import { API_ENABLED } from "../api/hooks";
import { api } from "../api/client";

/**
 * Customization store — what the player owns and what they have equipped.
 *
 * One localStorage blob: a set of owned item ids and an `equipped` map keyed by
 * slot ("theme" | "accent" | "effect" | "avatar" | "chatTheme" | "frame" |
 * "title" | "badge"). The provider re-applies the live theme (tokens + accent
 * override + ambient effect) to <html> whenever any of that changes, and also
 * mirrors reduce-motion into the effect layer.
 *
 * Free / default items are considered owned implicitly.
 */

export type Slot = CustomizationSlot;

const LS_KEY = "forma.customization.v1";

const DEFAULT_EQUIPPED: Record<Slot, string> = {
  theme: DEFAULT_THEME_ID,
  accent: "ac-brand",
  effect: "fx-auto",
  avatar: "l-signature",
  chatTheme: "t-default",
  frame: "fr-none",
  title: "ti-none",
  badge: "bd-none",
  colorMode: "cm-system",
  font: "fn-system",
};

type State = {
  owned: string[];
  equipped: Record<Slot, string>;
};

function defaultOwned(): string[] {
  return customizationItems.filter((i) => i.price === 0).map((i) => i.id);
}

function load(): State {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { owned: defaultOwned(), equipped: { ...DEFAULT_EQUIPPED } };
    const p = JSON.parse(raw) as Partial<State>;
    return {
      owned: Array.from(new Set([...(p.owned ?? []), ...defaultOwned()])),
      equipped: { ...DEFAULT_EQUIPPED, ...(p.equipped ?? {}) },
    };
  } catch {
    return { owned: defaultOwned(), equipped: { ...DEFAULT_EQUIPPED } };
  }
}

let state: State = load();
const listeners = new Set<() => void>();
function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* noop */
  }
}
function emit() {
  persist();
  listeners.forEach((l) => l());
}

/** merge an authoritative server bundle into local state */
function hydrate(remote: { owned?: string[]; equipped?: Record<string, string>; balance?: number }) {
  state = {
    owned: remote.owned ? Array.from(new Set([...remote.owned, ...defaultOwned()])) : state.owned,
    equipped: remote.equipped ? { ...DEFAULT_EQUIPPED, ...remote.equipped } : state.equipped,
  };
  emit();
  if (typeof remote.balance === "number") walletStore.setBalance(remote.balance);
}

export const customizationStore = {
  snapshot: () => state,
  isOwned: (id: string) => state.owned.includes(id),
  equippedId: (slot: Slot) => state.equipped[slot],
  isEquipped: (id: string, slot: Slot) => state.equipped[slot] === id,
  hydrate,

  /** pull the server bundle (API builds only) */
  refresh() {
    if (!API_ENABLED) return;
    api.customization.get().then(hydrate).catch(() => {});
  },

  /** buy an item — spends coins, adds to owned; pass autoEquip=true to also equip instantly */
  buy(item: CustomizationItem, autoEquip = false): boolean {
    if (state.owned.includes(item.id)) return false;
    if (!walletStore.spend(item.price, item.name, "purchase")) return false;
    state = {
      owned: [...state.owned, item.id],
      equipped: autoEquip ? { ...state.equipped, [item.slot]: item.id } : state.equipped,
    };
    emit();
    if (API_ENABLED) {
      api.customization.buy(item.id)
        .then((res) => {
          hydrate(res);
          // chain equip only after buy succeeds so the server owns the item first
          if (autoEquip) return api.customization.equip(item.id).then(hydrate);
        })
        .catch(() => customizationStore.refresh());
    }
    return true;
  },

  /** equip an owned item into its slot */
  equip(item: CustomizationItem) {
    if (!state.owned.includes(item.id)) return;
    state = { ...state, equipped: { ...state.equipped, [item.slot]: item.id } };
    emit();
    if (API_ENABLED) api.customization.equip(item.id).then(hydrate).catch(() => customizationStore.refresh());
  },

  /** direct slot set (used for the "none" pseudo-items and theme picker) */
  set(slot: Slot, id: string) {
    state = { ...state, equipped: { ...state.equipped, [slot]: id } };
    emit();
    if (API_ENABLED) api.customization.setSlot(slot, id).then(hydrate).catch(() => customizationStore.refresh());
  },

  reset() {
    state = { owned: defaultOwned(), equipped: { ...DEFAULT_EQUIPPED } };
    emit();
  },

  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === LS_KEY) {
      state = load();
      listeners.forEach((l) => l());
    }
  });
}

// ── resolve equipped → live theme config ────────────────────────────────────
function resolveEffect(themeId: string, effectId: string): ThemeEffect {
  if (effectId === "fx-auto") return THEME_MAP[themeId]?.effect ?? "none";
  const map: Record<string, ThemeEffect> = {
    "fx-none": "none",
    "fx-particles": "particles",
    "fx-scanlines": "scanlines",
    "fx-grain": "grain-heavy",
    "fx-glow": "glow",
    "fx-aurora": "aurora-fast",
  };
  return map[effectId] ?? "none";
}

// ── context ────────────────────────────────────────────────────────────────
interface CustomizationCtx {
  owned: string[];
  equipped: Record<Slot, string>;
  balance: number;
  isOwned: (id: string) => boolean;
  isEquipped: (id: string, slot: Slot) => boolean;
  equippedId: (slot: Slot) => string;
  buy: (item: CustomizationItem, autoEquip?: boolean) => boolean;
  equip: (item: CustomizationItem) => void;
  setSlot: (slot: Slot, id: string) => void;
  /** shortcut for setSlot("colorMode", id) */
  setColorMode: (id: "cm-system" | "cm-light" | "cm-dark") => void;
  reset: () => void;
}
const Ctx = createContext<CustomizationCtx | null>(null);

export function CustomizationProvider({
  children,
  reduceMotion = false,
  authKey,
}: {
  children: ReactNode;
  reduceMotion?: boolean;
  /** changes when auth status changes, so we re-pull the server bundle on login */
  authKey?: string;
}) {
  const snap = useSyncExternalStore(
    customizationStore.subscribe,
    customizationStore.snapshot,
    customizationStore.snapshot,
  );
  const balance = useWalletBalance();

  // pull the server-persisted wallet + owned / equipped set once on mount (API builds)
  useEffect(() => {
    walletStore.hydrateFromServer();
    customizationStore.refresh();
  }, [authKey]);

  // apply theme + color mode + font whenever equipped set changes
  useEffect(() => {
    const themeId = snap.equipped.theme;
    const accent = ACCENT_MAP[snap.equipped.accent];
    const effect = reduceMotion ? "none" : resolveEffect(themeId, snap.equipped.effect);
    const colorMode = snap.equipped.colorMode ?? "cm-system";
    const fontId = snap.equipped.font ?? "fn-system";

    applyTheme(themeId, {
      effect,
      accentOverride: accent && accent.price >= 0 && accent.id !== "ac-brand" ? accent.color : null,
    });

    const theme = THEME_MAP[themeId] ?? THEME_MAP[DEFAULT_THEME_ID];
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isLight = colorMode === "cm-light" || (colorMode === "cm-system" && !prefersDark);
    applyColorModeOverrides(isLight, theme.vars);

    applyFont(fontId);
  }, [
    snap.equipped.theme,
    snap.equipped.accent,
    snap.equipped.effect,
    snap.equipped.colorMode,
    snap.equipped.font,
    reduceMotion,
  ]);

  // when color mode is "system", re-apply whenever the OS preference flips
  useEffect(() => {
    const colorMode = snap.equipped.colorMode ?? "cm-system";
    if (colorMode !== "cm-system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const themeId = snap.equipped.theme;
      const theme = THEME_MAP[themeId] ?? THEME_MAP[DEFAULT_THEME_ID];
      applyColorModeOverrides(!mq.matches, theme.vars);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [snap.equipped.colorMode, snap.equipped.theme]);

  const value = useMemo<CustomizationCtx>(
    () => ({
      owned: snap.owned,
      equipped: snap.equipped,
      balance,
      isOwned: customizationStore.isOwned,
      isEquipped: customizationStore.isEquipped,
      equippedId: customizationStore.equippedId,
      buy: customizationStore.buy,
      equip: customizationStore.equip,
      setSlot: customizationStore.set,
      setColorMode: (id: "cm-system" | "cm-light" | "cm-dark") =>
        customizationStore.set("colorMode", id),
      reset: customizationStore.reset,
    }),
    [snap, balance],
  );

  return createElement(Ctx.Provider, { value }, children);
}

export function useCustomization(): CustomizationCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCustomization must be used inside <CustomizationProvider>");
  return ctx;
}

/** Convenience: the currently equipped item object for a slot. */
export function useEquippedItem(slot: Slot): CustomizationItem | undefined {
  const { equippedId } = useCustomization();
  const id = equippedId(slot);
  return customizationItems.find((i) => i.id === id);
}
