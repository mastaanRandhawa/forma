import { ReactNode, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { CoinBalance } from "../CoinBalance";

export type NavItem = { to: string; label: string; icon: ReactNode; end?: boolean };

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
  const isActive = (n: NavItem) =>
    n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to);

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
            whileHover={reduce ? undefined : { rotate: -8, scale: 1.06 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <Mark />
          </motion.span>
          <span className="hidden text-[0.95rem] font-medium lowercase tracking-[0.01em] text-content-primary sm:block">
            forma
          </span>
        </NavLink>

        {/* center — primary destinations */}
        <LayoutGroup id="topnav">
          <nav
            className="flex items-center gap-0 lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:gap-0.5"
            aria-label="Primary"
          >
            {items.map((n) => {
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

        {/* right — wallet + secondary + profile */}
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
            className="focus-ring grid h-9 w-9 place-items-center rounded-pill surface-float"
          >
            <span className="text-[0.8rem] font-medium text-content-primary">A</span>
          </NavLink>
        </div>
      </motion.div>
    </motion.header>
  );
}
