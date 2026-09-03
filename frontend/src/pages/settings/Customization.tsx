import { Link } from "react-router-dom";
import { Check, Lock, Monitor, Moon, Sun } from "lucide-react";
import { Section } from "../../components/settings/ui";
import { customizationItems, type CustomizationSlot } from "../../lib/data";
import { THEMES } from "../../lib/themes";
import { useCustomization } from "../../lib/customization";
import { useWallet } from "../../lib/wallet";

const RARITY_TEXT: Record<string, string> = {
  common: "text-content-tertiary",
  rare: "text-[var(--accent-cyan)]",
  epic: "text-[var(--accent-mauve)]",
  legendary: "text-[var(--accent-amber)]",
};

const OTHER_SLOTS: { slot: CustomizationSlot; title: string; desc: string }[] = [
  { slot: "effect", title: "ambient effect", desc: "the motion layer behind the interface. some themes ship their own." },
  { slot: "avatar", title: "kai's look", desc: "the gradient on kai's avatar in chat and on the coach orb." },
  { slot: "chatTheme", title: "chat skin", desc: "how the trainer conversation is styled." },
  { slot: "frame", title: "profile frame", desc: "the ring around your avatar in the top bar." },
  { slot: "title", title: "profile title", desc: "shown under your name across the app." },
  { slot: "badge", title: "profile badge", desc: "a small mark next to your name." },
];

const COLOR_MODES: { id: "cm-light" | "cm-dark" | "cm-system"; label: string; icon: typeof Sun }[] = [
  { id: "cm-light", label: "light", icon: Sun },
  { id: "cm-dark", label: "dark", icon: Moon },
  { id: "cm-system", label: "system", icon: Monitor },
];

function LockedNote({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <p className="mt-3 text-[0.76rem] text-content-tertiary">
      {count} locked ·{" "}
      <Link to="/store" className="text-content-secondary underline underline-offset-2">
        unlock in the store
      </Link>
    </p>
  );
}

function SlotGrid({ slot }: { slot: CustomizationSlot }) {
  const cz = useCustomization();
  const items = customizationItems.filter((i) => i.slot === slot);
  const locked = items.filter((i) => !cz.isOwned(i.id)).length;
  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => {
          const owned = cz.isOwned(item.id);
          const active = cz.isEquipped(item.id, item.slot);
          return (
            <button
              key={item.id}
              onClick={() => owned && cz.setSlot(item.slot, item.id)}
              disabled={!owned}
              title={owned ? item.name : `${item.name} — ${item.price} coins`}
              className={`focus-ring relative flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors ${
                active
                  ? "border-white/40 bg-white/[0.08]"
                  : owned
                    ? "border-white/12 hover:border-white/25"
                    : "border-white/8 opacity-50"
              }`}
            >
              <span
                className="h-6 w-6 shrink-0 rounded-md border border-white/15"
                style={{ background: item.swatch ?? "rgba(255,255,255,0.08)" }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.8rem] lowercase text-content-primary">{item.name}</span>
                <span className={`block text-[0.58rem] uppercase tracking-wide ${RARITY_TEXT[item.rarity]}`}>
                  {owned ? (active ? "equipped" : "owned") : `${item.price} coins`}
                </span>
              </span>
              {active && <Check size={12} strokeWidth={3} className="shrink-0 text-[var(--accent-lime)]" />}
              {!owned && <Lock size={11} className="shrink-0 text-content-tertiary" />}
            </button>
          );
        })}
      </div>
      <LockedNote count={locked} />
    </>
  );
}

export default function Customization() {
  const cz = useCustomization();
  const { balance } = useWallet();
  const ownedCount = customizationItems.filter((i) => cz.isOwned(i.id)).length;
  const accents = customizationItems.filter((i) => i.slot === "accent");
  const mode = (cz.equippedId("colorMode") ?? "cm-system") as "cm-light" | "cm-dark" | "cm-system";

  return (
    <div className="space-y-5">
      <Section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[0.95rem] lowercase text-content-primary">your customization</div>
            <div className="mt-0.5 text-[0.82rem] lowercase text-content-tertiary">
              {ownedCount} of {customizationItems.length} items unlocked ·{" "}
              <span className="num">{balance.toLocaleString()}</span> coins
            </div>
          </div>
          <Link
            to="/store"
            className="focus-ring tactile rounded-pill bg-white/[0.06] px-4 py-2 text-[0.82rem] lowercase text-content-primary transition-colors hover:bg-white/[0.12]"
          >
            open store
          </Link>
        </div>
      </Section>

      <Section
        title="appearance mode"
        description="light or dark is a switch, not a colour choice. every theme below works in both."
      >
        <div className="grid grid-cols-3 gap-2">
          {COLOR_MODES.map(({ id, label, icon: Icon }) => {
            const active = mode === id;
            return (
              <button
                key={id}
                onClick={() => cz.setColorMode(id)}
                className={`focus-ring tactile flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-3.5 text-center transition-colors ${
                  active ? "border-white/40 bg-white/[0.08]" : "border-white/10 hover:border-white/25"
                }`}
              >
                <Icon size={17} strokeWidth={1.75} className={active ? "text-content-primary" : "text-content-tertiary"} />
                <span className="text-[0.78rem] lowercase text-content-primary">{label}</span>
                <span className="text-[0.56rem] uppercase tracking-wide text-content-tertiary">
                  {active ? "active" : "free"}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        title="theme"
        description="a colour world — accent family, background hue, corner radius and ambient motion. all free, all render in light and dark."
      >
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {THEMES.map((t) => {
            const active = cz.equippedId("theme") === t.id;
            return (
              <button
                key={t.id}
                onClick={() => cz.setSlot("theme", t.id)}
                className="focus-ring tactile relative overflow-hidden rounded-2xl border p-3 text-left transition-colors"
                style={{
                  background: t.swatch,
                  borderColor: active ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.14)",
                }}
              >
                <span
                  className="block h-10 w-full rounded-lg backdrop-blur-sm"
                  style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.15)" }}
                />
                <span className="mt-2 block text-[0.76rem] lowercase" style={{ color: "rgba(255,255,255,0.96)" }}>
                  {t.name}
                </span>
                <span
                  className="mt-0.5 block text-[0.54rem] uppercase tracking-wide"
                  style={{ color: "rgba(255,255,255,0.62)" }}
                >
                  included
                </span>
                {active && <Check size={13} strokeWidth={3} className="absolute right-2 top-2 text-white" />}
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        title="accent colour"
        description="one colour for buttons, links, rings and active states. free, and carried into light mode with the contrast adjusted."
      >
        <div className="flex flex-wrap gap-2">
          {accents.map((a) => {
            const active = cz.equippedId("accent") === a.id;
            return (
              <button
                key={a.id}
                onClick={() => cz.setSlot("accent", a.id)}
                title={a.name}
                className={`focus-ring relative h-9 w-9 rounded-full border-2 transition-transform ${
                  active ? "scale-110 border-white/70" : "border-white/20 hover:scale-105"
                }`}
                style={{ background: a.swatch }}
              >
                {active && <Check size={13} strokeWidth={3} className="absolute inset-0 m-auto text-white" />}
              </button>
            );
          })}
        </div>
      </Section>

      {OTHER_SLOTS.map(({ slot, title, desc }) => (
        <Section key={slot} title={title} description={desc}>
          <SlotGrid slot={slot} />
        </Section>
      ))}
    </div>
  );
}
