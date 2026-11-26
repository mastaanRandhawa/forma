/**
 * App tour — a spotlight walkthrough.
 *
 *  • Elements opt in with a `data-tour="…"` attribute; the tour looks them up on
 *    demand, so it follows an element wherever layout puts it and skips a step
 *    whose element isn't on screen.
 *  • A dimmed overlay with an animated cut-out frames the element; the card
 *    goes on whichever side has room and never covers the element.
 *  • Everything is optional: Skip is always visible, Escape also skips, and the
 *    choice (done or skipped) is remembered per user, so it never restarts on
 *    login. Replay lives in Settings.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useAuth } from "../../api/auth";
import { TOUR_STEPS, type TourStep } from "./steps";

type Box = { x: number; y: number; w: number; h: number };
type Phase = "idle" | "welcome" | "running";

const Ctx = createContext<{ start: () => void; active: boolean }>({ start: () => {}, active: false });
export const useTour = () => useContext(Ctx);

const key = (uid: string) => `tour.v1.${uid}`;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const PAD = 8;
const EASE = [0.22, 1, 0.36, 1] as const;

const read = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode */
  }
};

/** First matching element that is actually on screen (two layouts may render the same target). */
function findTarget(id: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`);
  for (const n of nodes) {
    const r = n.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return n;
  }
  return null;
}

export function TourProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const reduce = useReducedMotion();
  const uid = user?.id ?? "demo";
  const [phase, setPhase] = useState<Phase>("idle");
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Box | null>(null);
  const run = useRef(0); // cancels stale step transitions
  const decided = useRef<string | null>(null);
  const el = useRef<HTMLElement | null>(null);

  // first visit: offer the tour once, from Home, after the screen has settled
  useEffect(() => {
    if (decided.current === uid || !pathname.startsWith("/dashboard") || read(key(uid))) return;
    const t = setTimeout(() => {
      decided.current = uid; // mark it only when it fires, so a cancelled timer (strict-mode double run) can retry
      setPhase((p) => (p === "idle" ? "welcome" : p));
    }, 1600);
    return () => clearTimeout(t);
  }, [uid, pathname]);

  const finishWith = useCallback(
    (how: "done" | "skipped") => {
      run.current++;
      el.current = null;
      setPhase("idle");
      setRect(null);
      write(key(uid), how);
      if (how === "done") nav("/dashboard");
    },
    [uid, nav],
  );

  const measure = useCallback(() => {
    const n = el.current;
    if (!n || !n.isConnected) return;
    const r = n.getBoundingClientRect();
    setRect({ x: r.left, y: r.top, w: r.width, h: r.height });
  }, []);

  /** Go to a step: switch screen, wait for the element to exist, bring it into view, then frame it. */
  const go = useCallback(
    async (i: number, dir: 1 | -1) => {
      const my = ++run.current;
      let n = i;
      while (n >= 0 && n < TOUR_STEPS.length) {
        const step: TourStep = TOUR_STEPS[n];
        if (window.location.pathname.replace(/\/$/, "").split("/").slice(-1)[0] !== step.route.slice(1) && !window.location.pathname.endsWith(step.route)) {
          nav(step.route);
        }
        let node: HTMLElement | null = null;
        for (let tries = 0; tries < 18 && !node; tries++) {
          await wait(100);
          if (run.current !== my) return;
          node = findTarget(step.target);
        }
        if (run.current !== my) return;
        if (node) {
          el.current = node;
          if (!step.pinned) node.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
          await wait(reduce ? 50 : 420); // let scrolling and entrance animations settle
          if (run.current !== my) return;
          setIndex(n);
          measure();
          return;
        }
        n += dir; // element isn't on this screen — skip the step
      }
      if (run.current === my) finishWith(dir === 1 ? "done" : "skipped");
    },
    [nav, measure, reduce, finishWith],
  );

  // keep the frame glued to the element while the page scrolls or resizes
  useEffect(() => {
    if (phase !== "running") return;
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", on, { passive: true, capture: true });
    window.addEventListener("resize", on);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", on, true);
      window.removeEventListener("resize", on);
    };
  }, [phase, measure]);

  useEffect(() => {
    if (phase === "idle") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finishWith("skipped");
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, finishWith]);

  const start = useCallback(() => {
    setPhase("running");
    setIndex(0);
    void go(0, 1);
  }, [go]);

  const next = () => (index + 1 >= TOUR_STEPS.length ? finishWith("done") : void go(index + 1, 1));
  const back = () => index > 0 && void go(index - 1, -1);

  const value = useMemo(() => ({ start, active: phase !== "idle" }), [start, phase]);
  const step = TOUR_STEPS[index];

  return (
    <Ctx.Provider value={value}>
      {children}
      <AnimatePresence>
        {phase === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-5 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-label="welcome tour"
          >
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="surface-float w-full max-w-[380px] p-7 text-center"
              style={{ background: "rgba(22,11,20,0.97)" }}
            >
              <h2 className="text-title text-content-primary lowercase">welcome to forma</h2>
              <p className="mx-auto mt-2 max-w-[30ch] text-[0.92rem] text-content-secondary">
                a 1-minute tour of the main features: your workout, quick logging, nutrition and Kai. go at your own pace, or skip it and replay it anytime from settings.
              </p>
              <button onClick={start} className="btn-primary mt-6 w-full px-6 py-3.5 text-[0.95rem]">
                start the tour
              </button>
              <button onClick={() => finishWith("skipped")} className="focus-ring mt-2 w-full rounded-pill px-6 py-3 text-[0.9rem] lowercase text-content-secondary hover:text-content-primary">
                skip for now
              </button>
            </motion.div>
          </motion.div>
        )}

        {phase === "running" && rect && step && (
          <div key="run" className="pointer-events-none fixed inset-0 z-[90]" role="dialog" aria-label="app tour">
            {/* click-catcher so the page underneath can't be poked mid-tour */}
            <div className="pointer-events-auto absolute inset-0" />
            {/* spotlight: a transparent box whose huge shadow dims everything else */}
            <div
              className="absolute rounded-[var(--radius-large)]"
              style={{
                left: rect.x - PAD,
                top: rect.y - PAD,
                width: rect.w + PAD * 2,
                height: rect.h + PAD * 2,
                boxShadow: "0 0 0 9999px rgba(8,4,8,0.68)",
                outline: "1.5px solid rgba(255,255,255,0.35)",
                transition: reduce ? "none" : "left .4s cubic-bezier(.22,1,.36,1), top .4s cubic-bezier(.22,1,.36,1), width .4s cubic-bezier(.22,1,.36,1), height .4s cubic-bezier(.22,1,.36,1)",
              }}
            />
            <StepCard step={step} index={index} total={TOUR_STEPS.length} rect={rect} onNext={next} onBack={back} onSkip={() => finishWith("skipped")} reduce={!!reduce} />
          </div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}

function StepCard({ step, index, total, rect, onNext, onBack, onSkip, reduce }: { step: TourStep; index: number; total: number; rect: Box; onNext: () => void; onBack: () => void; onSkip: () => void; reduce: boolean }) {
  const W = typeof window !== "undefined" ? window.innerWidth : 375;
  const H = typeof window !== "undefined" ? window.innerHeight : 812;
  const cw = Math.min(340, W - 32);
  const below = rect.y + rect.h + PAD + 16;
  const roomBelow = H - below;
  const placeBelow = roomBelow >= 200 || roomBelow >= rect.y - PAD;
  const top = placeBelow ? Math.min(below, H - 220) : Math.max(16, rect.y - PAD - 16 - 196);
  const left = Math.max(16, Math.min(rect.x + rect.w / 2 - cw / 2, W - cw - 16));
  const last = index + 1 >= total;
  return (
    <motion.div
      key={step.id}
      initial={reduce ? false : { opacity: 0, y: placeBelow ? 8 : -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="surface-float pointer-events-auto absolute p-5"
      style={{ left, top, width: cw, background: "rgba(22,11,20,0.97)" }}
    >
      <div className="label-instrument">step {index + 1} of {total}</div>
      <h3 className="mt-1 text-heading text-content-primary lowercase">{step.title}</h3>
      <p className="mt-1.5 text-[0.88rem] leading-relaxed text-content-secondary">{step.body}</p>
      <div className="mt-4 flex items-center gap-2">
        <button onClick={onSkip} className="focus-ring rounded-pill px-3 py-2 text-[0.82rem] lowercase text-content-tertiary hover:text-content-secondary">
          skip
        </button>
        <span className="flex-1" />
        {index > 0 && (
          <button onClick={onBack} className="focus-ring tactile rounded-pill bg-white/[0.08] px-4 py-2 text-[0.85rem] lowercase text-content-primary hover:bg-white/[0.14]">
            back
          </button>
        )}
        <button onClick={onNext} className="btn-primary px-5 py-2.5 text-[0.88rem]">
          {last ? "done" : "next"}
        </button>
      </div>
    </motion.div>
  );
}
