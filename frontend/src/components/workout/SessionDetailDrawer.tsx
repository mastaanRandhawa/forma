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
  busy,
}: {
  session: CompletedSession | null;
  priorSessions: CompletedSession[];
  onClose: () => void;
  onRepeat: (s: CompletedSession) => void;
  onSaveAsTemplate: (s: CompletedSession) => void;
  busy?: string | null;
}) {
  const [saved, setSaved] = useState(false);
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
          className="focus-ring tactile w-full rounded-pill bg-[var(--accent-lime)] py-3 text-[0.88rem] lowercase text-[#0c0c0c] disabled:opacity-50"
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
