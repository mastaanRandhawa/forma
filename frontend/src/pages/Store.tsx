import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Coins, Mic, Sparkles, Palette, MessageSquare, Check, Lock } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Reveal } from "../components/Reveal";
import { PillSelector } from "../components/primitives";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Skel } from "../components/skeleton/Skeleton";
import { type StoreCategory, type StoreItem } from "../lib/data";
import { useWalletBalance, walletStore } from "../lib/wallet";
import { useStoreItems, useWallet, API_ENABLED, errorMessage } from "../api/hooks";
import { api } from "../api";

const TABS = ["all", "voices", "styles", "looks", "themes"] as const;
const TAB_TO_CAT: Record<string, StoreCategory | null> = {
  all: null,
  voices: "voice",
  styles: "personality",
  looks: "look",
  themes: "theme",
};

const CAT_ICON: Record<StoreCategory, typeof Mic> = {
  voice: Mic,
  personality: Sparkles,
  look: Palette,
  theme: MessageSquare,
};

const CAT_TONE: Record<StoreCategory, string> = {
  voice: "cyan",
  personality: "amber",
  look: "mauve",
  theme: "violet",
};

const EASE = [0.22, 1, 0.36, 1] as const;

export default function Store() {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const catalogue = useStoreItems();
  const walletRes = useWallet();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [seeded, setSeeded] = useState(false);
  const balance = useWalletBalance();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!seeded && catalogue.data) {
      setItems(catalogue.data as StoreItem[]);
      setSeeded(true);
    }
  }, [catalogue.data, seeded]);

  const shown = useMemo(() => {
    const cat = TAB_TO_CAT[tab];
    return cat ? items.filter((i) => i.category === cat) : items;
  }, [items, tab]);

  async function buy(item: StoreItem) {
    if (item.owned || balance < item.price) return;
    walletStore.spend(item.price);
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, owned: true } : i)));
    setToast(`${item.name} unlocked`);
    setTimeout(() => setToast(null), 2200);
    if (API_ENABLED) {
      await api.store.buy(item.id).catch(() => {});
      catalogue.refetch();
    }
  }

  async function equip(item: StoreItem) {
    if (!item.owned) return;
    setItems((list) =>
      list.map((i) => (i.category === item.category ? { ...i, equipped: i.id === item.id } : i)),
    );
    setToast(`${item.name} equipped`);
    setTimeout(() => setToast(null), 1800);
    if (API_ENABLED) {
      await api.store.equip(item.id).catch(() => {});
      catalogue.refetch();
    }
  }

  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeader eyebrow="trainer" title="kai" ghost="store">
        <div className="flex items-center gap-2 rounded-pill border border-white/10 bg-white/[0.05] py-2 pl-3 pr-4">
          <Coins size={16} strokeWidth={2} className="text-[var(--accent-amber)]" />
          <span className="num text-[1rem] font-medium tabular-nums text-content-primary">
            {balance.toLocaleString()}
          </span>
        </div>
      </PageHeader>

      <p className="max-w-[54ch] text-[0.92rem] leading-relaxed text-content-secondary">
        Spend coins to change how Kai sounds, coaches and looks. You earn coins from
        finished workouts, streaks and hit goals.
      </p>
      {walletRes.data && (
        <div className="num mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.76rem] text-content-tertiary">
          <span className="text-[var(--accent-lime)]">+{walletRes.data.earnedThisWeek} this week</span>
          {walletRes.data.recent.map((r) => (
            <span key={r.id}>
              {r.label} <span className="text-[var(--accent-lime)]">+{r.amount}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-7">
        <PillSelector options={TABS} value={tab} onChange={setTab} />
      </div>

      {catalogue.initialLoading ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skel key={i} className="h-[168px] rounded-[var(--radius-medium)]" />
          ))}
        </div>
      ) : catalogue.error && items.length === 0 ? (
        <ErrorState className="mt-6" message={errorMessage(catalogue.error)} onRetry={catalogue.refetch} />
      ) : shown.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="nothing here yet"
          body="new voices, personalities, looks and chat themes land in the store as they're released."
          icon={<Sparkles size={18} strokeWidth={1.75} />}
        />
      ) : (
        <Reveal onView key={tab} className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((item) => {
          const Icon = CAT_ICON[item.category];
          const affordable = balance >= item.price;
          return (
            <div
              key={item.id}
              data-tone={CAT_TONE[item.category]}
              data-variant="glow"
              className={`metric-card lift !rounded-[var(--radius-medium)] !p-4 ${
                item.equipped ? "!border-white/25" : ""
              }`}
            >
              <div className="relative z-10 flex h-full flex-col">
                <div className="flex items-start justify-between">
                  {item.swatch ? (
                    <span
                      className="h-9 w-9 rounded-xl border border-white/15"
                      style={{ background: item.swatch }}
                    />
                  ) : (
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.06] text-content-secondary">
                      <Icon size={16} strokeWidth={1.9} />
                    </span>
                  )}
                  {item.equipped && (
                    <span className="label-instrument !text-[0.6rem]" style={{ color: "var(--accent-lime)" }}>
                      equipped
                    </span>
                  )}
                </div>

                <div className="mt-3 text-[0.95rem] lowercase text-content-primary">{item.name}</div>
                <div className="mt-0.5 text-[0.78rem] leading-snug text-content-tertiary">{item.detail}</div>

                <div className="mt-auto pt-4">
                  {item.owned ? (
                    <button
                      onClick={() => equip(item)}
                      disabled={item.equipped}
                      className={`focus-ring tactile flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-[0.8rem] lowercase transition-colors ${
                        item.equipped
                          ? "border border-[var(--accent-lime)]/40 text-[var(--accent-lime)]"
                          : "border border-white/12 bg-white/[0.05] text-content-secondary hover:border-white/25 hover:text-content-primary"
                      }`}
                    >
                      {item.equipped && <Check size={12} strokeWidth={2.5} />}
                      {item.equipped ? "equipped" : "equip"}
                    </button>
                  ) : (
                    <button
                      onClick={() => buy(item)}
                      disabled={!affordable}
                      className={`focus-ring tactile flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-[0.8rem] font-medium transition-colors ${
                        affordable
                          ? "text-[var(--fill-on-color)]"
                          : "cursor-not-allowed bg-white/[0.04] text-content-tertiary"
                      }`}
                      style={affordable ? { background: "var(--fill-coral)" } : undefined}
                    >
                      {affordable ? (
                        <>
                          <Coins size={12} strokeWidth={2.5} /> {item.price}
                        </>
                      ) : (
                        <>
                          <Lock size={11} strokeWidth={2.5} /> {item.price - balance} more
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
          })}
        </Reveal>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="fixed bottom-6 left-1/2 z-[75] flex -translate-x-1/2 items-center gap-2 rounded-pill border border-white/10 bg-[rgba(24,13,20,0.96)] px-4 py-2.5 text-[0.85rem] lowercase text-content-primary shadow-[0_16px_40px_-14px_rgba(0,0,0,0.6)] backdrop-blur-md"
          >
            <Check size={14} strokeWidth={2.5} className="text-[var(--accent-lime)]" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
