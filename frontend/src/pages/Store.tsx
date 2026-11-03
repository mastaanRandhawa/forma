import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Coins, Check, Lock, Sparkles, Palette, Droplet, Wand2, MessageSquare, UserRound,
  Flame, Target, Trophy, CalendarDays, Dumbbell, Sunrise, Medal, Apple, HeartPulse,
  Minus, Sun, Moon, Waves, Grip, Monitor, Circle, CircleDot, Award, Aperture, Crown,
  Zap, Cpu, Sparkle, Star, Gem, Type, Terminal, BookOpen, Layers,
  Snowflake, Dices, ScrollText, Megaphone, Leaf, ChartLine, PartyPopper, BellRing, Bell,
  Gamepad2, Radio, Rocket, Play, Package, Tag, RefreshCw, Wrench, ArrowUpRight,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Reveal } from "../components/Reveal";
import { PillSelector } from "../components/primitives";
import { DetailDrawer } from "../components/dashboard/DetailDrawer";
import { Celebration } from "../components/workout/Celebration";
import { customizationItems, type CustomizationItem, type CustomizationRarity } from "../lib/data";
import { useWallet } from "../lib/wallet";
import { useCustomization } from "../lib/customization";
import { EARN_WAYS, settleEconomy, type EarnWay } from "../lib/rewards";
import { buyItem, priceOf, repairStreak, rerollChallenge, useEconomy, spendKaiReview } from "../lib/economy";
import { BUNDLES, CONSUMABLES, FREEZE_ID, REROLL_ID, REVIEW_ID, type Bundle, type Consumable } from "../lib/economyConfig";
import { previewRestSound } from "../lib/restAlert";
import { useMuscleLookup } from "../lib/muscleLookup";
import type { KaiReview } from "../api/types";

// Themes, accent colours and light/dark are all free and managed in
// Settings › Customization — the store sells everything else.
const TABS = ["all", "boosts", "programs", "kai", "effects", "sounds", "chat", "profile", "font", "bundles"] as const;
const TAB_GROUP: Record<string, CustomizationItem["group"] | null> = {
  all: null, effects: "Effects", programs: "Programs", sounds: "Sounds",
  kai: "Kai", chat: "Chat", profile: "Profile", font: "Font",
};
const STORE_SLOTS = new Set([
  "effect", "avatar", "chatTheme", "frame", "title", "badge", "font",
  "persona", "restSound", "celebration", "program",
]);
const storeCatalogue = customizationItems.filter((i) => STORE_SLOTS.has(i.slot) && i.price > 0);

const GLYPHS: Record<string, LucideIcon> = {
  Wand2, Minus, Sun, Moon, Sparkles, Waves, Grip, Monitor, Circle, CircleDot, Award,
  Aperture, Crown, Sunrise, Dumbbell, Zap, Cpu, Trophy, Sparkle, Star, Gem, Palette,
  Type, Terminal, BookOpen, Flame, MessageSquare, Megaphone, Leaf, ChartLine, PartyPopper,
  BellRing, Bell, Gamepad2, Radio, Rocket, Coins, Snowflake, Dices, ScrollText,
};
const EARN_ICONS: Record<EarnWay["icon"], LucideIcon> = {
  dumbbell: Dumbbell, flame: Flame, target: Target, trophy: Trophy, calendar: CalendarDays,
  sparkles: Sparkles, sunrise: Sunrise, medal: Medal, apple: Apple, heart: HeartPulse,
};

const RARITY: Record<CustomizationRarity, { label: string; ring: string; text: string }> = {
  common: { label: "common", ring: "border-white/12", text: "text-content-tertiary" },
  rare: { label: "rare", ring: "border-[var(--accent-cyan)]/45", text: "text-[var(--accent-cyan)]" },
  epic: { label: "epic", ring: "border-[var(--accent-mauve)]/55", text: "text-[var(--accent-mauve)]" },
  legendary: { label: "legendary", ring: "border-[var(--accent-amber)]/70", text: "text-[var(--accent-amber)]" },
};

const GROUP_ICON: Record<CustomizationItem["group"], LucideIcon> = {
  Themes: Palette, Accents: Droplet, Effects: Wand2, Kai: UserRound, Chat: MessageSquare, Profile: Star,
  Appearance: Layers, Font: Type, Sounds: BellRing, Programs: Dumbbell,
};

const EASE = [0.22, 1, 0.36, 1] as const;
const BUY_BUTTON = "focus-ring tactile flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-[0.8rem] font-medium transition-colors";
const QUIET_BUTTON = "focus-ring tactile rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[0.76rem] lowercase text-content-secondary transition-colors hover:border-white/25 hover:text-content-primary disabled:cursor-not-allowed disabled:opacity-50";

type Celebrated = { id: string; name: string; rarity: CustomizationRarity; swatch?: string };

export default function Store() {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const wallet = useWallet();
  const cz = useCustomization();
  const muscleOf = useMuscleLookup();
  const economy = useEconomy(muscleOf);
  const [toast, setToast] = useState<string | null>(null);
  const [purchased, setPurchased] = useState<Celebrated | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [review, setReview] = useState<KaiReview | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const purchaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // pay anything that's due, and get the server's latest, whenever the store opens
  useEffect(() => settleEconomy(muscleOf), [muscleOf]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2400);
  };

  const shown = useMemo(() => {
    const group = TAB_GROUP[tab];
    return storeCatalogue.filter((i) => {
      if (group && i.group !== group) return false;
      if (ownedOnly && !cz.isOwned(i.id)) return false;
      return true;
    });
  }, [tab, ownedOnly, cz]);

  const featured = useMemo(
    () =>
      storeCatalogue
        .filter((i) => (i.rarity === "legendary" || i.rarity === "epic") && !cz.isOwned(i.id))
        .sort((a, b) => b.price - a.price)
        .slice(0, 3),
    [cz],
  );

  const dealItems = useMemo(
    () =>
      economy.deals.flatMap((d) => {
        const item = customizationItems.find((i) => i.id === d.itemId);
        return item && !cz.isOwned(item.id) ? [item] : [];
      }),
    [economy.deals, cz],
  );

  async function buy(id: string, celebrate: Celebrated | null, done?: string) {
    setBusy(id);
    const res = await buyItem(id);
    setBusy(null);
    if (!res.ok) return flash(res.error);
    if (done) flash(done);
    if (celebrate) {
      if (purchaseTimer.current) clearTimeout(purchaseTimer.current);
      setPurchased(celebrate);
      purchaseTimer.current = setTimeout(() => setPurchased(null), 2400);
    }
  }

  const onBuy = (item: CustomizationItem) =>
    buy(item.id, { id: item.id, name: item.name, rarity: item.rarity, swatch: item.swatch });

  function onEquip(item: CustomizationItem) {
    cz.equip(item);
    flash(`${item.name} equipped`);
  }

  function preview(item: CustomizationItem) {
    if (item.slot === "restSound") return previewRestSound(item.id);
    setPreviewing(null);
    requestAnimationFrame(() => setPreviewing(item.id));
    setTimeout(() => setPreviewing((cur) => (cur === item.id ? null : cur)), 2400);
  }

  async function onReroll(id: string) {
    setBusy(`reroll:${id}`);
    const res = await rerollChallenge(id, muscleOf);
    setBusy(null);
    flash(res.ok ? "New challenge in that slot" : res.error);
  }

  async function onRepair() {
    setBusy("repair");
    const res = await repairStreak();
    setBusy(null);
    flash(res.ok ? "Streak repaired" : res.error);
  }

  async function onReview() {
    setBusy("review");
    const res = await spendKaiReview(muscleOf);
    setBusy(null);
    if ("error" in res) return flash(res.error);
    setReview(res.review);
  }

  const lvl = wallet.level;
  const card = { cz, balance: wallet.balance, busy, onBuy, onEquip, onPreview: preview };
  const freezes = economy.held(FREEZE_ID);
  const rerolls = economy.held(REROLL_ID);
  const reviews = economy.held(REVIEW_ID);
  const showBoosts = (tab === "all" || tab === "boosts") && !ownedOnly;
  const showBundles = (tab === "all" || tab === "bundles") && !ownedOnly;

  return (
    <div className="mx-auto max-w-[960px]">
      <PageHeader eyebrow="unlockables" title="the" ghost="store">
        <div className="flex items-center gap-2 rounded-pill border border-[var(--accent-amber)]/25 bg-white/[0.05] py-2 pl-3 pr-4">
          <Coins size={16} strokeWidth={2} className="text-[var(--accent-amber)]" />
          <span className="num text-[1rem] font-medium tabular-nums text-content-primary" data-testid="store-balance">
            {wallet.balance.toLocaleString()}
          </span>
        </div>
      </PageHeader>

      {/* ── collector level ─────────────────────────────────────────────── */}
      <div className="mt-2 rounded-[var(--radius-large)] border border-white/10 bg-white/[0.04] p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="label-instrument text-[var(--accent-amber)]">
              level {lvl.level} · {lvl.title}
            </div>
            <div className="num mt-1 text-[1.7rem] font-semibold tabular-nums text-content-primary">
              {wallet.lifetimeEarned.toLocaleString()}
              <span className="ml-1.5 text-[0.8rem] font-normal text-content-tertiary">coins earned all-time</span>
            </div>
          </div>
          <div className="text-right text-[0.78rem] text-content-tertiary">
            <div>
              <span className="num text-content-secondary">{wallet.earnedThisWeek.toLocaleString()}</span> this week
            </div>
            {lvl.next ? (
              <div>
                <span className="num text-content-secondary">{lvl.toNext.toLocaleString()}</span> to {lvl.next.title}
              </div>
            ) : (
              <div>max level reached</div>
            )}
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-[var(--accent-amber)]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: lvl.progress }}
            transition={{ duration: reduce ? 0 : 0.7, ease: EASE }}
            style={{ transformOrigin: "left center" }}
          />
        </div>
      </div>

      {/* ── your kit ────────────────────────────────────────────────────── */}
      <SectionLabel>your kit</SectionLabel>
      <div className="grid gap-2.5 sm:grid-cols-3" data-testid="kit">
        <KitCard icon={Snowflake} tone="var(--accent-cyan)" title="streak freezes" count={freezes} detail={`${economy.streak}-day streak. Covers a missed day on its own.`} />
        <KitCard icon={Dices} tone="var(--accent-mauve)" title="challenge rerolls" count={rerolls} detail={`${economy.rerollsLeft} use${economy.rerollsLeft === 1 ? "" : "s"} left this week.`} />
        <KitCard icon={ScrollText} tone="var(--accent-amber)" title="kai reviews" count={reviews} detail="A full report on your last 28 days.">
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button onClick={onReview} disabled={reviews < 1 || busy === "review"} className={QUIET_BUTTON} aria-label="use a kai review">
              {busy === "review" ? "writing…" : "use one"}
            </button>
            {economy.lastReview && (
              <button onClick={() => setReview(economy.lastReview)} className={QUIET_BUTTON}>
                read the last one
              </button>
            )}
          </div>
        </KitCard>
      </div>

      {economy.repair && (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-medium)] border border-[var(--accent-amber)]/40 bg-[var(--accent-amber)]/[0.07] p-4" data-testid="streak-repair">
          <div className="flex items-start gap-3">
            <Wrench size={16} className="mt-0.5 shrink-0 text-[var(--accent-amber)]" aria-hidden />
            <div>
              <div className="text-[0.92rem] text-content-primary">
                your streak broke. repair it back to {economy.repair.restoresTo} days?
              </div>
              <div className="mt-0.5 text-[0.76rem] text-content-tertiary">
                Covers {economy.repair.days.length} missed day{economy.repair.days.length === 1 ? "" : "s"}. Available for a few days after a break, once a week.
              </div>
            </div>
          </div>
          <button
            onClick={onRepair}
            disabled={wallet.balance < economy.repair.price || busy === "repair"}
            className={`${BUY_BUTTON} !w-auto px-4 text-[var(--fill-on-color)] disabled:cursor-not-allowed disabled:opacity-50`}
            style={{ background: "var(--fill-coral)" }}
            aria-label="repair streak"
          >
            <Coins size={12} strokeWidth={2.5} /> {economy.repair.price}
          </button>
        </div>
      )}

      {/* ── weekly challenges ───────────────────────────────────────────── */}
      <SectionLabel>weekly challenges</SectionLabel>
      <div className="grid gap-2.5 sm:grid-cols-3" data-testid="challenges">
        {economy.challenges.map((c) => {
          const pct = Math.min(1, c.current / c.target);
          return (
            <div
              key={c.id}
              data-tone={c.tone}
              data-challenge={c.id}
              className="metric-card !rounded-[var(--radius-medium)] !p-4"
              data-variant="glow"
            >
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[0.92rem] text-content-primary">{c.title}</div>
                    <div className="mt-0.5 text-[0.76rem] text-content-tertiary">{c.detail}</div>
                  </div>
                  <span className="num shrink-0 text-[0.8rem] font-medium text-[var(--accent-lime)]">+{c.reward}</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[var(--accent-lime)]" style={{ width: `${pct * 100}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[0.72rem] text-content-tertiary">
                  <span className="num">
                    {c.current.toLocaleString()} / {c.target.toLocaleString()} {c.unit}
                  </span>
                  {c.paid ? (
                    <span className="flex items-center gap-1 text-[var(--accent-lime)]">
                      <Check size={11} strokeWidth={3} /> paid
                    </span>
                  ) : c.done ? (
                    <span className="text-[var(--accent-lime)]">done</span>
                  ) : rerolls > 0 && economy.rerollsLeft > 0 ? (
                    <button
                      onClick={() => onReroll(c.id)}
                      disabled={busy === `reroll:${c.id}`}
                      aria-label={`reroll ${c.title}`}
                      className="focus-ring flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-1 text-[0.7rem] text-content-secondary hover:bg-white/[0.12]"
                    >
                      <RefreshCw size={10} aria-hidden /> reroll
                    </button>
                  ) : (
                    <span>resets monday</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── ways to earn ────────────────────────────────────────────────── */}
      <SectionLabel>ways to earn</SectionLabel>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {EARN_WAYS.map((w) => {
          const Icon = EARN_ICONS[w.icon];
          const cap = w.cap ? economy.capFor(w.cap) : null;
          return (
            <div
              key={w.id}
              data-earn={w.id}
              className="flex items-start gap-3 rounded-[var(--radius-medium)] border border-white/8 bg-white/[0.03] p-3.5"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[var(--accent-amber)]/12 text-[var(--accent-amber)]">
                <Icon size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[0.9rem] text-content-primary">{w.label}</span>
                  <span className="num text-[0.8rem] font-medium text-[var(--accent-lime)]">{w.coins}</span>
                </div>
                <div className="mt-0.5 text-[0.76rem] leading-snug text-content-tertiary">
                  {w.detail} · {w.cadence}
                </div>
                {cap && (
                  <div className="num mt-1 text-[0.68rem] text-content-tertiary">
                    {cap.daily != null ? `${cap.today} / ${cap.daily} today` : ""}
                    {cap.daily != null && cap.weekly != null ? " · " : ""}
                    {cap.weekly != null ? `${cap.week} / ${cap.weekly} this week` : ""}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── this week's deals ───────────────────────────────────────────── */}
      {dealItems.length > 0 && (
        <>
          <SectionLabel>
            <span className="inline-flex items-center gap-1.5">
              <Tag size={12} aria-hidden /> this week's deals · ends monday
            </span>
          </SectionLabel>
          <div className="grid gap-3 sm:grid-cols-3" data-testid="deals">
            {dealItems.map((item) => (
              <ItemCard key={item.id} item={item} {...card} />
            ))}
          </div>
        </>
      )}

      {/* ── featured ────────────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <>
          <SectionLabel>save toward</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-3">
            {featured.map((item) => (
              <ItemCard key={item.id} item={item} {...card} big />
            ))}
          </div>
        </>
      )}

      {/* ── shop ────────────────────────────────────────────────────────── */}
      <SectionLabel>shop</SectionLabel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar min-w-0 max-w-full overflow-x-auto">
          <PillSelector options={TABS} value={tab} onChange={setTab} />
        </div>
        <button
          onClick={() => setOwnedOnly((v) => !v)}
          className={`focus-ring rounded-full border px-3 py-1.5 text-[0.76rem] lowercase transition-colors ${
            ownedOnly
              ? "border-white/25 bg-white/[0.08] text-content-primary"
              : "border-white/10 text-content-tertiary hover:text-content-secondary"
          }`}
        >
          owned only
        </button>
      </div>

      <Reveal onView key={`${tab}-${ownedOnly}`} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {showBoosts &&
          CONSUMABLES.map((c) => (
            <ConsumableCard
              key={c.id}
              item={c}
              held={economy.held(c.id)}
              balance={wallet.balance}
              busy={busy === c.id}
              onBuy={() => buy(c.id, null, `${c.name} added to your kit`)}
            />
          ))}
        {showBundles &&
          BUNDLES.map((b) => (
            <BundleCard
              key={b.id}
              bundle={b}
              owned={cz.owned}
              balance={wallet.balance}
              busy={busy === b.id}
              onBuy={() => buy(b.id, { id: b.id, name: b.name, rarity: b.rarity })}
            />
          ))}
        {tab !== "boosts" &&
          tab !== "bundles" &&
          shown.map((item) => <ItemCard key={item.id} item={item} {...card} />)}
        {tab !== "boosts" && tab !== "bundles" && shown.length === 0 && (
          <p className="col-span-full py-8 text-center text-[0.85rem] text-content-tertiary">nothing here yet.</p>
        )}
      </Reveal>

      {/* ── recent activity ─────────────────────────────────────────────── */}
      {wallet.ledger.length > 0 && (
        <>
          <SectionLabel>recent activity</SectionLabel>
          <ul className="divide-y divide-white/[0.06] rounded-[var(--radius-medium)] border border-white/8 bg-white/[0.03] px-4" data-testid="ledger">
            {wallet.ledger.slice(0, 8).map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-[0.82rem]">
                <span className="min-w-0 truncate lowercase text-content-secondary">{e.label}</span>
                <span className={`num shrink-0 tabular-nums ${e.type === "earn" ? "text-[var(--accent-lime)]" : "text-content-tertiary"}`}>
                  {e.type === "earn" ? "+" : "−"}
                  {e.amount.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <DetailDrawer open={!!review} onClose={() => setReview(null)} eyebrow="kai deep review" title={review?.title ?? ""}>
        {review && (
          <div className="space-y-4" data-testid="kai-review">
            {review.sections.map((s) => (
              <section key={s.heading}>
                <h3 className="label-instrument mb-1">{s.heading}</h3>
                <p className="text-[0.88rem] leading-relaxed text-content-secondary">{s.body}</p>
              </section>
            ))}
          </div>
        )}
      </DetailDrawer>

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="fixed bottom-24 left-1/2 z-[75] flex -translate-x-1/2 items-center gap-2 rounded-pill border border-white/10 bg-[rgba(24,13,20,0.96)] px-4 py-2.5 text-[0.85rem] lowercase text-content-primary shadow-[0_16px_40px_-14px_rgba(0,0,0,0.6)] backdrop-blur-md"
          >
            <Check size={14} strokeWidth={2.5} className="text-[var(--accent-lime)]" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {purchased && <PurchaseCelebration key={purchased.id} item={purchased} reduce={!!reduce} />}
      </AnimatePresence>

      {previewing && (
        <div className="pointer-events-none fixed inset-0 z-[150]">
          <Celebration key={previewing} variant={previewing} />
        </div>
      )}
    </div>
  );
}

const RARITY_COLOR: Record<CustomizationRarity, string> = {
  common: "var(--accent-cyan)",
  rare: "var(--accent-cyan)",
  epic: "var(--accent-mauve)",
  legendary: "var(--accent-amber)",
};

function PurchaseCelebration({ item, reduce }: { item: Celebrated; reduce: boolean }) {
  const color = RARITY_COLOR[item.rarity];

  // 20 particles at evenly spaced angles + slight jitter
  const particles = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => {
        const angle = (i / 20) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const dist = 90 + Math.random() * 130;
        const size = 6 + Math.random() * 7;
        const delay = Math.random() * 0.08;
        return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, size, delay };
      }),
    [],
  );

  if (reduce) return null;

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2.4, times: [0, 0.04, 0.72, 1], ease: "easeInOut" }}
    >
      {/* dark backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      {/* large radial burst ring */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 360, height: 360, background: `radial-gradient(circle, ${color}28, transparent 70%)` }}
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: [0, 3], opacity: [0.9, 0] }}
        transition={{ duration: 0.7, ease: [0.2, 0, 0.4, 1] }}
      />

      {/* secondary ring pulse */}
      <motion.div
        className="absolute rounded-full border"
        style={{ width: 180, height: 180, borderColor: color, opacity: 0.7 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0.2, 2.2], opacity: [0.8, 0] }}
        transition={{ duration: 0.9, ease: "easeOut", delay: 0.05 }}
      />

      {/* coin particles */}
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{
            x: [0, p.x * 0.6, p.x],
            y: [0, p.y * 0.6 - 20, p.y + 30],
            scale: [0, 1, 0],
            opacity: [1, 1, 0],
          }}
          transition={{ duration: 1.1 + Math.random() * 0.3, ease: "easeOut", delay: p.delay }}
        >
          <svg viewBox="0 0 12 12" width={p.size} height={p.size} aria-hidden>
            <circle cx={6} cy={6} r={5.5} fill={color} fillOpacity={0.85} />
            <circle cx={6} cy={6} r={3.5} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1} />
          </svg>
        </motion.div>
      ))}

      {/* center text card */}
      <motion.div
        className="relative flex flex-col items-center gap-2 text-center"
        initial={{ scale: 0.55, opacity: 0, y: 12 }}
        animate={{ scale: [0.55, 1.06, 1], opacity: [0, 1, 1, 0], y: [12, 0, 0, -8] }}
        transition={{ duration: 2.4, times: [0, 0.1, 0.65, 1], ease: EASE }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: [0, 1.3, 1], rotate: [-15, 4, 0] }}
          transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
          className="mb-1 grid h-16 w-16 place-items-center rounded-2xl border border-white/15 bg-white/[0.08] shadow-[0_0_32px_-8px_var(--glow)]"
          style={{ ["--glow" as string]: color }}
        >
          {item.swatch ? (
            <span className="h-10 w-10 rounded-xl" style={{ background: item.swatch }} />
          ) : (
            <Star size={28} strokeWidth={1.6} style={{ color }} />
          )}
        </motion.div>

        <div
          className="label-instrument"
          style={{ color, letterSpacing: "0.14em", fontSize: "0.65rem", textTransform: "uppercase" }}
        >
          {item.rarity} · unlocked
        </div>
        <div
          style={{
            fontSize: "clamp(1.7rem, 5vw, 2.3rem)",
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
          }}
        >
          {item.name}
        </div>
        <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginTop: "0.2rem" }}>
          added to your collection
        </div>
      </motion.div>
    </motion.div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="label-instrument mb-3 mt-9 text-content-secondary">{children}</h2>;
}

function KitCard({
  icon: Icon,
  tone,
  title,
  count,
  detail,
  children,
}: {
  icon: LucideIcon;
  tone: string;
  title: string;
  count: number;
  detail: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-medium)] border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/[0.06]" style={{ color: tone }}>
          <Icon size={15} aria-hidden />
        </span>
        <span className="num text-[1.3rem] font-semibold tabular-nums text-content-primary" data-kit={title}>
          {count}
        </span>
        <span className="text-[0.82rem] lowercase text-content-secondary">{title}</span>
      </div>
      <p className="mt-1.5 text-[0.76rem] leading-snug text-content-tertiary">{detail}</p>
      {children}
    </div>
  );
}

/** Price + "you can't afford this yet", shared by every buy button. */
function BuyLabel({ price, balance, was }: { price: number; balance: number; was?: number | null }) {
  if (balance < price) {
    return (
      <>
        <Lock size={11} strokeWidth={2.5} /> {(price - balance).toLocaleString()} more
      </>
    );
  }
  return (
    <>
      <Coins size={12} strokeWidth={2.5} /> {price.toLocaleString()}
      {was != null && was !== price && <s className="ml-1 font-normal opacity-60">{was.toLocaleString()}</s>}
    </>
  );
}

const buyButtonClass = (affordable: boolean) =>
  `${BUY_BUTTON} ${affordable ? "text-[var(--fill-on-color)]" : "cursor-not-allowed bg-white/[0.04] text-content-tertiary"}`;
const buyButtonStyle = (affordable: boolean) => (affordable ? { background: "var(--fill-coral)" } : undefined);

function ConsumableCard({
  item,
  held,
  balance,
  busy,
  onBuy,
}: {
  item: Consumable;
  held: number;
  balance: number;
  busy: boolean;
  onBuy: () => void;
}) {
  const Glyph = GLYPHS[item.glyph] ?? Package;
  const full = held >= item.maxHold;
  const affordable = balance >= item.price;
  return (
    <div className="relative flex flex-col rounded-[var(--radius-medium)] border border-[var(--accent-cyan)]/45 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.06] text-content-secondary">
          <Glyph size={16} strokeWidth={1.9} />
        </span>
        <span className="label-instrument !text-[0.56rem] text-[var(--accent-cyan)]">
          {held} / {item.maxHold} held
        </span>
      </div>
      <div className="mt-3 text-[0.95rem] lowercase text-content-primary">{item.name}</div>
      <div className="mt-0.5 text-[0.78rem] leading-snug text-content-tertiary">{item.detail}</div>
      <div className="mt-auto pt-4">
        <button
          onClick={onBuy}
          disabled={!affordable || full || busy}
          aria-label={`buy ${item.name}`}
          className={full ? `${BUY_BUTTON} cursor-not-allowed bg-white/[0.04] text-content-tertiary` : buyButtonClass(affordable)}
          style={full ? undefined : buyButtonStyle(affordable)}
        >
          {full ? "kit full" : <BuyLabel price={item.price} balance={balance} />}
        </button>
      </div>
    </div>
  );
}

function BundleCard({
  bundle,
  owned,
  balance,
  busy,
  onBuy,
}: {
  bundle: Bundle;
  owned: readonly string[];
  balance: number;
  busy: boolean;
  onBuy: () => void;
}) {
  const r = RARITY[bundle.rarity];
  const missing = bundle.items.filter((id) => !owned.includes(id));
  const price = priceOf(bundle.id, owned) ?? 0;
  const list = missing.reduce((n, id) => n + (customizationItems.find((i) => i.id === id)?.price ?? 0), 0);
  const affordable = balance >= price;
  return (
    <div
      data-bundle={bundle.id}
      className={`relative flex flex-col rounded-[var(--radius-medium)] border bg-white/[0.03] p-4 ${r.ring} ${
        bundle.rarity === "legendary" ? "shadow-[0_0_28px_-10px_var(--accent-amber)]" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.06] text-content-secondary">
          <Package size={16} strokeWidth={1.9} />
        </span>
        <span className={`label-instrument !text-[0.56rem] ${r.text}`}>bundle · 25% off</span>
      </div>
      <div className="mt-3 text-[0.95rem] lowercase text-content-primary">{bundle.name}</div>
      <div className="mt-0.5 text-[0.78rem] leading-snug text-content-tertiary">{bundle.detail}</div>
      <div className="mt-2 text-[0.7rem] lowercase text-content-tertiary">
        {bundle.items.length - missing.length} of {bundle.items.length} owned
      </div>
      <div className="mt-auto pt-4">
        {missing.length === 0 ? (
          <div className="flex w-full items-center justify-center gap-1.5 rounded-full border border-[var(--accent-lime)]/40 py-2 text-[0.8rem] lowercase text-[var(--accent-lime)]">
            <Check size={12} strokeWidth={2.5} /> owned
          </div>
        ) : (
          <button
            onClick={onBuy}
            disabled={!affordable || busy}
            aria-label={`buy ${bundle.name}`}
            className={buyButtonClass(affordable)}
            style={buyButtonStyle(affordable)}
          >
            <BuyLabel price={price} balance={balance} was={list} />
          </button>
        )}
      </div>
    </div>
  );
}

function ItemCard({
  item,
  cz,
  balance,
  busy,
  onBuy,
  onEquip,
  onPreview,
  big,
}: {
  item: CustomizationItem;
  cz: ReturnType<typeof useCustomization>;
  balance: number;
  busy: string | null;
  onBuy: (i: CustomizationItem) => void;
  onEquip: (i: CustomizationItem) => void;
  onPreview: (i: CustomizationItem) => void;
  big?: boolean;
}) {
  const owned = cz.isOwned(item.id);
  const isProgram = item.slot === "program";
  const equipped = item.slot !== "program" && cz.isEquipped(item.id, item.slot);
  const price = priceOf(item.id) ?? item.price;
  const affordable = balance >= price;
  const previewable = item.slot === "restSound" || item.slot === "celebration";
  const r = RARITY[item.rarity];
  const Glyph = item.glyph ? GLYPHS[item.glyph] ?? GROUP_ICON[item.group] : GROUP_ICON[item.group];

  return (
    <div
      data-item={item.id}
      className={`relative flex flex-col rounded-[var(--radius-medium)] border bg-white/[0.03] p-4 transition-colors ${
        equipped ? "border-white/30" : r.ring
      } ${item.rarity === "legendary" ? "shadow-[0_0_28px_-10px_var(--accent-amber)]" : ""} ${big ? "sm:p-5" : ""}`}
    >
      <div className="flex items-start justify-between">
        {item.swatch ? (
          <span
            className={`rounded-xl border border-white/15 ${big ? "h-12 w-12" : "h-9 w-9"}`}
            style={{ background: item.swatch }}
          />
        ) : (
          <span className={`grid place-items-center rounded-xl bg-white/[0.06] text-content-secondary ${big ? "h-12 w-12" : "h-9 w-9"}`}>
            <Glyph size={big ? 20 : 16} strokeWidth={1.9} />
          </span>
        )}
        <span className={`label-instrument !text-[0.56rem] ${equipped || price !== item.price ? "text-[var(--accent-lime)]" : r.text}`}>
          {equipped ? "equipped" : price !== item.price ? "25% off" : r.label}
        </span>
      </div>

      <div className={`mt-3 lowercase text-content-primary ${big ? "text-[1.05rem]" : "text-[0.95rem]"}`}>
        {item.name}
      </div>
      <div className="mt-0.5 text-[0.78rem] leading-snug text-content-tertiary">{item.detail}</div>

      <div className="mt-auto flex items-center gap-2 pt-4">
        {previewable && (
          <button
            onClick={() => onPreview(item)}
            aria-label={`preview ${item.name}`}
            className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.05] text-content-secondary hover:border-white/25 hover:text-content-primary"
          >
            <Play size={12} aria-hidden />
          </button>
        )}
        {owned && isProgram ? (
          <Link
            to="/workouts"
            className={`${BUY_BUTTON} border border-white/12 bg-white/[0.05] lowercase text-content-secondary hover:border-white/25 hover:text-content-primary`}
          >
            in your plan library <ArrowUpRight size={12} aria-hidden />
          </Link>
        ) : owned ? (
          <button
            onClick={() => onEquip(item)}
            disabled={equipped}
            aria-label={`equip ${item.name}`}
            className={`focus-ring tactile flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-[0.8rem] lowercase transition-colors ${
              equipped
                ? "border border-[var(--accent-lime)]/40 text-[var(--accent-lime)]"
                : "border border-white/12 bg-white/[0.05] text-content-secondary hover:border-white/25 hover:text-content-primary"
            }`}
          >
            {equipped && <Check size={12} strokeWidth={2.5} />}
            {equipped ? "equipped" : "equip"}
          </button>
        ) : (
          <button
            onClick={() => onBuy(item)}
            disabled={!affordable || busy === item.id}
            aria-label={`buy ${item.name}`}
            className={buyButtonClass(affordable)}
            style={buyButtonStyle(affordable)}
          >
            <BuyLabel price={price} balance={balance} was={item.price} />
          </button>
        )}
      </div>
    </div>
  );
}
