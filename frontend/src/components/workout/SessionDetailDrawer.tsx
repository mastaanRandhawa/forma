import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy } from "lucide-react";
import { DetailDrawer } from "../dashboard/DetailDrawer";
import { ExerciseThumb } from "../ExerciseThumb";
import { repdbThumb } from "../../lib/repdb";
import { bestByExercise, epley1RM, exerciseVolume } from "../../lib/fitness";
import type { CompletedSession } from "../../lib/localStore";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

/**
 * Read-only deep-dive on one finished session (§21). Per-exercise set logs with
 * PR marks, totals, and the follow-through actions: repeat, save as template,
 * jump to progression.
 */
export function SessionDetailDrawer({
  session,
  priorSessions,
  onClose,
  onRepeat,
  onSaveAsTemplate,
  onEdit,
  onDelete,
  onRemoveExercise,
  busy,
}: {
  session: CompletedSession | null;
  priorSessions: CompletedSession[];
  onClose: () => void;
  onRepeat: (s: CompletedSession) => void;
  onSaveAsTemplate: (s: CompletedSession) => void;
  /** fix the name, day or length; resolves with an error message, or nothing on success */
  onEdit?: (s: CompletedSession, patch: { name: string; date: string; minutes: number }) => Promise<string | void>;
  onDelete?: (s: CompletedSession) => Promise<string | void>;
  onRemoveExercise?: (s: CompletedSession, index: number) => Promise<string | void>;
  busy?: string | null;
}) {
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [mins, setMins] = useState("");
  const [confirm, setConfirm] = useState<"delete" | number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [seen, setSeen] = useState<string | null>(null);
  if (session && session.id !== seen) {
    setSeen(session.id);
    setEditing(false);
    setConfirm(null);
    setErr(null);
  }
  const startEdit = () => {
    if (!session) return;
    const d = new Date(session.startedAt);
    setName(session.name);
    setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    setMins(String(Math.round(session.durationSec / 60)));
    setErr(null);
    setEditing(true);
  };
  const run = async (fn: () => Promise<string | void>, after?: () => void) => {
    setPending(true);
    setErr(null);
    const e = await fn();
    setPending(false);
    if (e) setErr(e);
    else after?.();
  };
  const minsN = Number.parseFloat(mins);
  const editOk = name.trim() && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(minsN) && minsN >= 0 && minsN <= 1440;
  const prior = useMemo(
    () =>
      bestByExercise(
        session ? priorSessions.filter((s) => s.finishedAt < session.finishedAt) : [],
      ),
    [priorSessions, session],
  );

  if (!session) return null;
  const units = session.units;
  const totalSets = session.exercises.reduce(
    (n, e) => n + e.sets.filter((s) => s.done && !s.warmup).length,
    0,
  );

  return (
    <DetailDrawer
      open={!!session}
      onClose={onClose}
      title={session.name}
      eyebrow={fmtDate(session.finishedAt).toLowerCase()}
    >
      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        {[
          ["time", `${Math.round(session.durationSec / 60)}m`],
          ["volume", `${Math.round(session.volume).toLocaleString()}`],
          ["sets", `${totalSets}`],
        ].map(([label, value]) => (
          <div key={label} className="surface-recessed rounded-hero p-2.5">
            <div className="metric-numeral text-[1.15rem] text-content-primary">{value}</div>
            <div className="label-instrument mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {onEdit && (
        <div className="mb-4">
          {editing ? (
            <div className="surface-recessed space-y-2 rounded-hero p-3">
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} aria-label="name" className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[0.9rem] text-content-primary outline-none focus:border-white/30" />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="date" className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[0.9rem] text-content-primary outline-none focus:border-white/30" />
                <div className="flex items-center gap-2">
                  <input value={mins} onChange={(e) => setMins(e.target.value)} inputMode="numeric" maxLength={4} aria-label="minutes" className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[0.9rem] text-content-primary outline-none focus:border-white/30" />
                  <span className="label-instrument">min</span>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditing(false)} className="focus-ring rounded-pill px-3 py-1.5 text-[0.8rem] lowercase text-content-tertiary">cancel</button>
                <button
                  disabled={!editOk || pending}
                  onClick={() => run(() => onEdit(session, { name: name.trim(), date, minutes: minsN }), () => setEditing(false))}
                  className="focus-ring tactile rounded-pill bg-[var(--accent-pink)] px-4 py-1.5 text-[0.8rem] lowercase text-white disabled:opacity-40"
                >
                  {pending ? "saving…" : "save"}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={startEdit} className="focus-ring text-[0.8rem] lowercase text-content-tertiary hover:text-content-secondary">
              edit name, day or length
            </button>
          )}
        </div>
      )}

      {err && <p role="alert" className="mb-3 text-[0.82rem] text-[var(--accent-amber)]">{err}</p>}

      {session.prs.length > 0 && (
        <div className="mb-4 rounded-2xl border border-[color-mix(in_srgb,var(--accent-lime)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent-lime)_8%,transparent)] p-3">
          <div className="label-instrument" style={{ color: "var(--accent-lime)" }}>
            {session.prs.length} personal record{session.prs.length > 1 ? "s" : ""}
          </div>
          <ul className="mt-1 space-y-0.5 text-[0.84rem] text-content-primary">
            {session.prs.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        {session.exercises.map((e, i) => {
          const working = e.sets.filter((s) => !s.warmup);
          const was = prior.get(e.name);
          return (
            <div key={i} className="surface-recessed rounded-hero p-3">
              <div className="flex items-center gap-2.5">
                <ExerciseThumb src={repdbThumb(e.name)} alt="" size={32} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[0.9rem] lowercase text-content-primary">{e.name}</div>
                  <div className="label-instrument">
                    {Math.round(exerciseVolume(e)).toLocaleString()} {units}
                  </div>
                </div>
                {onRemoveExercise &&
                  (confirm === i ? (
                    <span className="flex items-center gap-1.5">
                      <button onClick={() => setConfirm(null)} className="focus-ring rounded-pill px-2 py-1 text-[0.74rem] lowercase text-content-tertiary">keep</button>
                      <button
                        disabled={pending}
                        onClick={() => run(() => onRemoveExercise(session, i), () => setConfirm(null))}
                        className="focus-ring rounded-pill bg-[var(--accent-amber)] px-3 py-1 text-[0.74rem] lowercase text-black"
                      >
                        remove
                      </button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirm(i)} aria-label={`remove ${e.name}`} className="focus-ring rounded-pill px-2 py-1 text-[0.74rem] lowercase text-content-tertiary hover:text-[var(--accent-amber)]">
                      remove
                    </button>
                  ))}
              </div>
              <div className="mt-2 space-y-1">
                {working.map((s, si) => {
                  const isPr =
                    s.done &&
                    !!s.weight &&
                    !!s.reps &&
                    (!was ||
                      s.weight > was.maxWeight ||
                      epley1RM(s.weight, s.reps) > was.max1RM);
                  return (
                    <div
                      key={si}
                      className="flex items-center gap-2 text-[0.84rem] tabular-nums text-content-secondary"
                    >
                      <span className="w-6 label-instrument">#{si + 1}</span>
                      <span className="flex-1">
                        {s.weight != null ? `${s.weight} ${units}` : "—"} × {s.reps ?? "—"}
                        {s.rpe != null ? ` @ ${s.rpe}` : ""}
                      </span>
                      {isPr && <Trophy size={12} className="text-[var(--accent-lime)]" />}
                      {!s.done && <span className="label-instrument">skipped</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <button
          onClick={() => onRepeat(session)}
          disabled={busy === "repeat"}
          className="focus-ring tactile w-full rounded-pill bg-[var(--accent-pink)] py-3 text-[0.88rem] lowercase text-white disabled:opacity-50"
        >
          {busy === "repeat" ? "starting…" : "repeat workout"}
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => {
              onSaveAsTemplate(session);
              setSaved(true);
            }}
            disabled={busy === "template" || saved}
            className="focus-ring surface-recessed flex-1 rounded-pill py-2.5 text-[0.82rem] lowercase text-content-secondary hover:text-content-primary disabled:opacity-50"
          >
            {saved ? "saved ✓" : busy === "template" ? "saving…" : "save as template"}
          </button>
          <ProgressionLink names={session.exercises.map((e) => e.name)} />
        </div>
        {onDelete &&
          (confirm === "delete" ? (
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--accent-amber)]/40 p-3">
              <span className="flex-1 text-[0.82rem] text-content-secondary">delete this workout and any records it set?</span>
              <button onClick={() => setConfirm(null)} className="focus-ring rounded-pill px-3 py-1.5 text-[0.8rem] lowercase text-content-tertiary">keep</button>
              <button disabled={pending} onClick={() => run(() => onDelete(session))} className="focus-ring rounded-pill bg-[var(--accent-amber)] px-4 py-1.5 text-[0.8rem] lowercase text-black">
                delete
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirm("delete")} className="focus-ring w-full rounded-pill py-2.5 text-[0.82rem] lowercase text-content-tertiary hover:text-[var(--accent-amber)]">
              delete workout
            </button>
          ))}
      </div>
    </DetailDrawer>
  );
}

function ProgressionLink({ names }: { names: string[] }) {
  const nav = useNavigate();
  return (
    <button
      onClick={() => nav("/progress")}
      className="focus-ring surface-recessed flex-1 rounded-pill py-2.5 text-[0.82rem] lowercase text-content-secondary hover:text-content-primary"
      title={names.slice(0, 3).join(", ")}
    >
      view progression
    </button>
  );
}
