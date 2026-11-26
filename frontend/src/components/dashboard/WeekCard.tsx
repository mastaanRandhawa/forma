import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { Check, Coins, Flame, HandCoins } from "lucide-react";
import { api } from "../../api/client";
import { errorMessage, invalidateResource } from "../../api/hooks";
import type { Quest } from "../../api/types";
import { useRewards } from "../../lib/progression";

const DAYS = ["m", "t", "w", "t", "f", "s", "s"];
const TONE: Record<Quest["tone"], string> = {
  pink: "var(--accent-pink)",
  cyan: "var(--accent-cyan)",
  lime: "var(--accent-lime)",
  amber: "var(--accent-amber)",
  violet: "var(--accent-mauve)",
};

/**
 * This week — sessions toward the target, the weekly streak with its free pass
 * and shields, rank, the weekly quests and an optional coin pledge. Everything
 * here is decided by the server; the page only asks it to claim or pledge.
 */
export function WeekCard({ done, target, weekTrained }: { done: number; target: number; weekTrained: boolean[] }) {
  const reduce = useReducedMotion();
  const rewards = useRewards();
  const rw = rewards.data;
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pledging, setPledging] = useState(false);

  const streak = rw?.streak.weeks ?? 0;
  const passReady = rw?.streak.passReady ?? true;
  const shields = rw?.shields.held ?? 0;
  const left = target ? Math.max(0, target - done) : 0;
  const p = rw?.pledge;

  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setErr(null);
    try {
      await fn();
      invalidateResource(); // coins and the dashboard moved on the server
      rewards.refetch();
    } catch (e) {
      setErr(errorMessage(e as Error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="surface-soft p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="label-soft lowercase">this week</div>
        <div className="flex items-center gap-3">
          {rw ? (
            <span className="label-instrument" title={rw.rank.next ? `${rw.rank.toNext} xp to ${rw.rank.next.title}` : "top rank"}>
              rank {rw.rank.rank} · {rw.rank.title.toLowerCase()}
            </span>
          ) : null}
          <Link to="/progress" className="focus-ring text-[0.8rem] lowercase" style={{ color: "var(--accent-pink)" }}>
            progress
          </Link>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <span className="metric-numeral text-[2.2rem] leading-none tabular-nums">{done}</span>
          <span className="text-[0.9rem] text-content-tertiary">
            {target ? `of ${target} sessions${left ? ` · ${left} to go` : " · goal met"}` : "sessions"}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <motion.span
            className="grid h-[34px] w-[34px] place-items-center rounded-full"
            style={{ background: "rgba(255,182,97,0.2)" }}
            animate={streak > 0 && !reduce ? { scale: [1, 1.12, 1], rotate: [0, -8, 0] } : {}}
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
          >
            <Flame size={17} style={{ color: streak > 0 ? "var(--accent-amber)" : "var(--content-tertiary)" }} />
          </motion.span>
          <div className="text-right">
            <div className="text-[0.8rem] text-content-secondary">{streak > 0 ? `${streak}-week streak` : "no streak yet"}</div>
            {streak > 0 ? (
              <div className="label-instrument">
                {passReady ? "free pass ready" : "free pass used"}
                {shields ? ` · ${shields} shield${shields > 1 ? "s" : ""}` : ""}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: "var(--accent-pink)" }}
          initial={false}
          animate={{ width: `${target ? Math.min(100, (done / target) * 100) : 0}%` }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {DAYS.map((l, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className="h-[22px] w-full rounded-[8px]"
              style={{ background: weekTrained[i] ? "linear-gradient(135deg, var(--accent-pink), var(--accent-coral))" : "rgba(255,255,255,0.07)" }}
            />
            <span className="label-instrument">{l}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3 border-t border-[var(--line-soft)] pt-4">
        <div className="flex justify-between">
          <span className="label-soft lowercase">weekly quests</span>
          <span className="label-instrument">resets monday</span>
        </div>
        {rw === null ? (
          <p className="label-instrument">loading quests…</p>
        ) : (
          rw.quests.map((q) => (
            <div key={q.id} className="space-y-1.5" aria-label={`${q.title}: ${q.detail}. ${q.current} of ${q.target} ${q.unit}. ${q.reward} coins${q.claimed ? ", claimed" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[0.9rem] text-content-primary lowercase">{q.title}</div>
                  <div className="label-instrument truncate">{q.detail}</div>
                </div>
                {q.claimed ? (
                  <Check size={18} style={{ color: "var(--accent-lime)" }} />
                ) : q.done ? (
                  <button
                    disabled={busy === q.id}
                    onClick={() => act(q.id, () => api.rewards.claimQuest(q.id, rewards.checkinsEnabled))}
                    className="btn-primary px-4 py-2 text-[0.8rem]"
                  >
                    claim +{q.reward}
                  </button>
                ) : (
                  <span className="flex items-center gap-1 text-[0.8rem] tabular-nums" style={{ color: "var(--accent-amber)" }}>
                    <Coins size={12} /> {q.reward}
                  </span>
                )}
              </div>
              {q.claimed ? null : (
                <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (q.current / q.target) * 100)}%`, background: TONE[q.tone], transition: "width .4s ease" }} />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {p ? (
        <div className="mt-4 flex items-center gap-2 text-[0.82rem] text-content-secondary">
          <HandCoins size={15} style={{ color: p.status === "won" ? "var(--accent-lime)" : "var(--accent-amber)" }} />
          {p.status === "won" ? `pledge kept · +${p.payout} coins` : `pledged ${p.stake} · finish ${p.target} to win ${p.payout}`}
        </div>
      ) : rw?.pledgeOptions.available ? (
        <div className="mt-4">
          <button onClick={() => setPledging((v) => !v)} className="focus-ring flex w-full items-center gap-2 text-left text-[0.82rem] text-content-secondary hover:text-content-primary">
            <HandCoins size={15} style={{ color: "var(--accent-amber)" }} />
            <span className="flex-1 lowercase">pledge coins on hitting this week's target</span>
          </button>
          {pledging ? (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {rw.pledgeOptions.stakes.map((s) => (
                <button
                  key={s}
                  disabled={busy === `pledge:${s}`}
                  onClick={() => act(`pledge:${s}`, () => api.rewards.pledge(s, rewards.checkinsEnabled).then(() => setPledging(false)))}
                  className="focus-ring tactile rounded-pill bg-white/[0.08] px-4 py-2 text-[0.82rem] tabular-nums text-content-primary hover:bg-white/[0.14]"
                >
                  {s} coins
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {err ? <p className="mt-3 label-instrument text-[var(--accent-pink)]">{err}</p> : null}
    </section>
  );
}
