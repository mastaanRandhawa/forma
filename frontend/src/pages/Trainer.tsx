import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, Coins, MessageSquare } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Reveal } from "../components/Reveal";
import { KaiOrb, coachMood } from "../components/KaiOrb";
import type { AIState } from "../components/smoothui/ai-core";
import { BarProgress } from "../components/health/ProgressIndicator";
import { Skel } from "../components/skeleton/Skeleton";
import { ErrorState } from "../components/ErrorState";
import { suggestedPrompts as mockPrompts } from "../lib/data";
import {
  useChatHistory,
  useSuggestedPrompts,
  useTrainer,
  useDashboard,
  API_ENABLED,
  errorMessage,
} from "../api/hooks";
import { api } from "../api";
import type { ChatMessage } from "../api/types";

type Msg = { from: "trainer" | "user"; text: string; time: string };

const EASE = [0.22, 1, 0.36, 1] as const;

const timeLabel = (iso?: string) =>
  new Date(iso ?? Date.now())
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    .toLowerCase();

const toMsg = (m: ChatMessage): Msg => ({
  from: m.role === "trainer" ? "trainer" : "user",
  text: m.content,
  time: timeLabel(m.createdAt),
});

function KaiAvatar({ state = "done", size = 28 }: { state?: AIState; size?: number }) {
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
  const history = useChatHistory();
  const prompts = useSuggestedPrompts();
  const trainer = useTrainer();
  const dashboard = useDashboard();
  const mood = coachMood(dashboard.data);

  const [thread, setThread] = useState<Msg[]>([]);
  const [seeded, setSeeded] = useState(false);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // seed the thread once from the fetched history
  useEffect(() => {
    if (!seeded && history.data) {
      setThread(history.data.map(toMsg));
      setSeeded(true);
    }
  }, [history.data, seeded]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [thread, typing, reduce]);

  const chips = prompts.data ?? mockPrompts;

  const styleRows = useMemo<[string, number][]>(() => {
    const t = trainer.data;
    return [
      ["directness", t?.coachingDirectness ?? 0.7],
      ["warmth", t ? 1 - t.formStrictness : 0.55],
      ["detail", t?.coachingDetail ?? 0.8],
      ["intensity", t?.motivationLevel ?? 0.45],
      ["humor", t?.humor ?? 0.3],
    ];
  }, [trainer.data]);

  async function send(text: string) {
    if (!text.trim() || typing) return;
    setThread((t) => [...t, { from: "user", text, time: timeLabel() }]);
    setDraft("");
    setTyping(true);

    if (API_ENABLED) {
      try {
        const turn = await api.chat.send(text);
        setThread((t) => [...t, toMsg(turn.trainerMessage)]);
      } catch (e) {
        setThread((t) => [
          ...t,
          { from: "trainer", text: errorMessage(e as Error), time: timeLabel() },
        ]);
      } finally {
        setTyping(false);
      }
      return;
    }

    window.setTimeout(() => {
      setTyping(false);
      setThread((t) => [
        ...t,
        {
          from: "trainer",
          text: "Got it. I've logged that and I'll factor it into tomorrow's session, so expect a lighter top set and an extra warm-up ramp.",
          time: timeLabel(),
        },
      ]);
    }, 1400);
  }

  return (
    <div className="mx-auto grid max-w-[1120px] gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <PageHeader eyebrow="trainer" title={trainer.data?.name?.toLowerCase() ?? "kai"} />

        <Reveal className="ai-card flex h-[64vh] min-h-[460px] flex-col overflow-hidden">
          {/* header bar */}
          <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-5 py-3.5">
            <KaiAvatar size={36} state={typing ? "thinking" : mood} />
            <div className="min-w-0">
              <div className="text-[0.92rem] text-content-primary">{trainer.data?.name?.toLowerCase() ?? "kai"}</div>
              <div className="num flex items-center gap-1.5 text-[0.7rem] text-content-tertiary">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-lime)]" />
                online · replies in seconds
              </div>
            </div>
          </div>

          {/* messages */}
          <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto px-5 py-4">
            {history.initialLoading ? (
              <div className="space-y-3">
                <Skel className="h-14 w-3/4 rounded-2xl" />
                <Skel className="ml-auto h-10 w-1/2 rounded-2xl" />
                <Skel className="h-20 w-4/5 rounded-2xl" />
              </div>
            ) : history.error && thread.length === 0 ? (
              <ErrorState message={errorMessage(history.error)} onRetry={history.refetch} className="mt-6" />
            ) : thread.length === 0 && !typing ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <KaiAvatar size={52} state={mood} />
                <div className="text-[0.98rem] lowercase text-content-primary">say hi to kai</div>
                <p className="max-w-[32ch] text-[0.85rem] leading-relaxed text-content-secondary">
                  ask about today's session, your form, an injury, or how a lift is progressing.
                </p>
              </div>
            ) : (
              <>
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
                      <span className="w-7 shrink-0">{!mine && !grouped ? <KaiAvatar /> : null}</span>
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
              </>
            )}
          </div>

          {/* quick replies + composer */}
          <div className="border-t border-white/[0.06] px-4 py-3">
            <div className="no-scrollbar mb-2.5 flex gap-2 overflow-x-auto">
              {chips.map((p) => (
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
            {styleRows.map(([label, v]) => (
              <div key={label}>
                <div className="label-instrument mb-1.5">{label}</div>
                <BarProgress
                  fraction={v}
                  color="var(--accent-mauve)"
                  height={8}
                  ariaLabel={`${label} ${Math.round(v * 100)} percent`}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-[0.78rem]">
            <span className="text-content-tertiary">voice · {(trainer.data?.voiceId ?? "v-marcus").replace(/^v-/, "")}</span>
            <span className="text-content-tertiary">look · {(trainer.data?.avatarId ?? "l-signature").replace(/^l-/, "")}</span>
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
          <p className="mt-3 flex items-start gap-2 text-[0.92rem] leading-relaxed text-content-secondary">
            <MessageSquare size={14} strokeWidth={1.9} className="mt-1 shrink-0 text-content-tertiary" />
            Your squat depth averaged 92% of parallel last week, up from 85%. Keeping the tempo
            controlled is paying off.
          </p>
        </Reveal>
      </aside>
    </div>
  );
}
