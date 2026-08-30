import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, Coins } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Reveal } from "../components/Reveal";
import { KaiOrb } from "../components/KaiOrb";
import type { AIState } from "../components/smoothui/ai-core";
import { BarProgress } from "../components/health/ProgressIndicator";
import { chatThread, suggestedPrompts } from "../lib/data";

type Msg = { from: "trainer" | "user"; text: string; time: string };

const EASE = [0.22, 1, 0.36, 1] as const;

function nowLabel() {
  return new Date()
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    .toLowerCase();
}

function KaiAvatar({ state = "idle", size = 28 }: { state?: AIState; size?: number }) {
  return <KaiOrb size={size} state={state} />;
}

function TypingBubble() {
  return (
    <div className="flex items-end gap-2">
      <KaiAvatar state="thinking" />
      <div className="surface-recessed flex items-center gap-1 rounded-2xl rounded-bl-md px-4 py-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-content-tertiary"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Trainer() {
  const reduce = useReducedMotion();
  const [thread, setThread] = useState<Msg[]>(chatThread);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [thread, typing, reduce]);

  function send(text: string) {
    if (!text.trim() || typing) return;
    setThread((t) => [...t, { from: "user", text, time: nowLabel() }]);
    setDraft("");
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setThread((t) => [
        ...t,
        {
          from: "trainer",
          text: "Got it. I've logged that and I'll factor it into tomorrow's session, so expect a lighter top set and an extra warm-up ramp.",
          time: nowLabel(),
        },
      ]);
    }, 1400);
  }

  return (
    <div className="mx-auto grid max-w-[1120px] gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <PageHeader eyebrow="trainer" title="kai" />

        <Reveal className="ai-card flex h-[64vh] min-h-[460px] flex-col overflow-hidden">
          {/* header bar */}
          <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-5 py-3.5">
            <KaiAvatar size={36} state={typing ? "thinking" : "idle"} />
            <div className="min-w-0">
              <div className="text-[0.92rem] text-content-primary">kai</div>
              <div className="num flex items-center gap-1.5 text-[0.7rem] text-content-tertiary">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-lime)]" />
                online · replies in seconds
              </div>
            </div>
          </div>

          {/* messages */}
          <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto px-5 py-4">
            <div className="mb-3 text-center">
              <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.1em] text-content-tertiary">
                today
              </span>
            </div>

            {thread.map((m, i) => {
              const prev = thread[i - 1];
              const grouped = prev?.from === m.from;
              const next = thread[i + 1];
              const last = next?.from !== m.from;
              const mine = m.from === "user";
              return (
                <div
                  key={i}
                  className={`msg-in flex items-end gap-2 ${grouped ? "mt-0.5" : "mt-3"} ${
                    mine ? "flex-row-reverse" : ""
                  }`}
                >
                  <span className="w-7 shrink-0">
                    {!mine && !grouped ? <KaiAvatar /> : null}
                  </span>
                  <div className={`flex max-w-[78%] flex-col ${mine ? "items-end" : "items-start"}`}>
                    <div
                      className={`px-4 py-2.5 text-[0.92rem] leading-relaxed ${
                        mine
                          ? "surface-float rounded-2xl rounded-br-md text-content-primary"
                          : "surface-recessed rounded-2xl rounded-bl-md text-content-secondary"
                      }`}
                    >
                      {m.text}
                    </div>
                    {last && (
                      <span className="num mt-1 px-1 text-[0.66rem] text-content-tertiary">{m.time}</span>
                    )}
                  </div>
                </div>
              );
            })}

            <AnimatePresence>
              {typing && (
                <motion.div
                  className="mt-3"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: EASE }}
                >
                  <TypingBubble />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* quick replies + composer */}
          <div className="border-t border-white/[0.06] px-4 py-3">
            <div className="no-scrollbar mb-2.5 flex gap-2 overflow-x-auto">
              {suggestedPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  disabled={typing}
                  className="focus-ring tactile shrink-0 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[0.78rem] lowercase text-content-secondary transition-colors hover:border-white/20 hover:text-content-primary disabled:opacity-40"
                >
                  {p}
                </button>
              ))}
            </div>
            <form
              className="island flex w-full !gap-1 !p-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                send(draft);
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="message kai…"
                className="flex-1 bg-transparent px-4 text-[0.9rem] text-content-primary outline-none placeholder:text-content-tertiary"
              />
              <button
                type="submit"
                aria-label="send"
                disabled={!draft.trim() || typing}
                className="btn-white focus-ring tactile h-10 w-10 shrink-0 disabled:opacity-40"
              >
                <ArrowUp size={16} strokeWidth={2.5} />
              </button>
            </form>
          </div>
        </Reveal>
      </div>

      <aside className="space-y-8">
        <Reveal onView delay={0.08}>
          <div className="label-soft lowercase">coaching style</div>
          <div className="mt-4 space-y-3.5">
            {([
              ["directness", 0.7],
              ["warmth", 0.55],
              ["detail", 0.8],
              ["intensity", 0.45],
              ["humor", 0.3],
            ] as [string, number][]).map(([label, v]) => (
              <div key={label}>
                <div className="label-instrument mb-1.5">{label}</div>
                <BarProgress fraction={v} color="var(--accent-mauve)" height={8} ariaLabel={`${label} ${Math.round(v * 100)} percent`} />
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-[0.78rem]">
            <span className="text-content-tertiary">voice · marcus</span>
            <span className="text-content-tertiary">look · signature</span>
          </div>
          <Link
            to="/store"
            className="focus-ring tactile mt-3 flex items-center justify-center gap-2 rounded-pill border border-white/12 bg-white/[0.05] py-2.5 text-[0.82rem] lowercase text-content-primary transition-colors hover:border-white/25"
          >
            <Coins size={13} strokeWidth={2} className="text-[var(--accent-amber)]" />
            customize kai · store
          </Link>
        </Reveal>

        <Reveal onView delay={0.14}>
          <div className="label-soft lowercase">recent insight</div>
          <p className="mt-3 text-[0.92rem] leading-relaxed text-content-secondary">
            Your squat depth averaged 92% of parallel last week, up from 85%. Keeping the
            tempo controlled is paying off.
          </p>
        </Reveal>
      </aside>
    </div>
  );
}
