import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, Plus, Check, SlidersHorizontal, Coins, MessageSquare } from "lucide-react";
import { KaiOrb, coachMood } from "../components/KaiOrb";
import { Skel } from "../components/skeleton/Skeleton";
import { ErrorState } from "../components/ErrorState";
import { DetailDrawer } from "../components/dashboard/DetailDrawer";
import { suggestedPrompts as mockPrompts, customizationItems } from "../lib/data";
import {
  useChatHistory,
  useSuggestedPrompts,
  useTrainer,
  API_ENABLED,
  errorMessage,
  type Resource,
} from "../api/hooks";
import { buildLocalDashboard } from "../api/localDashboard";
import { useFormaData } from "../lib/localStore";
import { useCustomization, useEquippedItem } from "../lib/customization";
import { api } from "../api";
import type { ChatMessage, Trainer as TrainerT, TrainerPatch } from "../api/types";

/** Detect program-design intent in a user message. */
function isProgramIntent(text: string): boolean {
  const lower = text.toLowerCase();
  const hasProgram = /\b(program|plan|routine|schedule|build me|create a|design|make me)\b/.test(lower);
  const hasGoal = /\b(day|days|week|weeks|gain|lose|bulk|cut|strength|hypertrophy|muscle)\b/.test(lower);
  return hasProgram && hasGoal;
}

/** Detect if Kai's reply looks like a structured program response. */
function looksLikeProgram(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    (lower.includes("day 1") || lower.includes("week 1") || lower.includes("monday")) &&
    (lower.includes("sets") || lower.includes("reps") || lower.includes("exercise"))
  );
}

type Msg = { from: "trainer" | "user"; text: string; time: string; isProgram?: boolean };

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

const VOICES = [
  { id: "v-marcus", name: "marcus", detail: "warm, measured baritone" },
  { id: "v-nova", name: "nova", detail: "bright, quick, energetic" },
  { id: "v-atlas", name: "atlas", detail: "deep, calm, deliberate" },
  { id: "v-sable", name: "sable", detail: "low, dry, understated" },
];

/** Plain solid dot for message rows — the animated face lives in the header. */
function ChatDot({ look }: { look?: string }) {
  return <KaiOrb size={26} state="idle" breathe={false} look={look} />;
}

function TypingBubble({ look }: { look?: string }) {
  return (
    <div className="flex items-end gap-2">
      <ChatDot look={look} />
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
  const formaData = useFormaData();
  const equippedLook = useEquippedItem("avatar");
  const lookId = equippedLook?.id;
  const mood = coachMood(buildLocalDashboard(formaData));
  const name = trainer.data?.name?.trim() || "Kai";

  const [thread, setThread] = useState<Msg[]>(() => (history.data ?? []).map(toMsg));
  const [seeded, setSeeded] = useState(history.data != null);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [savedMsgIdx, setSavedMsgIdx] = useState<Set<number>>(new Set());
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  async function send(text: string) {
    if (!text.trim() || typing) return;
    const hasProgramIntent = isProgramIntent(text);
    setThread((t) => [...t, { from: "user", text, time: timeLabel() }]);
    setDraft("");
    setTyping(true);

    if (API_ENABLED) {
      try {
        const turn = await api.chat.send(text);
        const replyText = turn.trainerMessage.content;
        const isProgram = hasProgramIntent && looksLikeProgram(replyText);
        setThread((t) => [...t, { ...toMsg(turn.trainerMessage), isProgram }]);
      } catch (e) {
        setThread((t) => [...t, { from: "trainer", text: errorMessage(e as Error), time: timeLabel() }]);
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
          text: "Thanks for the context — noted. Automatic program adjustments aren't wired up in this build yet, so nothing changes on its own. When you start your next session you can tweak the weights and swap exercises directly in the logger.",
          time: timeLabel(),
          isProgram: false,
        },
      ]);
    }, 1400);
  }

  async function saveProgram(idx: number) {
    if (!API_ENABLED || savingIdx !== null) return;
    setSavingIdx(idx);
    try {
      const userMsg = [...thread].reverse().find((m, ri) => {
        const msgIdx = thread.length - 1 - ri;
        return m.from === "user" && msgIdx < idx;
      });
      const label = userMsg?.text.slice(0, 60) ?? "Kai's Program";
      await api.programs.generate({ name: label, daysPerWeek: 4 });
      setSavedMsgIdx((s) => new Set([...s, idx]));
    } catch {
      /* silently ignore */
    } finally {
      setSavingIdx(null);
    }
  }

  return (
    <div
      className="mx-auto flex w-full max-w-[900px] flex-col"
      style={{ height: "calc(100dvh - 13rem)", minHeight: 440 }}
    >
      <div className="ai-card flex flex-1 flex-col overflow-hidden">
        {/* header bar */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-3">
          <KaiOrb size={38} state={typing ? "thinking" : mood} look={lookId} />
          <div className="min-w-0 flex-1">
            <div className="text-[0.95rem] text-content-primary">{name}</div>
            <div className="num flex items-center gap-1.5 text-[0.7rem] text-content-tertiary">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-lime)]" />
              online · replies in seconds
            </div>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Trainer settings"
            className="metric-card__action !h-9 !w-9"
          >
            <SlidersHorizontal size={15} strokeWidth={2} />
          </button>
        </div>

        {/* messages */}
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-5 py-4">
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
              <KaiOrb size={56} state={mood} look={lookId} />
              <div className="text-[0.98rem] text-content-primary">say hi to {name.toLowerCase()}</div>
              <p className="max-w-[32ch] text-[0.85rem] leading-relaxed text-content-secondary">
                Ask about today's session, your form, an injury, or how a lift is progressing.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 text-center">
                <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.1em] text-content-tertiary">
                  Today
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
                    <span className="w-6 shrink-0">{!mine && !grouped ? <ChatDot look={lookId} /> : null}</span>
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
                      {last && <span className="num mt-1 px-1 text-[0.66rem] text-content-tertiary">{m.time}</span>}
                      {m.isProgram && !mine && last && (
                        <button
                          onClick={() => saveProgram(i)}
                          disabled={savedMsgIdx.has(i) || savingIdx === i}
                          className="focus-ring tactile mt-1.5 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[0.74rem] text-content-secondary transition-colors hover:border-white/20 hover:text-content-primary disabled:opacity-50"
                        >
                          {savedMsgIdx.has(i) ? (
                            <><Check size={11} strokeWidth={2.5} className="text-[var(--accent-lime)]" /> saved to programs</>
                          ) : (
                            <><Plus size={11} strokeWidth={2.5} /> save as program</>
                          )}
                        </button>
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
                    <TypingBubble look={lookId} />
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
                className="focus-ring tactile shrink-0 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[0.78rem] text-content-secondary transition-colors hover:border-white/20 hover:text-content-primary disabled:opacity-40"
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
              placeholder={`message ${name.toLowerCase()}…`}
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
      </div>

      <TrainerSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        trainer={trainer}
        lookId={lookId}
        sessionCount={formaData.sessions.length}
      />
    </div>
  );
}

/* ── settings drawer ─────────────────────────────────────────────────────── */

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[0.82rem]">
        <span className="lowercase text-content-primary">{label}</span>
        <span className="num text-content-tertiary">{Math.round(value * 100)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="focus-ring w-full accent-[var(--accent-pink)]"
        aria-label={label}
      />
    </div>
  );
}

function TrainerSettings({
  open,
  onClose,
  trainer,
  lookId,
  sessionCount,
}: {
  open: boolean;
  onClose: () => void;
  trainer: Resource<TrainerT>;
  lookId?: string;
  sessionCount: number;
}) {
  const cz = useCustomization();
  const t = trainer.data;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patch = (p: TrainerPatch) => {
    if (t) trainer.mutate({ ...t, ...p });
    if (API_ENABLED) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        api.trainer.update(p).catch(() => {});
      }, 350);
    }
  };

  const rows: [string, number, (v: number) => void][] = [
    ["directness", t?.coachingDirectness ?? 0.7, (v) => patch({ coachingDirectness: v })],
    ["warmth", t ? 1 - t.formStrictness : 0.55, (v) => patch({ formStrictness: 1 - v })],
    ["detail", t?.coachingDetail ?? 0.8, (v) => patch({ coachingDetail: v })],
    ["intensity", t?.motivationLevel ?? 0.45, (v) => patch({ motivationLevel: v })],
    ["humor", t?.humor ?? 0.3, (v) => patch({ humor: v })],
  ];

  const ownedLooks = customizationItems.filter((i) => i.slot === "avatar" && cz.isOwned(i.id));
  const voiceId = t?.voiceId ?? "v-marcus";

  return (
    <DetailDrawer open={open} onClose={onClose} eyebrow="trainer" title={`customize ${(t?.name ?? "kai").toLowerCase()}`}>
      <div className="space-y-6">
        <div>
          <div className="label-instrument mb-1.5">name</div>
          <input
            value={t?.name ?? ""}
            onChange={(e) => patch({ name: e.target.value.slice(0, 24) })}
            placeholder="Kai"
            className="focus-ring w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-[0.9rem] text-content-primary outline-none placeholder:text-content-tertiary"
          />
        </div>

        <div>
          <div className="label-instrument mb-3">coaching style</div>
          <div className="space-y-3.5">
            {rows.map(([label, value, onChange]) => (
              <Slider key={label} label={label} value={value} onChange={onChange} />
            ))}
          </div>
        </div>

        <div>
          <div className="label-instrument mb-2">voice</div>
          <div className="grid grid-cols-2 gap-2">
            {VOICES.map((v) => {
              const active = voiceId === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => patch({ voiceId: v.id })}
                  className={`focus-ring rounded-xl border px-3 py-2 text-left transition-colors ${
                    active ? "border-white/40 bg-white/[0.08]" : "border-white/10 hover:border-white/25"
                  }`}
                >
                  <span className="block text-[0.82rem] lowercase text-content-primary">{v.name}</span>
                  <span className="block text-[0.66rem] leading-tight text-content-tertiary">{v.detail}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="label-instrument mb-2">kai's look</div>
          <div className="flex flex-wrap items-center gap-2">
            {ownedLooks.map((item) => {
              const active = cz.isEquipped(item.id, "avatar");
              return (
                <button
                  key={item.id}
                  onClick={() => cz.setSlot("avatar", item.id)}
                  title={item.name}
                  className={`focus-ring h-9 w-9 rounded-full border-2 transition-transform ${
                    active ? "scale-110 border-white/70" : "border-white/20 hover:scale-105"
                  }`}
                  style={{ background: item.swatch }}
                />
              );
            })}
            <Link
              to="/store"
              className="focus-ring inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[0.74rem] text-content-secondary transition-colors hover:border-white/20 hover:text-content-primary"
            >
              <Coins size={12} strokeWidth={2} className="text-[var(--accent-amber)]" /> more looks
            </Link>
          </div>
          <p className="mt-2 flex items-start gap-2 text-[0.78rem] leading-relaxed text-content-tertiary">
            <KaiOrb size={22} state="done" breathe={false} look={lookId} />
            this is how {(t?.name ?? "kai").toLowerCase()} shows up in chat and on the dashboard.
          </p>
        </div>

        <div className="border-t border-[var(--line-soft)] pt-4">
          <div className="label-instrument mb-2">recent insight</div>
          <p className="flex items-start gap-2 text-[0.86rem] leading-relaxed text-content-secondary">
            <MessageSquare size={14} strokeWidth={1.9} className="mt-1 shrink-0 text-content-tertiary" />
            {sessionCount === 0
              ? "Log a few sessions and Kai will start surfacing trends from your working sets here."
              : `You've logged ${sessionCount} session${sessionCount > 1 ? "s" : ""}. Ask about how a specific lift is trending and I'll pull the numbers.`}
          </p>
        </div>
      </div>
    </DetailDrawer>
  );
}
