import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Plus, Trash2, SkipForward, Timer, X } from "lucide-react";
import { InstrumentReadout } from "../components/InstrumentReadout";
import { Reveal } from "../components/Reveal";
import { EmptyState } from "../components/EmptyState";
import { Button } from "../components/primitives";
import {
  abandonSession,
  finishSession,
  loadData,
  updateActive,
  useFormaData,
  type LoggedExercise,
  type LoggedSet,
} from "../lib/localStore";
import { detectPRs, sessionVolume } from "../lib/fitness";
import { ALL_TEMPLATES } from "../lib/program";

const EASE = [0.22, 1, 0.36, 1] as const;
const REST_PRESETS = [60, 90, 120, 180];

const EXERCISE_POOL = [
  ...new Set(ALL_TEMPLATES.flatMap((t) => t.exercises.map((e) => e.name))),
].sort();

function useElapsed(startedAt: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const sec = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function NumField({
  value,
  onChange,
  placeholder,
  suffix,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder: string;
  suffix?: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <input
        inputMode="decimal"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value.replace(",", ".");
          onChange(raw === "" ? null : Number.isNaN(Number(raw)) ? value : Number(raw));
        }}
        className="focus-ring w-14 rounded-[var(--radius-small)] border border-[var(--line-soft)] bg-transparent px-2 py-1.5 text-center text-[0.9rem] tabular-nums text-content-primary outline-none placeholder:text-content-tertiary"
      />
      {suffix && <span className="label-instrument">{suffix}</span>}
    </span>
  );
}

function RestTimer() {
  const data = useFormaData();
  const restEndsAt = data.active?.restEndsAt ?? null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!restEndsAt) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [restEndsAt]);

  const remaining = restEndsAt ? Math.ceil((restEndsAt - now) / 1000) : 0;

  useEffect(() => {
    if (restEndsAt && remaining <= 0) updateActive((s) => ({ ...s, restEndsAt: null }));
  }, [restEndsAt, remaining]);

  const start = (sec: number) => updateActive((s) => ({ ...s, restEndsAt: Date.now() + sec * 1000 }));
  const stop = () => updateActive((s) => ({ ...s, restEndsAt: null }));

  return (
    <div className="surface-recessed rounded-hero p-5">
      <div className="flex items-center gap-2 label-soft lowercase">
        <Timer size={13} strokeWidth={2} /> rest timer
      </div>
      {restEndsAt && remaining > 0 ? (
        <div className="mt-3 flex items-center justify-between">
          <span className="metric-numeral text-[2rem] text-content-primary tabular-nums">
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
          </span>
          <button
            onClick={stop}
            className="focus-ring rounded-pill bg-white/[0.06] px-3 py-1.5 text-[0.78rem] lowercase text-content-tertiary hover:text-content-secondary"
          >
            skip
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {REST_PRESETS.map((sec) => (
            <button
              key={sec}
              onClick={() => start(sec)}
              className="focus-ring tactile rounded-pill bg-white/[0.06] px-3 py-1.5 text-[0.8rem] tabular-nums text-content-primary hover:bg-white/[0.12]"
            >
              {sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ActiveWorkout() {
  const nav = useNavigate();
  const reduce = useReducedMotion();
  const data = useFormaData();
  const session = data.active;
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [addingTo, setAddingTo] = useState(false);
  const [summary, setSummary] = useState<null | {
    durationSec: number;
    volume: number;
    prs: string[];
    completed: number;
    skipped: number;
  }>(null);
  const elapsed = useElapsed(session?.startedAt ?? new Date().toISOString());
  const priorSessions = useRef(loadData().sessions).current;

  const liveVolume = useMemo(
    () => (session ? sessionVolume(session.exercises) : 0),
    [session],
  );

  if (!session && !summary) {
    return (
      <div className="mx-auto max-w-[640px] pt-10">
        <EmptyState
          title="no active workout"
          body="start today's session from the plan and it'll open here."
          action={{ label: "go to today's plan", to: "/workouts" }}
        />
      </div>
    );
  }

  const setEx = (i: number, fn: (e: LoggedExercise) => LoggedExercise) =>
    updateActive((s) => ({ ...s, exercises: s.exercises.map((e, idx) => (idx === i ? fn(e) : e)) }));

  const setSet = (exi: number, si: number, fn: (set: LoggedSet) => LoggedSet) =>
    setEx(exi, (e) => ({ ...e, sets: e.sets.map((set, idx) => (idx === si ? fn(set) : set)) }));

  const addSet = (exi: number) =>
    setEx(exi, (e) => {
      const last = e.sets[e.sets.length - 1];
      return {
        ...e,
        sets: [...e.sets, { weight: last?.weight ?? null, reps: last?.reps ?? null, rpe: null, done: false }],
      };
    });

  const deleteSet = (exi: number, si: number) =>
    setEx(exi, (e) => ({ ...e, sets: e.sets.length > 1 ? e.sets.filter((_, idx) => idx !== si) : e.sets }));

  const toggleSkip = (exi: number) => setEx(exi, (e) => ({ ...e, skipped: !e.skipped }));

  const replaceExercise = (exi: number, name: string) =>
    setEx(exi, (e) => ({ ...e, name, sets: e.sets.map((s) => ({ ...s, done: false })) }));

  const addExercise = (name: string) => {
    updateActive((s) => ({
      ...s,
      exercises: [
        ...s.exercises,
        { name, target: "3 × 8–12", skipped: false, sets: [{ weight: null, reps: null, rpe: null, done: false }] },
      ],
    }));
    setAddingTo(false);
  };

  const finish = () => {
    if (!session) return;
    const working = session.exercises.filter((e) => !e.skipped);
    const prs = detectPRs({ exercises: working }, priorSessions);
    const volume = sessionVolume(session.exercises);
    const completed = finishSession(volume, data.profile.units, prs);
    setSummary({
      durationSec: completed?.durationSec ?? 0,
      volume,
      prs,
      completed: working.filter((e) => e.sets.some((s) => s.done)).length,
      skipped: session.exercises.filter((e) => e.skipped).length,
    });
  };

  const completedSets = session
    ? session.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
    : 0;
  const totalSets = session
    ? session.exercises.reduce((n, e) => n + e.sets.length, 0)
    : 0;

  return (
    <div className="mx-auto max-w-[1120px] pb-24">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="label-instrument mb-2">active session · {elapsed}</div>
          <h1 className="text-title text-content-primary lowercase">{session?.name}</h1>
          <div className="label-instrument mt-1">
            {completedSets} / {totalSets} sets logged
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setConfirmAbandon(true)}>
            abandon
          </Button>
          <Button onClick={finish}>finish</Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Reveal className="space-y-4">
          {session?.exercises.map((ex, exi) => (
            <div
              key={exi}
              className={`surface-soft p-5 sm:p-6 ${ex.skipped ? "opacity-50" : ""}`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <select
                    value={ex.name}
                    onChange={(e) => replaceExercise(exi, e.target.value)}
                    className="focus-ring max-w-full truncate rounded-[var(--radius-small)] bg-transparent text-[1rem] lowercase text-content-primary outline-none"
                  >
                    {[ex.name, ...EXERCISE_POOL.filter((n) => n !== ex.name)].map((n) => (
                      <option key={n} value={n} className="bg-[#1a0f16]">
                        {n}
                      </option>
                    ))}
                  </select>
                  <div className="label-instrument mt-0.5">{ex.target}</div>
                </div>
                <button
                  onClick={() => toggleSkip(exi)}
                  className="focus-ring shrink-0 rounded-pill bg-white/[0.05] px-2.5 py-1 text-[0.72rem] lowercase text-content-tertiary hover:text-content-secondary"
                >
                  <SkipForward size={11} strokeWidth={2} className="mr-1 inline" />
                  {ex.skipped ? "unskip" : "skip"}
                </button>
              </div>

              {!ex.skipped && (
                <>
                  <table className="w-full text-[0.88rem]">
                    <thead>
                      <tr className="text-left">
                        {["set", "weight", "reps", "rpe", "", ""].map((h, i) => (
                          <th key={i} className="label-instrument py-1 font-normal">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {ex.sets.map((s, si) => (
                        <tr key={si} className="border-t border-[var(--line-soft)]">
                          <td className="py-2 pr-2 text-content-tertiary">{si + 1}</td>
                          <td className="py-2 pr-2">
                            <NumField
                              value={s.weight}
                              onChange={(v) => setSet(exi, si, (set) => ({ ...set, weight: v }))}
                              placeholder={data.profile.units}
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <NumField
                              value={s.reps}
                              onChange={(v) => setSet(exi, si, (set) => ({ ...set, reps: v }))}
                              placeholder="reps"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <NumField
                              value={s.rpe}
                              onChange={(v) => setSet(exi, si, (set) => ({ ...set, rpe: v }))}
                              placeholder="—"
                            />
                          </td>
                          <td className="py-2 pr-1">
                            <button
                              aria-label={s.done ? "Mark set incomplete" : "Complete set"}
                              onClick={() => {
                                const willBeDone = !s.done;
                                setSet(exi, si, (set) => ({ ...set, done: willBeDone }));
                                if (willBeDone)
                                  updateActive((sess) => ({ ...sess, restEndsAt: Date.now() + 90_000 }));
                              }}
                              className={`focus-ring grid h-7 w-7 place-items-center rounded-full border transition-colors ${
                                s.done
                                  ? "border-transparent bg-[var(--accent-lime)] text-[#0c0c0c]"
                                  : "border-[var(--line-soft)] text-content-tertiary hover:border-white/30"
                              }`}
                            >
                              <Check size={14} strokeWidth={2.5} />
                            </button>
                          </td>
                          <td className="py-2">
                            <button
                              aria-label="Delete set"
                              onClick={() => deleteSet(exi, si)}
                              className="focus-ring grid h-7 w-7 place-items-center rounded-full text-content-tertiary hover:text-content-secondary"
                            >
                              <Trash2 size={13} strokeWidth={1.9} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <button
                    onClick={() => addSet(exi)}
                    className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-pill bg-white/[0.05] px-3 py-1.5 text-[0.78rem] lowercase text-content-secondary hover:bg-white/[0.1]"
                  >
                    <Plus size={12} strokeWidth={2.25} /> add set
                  </button>
                </>
              )}
            </div>
          ))}

          {addingTo ? (
            <div className="surface-soft p-5">
              <div className="label-soft lowercase">add an exercise</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {EXERCISE_POOL.map((n) => (
                  <button
                    key={n}
                    onClick={() => addExercise(n)}
                    className="focus-ring tactile rounded-pill bg-white/[0.05] px-3 py-1.5 text-[0.78rem] text-content-primary hover:bg-white/[0.12]"
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setAddingTo(false)}
                className="focus-ring mt-3 text-[0.78rem] lowercase text-content-tertiary hover:text-content-secondary"
              >
                cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingTo(true)}
              className="focus-ring w-full rounded-[var(--radius-large)] border border-dashed border-[var(--line-soft)] py-4 text-[0.82rem] lowercase text-content-tertiary hover:text-content-secondary"
            >
              <Plus size={13} strokeWidth={2} className="mr-1.5 inline" /> add exercise
            </button>
          )}
        </Reveal>

        <Reveal as="aside" onView delay={0.08} className="space-y-6">
          <div className="surface-recessed flex flex-col items-center rounded-hero p-6">
            <div className="label-soft lowercase">working volume</div>
            <div className="my-3">
              <InstrumentReadout
                value={Math.round(liveVolume).toLocaleString()}
                identity="pink"
                dot={6}
                gap={2.5}
              />
            </div>
            <div className="label-instrument">{data.profile.units} moved this session</div>
          </div>

          <RestTimer />

          <div>
            <div className="label-soft lowercase">note</div>
            <p className="mt-2 text-[0.86rem] leading-relaxed text-content-tertiary">
              Every set is saved as you log it. You can close this tab and pick the
              session back up here.
            </p>
          </div>
        </Reveal>
      </div>

      {/* abandon confirmation */}
      <AnimatePresence>
        {confirmAbandon && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-[rgba(16,10,17,0.72)] p-4 backdrop-blur-sm"
            onClick={() => setConfirmAbandon(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <motion.div
              className="w-full max-w-sm surface-glass rounded-shell p-7 text-center"
              onClick={(e) => e.stopPropagation()}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.24, ease: EASE }}
            >
              <h2 className="text-heading text-content-primary lowercase">abandon this session?</h2>
              <p className="mx-auto mt-2 max-w-[34ch] text-[0.88rem] text-content-secondary">
                Logged sets won't be saved to your history.
              </p>
              <div className="mt-5 flex justify-center gap-2.5">
                <button
                  onClick={() => {
                    abandonSession();
                    nav("/workouts");
                  }}
                  className="focus-ring rounded-pill bg-[color-mix(in_srgb,var(--accent-pink)_16%,transparent)] px-5 py-2.5 text-[0.86rem] lowercase text-[var(--accent-pink)]"
                >
                  abandon
                </button>
                <button
                  onClick={() => setConfirmAbandon(false)}
                  className="focus-ring rounded-pill px-5 py-2.5 text-[0.86rem] lowercase text-content-tertiary hover:text-content-secondary"
                >
                  keep going
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* summary */}
      <AnimatePresence>
        {summary && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-[rgba(16,10,17,0.8)] p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <motion.div
              className="w-full max-w-md surface-glass rounded-shell p-8"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.28, ease: EASE }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-heading text-content-primary lowercase">session complete</h2>
                <button
                  aria-label="Close"
                  onClick={() => nav("/workouts")}
                  className="focus-ring grid h-8 w-8 place-items-center rounded-full text-content-tertiary hover:text-content-secondary"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                {[
                  ["duration", `${Math.floor(summary.durationSec / 60)}m`],
                  ["volume", `${Math.round(summary.volume).toLocaleString()}`],
                  ["exercises", `${summary.completed}`],
                ].map(([label, value]) => (
                  <div key={label} className="surface-recessed rounded-hero p-3">
                    <div className="metric-numeral text-[1.4rem] text-content-primary">{value}</div>
                    <div className="label-instrument mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              {summary.prs.length > 0 && (
                <div className="mt-4 rounded-2xl border border-[color-mix(in_srgb,var(--accent-lime)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent-lime)_8%,transparent)] p-4">
                  <div className="label-instrument" style={{ color: "var(--accent-lime)" }}>
                    {summary.prs.length} personal record{summary.prs.length > 1 ? "s" : ""}
                  </div>
                  <ul className="mt-1.5 space-y-1 text-[0.86rem] text-content-primary">
                    {summary.prs.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.skipped > 0 && (
                <p className="mt-3 label-instrument">{summary.skipped} exercise(s) skipped</p>
              )}

              <div className="mt-6 flex gap-2.5">
                <Link to="/workouts" className="flex-1">
                  <Button className="w-full">view history</Button>
                </Link>
                <Link to="/progress" className="flex-1">
                  <Button variant="ghost" className="w-full">
                    progress
                  </Button>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
