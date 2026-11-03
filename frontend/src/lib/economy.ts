import { useMemo, useSyncExternalStore } from "react";
import { API_ENABLED, errorMessage, invalidateResource } from "../api/hooks";
import { api } from "../api/client";
import type {
  EconomyEvent,
  EconomyReward,
  EconomySnapshot,
  KaiReview,
} from "../api/types";
import { customizationStore } from "./customization";
import { customizationItems } from "./data";
import {
  ACTIVE_CHALLENGES,
  bundleById,
  bundlePrice,
  challengeById,
  challengeOrder,
  consumableById,
  dealsFor,
  defaultChallengeSlots,
  EARN_CAPS,
  FREEZE_ID,
  REROLL_ID,
  REROLLS_PER_WEEK,
  REVIEW_ID,
  STREAK_REPAIR,
  type Challenge,
  type Deal,
  type EarnKind,
  type WeekFacts,
} from "./economyConfig";
import { improvedLifts, sessionsPerGroup, trainedDays } from "./fitness";
import { buildLocalReview } from "./kaiReview";
import { fromKg } from "./lifecycle";
import { loadData, useFormaData, type CompletedSession, type FormaData } from "./localStore";
import {
  daysToFreeze,
  localDayOf,
  repairOption,
  streakLength,
  streakProtection,
  todayKey,
  weekKey,
  weekStart,
  type RepairOption,
} from "./streak";
import { walletStore } from "./wallet";

/**
 * Coin economy store: what a user holds beyond their balance, and the actions
 * that spend it. API mode mirrors the server's snapshot; the no-backend build runs
 * the same rules here against localStorage. Screens use `useEconomy()` and the
 * async actions below and never branch on which mode they're in.
 */

const LS_KEY = "forma.economy.v1";

type MuscleOf = Parameters<typeof sessionsPerGroup>[1];

interface State {
  // no-backend build
  inventory: Record<string, number>;
  protections: { date: string; source: "freeze" | "repair"; at: string }[];
  challengeWeek: { week: string; slots: string[]; retired: string[]; rerolls: number } | null;
  lastReview: KaiReview | null;
  // API mode: the server's latest word on everything above and more
  server: EconomySnapshot | null;
}

const empty = (): State => ({ inventory: {}, protections: [], challengeWeek: null, lastReview: null, server: null });

function load(): State {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? { ...empty(), ...(JSON.parse(raw) as Partial<State>) } : empty();
  } catch {
    return empty();
  }
}

const coveredDays = (s: State) => s.server?.protectedDays ?? s.protections.map((p) => p.date);

let state = load();
streakProtection.set(coveredDays(state));
const listeners = new Set<() => void>();

function emit() {
  state = { ...state };
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* private mode — in-memory only */
  }
  streakProtection.set(coveredDays(state));
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === LS_KEY) {
      state = load();
      streakProtection.set(coveredDays(state));
      listeners.forEach((l) => l());
    }
  });
}

export const economyStore = {
  snapshot: () => state,
  held: (id: string) => (state.server ? state.server.inventory[id] : state.inventory[id]) ?? 0,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};

// ── server mirror ───────────────────────────────────────────────────────────
export function applyServerEconomy(snapshot: EconomySnapshot) {
  // the dashboard caches its streak, and a freeze or repair just moved it
  if (state.server && state.server.streak.current !== snapshot.streak.current) invalidateResource("dashboard");
  state.server = snapshot;
  walletStore.applyServer(snapshot);
  emit();
}

/** Tell the user what just happened: a toast per payout, and one per freeze spent. */
export function announceRewards(rewards: EconomyReward[], events: EconomyEvent[] = []) {
  if (typeof window === "undefined") return;
  for (const r of rewards) {
    window.dispatchEvent(new CustomEvent("forma:coin-earn", { detail: r }));
  }
  for (const e of events) {
    if (e.type !== "freeze_used") continue;
    const n = e.days.length;
    window.dispatchEvent(
      new CustomEvent("forma:coin-earn", {
        detail: { amount: 0, kind: "freeze", label: `streak freeze used · ${n} day${n === 1 ? "" : "s"} covered` },
      }),
    );
  }
}

/** Sign-out, or another account signing in: this browser's copy is no longer theirs. */
export function clearEconomyCaches() {
  state = empty();
  emit();
  walletStore.reset();
}

// ── prices ──────────────────────────────────────────────────────────────────
const dealList = (): Deal[] => state.server?.deals ?? dealsFor(weekKey());

/** What an item costs this week: bundles depend on what you own, deals on the week. */
export function priceOf(itemId: string, owned: readonly string[] = customizationStore.snapshot().owned): number | null {
  const consumable = consumableById(itemId);
  if (consumable) return consumable.price;
  const bundle = bundleById(itemId);
  if (bundle) return bundlePrice(bundle, owned);
  const item = customizationItems.find((i) => i.id === itemId);
  if (!item) return null;
  return dealList().find((d) => d.itemId === itemId)?.price ?? item.price;
}

// ── streak freezes (no-backend build; the server does this in API mode) ─────
/** Spend freezes on any days missed since the last covered day. Safe to repeat. */
export function applyLocalFreezes(data: FormaData = loadData()): void {
  const held = state.inventory[FREEZE_ID] ?? 0;
  const covered = new Set(state.protections.map((p) => p.date));
  const days = daysToFreeze(trainedDays(data.sessions), covered, todayKey(), held);
  if (!days.length) return;
  state.inventory = { ...state.inventory, [FREEZE_ID]: held - days.length };
  const at = new Date().toISOString();
  state.protections = [...state.protections, ...days.map((date) => ({ date, source: "freeze" as const, at }))];
  emit();
  announceRewards([], [{ type: "freeze_used", days }]);
}

// ── the week's facts, which challenges measure ──────────────────────────────
function weekFacts(data: FormaData, muscleOf: MuscleOf | null): WeekFacts {
  const from = weekStart();
  const all: CompletedSession[] = [...data.sessions].sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));
  const inWeek = all.filter(
    (s) => Date.parse(s.finishedAt) >= from && s.exercises.some((e) => e.sets.some((x) => x.done && !x.warmup)),
  );
  const prs = inWeek.reduce((n, s) => {
    const prior = all.filter((p) => p.finishedAt < s.finishedAt);
    return n + improvedLifts(s, prior).length;
  }, 0);
  const inWeekDay = (at: string) => Date.parse(at) >= from;
  return {
    workouts: inWeek.length,
    volumeLb: Math.round(inWeek.reduce((n, s) => n + (s.units === "lb" ? s.volume : fromKg(s.volume, "lb")), 0)),
    earlySessions: inWeek.filter((s) => new Date(s.startedAt).getHours() < 9).length,
    muscleGroups: muscleOf ? sessionsPerGroup(inWeek, muscleOf, 7).filter((g) => g.sessions > 0).length : 0,
    workingSets: inWeek.reduce(
      (n, s) => n + s.exercises.reduce((m, e) => m + e.sets.filter((x) => x.done && !x.warmup).length, 0),
      0,
    ),
    prs,
    foodDays: new Set(data.meals.filter((m) => inWeekDay(m.at)).map((m) => localDayOf(m.at))).size,
    checkinDays: new Set(data.checkins.filter((c) => inWeekDay(c.createdAt)).map((c) => localDayOf(c.createdAt))).size,
    weekendSessions: inWeek.filter((s) => [0, 6].includes(new Date(s.startedAt).getDay())).length,
    longSessions: inWeek.filter((s) => s.durationSec >= 45 * 60).length,
  };
}

function localChallengeWeek() {
  const week = weekKey();
  return state.challengeWeek?.week === week
    ? state.challengeWeek
    : { week, slots: defaultChallengeSlots(week), retired: [] as string[], rerolls: 0 };
}

export const challengeKey = (id: string) => `${id}:${weekKey()}`;

/** The challenges this week's activity has completed. Rewards pays these. */
export function completedChallenges(data: FormaData, muscleOf: MuscleOf | null): Challenge[] {
  const facts = weekFacts(data, muscleOf);
  return localChallengeWeek().slots.flatMap((id) => {
    const c = challengeById(id);
    return c && c.measure(facts) >= c.target ? [c] : [];
  });
}

// ── actions ─────────────────────────────────────────────────────────────────
export type ActionResult = { ok: true } | { ok: false; error: string };
const fail = (error: string): ActionResult => ({ ok: false, error });
const OK: ActionResult = { ok: true };
const failure = (e: unknown) => fail(errorMessage(e instanceof Error ? e : new Error(String(e))));

/** Pull the server's snapshot, after a failure or when the store opens. */
export async function refreshEconomy() {
  if (!API_ENABLED) return;
  const snapshot = await api.economy.get(-new Date().getTimezoneOffset()).catch(() => null);
  if (snapshot) applyServerEconomy(snapshot);
}

/** Buy anything in the store. In API mode nothing changes until the server says so. */
export async function buyItem(itemId: string): Promise<ActionResult> {
  const price = priceOf(itemId);
  if (price == null) return fail("That item isn't in the store.");

  if (API_ENABLED) {
    try {
      const res = await api.economy.buy(itemId, price);
      customizationStore.hydrate(res.customization);
      applyServerEconomy(res.economy);
      announceRewards(res.rewards, res.events);
      return OK;
    } catch (e) {
      customizationStore.refresh();
      void refreshEconomy();
      return failure(e);
    }
  }

  const consumable = consumableById(itemId);
  if (consumable) {
    const held = state.inventory[itemId] ?? 0;
    if (held >= consumable.maxHold) return fail(`You can only hold ${consumable.maxHold} of those.`);
    if (!walletStore.spend(price, consumable.name)) return fail("Not enough coins.");
    state.inventory = { ...state.inventory, [itemId]: held + 1 };
    emit();
    // buying a freeze can rescue a streak that's already due one
    if (itemId === FREEZE_ID) applyLocalFreezes();
    return OK;
  }

  const { owned } = customizationStore.snapshot();
  const bundle = bundleById(itemId);
  if (bundle) {
    if (bundle.items.every((id) => owned.includes(id))) return fail("You already own everything in this.");
    if (!walletStore.spend(price, bundle.name)) return fail("Not enough coins.");
    customizationStore.grantLocal(bundle.items);
    return OK;
  }

  const item = customizationItems.find((i) => i.id === itemId);
  if (!item) return fail("That item isn't in the store.");
  if (owned.includes(itemId)) return fail("You already own this.");
  if (!walletStore.spend(price, item.name)) return fail("Not enough coins.");
  customizationStore.grantLocal([itemId], item);
  return OK;
}

export async function rerollChallenge(challengeId: string, muscleOf: MuscleOf | null): Promise<ActionResult> {
  if (API_ENABLED) {
    try {
      applyServerEconomy((await api.economy.reroll(challengeId)).economy);
      return OK;
    } catch (e) {
      return failure(e);
    }
  }

  const cw = localChallengeWeek();
  const facts = weekFacts(loadData(), muscleOf);
  const current = challengeById(challengeId);
  if (!current || !cw.slots.includes(challengeId)) return fail("That challenge isn't active this week.");
  if (current.measure(facts) >= current.target) return fail("That challenge is already done.");
  if (cw.rerolls >= REROLLS_PER_WEEK) return fail("No rerolls left this week.");
  if ((state.inventory[REROLL_ID] ?? 0) < 1) return fail("You don't have a Challenge Reroll.");

  const next = challengeOrder(cw.week).find((id) => {
    const c = challengeById(id);
    return c && !cw.slots.includes(id) && !cw.retired.includes(id) && c.measure(facts) < c.target;
  });
  if (!next) return fail("No other challenges available this week.");

  state.inventory = { ...state.inventory, [REROLL_ID]: state.inventory[REROLL_ID] - 1 };
  state.challengeWeek = {
    ...cw,
    slots: cw.slots.map((id) => (id === challengeId ? next : id)),
    retired: [...cw.retired, challengeId],
    rerolls: cw.rerolls + 1,
  };
  emit();
  return OK;
}

/** Charge for and apply a streak repair, but only when one can actually be applied. */
export async function repairStreak(): Promise<ActionResult> {
  if (API_ENABLED) {
    try {
      const res = await api.economy.repairStreak();
      applyServerEconomy(res.economy);
      announceRewards(res.rewards, res.events);
      return OK;
    } catch (e) {
      void refreshEconomy();
      return failure(e);
    }
  }

  const option = localRepairOption(loadData());
  if (!option) return fail("There's no streak to repair right now.");
  if (!walletStore.spend(STREAK_REPAIR.price, "Streak Repair")) return fail("Not enough coins.");
  const at = new Date().toISOString();
  state.protections = [...state.protections, ...option.days.map((date) => ({ date, source: "repair" as const, at }))];
  emit();
  return OK;
}

/** Spend a Kai Deep Review. Returns the report to show. */
export async function spendKaiReview(muscleOf: MuscleOf | null): Promise<{ review: KaiReview } | { error: string }> {
  if (API_ENABLED) {
    try {
      const res = await api.economy.kaiReview();
      applyServerEconomy(res.economy);
      return { review: res.review };
    } catch (e) {
      return { error: errorMessage(e instanceof Error ? e : new Error(String(e))) };
    }
  }
  const held = state.inventory[REVIEW_ID] ?? 0;
  if (held < 1) return { error: "You don't have a Kai Deep Review." };
  const review = buildLocalReview(loadData(), muscleOf);
  state.inventory = { ...state.inventory, [REVIEW_ID]: held - 1 };
  state.lastReview = review;
  emit();
  return { review };
}

function localRepairOption(data: FormaData): RepairOption | null {
  const cutoff = Date.now() - STREAK_REPAIR.cooldownDays * 86_400_000;
  if (state.protections.some((p) => p.source === "repair" && Date.parse(p.at) > cutoff)) return null;
  return repairOption(trainedDays(data.sessions), new Set(state.protections.map((p) => p.date)), todayKey());
}

// ── what the store shows ────────────────────────────────────────────────────
export interface ChallengeView {
  id: string;
  title: string;
  detail: string;
  target: number;
  reward: number;
  unit: string;
  tone: Challenge["tone"];
  current: number;
  done: boolean;
  paid: boolean;
}

export interface EconomyView {
  held: (id: string) => number;
  challenges: ChallengeView[];
  rerollsLeft: number;
  deals: Deal[];
  streak: number;
  repair: (RepairOption & { price: number }) | null;
  capFor: (kind: EarnKind) => { today: number; week: number; daily: number | null; weekly: number | null };
  lastReview: KaiReview | null;
}

export function useEconomy(muscleOf: MuscleOf | null): EconomyView {
  const snap = useSyncExternalStore(economyStore.subscribe, economyStore.snapshot, economyStore.snapshot);
  const walletSnap = useSyncExternalStore(walletStore.subscribe, walletStore.snapshot, walletStore.snapshot);
  const data = useFormaData();

  return useMemo<EconomyView>(() => {
    const s = snap.server;
    if (s) {
      return {
        held: (id) => s.inventory[id] ?? 0,
        challenges: s.challenges,
        rerollsLeft: s.rerollsLeft,
        deals: s.deals,
        streak: s.streak.current,
        repair: s.streak.repair,
        capFor: (kind) => {
          const cap = s.caps.find((c) => c.kind === kind);
          return { today: cap?.today ?? 0, week: cap?.week ?? 0, ...EARN_CAPS[kind] };
        },
        lastReview: s.lastReview,
      };
    }

    const facts = weekFacts(data, muscleOf);
    const cw = localChallengeWeek();
    const covered = new Set(snap.protections.map((p) => p.date));
    const option = localRepairOption(data);
    return {
      held: (id) => snap.inventory[id] ?? 0,
      challenges: cw.slots.slice(0, ACTIVE_CHALLENGES).flatMap((id) => {
        const c = challengeById(id);
        if (!c) return [];
        const current = Math.min(c.target, c.measure(facts));
        return [{
          id: c.id, title: c.title, detail: c.detail, target: c.target, reward: c.reward, unit: c.unit, tone: c.tone,
          current,
          done: current >= c.target,
          paid: walletStore.hasGrant(challengeKey(c.id)),
        }];
      }),
      rerollsLeft: Math.max(0, REROLLS_PER_WEEK - cw.rerolls),
      deals: dealsFor(cw.week),
      streak: streakLength(trainedDays(data.sessions), covered, todayKey()),
      repair: option ? { ...option, price: STREAK_REPAIR.price } : null,
      capFor: (kind) => ({ ...walletStore.capUsage(kind), ...EARN_CAPS[kind] }),
      lastReview: snap.lastReview,
    };
    // wallet changes move the challenge "paid" flags and the cap counts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, walletSnap, data, muscleOf]);
}
