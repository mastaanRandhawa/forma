import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Coins, Check, Lock, Sparkles, Palette, Droplet, Wand2, MessageSquare, UserRound,
  Flame, Target, Trophy, CalendarDays, Dumbbell, Sunrise, Medal,
  Minus, Sun, Waves, Grip, Monitor, Circle, CircleDot, Award, Aperture, Crown,
  Zap, Cpu, Sparkle, Star, Gem,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Reveal } from "../components/Reveal";
import { PillSelector } from "../components/primitives";
import { customizationItems, type CustomizationItem, type CustomizationRarity } from "../lib/data";
import { useWallet } from "../lib/wallet";
import { useCustomization } from "../lib/customization";
import { EARN_WAYS, useChallenges, challengeStore, type EarnWay } from "../lib/rewards";

const TABS = ["all", "themes", "accents", "effects", "kai", "chat", "profile"] as const;
const TAB_GROUP: Record<string, CustomizationItem["group"] | null> = {
  all: null, themes: "Themes", accents: "Accents", effects: "Effects",
  kai: "Kai", chat: "Chat", profile: "Profile",
};

const GLYPHS: Record<string, LucideIcon> = {
  Wand2, Minus, Sun, Sparkles, Waves, Grip, Monitor, Circle, CircleDot, Award,
  Aperture, Crown, Sunrise, Dumbbell, Zap, Cpu, Trophy, Sparkle, Star, Gem, Palette,
};
const EARN_ICONS: Record<EarnWay["icon"], LucideIcon> = {
  dumbbell: Dumbbell, flame: Flame, target: Target, trophy: Trophy, calendar: CalendarDays,
  sparkles: Sparkles, sunrise: Sunrise, medal: Medal,
};

const RARITY: Record<CustomizationRarity, { label: string; ring: string; text: string }> = {
  common: { label: "common", ring: "border-white/12", text: "text-content-tertiary" },
  rare: { label: "rare", ring: "border-[var(--accent-cyan)]/45", text: "text-[var(--accent-cyan)]" },
  epic: { label: "epic", ring: "border-[var(--accent-mauve)]/55", text: "text-[var(--accent-mauve)]" },
  legendary: { label: "legendary", ring: "border-[var(--accent-amber)]/70", text: "text-[var(--accent-amber)]" },
};

const GROUP_ICON: Record<CustomizationItem["group"], LucideIcon> = {
  Themes: Palette, Accents: Droplet, Effects: Wand2, Kai: UserRound, Chat: MessageSquare, Profile: Star,
};

const EASE = [0.22, 1, 0.36, 1] as const;

export default function Store() {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const wallet = useWallet();
  const cz = useCustomization();
  const challenges = useChallenges();
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2000);
  };

  const shown = useMemo(() => {
    const group = TAB_GROUP[tab];
    return customizationItems.filter((i) => {
      if (group && i.group !== group) return false;
      if (ownedOnly && !cz.isOwned(i.id)) return false;
      return true;
    });
  }, [tab, ownedOnly, cz]);

  const featured = useMemo(
    () =>
      customizationItems
        .filter((i) => (i.rarity === "legendary" || i.rarity === "epic") && !cz.isOwned(i.id))
        .slice(0, 3),
    [cz],
  );

  function onBuy(item: CustomizationItem) {
    if (cz.isOwned(item.id)) return;
    if (wallet.balance < item.price) return;
    if (cz.buy(item, true)) {
      flash(`${item.name} unlocked and equipped`);
    }
  }
  function onEquip(item: CustomizationItem) {
    cz.equip(item);
    flash(`${item.name} equipped`);
  }

  const lvl = wallet.level;

  return (
    <div className="mx-auto max-w-[960px]">
      <PageHeader eyebrow="unlockables" title="the" ghost="store">
        <div className="flex items-center gap-2 rounded-pill border border-[var(--accent-amber)]/25 bg-white/[0.05] py-2 pl-3 pr-4">
          <Coins size={16} strokeWidth={2} className="text-[var(--accent-amber)]" />
          <span className="num text-[1rem] font-medium tabular-nums text-content-primary">
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
            {lvl.next ? (
              <>
                <span className="num text-content-secondary">{lvl.toNext.toLocaleString()}</span> to{" "}
                {lvl.next.title}
              </>
            ) : (
              "max level reached"
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

      {/* ── ways to earn ────────────────────────────────────────────────── */}
      <SectionLabel>ways to earn</SectionLabel>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {EARN_WAYS.map((w) => {
          const Icon = EARN_ICONS[w.icon];
          return (
            <div
              key={w.id}
              className="flex items-start gap-3 rounded-[var(--radius-medium)] border border-white/8 bg-white/[0.03] p-3.5"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[var(--accent-amber)]/12 text-[var(--accent-amber)]">
                <Icon size={15} />
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[0.9rem] text-content-primary">{w.label}</span>
                  <span className="num text-[0.8rem] font-medium text-[var(--accent-lime)]">{w.coins}</span>
                </div>
                <div className="mt-0.5 text-[0.76rem] leading-snug text-content-tertiary">
                  {w.detail} · {w.cadence}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── weekly challenges ───────────────────────────────────────────── */}
      <SectionLabel>weekly challenges</SectionLabel>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {challenges.map((c) => {
          const pct = Math.min(1, c.current / c.target);
          return (
            <div
              key={c.id}
              data-tone={c.tone}
              className="metric-card !rounded-[var(--radius-medium)] !p-4"
              data-variant="glow"
            >
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[0.92rem] text-content-primary">{c.title}</div>
                    <div className="mt-0.5 text-[0.76rem] text-content-tertiary">{c.detail}</div>
                  </div>
                  <span className="num shrink-0 text-[0.8rem] font-medium text-[var(--accent-lime)]">
                    +{c.reward}
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[var(--accent-lime)]"
                    style={{ width: `${pct * 100}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[0.72rem] text-content-tertiary">
                  <span className="num">
                    {c.current.toLocaleString()} / {c.target.toLocaleString()} {c.unit}
                  </span>
                  {c.done && !c.claimed ? (
                    <button
                      onClick={() => {
                        challengeStore.claim(c.id);
                        flash(`Challenge complete · +${c.reward}`);
                      }}
                      className="focus-ring rounded-full bg-[var(--accent-lime)]/15 px-2.5 py-1 text-[0.72rem] font-medium text-[var(--accent-lime)]"
                    >
                      claim
                    </button>
                  ) : c.claimed ? (
                    <span className="flex items-center gap-1 text-[var(--accent-lime)]">
                      <Check size={11} strokeWidth={3} /> claimed
                    </span>
                  ) : (
                    <span>{c.expires}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── featured ────────────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <>
          <SectionLabel>save toward</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-3">
            {featured.map((item) => (
              <ItemCard key={item.id} item={item} cz={cz} balance={wallet.balance} onBuy={onBuy} onEquip={onEquip} big />
            ))}
          </div>
        </>
      )}

      {/* ── shop ────────────────────────────────────────────────────────── */}
      <SectionLabel>shop</SectionLabel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PillSelector options={TABS} value={tab} onChange={setTab} />
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
        {shown.map((item) => (
          <ItemCard key={item.id} item={item} cz={cz} balance={wallet.balance} onBuy={onBuy} onEquip={onEquip} />
        ))}
        {shown.length === 0 && (
          <p className="col-span-full py-8 text-center text-[0.85rem] text-content-tertiary">
            nothing here yet.
          </p>
        )}
      </Reveal>

      <AnimatePresence>
        {toast && (
          <motion.div
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
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="label-instrument mb-3 mt-9 text-content-secondary">{children}</h2>;
}

function ItemCard({
  item,
  cz,
  balance,
  onBuy,
  onEquip,
  big,
}: {
  item: CustomizationItem;
  cz: ReturnType<typeof useCustomization>;
  balance: number;
  onBuy: (i: CustomizationItem) => void;
  onEquip: (i: CustomizationItem) => void;
  big?: boolean;
}) {
  const owned = cz.isOwned(item.id);
  const equipped = cz.isEquipped(item.id, item.slot);
  const affordable = balance >= item.price;
  const r = RARITY[item.rarity];
  const Glyph = item.glyph ? GLYPHS[item.glyph] ?? GROUP_ICON[item.group] : GROUP_ICON[item.group];

  return (
    <div
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
        <span className={`label-instrument !text-[0.56rem] ${equipped ? "text-[var(--accent-lime)]" : r.text}`}>
          {equipped ? "equipped" : r.label}
        </span>
      </div>

      <div className={`mt-3 lowercase text-content-primary ${big ? "text-[1.05rem]" : "text-[0.95rem]"}`}>
        {item.name}
      </div>
      <div className="mt-0.5 text-[0.78rem] leading-snug text-content-tertiary">{item.detail}</div>

      <div className="mt-auto pt-4">
        {owned ? (
          <button
            onClick={() => onEquip(item)}
            disabled={equipped}
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
            disabled={!affordable}
            className={`focus-ring tactile flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-[0.8rem] font-medium transition-colors ${
              affordable ? "text-[var(--fill-on-color)]" : "cursor-not-allowed bg-white/[0.04] text-content-tertiary"
            }`}
            style={affordable ? { background: "var(--fill-coral)" } : undefined}
          >
            {affordable ? (
              <>
                <Coins size={12} strokeWidth={2.5} /> {item.price.toLocaleString()}
              </>
            ) : (
              <>
                <Lock size={11} strokeWidth={2.5} /> {(item.price - balance).toLocaleString()} more
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
