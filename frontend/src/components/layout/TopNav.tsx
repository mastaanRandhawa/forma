import { ReactNode, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { CoinBalance } from "../CoinBalance";
import { useProgression } from "../../api/settings";
import type { FeatureKey } from "../../api/types";

export type NavItem = {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
  feature?: FeatureKey;
  /** extra path prefixes that should also mark this item active */
  match?: string[];
};

/** Small geometric wordmark glyph — a soft chevron cut from the pink gradient. */
function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="h-[18px] w-auto" aria-hidden fill="none">
      <defs>
        <linearGradient id="forma-mark" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--accent-pink)" />
          <stop offset="1" stopColor="var(--accent-coral)" />
        </linearGradient>
      </defs>
      <path d="M5 23 L16 5 L27 23 L21.5 23 L16 13.5 L10.5 23 Z" fill="url(#forma-mark)" />
      <path d="M16 27 a10 10 0 0 1 -10 -10" stroke="var(--accent-pink)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Two bars that cross into an X when `open`. */
function BurgerIcon({ open, reduce }: { open: boolean; reduce: boolean | null }) {
  const t = reduce ? { duration: 0 } : { duration: 0.24, ease: [0.4, 0, 0.2, 1] as const };
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" aria-hidden>
      <motion.line
        x1="3" x2="17" y1="7" y2="7"
        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"
        animate={open ? { rotate: 45, y: 3 } : { rotate: 0, y: 0 }}
        style={{ originX: "10px", originY: "7px" }}
        transition={t}
      />
      <motion.line
        x1="3" x2="17" y1="13" y2="13"
        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"
        animate={open ? { rotate: -45, y: -3 } : { rotate: 0, y: 0 }}
        style={{ originX: "10px", originY: "13px" }}
        transition={t}
      />
    </svg>
  );
}

/** True once the page has scrolled past `threshold` px. rAF-throttled. */
function useScrolled(threshold = 10) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      setScrolled(window.scrollY > threshold);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [threshold]);
  return scrolled;
}

/**
 * TopNav — one floating pill for the whole logged-in app, modeled on the
 * tws-2 marque. It drops in on load, then condenses on scroll: a barely-there
 * bar at the top solidifies into a shorter glass pill — hairline border, deep
 * shadow and blur all easing in together. Wordmark left, primary destinations
 * centered with a spring "magic-move" indicator, wallet + profile right.
 * On phones the destinations collapse into a burger menu.
 */
export function TopNav({
  items,
  secondary,
  context,
}: {
  items: NavItem[];
  secondary: NavItem[];
  context?: ReactNode;
}) {
  const loc = useLocation();
  const reduce = useReducedMotion();
  const scrolled = useScrolled();
  const { has } = useProgression();
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = (n: NavItem) =>
    (n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to)) ||
    (n.match?.some((m) => loc.pathname.startsWith(m)) ?? false);
  // gated destinations drop out of the nav until unlocked (less on screen early)
  const visibleItems = items.filter((n) => !n.feature || has(n.feature));

  // close the mobile menu on navigation
  useEffect(() => setMenuOpen(false), [loc.pathname]);

  // close on Escape; lock body scroll while open
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const barState = scrolled
    ? {
        height: 56,
        background: "color-mix(in oklab, var(--background) 82%, transparent)",
        borderColor: "rgba(255, 255, 255, 0.08)",
        boxShadow:
          "0 20px 60px -30px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
      }
    : {
        height: 64,
        background: "color-mix(in oklab, var(--background) 30%, transparent)",
        borderColor: "rgba(255, 255, 255, 0.02)",
        boxShadow:
          "0 0 0 0 rgba(0, 0, 0, 0), inset 0 1px 0 rgba(255, 255, 255, 0)",
      };

  const menuItems = [...visibleItems, ...secondary, { to: "/settings", label: "settings", icon: <ProfileGlyph /> }];

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-2.5"
      initial={reduce ? false : { y: -22, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={
        reduce ? { duration: 0 } : { type: "spring", stiffness: 240, damping: 24, delay: 0.08 }
      }
    >
      <motion.div
        className="relative flex items-center justify-between rounded-full border px-3 pl-4 backdrop-blur-xl sm:pl-5"
        style={{ width: "min(72rem, 94vw)" }}
        animate={barState}
        transition={reduce ? { duration: 0 } : { duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* left — mark + wordmark */}
        <NavLink
          to="/dashboard"
          className="focus-ring group relative z-[2] flex shrink-0 items-center gap-2 rounded-pill"
        >
          <motion.span
            className="grid place-items-center"
            whileHover={reduce ? undefined : { scale: 1.05 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <Mark />
          </motion.span>
          <span className="text-[0.95rem] font-medium lowercase tracking-[0.01em] text-content-primary">
            forma
          </span>
        </NavLink>

        {/* center — primary destinations (hidden on phones) */}
        <LayoutGroup id="topnav">
          <nav
            className="hidden items-center gap-0 sm:flex lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:gap-0.5"
            aria-label="Primary"
          >
            {visibleItems.map((n) => {
              const active = isActive(n);
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  aria-current={active ? "page" : undefined}
                  className="focus-ring tactile group relative flex items-center gap-1.5 rounded-pill px-2 py-2 lg:px-3.5"
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-pill surface-recessed"
                      aria-hidden
                      transition={
                        reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }
                      }
                    />
                  )}
                  <span
                    className={`relative transition-colors duration-200 ${
                      active
                        ? "text-content-primary"
                        : "text-content-tertiary group-hover:text-content-secondary"
                    }`}
                    style={
                      active ? { filter: "drop-shadow(0 0 7px rgba(213,26,122,0.5))" } : undefined
                    }
                  >
                    {n.icon}
                  </span>
                  <span
                    className={`relative hidden text-[0.82rem] lowercase tracking-[0.02em] transition-colors duration-200 lg:inline ${
                      active
                        ? "text-content-primary"
                        : "text-content-tertiary group-hover:text-content-secondary"
                    }`}
                  >
                    {n.label}
                  </span>
                  <span
                    aria-hidden
                    className="relative ml-0.5 hidden text-content-tertiary/50 transition-transform duration-300 ease-out group-hover:translate-x-1 lg:inline"
                  >
                    ·
                  </span>
                </NavLink>
              );
            })}
          </nav>
        </LayoutGroup>

        {/* right — wallet + secondary + profile (sm+) / burger (phones) */}
        <div className="relative z-[2] flex shrink-0 items-center gap-1.5">
          {context && (
            <span className="label-instrument mr-1 hidden truncate xl:block">{context}</span>
          )}
          <span className="hidden sm:block">
            <CoinBalance />
          </span>
          {secondary.map((n) => {
            const active = isActive(n);
            return (
              <NavLink
                key={n.to}
                to={n.to}
                aria-label={n.label}
                title={n.label}
                aria-current={active ? "page" : undefined}
                className={`focus-ring tactile hidden h-9 w-9 place-items-center rounded-pill transition-colors sm:grid ${
                  active
                    ? "surface-recessed text-content-primary"
                    : "text-content-tertiary hover:text-content-secondary"
                }`}
              >
                {n.icon}
              </NavLink>
            );
          })}
          <NavLink
            to="/settings"
            aria-label="Profile"
            className="focus-ring hidden h-9 w-9 place-items-center rounded-pill surface-float sm:grid"
          >
            <span className="text-[0.8rem] font-medium text-content-primary">A</span>
          </NavLink>

          {/* burger — phones only */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="focus-ring tactile grid h-9 w-9 place-items-center rounded-pill surface-float text-content-primary sm:hidden"
          >
            <BurgerIcon open={menuOpen} reduce={reduce} />
          </button>
        </div>
      </motion.div>

      {/* mobile menu — dropdown sheet under the bar */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div className="sm:hidden" initial="hidden" animate="shown" exit="hidden">
            <motion.button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-30 bg-[rgba(12,6,12,0.5)] backdrop-blur-[2px]"
              variants={{ hidden: { opacity: 0 }, shown: { opacity: 1 } }}
              transition={{ duration: 0.2 }}
            />
            <motion.nav
              aria-label="Menu"
              className="absolute inset-x-4 top-[calc(100%+8px)] z-40 overflow-hidden rounded-[26px] border border-white/10 bg-[color-mix(in_oklab,var(--background)_88%,transparent)] p-2 shadow-[0_30px_70px_-24px_rgba(0,0,0,0.85)] backdrop-blur-xl"
              variants={{
                hidden: reduce
                  ? { opacity: 0 }
                  : { opacity: 0, y: -10, scale: 0.97 },
                shown: { opacity: 1, y: 0, scale: 1 },
              }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
            >
              <div className="mb-2 flex items-center justify-between px-2 pt-1">
                <span className="label-instrument">menu</span>
                <CoinBalance />
              </div>
              <ul className="space-y-0.5">
                {menuItems.map((n, i) => {
                  const active = isActive(n);
                  return (
                    <motion.li
                      key={n.to}
                      initial={reduce ? false : { opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: reduce ? 0 : 0.04 + i * 0.035, duration: 0.2 }}
                    >
                      <NavLink
                        to={n.to}
                        aria-current={active ? "page" : undefined}
                        className={`focus-ring tactile flex items-center gap-3 rounded-2xl px-3 py-3 text-[0.95rem] lowercase transition-colors ${
                          active
                            ? "surface-recessed text-content-primary"
                            : "text-content-secondary hover:text-content-primary"
                        }`}
                      >
                        <span
                          className={active ? "text-[var(--accent-pink)]" : "text-content-tertiary"}
                          style={
                            active
                              ? { filter: "drop-shadow(0 0 7px rgba(213,26,122,0.5))" }
                              : undefined
                          }
                        >
                          {n.icon}
                        </span>
                        {n.label}
                      </NavLink>
                    </motion.li>
                  );
                })}
              </ul>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

/** Small avatar chip used as the "settings" row glyph in the mobile menu. */
function ProfileGlyph() {
  return (
    <span className="grid h-[19px] w-[19px] place-items-center rounded-full surface-float text-[0.62rem] font-medium text-content-primary">
      A
    </span>
  );
}
