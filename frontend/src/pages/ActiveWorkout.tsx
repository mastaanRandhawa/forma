import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Check,
  ChevronLeft,
  Circle,
  Clock,
  Coins,
  Minus,
  Pause,
  Play,
  Plus,
  Repeat2,
  SkipForward,
  Timer,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { Reveal } from "../components/Reveal";
import { EmptyState } from "../components/EmptyState";
import { Button } from "../components/primitives";
import { KaiOrb } from "../components/KaiOrb";
import { ExerciseThumb } from "../components/ExerciseThumb";
import { ExerciseDetailDrawer } from "../components/ExerciseDetailDrawer";
import { DetailDrawer } from "../components/dashboard/DetailDrawer";
import { Stepper } from "../components/workout/Stepper";
import { ExercisePicker } from "../components/workout/ExercisePicker";
import {
  abandonSession,
  finishSession,
  loadData,
  repeatFromCompleted,
  startSession,
  updateActive,
  useFormaData,
  type CompletedSession,
  type LoggedExercise,
  type LoggedSet,
} from "../lib/localStore";
import { saveSessionAsTemplate } from "../lib/templates";
import { detectPRs, epley1RM, lastPerformance, lastTopSet, sessionVolume } from "../lib/fitness";
import {
  activeSetIndex,
  addWarmupSet,
  addWorkingSet,
  advance,
  deferExercise,
  focusExercise,
  isExerciseComplete,
  nextSupersetStep,
  resumeExercise,
  sessionProgress,
  sessionQueue,
  setSkipped,
  supersetLetter,
  supersetPosition,
  substituteExercise,
  suggestSubstitutes,
  trainerCue,
  type CueContext,
  type CueEvent,
  type SubstituteSuggestion,
} from "../lib/session";
import { grantWorkoutRewards } from "../lib/rewards";
import { walletStore } from "../lib/wallet";
import { streakData } from "../lib/data";
import { ALL_TEMPLATES } from "../lib/program";
import type { RepDbCatalogEntry } from "../lib/repdb";
import { repdbThumb, repdbImage } from "../lib/repdb";
import { plateCombo, plateLabel } from "../lib/plates";
import { API_ENABLED } from "../api/hooks";
import { api } from "../api/client";
import {
  abandonApiSession,
  finishApiSession,
  fromKg,
  syncDeleteSet,
  syncNewPerformance,
  syncSet,
} from "../lib/lifecycle";

const EASE = [0.22, 1, 0.36, 1] as const;
const REST_PRESETS = [60, 90, 120, 180];
const DEFAULT_REST = 90;
const COMPOUND_REST = 120;
const ISOLATION_REST = 75;

function adaptiveRest(mechanic: string | null | undefined, lastRpe: number | null | undefined): number {
  const base = mechanic === "compound" ? COMPOUND_REST : ISOLATION_REST;
  return (lastRpe ?? 0) >= 9 ? base + 30 : base;
}

const EXERCISE_POOL = [
  ...new Set(ALL_TEMPLATES.flatMap((t) => t.exercises.map((e) => e.name))),
].sort();

const vibrate = (p: number | number[]) => {
  try {
    navigator.vibrate?.(p);
  } catch {
    /* unsupported */
  }
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function useCatalogEntry(name: string): RepDbCatalogEntry | null {
  const [entry, setEntry] = useState<RepDbCatalogEntry | null>(null);
  useEffect(() => {
    let alive = true;
    void import("../lib/repdb.catalog").then((m) => {
      if (!alive) return;
      const key = norm(name);
      const hit =
        m.REPDB_CATALOG.find((e) => norm(e.name) === key) ??
        m.REPDB_CATALOG.find((e) => norm(e.name).includes(key) || key.includes(norm(e.name)));
      setEntry(hit ?? null);
    });
    return () => {
      alive = false;
    };
  }, [name]);
  return entry;
}

function useElapsed(session: ReturnType<typeof useFormaData>["active"]) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!session) return "0:00";
  const extra = session.paused && session.pausedAt ? now - session.pausedAt : 0;
  const sec = Math.max(
    0,
    Math.floor((now - Date.parse(session.startedAt) - (session.pausedMs ?? 0) - extra) / 1000),
  );
  const m = Math.floor(sec / 60);
  return `${m}:${String(sec % 60).padStart(2, "0")}`;
}

const fmtClock = (sec: number) =>
  `${Math.floor(Math.max(0, sec) / 60)}:${String(Math.max(0, sec) % 60).padStart(2, "0")}`;

// ── progress rail ───────────────────────────────────────────────────────────
function ProgressRail({ queue, cursor, onJump }: {
  queue: ReturnType<typeof sessionQueue>;
  cursor: number;
  onJump: (i: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {queue
        .filter((r) => r.phase !== "skipped")
        .map((r) => {
          const tone =
            r.phase === "done"
              ? "var(--accent-lime)"
              : r.index === cursor
              ? "var(--accent-pink)"
              : r.phase === "deferred"
              ? "var(--accent-amber)"
              : "rgba(255,255,255,0.14)";
          return (
            <button
              key={r.index}
              onClick={() => onJump(r.index)}
              aria-label={`go to ${r.ex.name}`}
              className="focus-ring h-1.5 flex-1 rounded-full transition-colors"
              style={{ background: tone }}
            />
          );
        })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function ActiveWorkout() {
  const nav = useNavigate();
  const reduce = useReducedMotion();
  const data = useFormaData();
  const session = data.active;
  const units = data.profile.units;
  const weightStep = units === "kg" ? 2.5 : 5;
  const priorSessions = useRef(loadData().sessions).current;

  const [view, setView] = useState<"focus" | "overview">("focus");
  const [subFor, setSubFor] = useState<number | null>(null);
  const [howto, setHowto] = useState(false);
  const [addingEx, setAddingEx] = useState(false);
  const [savedAsTemplate, setSavedAsTemplate] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [endEarly, setEndEarly] = useState(false);
  const finishedRef = useRef<CompletedSession | null>(null);
  const [cue, setCue] = useState<{ event: CueEvent; ctx: CueContext }>({ event: "start", ctx: {} });
  const [milestone, setMilestone] = useState<null | { kind: "pr" | "exercise"; title: string; detail?: string }>(null);
  const [summary, setSummary] = useState<null | {
    durationSec: number;
    volume: number;
    prs: string[];
    completed: number;
    skipped: number;
    sets: number;
    coins: number;
    muscles: string[];
    vsLast: { volume: number; duration: number } | null;
    proteinNudge: { eaten: number; target: number } | null;
  }>(null);

  const elapsed = useElapsed(session);

  // debounced write-through of a single cell to the API
  const syncTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const queueSync = (exi: number, si: number, immediate = false) => {
    if (!API_ENABLED || !session?.apiId) return;
    const key = `${exi}:${si}`;
    clearTimeout(syncTimers.current[key]);
    const fire = () => {
      const a = loadData().active;
      if (a) void syncSet(a, exi, si, units);
    };
    if (immediate) fire();
    else syncTimers.current[key] = setTimeout(fire, 450);
  };

  const cursor = session?.cursor ?? 0;
  const currentEx = session?.exercises[cursor] ?? null;
  const catEntry = useCatalogEntry(currentEx?.name ?? "");
  const queue = useMemo(() => (session ? sessionQueue(session) : []), [session]);
  const progress = useMemo(() => (session ? sessionProgress(session) : null), [session]);
  const liveVolume = useMemo(() => (session ? sessionVolume(session.exercises) : 0), [session]);

  useEffect(() => {
    if (milestone) {
      const t = setTimeout(() => setMilestone(null), 3400);
      return () => clearTimeout(t);
    }
  }, [milestone]);

  // "before set" cue whenever focus lands on a fresh, not-yet-done set
  const prevSetKey = useRef("");
  useEffect(() => {
    if (!session || session.restEndsAt) return;
    const ex = session.exercises[session.cursor];
    if (!ex) return;
    const si = activeSetIndex(ex);
    const key = `${session.cursor}:${si}`;
    if (prevSetKey.current === key) return;
    prevSetKey.current = key;
    const set = ex.sets[si];
    if (!set || set.done) return;
    const rw = ex.prescription?.weightKg != null ? fromKg(ex.prescription.weightKg, units) : null;
    const w = set.weight ?? rw;
    const top = lastTopSet(priorSessions, ex.name);
    setCue({
      event: "before-set",
      ctx: {
        heavierThanLast: !!(w && top && w > top.weight),
        lighterThanLast: !!(w && top && w < top.weight),
      },
    });
  }, [session, units, priorSessions]);

  // one-time start cue
  useEffect(() => {
    if (session && cue.event === "start" && cue.ctx.totalExercises === undefined) {
      setCue({
        event: "start",
        ctx: {
          totalExercises: session.exercises.filter((e) => !e.skipped).length,
          exerciseName: session.exercises[session.cursor]?.name,
        },
      });
    }
  }, [session, cue]);

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

  // ── mutations ─────────────────────────────────────────────────────────────
  const setEx = (i: number, fn: (e: LoggedExercise) => LoggedExercise) =>
    updateActive((s) => ({ ...s, exercises: s.exercises.map((e, idx) => (idx === i ? fn(e) : e)) }));

  const setSet = (
    exi: number,
    si: number,
    fn: (set: LoggedSet) => LoggedSet,
    opts?: { immediate?: boolean },
  ) => {
    setEx(exi, (e) => ({ ...e, sets: e.sets.map((set, idx) => (idx === si ? fn(set) : set)) }));
    queueSync(exi, si, opts?.immediate);
  };

  const patchActiveSet = (fn: (set: LoggedSet) => LoggedSet) => {
    if (!currentEx) return;
    setSet(cursor, activeSetIndex(currentEx), fn);
  };

  const addSet = (exi: number, warmup = false) => {
    setEx(exi, (e) => (warmup ? addWarmupSet(e) : addWorkingSet(e)));
    const a = loadData().active;
    if (a) queueSync(exi, (a.exercises[exi]?.sets.length ?? 1) - 1, true);
  };

  const deleteSet = (exi: number, si: number) => {
    const before = loadData().active;
    if (!before || (before.exercises[exi]?.sets.length ?? 0) <= 1) return;
    setEx(exi, (e) => ({ ...e, sets: e.sets.filter((_, idx) => idx !== si) }));
    if (API_ENABLED && before.apiId) {
      void (async () => {
        const count = before.exercises[exi]?.sets.length ?? 0;
        await syncDeleteSet(before, exi, count - 1);
        const after = loadData().active;
        if (after) for (let i = si; i < (after.exercises[exi]?.sets.length ?? 0); i++) queueSync(exi, i, true);
      })();
    }
  };

  const startRest = (sec: number) =>
    updateActive((s) => ({ ...s, restEndsAt: Date.now() + sec * 1000 }));
  const stopRest = () => updateActive((s) => ({ ...s, restEndsAt: null }));

  const togglePause = () =>
    updateActive((s) =>
      s.paused
        ? {
            ...s,
            paused: false,
            pausedAt: null,
            pausedMs: (s.pausedMs ?? 0) + (s.pausedAt ? Date.now() - s.pausedAt : 0),
          }
        : { ...s, paused: true, pausedAt: Date.now(), restEndsAt: null },
    );

  const jumpTo = (i: number) => {
    updateActive((s) => focusExercise(s, i));
    setView("focus");
  };

  const doDefer = (i: number, reason: string) => {
    const name = session?.exercises[i]?.name;
    updateActive((s) => deferExercise(s, i, reason));
    setCue({ event: "deferred", ctx: { exerciseName: name } });
    setView("focus");
  };

  const doResume = (i: number) => {
    const name = session?.exercises[i]?.name;
    updateActive((s) => resumeExercise(s, i));
    setCue({ event: "resumed", ctx: { exerciseName: name } });
    setView("focus");
  };

  const doSkip = (i: number, skip: boolean) => updateActive((s) => setSkipped(s, i, skip));

  const doSubstitute = (i: number, name: string) => {
    updateActive((s) => substituteExercise(s, i, name, { target: "3 × 8–12" }));
    setCue({ event: "substituted", ctx: { exerciseName: name } });
    setSubFor(null);
    const a = loadData().active;
    if (a) void syncNewPerformance(a, i, units);
  };

  const addExercise = (name: string) => {
    updateActive((s) => ({
      ...s,
      exercises: [
        ...s.exercises,
        {
          name,
          target: "3 × 8–12",
          skipped: false,
          deferred: false,
          deferReason: null,
          substitutedFrom: null,
          sets: [
            { weight: null, reps: null, rpe: null, done: false },
            { weight: null, reps: null, rpe: null, done: false },
            { weight: null, reps: null, rpe: null, done: false },
          ],
        },
      ],
      order: [...s.order, s.exercises.length],
    }));
    const a = loadData().active;
    if (a) void syncNewPerformance(a, a.exercises.length - 1, units);
  };

  // ── complete the working set in focus ────────────────────────────────────
  const completeActiveSet = () => {
    if (!currentEx || session?.paused) return;
    const si = activeSetIndex(currentEx);
    setSet(cursor, si, (set) => ({ ...set, done: true }), { immediate: true });
    vibrate(28);

    const fresh = loadData().active;
    if (!fresh) return;
    const freshEx = fresh.exercises[cursor];
    const done = isExerciseComplete(freshEx);
    const live = fresh.exercises.filter((e) => !e.skipped);
    const exercisesLeft = live.filter((e) => !isExerciseComplete(e)).length - (done ? 0 : 1);

    // PR / completion feedback whenever an exercise wraps
    let hadPr = false;
    if (done) {
      const prs = detectPRs({ exercises: [freshEx] }, priorSessions);
      if (prs.length) {
        hadPr = true;
        setMilestone({ kind: "pr", title: "new personal record", detail: prs[0] });
        setCue({ event: "pr", ctx: { prDetail: prs[0].split("— ")[1] } });
        vibrate([20, 40, 20]);
      } else {
        setMilestone({ kind: "exercise", title: `${freshEx.name} complete`, detail: `${freshEx.sets.filter((s) => s.done && !s.warmup).length} sets` });
      }
    }

    // ── superset routing: interleave peers, rest only between rounds ────────
    const step = freshEx.supersetGroup != null ? nextSupersetStep(fresh, cursor) : null;
    if (step) {
      updateActive((s) => focusExercise(s, step.targetIndex));
      const peerName = fresh.exercises[step.targetIndex]?.name;
      if (step.rest) {
        const doneWrk = freshEx.sets.filter((s) => s.done && !s.warmup);
        const lastRpe = doneWrk[doneWrk.length - 1]?.rpe;
        const restSec = adaptiveRest(catEntry?.mechanic, lastRpe);
        startRest(restSec);
        setCue({ event: "rest", ctx: { restSeconds: restSec } });
      } else {
        setCue({ event: "superset-next", ctx: { exerciseName: peerName } });
      }
      const after = loadData().active;
      if (after && after.exercises.filter((e) => !e.skipped).every(isExerciseComplete)) {
        setTimeout(() => void finish(), 1000);
      }
      return;
    }

    if (done) {
      if (!hadPr)
        setCue({
          event: exercisesLeft <= 0 ? "finish" : exercisesLeft === 1 ? "almost-done" : "exercise-done",
          ctx: { exercisesLeft, exerciseName: freshEx.name },
        });
      updateActive((s) => advance(s));
      const after = loadData().active;
      if (after && after.exercises.filter((e) => !e.skipped).every(isExerciseComplete)) {
        setTimeout(() => void finish(), 1000);
      } else if (after && after.cursor !== cursor && !isExerciseComplete(after.exercises[after.cursor])) {
        startRest(DEFAULT_REST);
      }
    } else {
      const setsLeft = freshEx.sets.filter((s) => !s.done).length;
      const doneWrk2 = freshEx.sets.filter((s) => s.done && !s.warmup);
      const lastRpe2 = doneWrk2[doneWrk2.length - 1]?.rpe;
      const restSec = adaptiveRest(catEntry?.mechanic, lastRpe2);
      startRest(restSec);
      setCue({ event: "rest", ctx: { restSeconds: restSec, setsLeftInExercise: setsLeft } });
    }
  };

  // ── finish ───────────────────────────────────────────────────────────────
  const finish = async () => {
    if (!session || finishing) return;
    setFinishing(true);
    const working = session.exercises.filter((e) => !e.skipped);
    let prs = detectPRs({ exercises: working }, priorSessions);
    let volume = sessionVolume(session.exercises);
    let durationSec = Math.max(
      0,
      Math.round((Date.now() - Date.parse(session.startedAt) - (session.pausedMs ?? 0)) / 1000),
    );

    if (API_ENABLED && session.apiId) {
      for (let e = 0; e < session.exercises.length; e++)
        for (let s = 0; s < session.exercises[e].sets.length; s++) queueSync(e, s, true);
      const result = await finishApiSession(session, durationSec);
      if (result) {
        volume = fromKg(result.totalVolumeKg, units);
        durationSec = result.durationSeconds || durationSec;
        prs = (result.personalRecords ?? []).map(
          (p) => `${p.exercise?.name ?? "lift"} — ${p.recordType.replace(/_/g, " ")}`,
        );
      }
    }

    const before = walletStore.snapshot().lifetimeEarned;
    const completed = finishSession(volume, units, prs, session.apiId);
    finishedRef.current = completed;
    const lastSame = priorSessions.find((s) => s.name === session.name) ?? null;
    const vsLast = lastSame
      ? { volume: volume - lastSame.volume, duration: durationSec - lastSame.durationSec }
      : null;
    grantWorkoutRewards({
      sessionId: session.apiId ?? session.startedAt,
      volume,
      prs: prs.length,
      streakDays: streakData.days,
    });
    const coins = walletStore.snapshot().lifetimeEarned - before;

    let muscles: string[] = [];
    try {
      const cat = await import("../lib/repdb.catalog");
      const set = new Set<string>();
      for (const e of working) {
        if (!e.sets.some((s) => s.done)) continue;
        const key = norm(e.name);
        const hit =
          cat.REPDB_CATALOG.find((c) => norm(c.name) === key) ??
          cat.REPDB_CATALOG.find((c) => norm(c.name).includes(key));
        hit?.primary.forEach((m) => set.add(m));
      }
      muscles = [...set].slice(0, 6);
    } catch {
      /* offline / no catalog */
    }

    let proteinNudge: { eaten: number; target: number } | null = null;
    if (API_ENABLED && data.nutritionTargets?.protein) {
      try {
        const foodDay = await api.food.day();
        const eaten = Math.round(foodDay.totals?.protein ?? 0);
        const target = data.nutritionTargets.protein;
        if (eaten < target * 0.85) proteinNudge = { eaten, target };
      } catch { /* offline — skip nudge */ }
    }

    setSummary({
      durationSec,
      volume,
      prs,
      completed: working.filter((e) => e.sets.some((s) => s.done)).length,
      skipped: session.exercises.filter((e) => e.skipped).length,
      sets: session.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done && !s.warmup).length, 0),
      coins,
      muscles,
      vsLast,
      proteinNudge,
    });
    setFinishing(false);
  };

  // ── derived display for the focus card ───────────────────────────────────
  const activeIdx = currentEx ? activeSetIndex(currentEx) : 0;
  const activeSet = currentEx?.sets[activeIdx] ?? null;
  const workingSets = currentEx?.sets.filter((s) => !s.warmup) ?? [];
  const workingDone = workingSets.filter((s) => s.done).length;
  const last = currentEx ? lastPerformance(priorSessions, currentEx.name) : null;
  const rxWeight =
    currentEx?.prescription?.weightKg != null ? fromKg(currentEx.prescription.weightKg, units) : null;
  const rxReps = currentEx?.prescription?.reps ?? null;
  const trainablePos = queue.find((r) => r.index === cursor)?.position ?? 1;
  const trainableTotal = queue.filter((r) => r.phase !== "skipped").length;

  return (
    <div className="mx-auto max-w-[720px] pb-28">
      {/* ── HUD top bar ─────────────────────────────────────────────── */}
      <header className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => nav("/workouts")}
            className="focus-ring -ml-1 flex items-center gap-1 text-[0.8rem] lowercase text-content-tertiary hover:text-content-secondary"
          >
            <ChevronLeft size={15} /> plan
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={togglePause}
              className="focus-ring flex items-center gap-1.5 rounded-pill bg-white/[0.06] px-3 py-1.5 text-[0.78rem] lowercase tabular-nums text-content-secondary hover:bg-white/[0.1]"
            >
              {session?.paused ? <Play size={12} /> : <Pause size={12} />}
              {elapsed}
            </button>
            <button
              onClick={() => setView("overview")}
              className="focus-ring rounded-pill bg-white/[0.06] px-3 py-1.5 text-[0.78rem] lowercase text-content-secondary hover:bg-white/[0.1]"
            >
              overview
            </button>
          </div>
        </div>
        <h1 className="mt-3 text-title text-content-primary lowercase">{session?.name}</h1>
        <div className="mt-3">
          <ProgressRail queue={queue} cursor={cursor} onJump={jumpTo} />
          {progress && (
            <div className="label-instrument mt-1.5">
              exercise {Math.min(progress.exercisesDone + 1, progress.exercisesTotal)} / {progress.exercisesTotal}
              {" · "}
              {progress.setsDone} / {progress.setsTotal} sets · {Math.round(liveVolume).toLocaleString()} {units}
            </div>
          )}
        </div>
      </header>

      {session && session.exercises.length === 0 && (
        <div className="surface-soft mb-5 p-6 text-center sm:p-8">
          <h2 className="text-heading text-content-primary lowercase">empty workout</h2>
          <p className="mx-auto mt-2 max-w-[34ch] text-[0.88rem] text-content-secondary lowercase">
            add exercises as you go. log your sets, rest between them, and finish when you're done.
          </p>
          <button
            onClick={() => setAddingEx(true)}
            className="focus-ring tactile mt-6 rounded-hero bg-[var(--accent-lime)] px-6 py-3.5 text-[0.95rem] font-semibold lowercase text-[#0c0c0c] active:scale-[0.99]"
          >
            + add your first exercise
          </button>
        </div>
      )}
      <ExercisePicker
        open={addingEx}
        onClose={() => setAddingEx(false)}
        onPick={(n) => {
          addExercise(n);
          setAddingEx(false);
        }}
      />

      {session?.paused && (
        <div className="surface-recessed mb-5 flex items-center justify-between rounded-hero p-4">
          <span className="text-[0.9rem] lowercase text-content-secondary">workout paused</span>
          <button onClick={togglePause} className="focus-ring rounded-pill bg-[var(--accent-lime)] px-4 py-2 text-[0.82rem] lowercase text-[#0c0c0c]">
            resume
          </button>
        </div>
      )}

      {/* ── milestone banner ────────────────────────────────────────── */}
      <AnimatePresence>
        {milestone && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="mb-5 overflow-hidden rounded-[var(--radius-large)]"
            style={{
              border: milestone.kind === "pr"
                ? "1px solid color-mix(in srgb, var(--accent-lime) 45%, transparent)"
                : "1px solid var(--line-soft)",
              background: milestone.kind === "pr"
                ? "radial-gradient(120% 180% at 10% -20%, color-mix(in srgb, var(--accent-lime) 18%, transparent), transparent 60%), color-mix(in srgb, var(--accent-lime) 6%, transparent)"
                : "rgba(255,255,255,0.03)",
              boxShadow: milestone.kind === "pr"
                ? "0 0 40px -12px color-mix(in srgb, var(--accent-lime) 40%, transparent)"
                : "none",
            }}
          >
            <div className="flex items-center gap-4 p-4 sm:p-5">
              <motion.div
                animate={milestone.kind === "pr" && !reduce ? { scale: [0.6, 1.18, 0.96, 1.04, 1] } : {}}
                transition={{ duration: 0.5, ease: EASE }}
                className="grid shrink-0 place-items-center rounded-full"
                style={{
                  width: milestone.kind === "pr" ? 48 : 36,
                  height: milestone.kind === "pr" ? 48 : 36,
                  background: milestone.kind === "pr" ? "var(--accent-lime)" : "rgba(255,255,255,0.08)",
                  boxShadow: milestone.kind === "pr" ? "0 0 20px -4px rgba(216,255,99,0.6)" : "none",
                }}
              >
                {milestone.kind === "pr" ? (
                  <Trophy size={20} strokeWidth={2.2} className="text-[#0c0c0c]" />
                ) : (
                  <Check size={15} strokeWidth={2.6} className="text-content-primary" />
                )}
              </motion.div>
              <div className="min-w-0">
                <div
                  className="font-semibold lowercase leading-tight"
                  style={{
                    fontSize: milestone.kind === "pr" ? "1.05rem" : "0.9rem",
                    color: milestone.kind === "pr" ? "var(--accent-lime)" : "var(--text-primary)",
                  }}
                >
                  {milestone.title}
                </div>
                {milestone.detail && (
                  <div className="label-instrument mt-0.5 text-content-secondary">{milestone.detail}</div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── rest overlay OR focus card ──────────────────────────────── */}
      {session && (
        <RestOrFocus
          session={session}
          currentEx={currentEx}
          catEntry={catEntry}
          units={units}
          weightStep={weightStep}
          activeIdx={activeIdx}
          activeSet={activeSet}
          workingDone={workingDone}
          workingCount={workingSets.length}
          trainablePos={trainablePos}
          trainableTotal={trainableTotal}
          supersetLabel={
            session && supersetPosition(session, cursor)
              ? `superset ${supersetPosition(session, cursor)!.letter} · ${supersetPosition(session, cursor)!.position}/${supersetPosition(session, cursor)!.count}`
              : null
          }
          last={last}
          rxWeight={rxWeight}
          rxReps={rxReps}
          cueText={trainerCue(cue.event, cue.ctx)}
          onStopRest={stopRest}
          onStartRest={startRest}
          onPatchActiveSet={patchActiveSet}
          onUsePrevious={() => {
            if (!currentEx) return;
            const top = lastTopSet(priorSessions, currentEx.name);
            if (top) patchActiveSet((s) => ({ ...s, weight: top.weight, reps: top.reps }));
          }}
          onCompleteSet={completeActiveSet}
          onAddSet={(w) => addSet(cursor, w)}
          onToggleWarmup={() =>
            currentEx && setSet(cursor, activeIdx, (s) => ({ ...s, warmup: !s.warmup }))
          }
          onHowto={() => setHowto(true)}
          onDeferBusy={() => doDefer(cursor, "machine busy")}
          onReplace={() => setSubFor(cursor)}
        />
      )}

      {/* set list for the current exercise */}
      {currentEx && !session?.restEndsAt && (
        <div className="mt-4">
          <div className="label-soft mb-2 lowercase">sets</div>
          <div className="space-y-1.5">
            {currentEx.sets.map((s, si) => {
              const workingIdx = currentEx.sets.slice(0, si + 1).filter((x) => !x.warmup).length - 1;
              const prevSet = !s.warmup && last?.sets[workingIdx] ? last.sets[workingIdx] : null;
              return (
              <div
                key={si}
                className={`rounded-[var(--radius-medium)] px-3 py-2 text-[0.88rem] ${
                  si === activeIdx && !s.done ? "surface-recessed" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                <span className="w-10 shrink-0 label-instrument">
                  {s.warmup ? "w/u" : `#${currentEx.sets.slice(0, si + 1).filter((x) => !x.warmup).length}`}
                </span>
                <span className="flex-1 tabular-nums text-content-secondary">
                  {s.weight != null ? `${s.weight} ${units}` : "—"} ×{" "}
                  {s.isAmrap ? (
                    <span className="rounded-sm px-1 text-[0.72rem] font-semibold uppercase tracking-wider" style={{ background: "rgba(var(--accent-amber-rgb,250,170,58),0.18)", color: "var(--accent-amber)" }}>amrap</span>
                  ) : (s.reps ?? "—")}
                  {s.rpe != null ? ` @ ${s.rpe}` : ""}
                </span>
                <button
                  aria-label={s.done ? "mark set not done" : "mark set done"}
                  onClick={() => setSet(cursor, si, (set) => ({ ...set, done: !set.done }), { immediate: true })}
                  className={`focus-ring grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-colors ${
                    s.done
                      ? "border-transparent bg-[var(--accent-lime)] text-[#0c0c0c]"
                      : "border-[var(--line-soft)] text-content-tertiary"
                  }`}
                >
                  <Check size={13} strokeWidth={2.6} />
                </button>
                <button
                  aria-label="delete set"
                  onClick={() => deleteSet(cursor, si)}
                  className="focus-ring grid h-7 w-7 shrink-0 place-items-center rounded-full text-content-tertiary hover:text-content-secondary"
                >
                  <X size={13} strokeWidth={2} />
                </button>
                </div>
                {prevSet && !s.done && (
                  <div className="ml-10 mt-0.5 label-instrument" style={{ color: "var(--content-tertiary)" }}>
                    last time: {prevSet.weight} {units} × {prevSet.reps}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <button
          onClick={() => setEndEarly(true)}
          className="focus-ring text-[0.8rem] lowercase text-content-tertiary hover:text-content-secondary"
        >
          end workout
        </button>
      </div>

      {/* ── overview sheet ─────────────────────────────────────────── */}
      <DetailDrawer open={view === "overview"} onClose={() => setView("focus")} title="workout overview" eyebrow={session?.name}>
        <OverviewBody
          queue={queue}
          cursor={cursor}
          units={units}
          onJump={jumpTo}
          onDefer={(i) => doDefer(i, "do later")}
          onResume={doResume}
          onSkip={doSkip}
          onReplace={(i) => {
            setView("focus");
            setSubFor(i);
          }}
          onAddExercise={addExercise}
        />
      </DetailDrawer>

      {/* ── substitute sheet ──────────────────────────────────────── */}
      <SubstituteSheet
        exIndex={subFor}
        session={session}
        environment={data.profile.environment}
        onClose={() => setSubFor(null)}
        onPick={doSubstitute}
      />

      {/* ── how-to drawer (reuses the library drawer) ─────────────── */}
      <ExerciseDetailDrawer exercise={howto ? catEntry : null} onClose={() => setHowto(false)} />

      {/* ── end early ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {endEarly && progress && (
          <Scrim onClose={() => setEndEarly(false)}>
            <h2 className="text-heading text-content-primary lowercase">leave workout?</h2>
            <p className="mx-auto mt-2 max-w-[34ch] text-[0.88rem] text-content-secondary">
              {progress.exercisesDone} / {progress.exercisesTotal} exercises · {progress.setsDone} / {progress.setsTotal} sets logged.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={() => setEndEarly(false)}
                className="focus-ring rounded-pill surface-recessed px-5 py-2.5 text-[0.86rem] lowercase text-content-primary"
              >
                continue workout
              </button>
              <button
                onClick={() => {
                  if (!session?.paused) togglePause();
                  nav("/workouts");
                }}
                className="focus-ring rounded-pill px-5 py-2.5 text-[0.86rem] lowercase text-content-secondary hover:text-content-primary"
              >
                pause &amp; exit — resume later
              </button>
              <Button onClick={() => void finish()} disabled={finishing} className="w-full">
                {finishing ? "saving…" : "finish & save workout"}
              </Button>
              <button
                onClick={() => {
                  const a = loadData().active;
                  if (a) void abandonApiSession(a);
                  abandonSession();
                  nav("/workouts");
                }}
                className="focus-ring rounded-pill px-5 py-2 text-[0.82rem] lowercase text-[var(--accent-pink)]"
              >
                discard without saving
              </button>
            </div>
          </Scrim>
        )}
      </AnimatePresence>

      {/* ── completion ────────────────────────────────────────────── */}
      <AnimatePresence>
        {summary && (
          <motion.div
            className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-[rgba(16,10,17,0.85)] p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md surface-glass rounded-shell p-8"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <div className="flex items-center gap-3">
                <KaiOrb size={40} state="done" />
                <div>
                  <div className="label-instrument">workout complete</div>
                  <h2 className="text-heading text-content-primary lowercase">
                    {session?.name ?? finishedRef.current?.name ?? "session"}
                  </h2>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2.5 text-center">
                {[
                  ["time", `${Math.floor(summary.durationSec / 60)}m`],
                  ["volume", Math.round(summary.volume).toLocaleString()],
                  ["sets", `${summary.sets}`],
                ].map(([label, value]) => (
                  <div key={label} className="surface-recessed rounded-hero p-3">
                    <div className="metric-numeral text-[1.35rem] text-content-primary">{value}</div>
                    <div className="label-instrument mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              {summary.coins > 0 && (
                <div className="mt-3 flex items-center justify-center gap-2 rounded-hero border border-[var(--accent-amber)]/25 bg-[var(--accent-amber)]/[0.08] py-2.5">
                  <Coins size={14} className="text-[var(--accent-amber)]" />
                  <span className="num text-[0.95rem] font-semibold tabular-nums text-[var(--accent-amber)]">
                    +{summary.coins}
                  </span>
                  <span className="text-[0.82rem] lowercase text-content-secondary">earned this session</span>
                </div>
              )}

              {summary.prs.length > 0 && (
                <div className="mt-3 rounded-2xl border border-[color-mix(in_srgb,var(--accent-lime)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent-lime)_8%,transparent)] p-4">
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

              {summary.muscles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {summary.muscles.map((m) => (
                    <span key={m} className="label-instrument rounded-pill surface-recessed px-3 py-1">
                      {m.toLowerCase()}
                    </span>
                  ))}
                </div>
              )}

              {summary.skipped > 0 && (
                <p className="mt-3 label-instrument">{summary.skipped} exercise(s) skipped</p>
              )}

              {summary.vsLast && (
                <p className="mt-3 label-instrument">
                  vs last time:{" "}
                  <span
                    style={{
                      color:
                        summary.vsLast.volume >= 0 ? "var(--accent-lime)" : "var(--accent-amber)",
                    }}
                  >
                    {summary.vsLast.volume >= 0 ? "+" : ""}
                    {Math.round(summary.vsLast.volume).toLocaleString()} {units} volume
                  </span>
                  {" · "}
                  {summary.vsLast.duration >= 0 ? "+" : ""}
                  {Math.round(summary.vsLast.duration / 60)} min
                </p>
              )}

              {summary.proteinNudge && (
                <div className="mt-3 flex items-start gap-2 rounded-2xl p-3.5 text-[0.84rem] text-content-secondary"
                  style={{ border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.08)" }}>
                  <Zap size={14} className="mt-0.5 shrink-0" style={{ color: "var(--accent-amber)" }} />
                  <span>
                    protein today:{" "}
                    <span className="font-medium text-content-primary">{summary.proteinNudge.eaten}g</span>
                    {" of "}
                    <span className="font-medium text-content-primary">{summary.proteinNudge.target}g</span>
                    {" - log a meal to hit your goal."}
                  </span>
                </div>
              )}

              <p className="mt-4 flex items-start gap-2 text-[0.9rem] italic leading-relaxed text-content-secondary">
                <span aria-hidden>"</span>
                {trainerCue("finish")}
              </p>

              <div className="mt-6 flex flex-col gap-2.5">
                <div className="flex gap-2.5">
                  <Link to="/workouts" className="flex-1">
                    <Button className="w-full">done</Button>
                  </Link>
                  <Link to="/progress" className="flex-1">
                    <Button variant="ghost" className="w-full">
                      progress
                    </Button>
                  </Link>
                </div>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => {
                      const s = finishedRef.current;
                      if (!s) return;
                      startSession(s.name, repeatFromCompleted(s));
                      setSummary(null);
                      nav("/workouts/active");
                    }}
                    className="focus-ring surface-recessed flex-1 rounded-pill py-2.5 text-[0.82rem] lowercase text-content-secondary hover:text-content-primary"
                  >
                    repeat workout
                  </button>
                  <button
                    onClick={() => {
                      const s = finishedRef.current;
                      if (!s || savedAsTemplate) return;
                      void saveSessionAsTemplate(s);
                      setSavedAsTemplate(true);
                    }}
                    disabled={savedAsTemplate}
                    className="focus-ring surface-recessed flex-1 rounded-pill py-2.5 text-[0.82rem] lowercase text-content-secondary hover:text-content-primary disabled:opacity-50"
                  >
                    {savedAsTemplate ? (
                      <span className="flex items-center justify-center gap-1.5"><Check size={12} strokeWidth={2.5} /> saved</span>
                    ) : "save as template"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
function Scrim({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="fixed inset-0 z-[85] grid place-items-center bg-[rgba(16,10,17,0.72)] p-4 backdrop-blur-sm"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-sm surface-glass rounded-shell p-7 text-center"
        onClick={(e) => e.stopPropagation()}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.24, ease: EASE }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

// ── rest overlay / focus card switch ───────────────────────────────────────
function RestOrFocus(props: {
  session: NonNullable<ReturnType<typeof useFormaData>["active"]>;
  currentEx: LoggedExercise | null;
  catEntry: RepDbCatalogEntry | null;
  units: string;
  weightStep: number;
  activeIdx: number;
  activeSet: LoggedSet | null;
  workingDone: number;
  workingCount: number;
  trainablePos: number;
  trainableTotal: number;
  supersetLabel: string | null;
  last: ReturnType<typeof lastPerformance>;
  rxWeight: number | null;
  rxReps: number | null;
  cueText: string;
  onStopRest: () => void;
  onStartRest: (s: number) => void;
  onPatchActiveSet: (fn: (s: LoggedSet) => LoggedSet) => void;
  onUsePrevious: () => void;
  onCompleteSet: () => void;
  onAddSet: (warmup: boolean) => void;
  onToggleWarmup: () => void;
  onHowto: () => void;
  onDeferBusy: () => void;
  onReplace: () => void;
}) {
  const { session, currentEx, catEntry, units, activeSet, cueText } = props;
  const [now, setNow] = useState(() => Date.now());
  const [imgFrame, setImgFrame] = useState(0);
  const restEndsAt = session.restEndsAt;

  // Animate between start/end RepDB frames when resting or viewing the card
  const imgStart = catEntry?.imgStart ? repdbImage(catEntry.imgStart) : null;
  const imgEnd = catEntry?.imgEnd ? repdbImage(catEntry.imgEnd) : null;
  const hasAnim = !!(imgStart && imgEnd);
  useEffect(() => {
    if (!hasAnim) return;
    const id = setInterval(() => setImgFrame((f) => (f === 0 ? 1 : 0)), 800);
    return () => clearInterval(id);
  }, [hasAnim]);

  useEffect(() => {
    if (!restEndsAt) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [restEndsAt]);

  const remaining = restEndsAt ? Math.ceil((restEndsAt - now) / 1000) : 0;
  useEffect(() => {
    if (restEndsAt && remaining <= 0) {
      vibrate([40, 30, 40]);
      props.onStopRest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restEndsAt, remaining]);

  if (!currentEx) return null;

  const thumb = repdbThumb(currentEx.name);
  const animSrc = hasAnim ? (imgFrame === 0 ? imgStart! : imgEnd!) : thumb;

  // ── REST STATE ──────────────────────────────────────────────────────────
  if (restEndsAt && remaining > 0) {
    const totalRest = restEndsAt
      ? Math.round((restEndsAt - (restEndsAt - remaining * 1000 - (Date.now() - (restEndsAt - remaining * 1000)))) / 1000)
      : remaining;
    const pct = Math.max(0, Math.min(1, remaining / Math.max(totalRest, remaining)));
    const R = 52;
    const circumference = 2 * Math.PI * R;
    const dash = pct * circumference;

    return (
      <div className="surface-soft overflow-hidden">
        {/* cinematic rest header */}
        <div className="flex flex-col items-center px-6 pt-10 pb-6 text-center">
          <div className="label-soft lowercase flex items-center gap-1.5 mb-6">
            <Timer size={12} /> rest
          </div>

          {/* circular countdown ring */}
          <div className="relative mb-4" style={{ width: 140, height: 140 }}>
            <svg width={140} height={140} style={{ transform: "rotate(-90deg)" }}>
              {/* track */}
              <circle cx={70} cy={70} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={6} />
              {/* progress */}
              <circle
                cx={70} cy={70} r={R}
                fill="none"
                stroke="var(--accent-lime)"
                strokeWidth={6}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circumference}`}
                style={{ transition: "stroke-dasharray 0.25s linear", filter: "drop-shadow(0 0 8px var(--accent-lime))" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div
                className="metric-numeral tabular-nums leading-none text-content-primary"
                style={{ fontSize: "clamp(2.6rem, 10vw, 3.4rem)" }}
              >
                {fmtClock(remaining)}
              </div>
            </div>
          </div>

          {/* controls */}
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => props.onStartRest(remaining + 15)} className="focus-ring tactile rounded-pill bg-white/[0.06] px-4 py-2 text-[0.85rem] tabular-nums text-content-primary hover:bg-white/[0.12]">
              +15s
            </button>
            <button onClick={props.onStopRest} className="btn-primary px-7 py-3 text-[0.95rem]">
              ready
            </button>
            <button onClick={() => props.onStartRest(Math.max(1, remaining - 15))} className="focus-ring tactile rounded-pill bg-white/[0.06] px-4 py-2 text-[0.85rem] tabular-nums text-content-primary hover:bg-white/[0.12]">
              -15s
            </button>
          </div>
        </div>

        {/* next up */}
        <div className="surface-recessed mx-5 mb-5 rounded-hero p-4 text-left">
          <div className="label-instrument mb-2">next up</div>
          <div className="flex items-center gap-3">
            <ExerciseThumb src={thumb} alt="" size={44} />
            <div className="min-w-0">
              <div className="truncate text-[0.95rem] lowercase text-content-primary">{currentEx.name}</div>
              <div className="label-instrument mt-0.5 tabular-nums">
                set {props.workingDone + 1} / {props.workingCount}
                {activeSet?.weight != null ? ` · ${activeSet.weight} ${units} × ${activeSet.reps ?? "—"}` : ""}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-5 mb-5 flex items-start gap-2.5">
          <KaiOrb size={26} state="idle" />
          <p className="text-[0.86rem] italic leading-relaxed text-content-secondary">{cueText}</p>
        </div>
      </div>
    );
  }

  // ── FOCUS STATE ─────────────────────────────────────────────────────────
  const isBodyweight = catEntry?.bodyweight ?? false;
  return (
    <div className="surface-soft overflow-hidden">
      {animSrc && (
        <div className="relative aspect-[16/10] w-full bg-[#150c12]">
          <img
            key={animSrc}
            src={animSrc}
            alt={currentEx.name}
            className="h-full w-full object-cover opacity-90 transition-opacity duration-300"
            loading="eager"
          />
          <button
            onClick={props.onHowto}
            className="focus-ring absolute bottom-3 right-3 rounded-pill bg-[rgba(12,6,10,0.7)] px-3 py-1.5 text-[0.76rem] lowercase text-content-primary backdrop-blur-sm hover:bg-[rgba(12,6,10,0.85)]"
          >
            how to
          </button>
        </div>
      )}

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="label-instrument flex flex-wrap items-center gap-x-2">
              {props.supersetLabel && (
                <span
                  className="rounded-pill px-2 py-0.5 text-[0.68rem] uppercase tracking-[0.08em]"
                  style={{
                    background: "color-mix(in srgb, var(--accent-mauve) 16%, transparent)",
                    color: "var(--accent-mauve)",
                  }}
                >
                  {props.supersetLabel}
                </span>
              )}
              <span>
                exercise {props.trainablePos} / {props.trainableTotal}
                {currentEx.substitutedFrom ? ` · swapped from ${currentEx.substitutedFrom}` : ""}
              </span>
            </div>
            {/* hero: exercise name at display scale */}
            <h2
              className="mt-1 font-medium lowercase text-content-primary leading-[1.0]"
              style={{ fontSize: "clamp(1.7rem, 6vw, 2.6rem)", letterSpacing: "-0.02em" }}
            >
              {currentEx.name}
            </h2>
            {/* set counter — prominent, accent color */}
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className="font-semibold tabular-nums leading-none"
                style={{ fontSize: "clamp(2.4rem, 9vw, 3.6rem)", color: "var(--accent-pink)", letterSpacing: "-0.03em" }}
              >
                {props.workingDone + 1}
              </span>
              <span className="text-[1rem] text-content-tertiary">
                / {props.workingCount}
              </span>
              <span className="label-instrument ml-1">sets · {currentEx.target}</span>
            </div>
          </div>
        </div>

        {/* previous / today */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            onClick={props.onUsePrevious}
            disabled={!props.last?.sets.length}
            className="focus-ring surface-recessed rounded-hero p-3 text-left disabled:cursor-default"
          >
            <div className="label-instrument flex items-center justify-between">
              previous
              {props.last?.sets.length ? <span className="text-content-tertiary">tap to fill</span> : null}
            </div>
            <div className="mt-0.5 text-[0.95rem] tabular-nums text-content-secondary">
              {props.last?.sets.length
                ? props.last.sets
                    .slice(0, 3)
                    .map((s) => `${s.weight}×${s.reps}`)
                    .join("  ")
                : "first time"}
            </div>
          </button>
          <div className="surface-recessed rounded-hero p-3">
            <div className="label-instrument" style={{ color: "var(--accent-mauve)" }}>
              today
            </div>
            <div className="mt-0.5 text-[0.95rem] tabular-nums text-content-primary">
              {props.rxWeight != null || props.rxReps != null
                ? `${props.rxWeight != null ? `${props.rxWeight} ${units} ` : ""}${props.rxReps != null ? `× ${props.rxReps}` : ""}`
                : currentEx.target}
              {currentEx.prescription?.note ? (
                <span className="label-instrument block">{currentEx.prescription.note}</span>
              ) : null}
              {(() => {
                if (props.rxWeight == null || !props.last?.sets.length) return null;
                const bestE1rm = Math.max(...props.last.sets.map((s) => epley1RM(s.weight, s.reps)));
                if (bestE1rm <= 0) return null;
                const pct = Math.round((props.rxWeight / bestE1rm) * 100);
                if (pct < 40 || pct > 115) return null;
                return (
                  <span className="label-instrument block" style={{ color: "var(--accent-mauve)" }}>
                    {pct}% of est. 1RM
                  </span>
                );
              })()}
            </div>
          </div>
        </div>

        {/* steppers for the active set */}
        <div className="mt-3 flex gap-2.5">
          {!isBodyweight && (
            <Stepper
              label="weight"
              suffix={units}
              value={activeSet?.weight ?? null}
              step={props.weightStep}
              onChange={(v) => props.onPatchActiveSet((s) => ({ ...s, weight: v }))}
            />
          )}
          <Stepper
            label="reps"
            value={activeSet?.reps ?? null}
            step={1}
            onChange={(v) => props.onPatchActiveSet((s) => ({ ...s, reps: v }))}
          />
          <Stepper
            label="rpe"
            value={activeSet?.rpe ?? null}
            step={0.5}
            onChange={(v) => props.onPatchActiveSet((s) => ({ ...s, rpe: v }))}
          />
        </div>

        {/* plate calculator — shown when a weight is set and exercise uses a barbell */}
        {activeSet?.weight != null && !isBodyweight && (() => {
          const barKg = units === "kg" ? 20 : 45;
          const result = plateCombo(activeSet.weight, barKg, units as "kg" | "lb");
          if (!result.perSide.length) return null;
          return (
            <div className="mt-2 flex items-center gap-2 rounded-hero px-3 py-2" style={{ background: "rgba(255,255,255,0.04)" }}>
              <span className="label-instrument shrink-0">plates/side</span>
              <span className="flex-1 tabular-nums text-[0.82rem] text-content-secondary">{plateLabel(result.perSide)}</span>
              {result.loaded !== activeSet.weight && (
                <span className="label-instrument shrink-0 tabular-nums" style={{ color: "var(--accent-amber)" }}>
                  {result.loaded} {units}
                </span>
              )}
            </div>
          );
        })()}

        <button
          onClick={props.onCompleteSet}
          className="focus-ring btn-primary mt-3 w-full rounded-[var(--radius-large)] py-4 text-[1.05rem]"
          style={{ borderRadius: "var(--radius-large)" }}
        >
          complete set {props.workingDone + 1}
        </button>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[0.76rem] lowercase text-content-tertiary">
          <button onClick={() => props.onAddSet(false)} className="focus-ring hover:text-content-secondary">
            + set
          </button>
          <button onClick={() => props.onAddSet(true)} className="focus-ring hover:text-content-secondary">
            + warmup
          </button>
          <button onClick={props.onToggleWarmup} className="focus-ring hover:text-content-secondary">
            {activeSet?.warmup ? "unmark warmup" : "this is a warmup"}
          </button>
          <button
            onClick={() => props.onPatchActiveSet((s) => ({ ...s, isAmrap: !s.isAmrap, reps: s.isAmrap ? s.reps : null }))}
            className={`focus-ring hover:text-content-secondary ${activeSet?.isAmrap ? "text-[var(--accent-amber)]" : ""}`}
          >
            {activeSet?.isAmrap ? "unmark amrap" : "amrap set"}
          </button>
          <button onClick={props.onDeferBusy} className="focus-ring hover:text-content-secondary">
            <SkipForward size={11} className="mr-1 inline" />
            machine busy
          </button>
          <button onClick={props.onReplace} className="focus-ring hover:text-content-secondary">
            <Repeat2 size={11} className="mr-1 inline" />
            replace
          </button>
        </div>

        <div className="mt-4 flex items-start gap-2.5 border-t border-[var(--line-soft)] pt-4">
          <KaiOrb size={26} state="idle" />
          <p className="text-[0.86rem] italic leading-relaxed text-content-secondary">{cueText}</p>
        </div>
      </div>
    </div>
  );
}

// ── overview body ──────────────────────────────────────────────────────────
function OverviewBody({
  queue,
  cursor,
  units,
  onJump,
  onDefer,
  onResume,
  onSkip,
  onReplace,
  onAddExercise,
}: {
  queue: ReturnType<typeof sessionQueue>;
  cursor: number;
  units: string;
  onJump: (i: number) => void;
  onDefer: (i: number) => void;
  onResume: (i: number) => void;
  onSkip: (i: number, skip: boolean) => void;
  onReplace: (i: number) => void;
  onAddExercise: (name: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const phaseIcon: Record<string, React.ReactNode> = {
    done:     <Check  size={13} strokeWidth={2.5} />,
    active:   <Play   size={11} strokeWidth={2.5} />,
    deferred: <Clock  size={12} strokeWidth={2} />,
    skipped:  <Circle size={11} strokeWidth={1.5} />,
    pending:  <Circle size={11} strokeWidth={1.5} />,
  };
  return (
    <div className="space-y-2">
      {queue.map((r, qi) => {
        const done = r.ex.sets.filter((s) => s.done && !s.warmup).length;
        const total = r.ex.sets.filter((s) => !s.warmup).length;
        const grp = r.ex.supersetGroup ?? null;
        const prevGrp = qi > 0 ? queue[qi - 1].ex.supersetGroup ?? null : null;
        const groupHeader = grp != null && grp !== prevGrp;
        return (
          <div key={r.index}>
            {groupHeader && (
              <div className="mb-1 mt-2 flex items-center gap-2 px-1">
                <span
                  className="rounded-pill px-2 py-0.5 text-[0.66rem] uppercase tracking-[0.1em]"
                  style={{
                    background: "color-mix(in srgb, var(--accent-mauve) 16%, transparent)",
                    color: "var(--accent-mauve)",
                  }}
                >
                  superset {supersetLetter(grp)}
                </span>
                <span className="label-instrument">back-to-back · rest after the round</span>
              </div>
            )}
          <div
            className={`rounded-[var(--radius-medium)] p-3 ${grp != null ? "border-l-2 border-[color-mix(in_srgb,var(--accent-mauve)_45%,transparent)]" : ""} ${r.index === cursor ? "surface-recessed" : ""}`}
          >
            <div className="flex items-center gap-3">
              <span
                className="flex w-4 shrink-0 items-center justify-center"
                style={{
                  color:
                    r.phase === "done"
                      ? "var(--accent-lime)"
                      : r.phase === "active"
                      ? "var(--accent-pink)"
                      : r.phase === "deferred"
                      ? "var(--accent-amber)"
                      : "var(--content-tertiary)",
                }}
              >
                {phaseIcon[r.phase]}
              </span>
              <button
                onClick={() => onJump(r.index)}
                className={`focus-ring min-w-0 flex-1 text-left text-[0.95rem] lowercase ${
                  r.phase === "skipped" ? "text-content-tertiary line-through" : "text-content-primary"
                }`}
              >
                {r.ex.name}
                <span className="label-instrument ml-2">
                  {r.phase === "deferred" && r.ex.deferReason ? r.ex.deferReason : `${done}/${total} sets`}
                </span>
              </button>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3.5 gap-y-1 pl-7 text-[0.74rem] lowercase text-content-tertiary">
              {r.phase !== "skipped" && r.phase !== "done" && r.phase !== "deferred" && (
                <button onClick={() => onDefer(r.index)} className="focus-ring hover:text-content-secondary">
                  do later
                </button>
              )}
              {r.phase === "deferred" && (
                <button onClick={() => onResume(r.index)} className="focus-ring hover:text-content-secondary">
                  resume now
                </button>
              )}
              <button onClick={() => onReplace(r.index)} className="focus-ring hover:text-content-secondary">
                replace
              </button>
              {r.phase === "skipped" ? (
                <button onClick={() => onSkip(r.index, false)} className="focus-ring hover:text-content-secondary">
                  add back
                </button>
              ) : (
                <button onClick={() => onSkip(r.index, true)} className="focus-ring hover:text-content-secondary">
                  skip
                </button>
              )}
            </div>
          </div>
          </div>
        );
      })}

      <div className="border-t border-[var(--line-soft)] pt-3">
        <button
          onClick={() => setAdding(true)}
          className="focus-ring w-full rounded-[var(--radius-large)] border border-dashed border-[var(--line-soft)] py-3 text-[0.82rem] lowercase text-content-tertiary hover:text-content-secondary"
        >
          <Plus size={13} className="mr-1.5 inline" /> add exercise
        </button>
        <ExercisePicker
          open={adding}
          onClose={() => setAdding(false)}
          onPick={(n) => {
            onAddExercise(n);
            setAdding(false);
          }}
        />
      </div>
      <p className="label-instrument pt-1">
        changes apply to today's session only — your saved plan isn't touched.
      </p>
      <span className="hidden">{units}</span>
    </div>
  );
}

// ── substitute sheet ───────────────────────────────────────────────────────
function SubstituteSheet({
  exIndex,
  session,
  environment,
  onClose,
  onPick,
}: {
  exIndex: number | null;
  session: ReturnType<typeof useFormaData>["active"];
  environment: string | null;
  onClose: () => void;
  onPick: (i: number, name: string) => void;
}) {
  const ex = exIndex != null ? session?.exercises[exIndex] ?? null : null;
  const [list, setList] = useState<SubstituteSuggestion[] | null>(null);
  const [showLib, setShowLib] = useState(false);

  useEffect(() => {
    if (!ex) {
      setList(null);
      return;
    }
    let alive = true;
    const avoid = environment === "home" ? ["Cable", "Machine", "Leverage machine"] : [];
    void suggestSubstitutes(ex.name, { avoidEquipment: avoid, limit: 6 }).then((r) => {
      if (alive) setList(r);
    });
    return () => {
      alive = false;
    };
  }, [ex, environment]);

  return (
    <>
      <DetailDrawer open={ex != null && !showLib} onClose={onClose} title="replace exercise" eyebrow={ex?.name}>
        {ex && (
          <div className="space-y-2">
            <p className="label-instrument mb-1">
              same primary muscle and movement — logs stay in today's session.
            </p>
            {list == null && <p className="label-instrument">finding alternatives…</p>}
            {list?.length === 0 && <p className="label-instrument">no close match — try the library.</p>}
            {list?.map((s) => (
              <button
                key={s.name}
                onClick={() => exIndex != null && onPick(exIndex, s.name)}
                className="focus-ring pill-row w-full text-left"
              >
                <ExerciseThumb src={repdbThumb(s.name)} alt="" size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.92rem] lowercase text-content-primary">{s.name}</span>
                  <span className="label-instrument">{s.equipment.toLowerCase()} · {s.reason}</span>
                </span>
              </button>
            ))}
            <button
              onClick={() => setShowLib(true)}
              className="focus-ring mt-1 w-full rounded-[var(--radius-large)] border border-dashed border-[var(--line-soft)] py-3 text-[0.82rem] lowercase text-content-tertiary hover:text-content-secondary"
            >
              browse full library
            </button>
          </div>
        )}
      </DetailDrawer>

      <ExercisePicker
        open={showLib}
        title="exercise library"
        onClose={() => {
          setShowLib(false);
          onClose();
        }}
        onPick={(name) => {
          if (exIndex != null) onPick(exIndex, name);
          setShowLib(false);
        }}
      />
    </>
  );
}
