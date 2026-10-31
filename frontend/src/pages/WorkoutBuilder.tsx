import { useEffect, useMemo, useRef, useState } from "react";
import { useBlocker, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  Copy,
  LayoutGrid,
  Link2,
  Link2Off,
  Plus,
  Repeat2,
  Trash2,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/primitives";
import { ExerciseThumb } from "../components/ExerciseThumb";
import { DetailDrawer } from "../components/dashboard/DetailDrawer";
import { ExercisePicker } from "../components/workout/ExercisePicker";
import { Stepper } from "../components/workout/Stepper";
import type { RepDbCatalogEntry } from "../lib/repdb";
import { useMuscleLookup, loadMuscleLookup } from "../lib/muscleLookup";
import { useAction, invalidateTemplates, invalidateResource } from "../api/hooks";
import { useFormaData } from "../lib/localStore";
import {
  createTemplate,
  updateTemplate,
  getTemplate,
  startFromTemplateRow,
  unmatchedExercises,
} from "../lib/templates";
import {
  templateById,
  templateDurationMin,
  templateExerciseTarget,
  type TemplateExercise,
} from "../lib/workoutTemplates";
import { normalizeSupersets, supersetLetter } from "../lib/session";

const DRAFT_KEY = (id: string) => `forma.builder.${id}`;

interface Draft {
  name: string;
  description: string;
  exercises: TemplateExercise[];
}

const EMPTY: Draft = { name: "", description: "", exercises: [] };
const clamp = (v: number | null, lo: number, hi: number, fallback: number) =>
  v == null || Number.isNaN(v) ? fallback : Math.min(hi, Math.max(lo, Math.round(v)));

/** First values for a newly added exercise, from what kind of movement it is. */
export function defaultsFor(name: string, entry: RepDbCatalogEntry | null): TemplateExercise {
  const perSide = entry?.unilateral ? true : undefined;
  if (entry?.discipline === "stretching")
    return { name, sets: 2, repsMin: 30, repsMax: 45, restSec: 15, timed: true, perSide };
  if (entry?.discipline === "cardio") return { name, sets: 3, repsMin: 30, repsMax: 60, restSec: 60, timed: true };
  if (entry?.discipline === "plyometrics") return { name, sets: 3, repsMin: 5, repsMax: 8, restSec: 90, perSide };
  if (entry?.discipline === "olympic") return { name, sets: 4, repsMin: 2, repsMax: 3, restSec: 150 };
  if (entry?.mechanic === "compound" && !entry.bodyweight)
    return { name, sets: 3, repsMin: 6, repsMax: 10, restSec: 120, perSide };
  if (entry?.bodyweight) return { name, sets: 3, repsMin: 8, repsMax: 15, restSec: 60, perSide };
  if (entry?.mechanic === "isolation") return { name, sets: 3, repsMin: 10, repsMax: 15, restSec: 60, perSide };
  return { name, sets: 3, repsMin: 8, repsMax: 12, restSec: 90 };
}

interface Problems {
  name?: string;
  exercises?: string;
  rows: Record<number, string>;
}

function validate(d: Draft): Problems {
  const p: Problems = { rows: {} };
  if (!d.name.trim()) p.name = "give your workout a name";
  if (d.exercises.length === 0) p.exercises = "add at least one exercise";
  d.exercises.forEach((e, i) => {
    const unit = e.timed ? "seconds" : "reps";
    if (e.repsMin < 1) p.rows[i] = `${unit} must be at least 1`;
    else if (e.repsMin > e.repsMax) p.rows[i] = `the lower ${unit} can't be more than the upper — set ${e.repsMax} or more`;
  });
  return p;
}
const hasProblems = (p: Problems) => Boolean(p.name || p.exercises || Object.keys(p.rows).length);

export default function WorkoutBuilder() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const fromPreset = params.get("from");
  const nav = useNavigate();
  const data = useFormaData();
  const units = data.profile.units;
  const muscleOf = useMuscleLookup();

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [baseline, setBaseline] = useState<string>(JSON.stringify(EMPTY));
  const [restored, setRestored] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [advanced, setAdvanced] = useState<Set<number>>(new Set());
  const [picking, setPicking] = useState(false);
  const [replacing, setReplacing] = useState<number | null>(null);
  const [removed, setRemoved] = useState<{ index: number; ex: TemplateExercise } | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [pendingSave, setPendingSave] = useState<{ andStart: boolean; missing: string[] } | null>(null);
  const [catalog, setCatalog] = useState<RepDbCatalogEntry[]>([]);
  const sourceRef = useRef<Draft>(EMPTY);
  const leaving = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const draftId = id ?? fromPreset ?? "new";

  // ── load the source (saved workout / preset copy / blank), then any draft ──
  // A re-run (StrictMode mounts effects twice in dev) cancels the earlier load
  // and starts a fresh one; nothing is written until a load completes.
  useEffect(() => {
    let alive = true;
    (async () => {
      let source: Draft = EMPTY;
      if (id) {
        const row = await getTemplate(id);
        if (!alive) return;
        if (row) source = { name: row.name, description: row.description, exercises: row.exercises };
      } else if (fromPreset) {
        const p = templateById(fromPreset);
        if (p) source = { name: `${p.name} (my copy)`, description: p.description, exercises: p.exercises.map((e) => ({ ...e })) };
      }
      sourceRef.current = source;
      setBaseline(JSON.stringify(source));
      // a saved draft only counts if it has real content and differs from the source
      let next = source;
      try {
        const raw = sessionStorage.getItem(DRAFT_KEY(draftId));
        const saved = raw ? (JSON.parse(raw) as Draft) : null;
        if (saved && (saved.exercises?.length || saved.name?.trim()) && JSON.stringify(saved) !== JSON.stringify(source)) {
          next = saved;
          setRestored(true);
        }
      } catch {
        /* ignore a corrupt draft */
      }
      setDraft(next);
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [id, fromPreset, draftId]);

  const dirty = loaded && JSON.stringify(draft) !== baseline;

  // ── autosave the draft for this tab ─────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    try {
      if (dirty) sessionStorage.setItem(DRAFT_KEY(draftId), JSON.stringify(draft));
      else sessionStorage.removeItem(DRAFT_KEY(draftId));
    } catch {
      /* private mode */
    }
  }, [draft, draftId, loaded, dirty]);

  // ── don't lose work: in-app navigation and closing the tab ─────────────
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !leaving.current && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [dirty]);

  useEffect(() => {
    if (!removed) return;
    const t = setTimeout(() => setRemoved(null), 6000);
    return () => clearTimeout(t);
  }, [removed]);

  useEffect(() => {
    if (replacing != null && catalog.length === 0)
      void import("../lib/repdb.catalog").then((m) => setCatalog(m.REPDB_CATALOG));
  }, [replacing, catalog.length]);

  const targetMuscles = useMemo(() => {
    const s = new Set<string>();
    for (const e of draft.exercises) (muscleOf?.(e.name)?.primary ?? []).forEach((m) => s.add(m));
    return [...s].slice(0, 6);
  }, [draft.exercises, muscleOf]);

  const durationMin = templateDurationMin(draft.exercises);
  const problems = validate(draft);

  // ── mutations ───────────────────────────────────────────────────────────
  const setExercises = (fn: (xs: TemplateExercise[]) => TemplateExercise[]) =>
    setDraft((d) => ({ ...d, exercises: normalizeSupersets(fn(d.exercises)) }));

  const patchEx = (i: number, patch: Partial<TemplateExercise>) =>
    setDraft((d) => ({ ...d, exercises: d.exercises.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) }));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= draft.exercises.length) return;
    setExercises((xs) => {
      const next = [...xs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    if (expanded === i) setExpanded(j);
  };

  const removeEx = (i: number) => {
    setRemoved({ index: i, ex: draft.exercises[i] });
    setExercises((xs) => xs.filter((_, idx) => idx !== i));
    setExpanded(null);
  };
  const undoRemove = () => {
    if (!removed) return;
    setExercises((xs) => [...xs.slice(0, removed.index), removed.ex, ...xs.slice(removed.index)]);
    setRemoved(null);
  };

  const dupEx = (i: number) =>
    setExercises((xs) => [...xs.slice(0, i + 1), { ...xs[i], supersetGroup: undefined }, ...xs.slice(i + 1)]);

  const linkedUp = (i: number) =>
    i > 0 &&
    draft.exercises[i].supersetGroup != null &&
    draft.exercises[i].supersetGroup === draft.exercises[i - 1].supersetGroup;

  const toggleLink = (i: number) =>
    setExercises((xs) => {
      if (i < 1) return xs;
      const exs = xs.map((e) => ({ ...e }));
      if (linkedUp(i)) {
        exs[i].supersetGroup = undefined;
      } else {
        const g = exs[i - 1].supersetGroup ?? -1;
        exs[i - 1].supersetGroup = g;
        exs[i].supersetGroup = g;
      }
      return exs;
    });

  const addEx = async (name: string) => {
    const lookup = await loadMuscleLookup().catch(() => null);
    const ex = defaultsFor(name, lookup?.(name) ?? null);
    setDraft((d) => ({ ...d, exercises: [...d.exercises, ex] }));
    setExpanded(draft.exercises.length);
  };

  const replaceEx = async (i: number, name: string) => {
    const lookup = await loadMuscleLookup().catch(() => null);
    const d = defaultsFor(name, lookup?.(name) ?? null);
    const old = draft.exercises[i];
    // keep the user's sets / reps / rest unless the new movement is measured differently
    const keep = Boolean(old.timed) === Boolean(d.timed);
    patchEx(i, {
      name,
      note: undefined,
      alternatives: undefined,
      timed: d.timed,
      perSide: d.perSide,
      ...(keep ? {} : { sets: d.sets, repsMin: d.repsMin, repsMax: d.repsMax, restSec: d.restSec }),
    });
  };

  const swapSuggestions = useMemo(() => {
    if (replacing == null) return [];
    const ex = draft.exercises[replacing];
    if (!ex) return [];
    const own = ex.alternatives ?? [];
    const primary = muscleOf?.(ex.name)?.primary[0];
    const sameMuscle = primary
      ? catalog.filter((c) => c.primary[0] === primary && c.name !== ex.name).slice(0, 6).map((c) => c.name)
      : [];
    return [...new Set([...own, ...sameMuscle])].slice(0, 8);
  }, [replacing, draft.exercises, muscleOf, catalog]);

  const clearDraft = () => {
    try {
      sessionStorage.removeItem(DRAFT_KEY(draftId));
    } catch {
      /* ignore */
    }
  };

  // useAction keeps the first render's function, so everything the save needs
  // is passed in as arguments rather than read from this render's closure
  const save = useAction(
    async (req: {
      draft: Draft;
      muscles: string[];
      editId?: string;
      sourceId?: string;
      units: typeof units;
      andStart: boolean;
    }) => {
      const input = {
        name: req.draft.name.trim(),
        description: req.draft.description.trim(),
        targetMuscles: req.muscles,
        exercises: req.draft.exercises,
        sourceId: req.sourceId,
      };
      const row = req.editId ? await updateTemplate(req.editId, input) : await createTemplate(input);
      invalidateTemplates();
      invalidateResource("planned-workouts");
      try {
        sessionStorage.removeItem(DRAFT_KEY(req.editId ?? req.sourceId ?? "new"));
      } catch {
        /* ignore */
      }
      leaving.current = true;
      if (req.andStart) {
        await startFromTemplateRow(row, req.units);
        nav("/workouts/active");
      } else {
        nav("/workouts", { state: { tab: "Templates", notice: `saved “${row.name}”` } });
      }
    },
  );
  const runSave = (andStart: boolean) =>
    save.run({ draft, muscles: targetMuscles, editId: id, sourceId: fromPreset ?? undefined, units, andStart });

  const attemptSave = async (andStart: boolean) => {
    setShowErrors(true);
    const p = validate(draft);
    if (hasProblems(p)) {
      if (p.name) nameRef.current?.focus();
      else if (Object.keys(p.rows).length) setExpanded(Number(Object.keys(p.rows)[0]));
      return;
    }
    const missing = await unmatchedExercises(draft.exercises);
    if (missing.length) {
      setPendingSave({ andStart, missing });
      return;
    }
    await runSave(andStart);
  };

  // back within the app when there is in-app history; opened from a link, go to Workouts
  const leave = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) nav(-1);
    else nav("/workouts", { state: { tab: id ? "Templates" : "Today" } });
  };
  const discard = () => {
    clearDraft();
    leaving.current = true;
    setConfirmDiscard(false);
    nav("/workouts", { state: { tab: id ? "Templates" : "Today" } });
  };

  if (!loaded) {
    return <p className="label-instrument mx-auto max-w-[720px]">loading…</p>;
  }

  const err = showErrors ? problems : { rows: {} as Record<number, string> };

  return (
    <div className="mx-auto max-w-[720px] pb-40">
      <button
        onClick={leave}
        className="focus-ring -ml-1 mb-3 inline-flex min-h-10 items-center gap-1 rounded-pill px-1 text-[0.82rem] lowercase text-content-tertiary hover:text-content-secondary"
      >
        <ChevronLeft size={15} aria-hidden /> back
      </button>
      <PageHeader eyebrow="build" title={id ? "edit workout" : "create workout"} />

      {restored && (
        <div role="status" className="surface-recessed mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-medium)] px-4 py-3">
          <span className="text-[0.85rem] text-content-secondary">we restored your unsaved changes from earlier.</span>
          <button
            onClick={() => {
              setDraft(sourceRef.current);
              setRestored(false);
              clearDraft();
            }}
            className="focus-ring min-h-9 rounded-pill px-3 text-[0.82rem] lowercase text-content-primary underline-offset-4 hover:underline"
          >
            start over
          </button>
        </div>
      )}

      {/* ── name + description ─────────────────────────────────────── */}
      <div className="surface-soft mt-6 space-y-3 p-5">
        <div>
          <label htmlFor="workout-name" className="label-instrument">
            workout name
          </label>
          <input
            id="workout-name"
            ref={nameRef}
            value={draft.name}
            maxLength={120}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="e.g. upper body a"
            aria-invalid={Boolean(err.name)}
            aria-describedby={err.name ? "workout-name-error" : undefined}
            className={`focus-ring surface-recessed mt-1 min-h-11 w-full rounded-hero px-3.5 py-2.5 text-[1.1rem] font-medium text-content-primary outline-none placeholder:text-content-tertiary ${
              err.name ? "ring-1 ring-[var(--accent-pink)]" : ""
            }`}
          />
          {err.name && (
            <p id="workout-name-error" className="mt-1.5 text-[0.8rem] text-[var(--accent-pink)]">
              {err.name}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="workout-desc" className="label-instrument">
            description (optional)
          </label>
          <textarea
            id="workout-desc"
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            rows={2}
            className="focus-ring surface-recessed mt-1 w-full resize-none rounded-hero px-3.5 py-2.5 text-[0.88rem] text-content-secondary outline-none"
          />
        </div>
        <div className="label-instrument flex flex-wrap gap-x-3 gap-y-1" aria-live="polite">
          <span>{draft.exercises.length} exercises</span>
          <span>· ~{durationMin} min</span>
          {targetMuscles.length > 0 && <span>· {targetMuscles.join(", ").toLowerCase()}</span>}
        </div>
      </div>

      {/* ── exercises ──────────────────────────────────────────────── */}
      {draft.exercises.length === 0 ? (
        <div className="surface-recessed mt-4 flex flex-col items-center rounded-[var(--radius-large)] px-6 py-10 text-center">
          <div className="text-[0.98rem] lowercase text-content-primary">no exercises yet</div>
          <p className="mt-1.5 max-w-[36ch] text-[0.85rem] leading-relaxed text-content-secondary">
            add exercises one at a time, or start from a ready-made workout and change what you like.
          </p>
          {err.exercises && <p className="mt-2 text-[0.8rem] text-[var(--accent-pink)]">{err.exercises}</p>}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={() => setPicking(true)}>
              <Plus size={14} aria-hidden /> add exercise
            </Button>
            <Button variant="ghost" onClick={() => nav("/workouts", { state: { tab: "Templates" } })}>
              <LayoutGrid size={14} aria-hidden /> browse templates
            </Button>
          </div>
        </div>
      ) : (
        <ol className="mt-4 space-y-2" aria-label="exercises">
          {draft.exercises.map((e, i) => {
            const grp = e.supersetGroup ?? null;
            const prevGrp = i > 0 ? draft.exercises[i - 1].supersetGroup ?? null : null;
            const open = expanded === i;
            const rowError = err.rows[i];
            const panelId = `ex-panel-${i}`;
            return (
              <li key={`${e.name}-${i}`}>
                {i > 0 && (
                  <div className="flex justify-center py-0.5">
                    <button
                      onClick={() => toggleLink(i)}
                      aria-pressed={linkedUp(i)}
                      className={`focus-ring inline-flex min-h-8 items-center gap-1 rounded-pill px-3 text-[0.72rem] lowercase transition-colors ${
                        linkedUp(i) ? "text-[var(--accent-mauve)]" : "text-content-tertiary hover:text-content-secondary"
                      }`}
                    >
                      {linkedUp(i) ? <Link2 size={12} aria-hidden /> : <Link2Off size={12} aria-hidden />}
                      {linkedUp(i) ? `superset with ${draft.exercises[i - 1].name.toLowerCase()} — unlink` : "link as superset"}
                    </button>
                  </div>
                )}
                {grp != null && grp !== prevGrp && (
                  <div className="label-instrument mb-1 px-1 uppercase tracking-[0.1em] text-[var(--accent-mauve)]">
                    superset {supersetLetter(grp)}
                  </div>
                )}
                <div
                  className={`surface-soft overflow-hidden ${
                    grp != null ? "border-l-2 border-[color-mix(in_srgb,var(--accent-mauve)_45%,transparent)]" : ""
                  } ${rowError ? "ring-1 ring-[var(--accent-pink)]" : ""}`}
                >
                  <div className="flex items-center gap-2 p-2.5">
                    <button
                      onClick={() => setExpanded(open ? null : i)}
                      aria-expanded={open}
                      aria-controls={panelId}
                      aria-label={`${open ? "close" : "edit"} ${e.name}: ${templateExerciseTarget(e)}, ${e.restSec} seconds rest`}
                      className="focus-ring flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-medium)] px-1 text-left"
                    >
                      <ExerciseThumb name={e.name} alt="" size={48} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.94rem] lowercase text-content-primary">{e.name}</span>
                        <span className="label-instrument block">
                          {templateExerciseTarget(e)} · {e.restSec}s rest{e.rpe != null ? ` · rpe ${e.rpe}` : ""}
                          {e.warmup ? " · + warm-up" : ""}
                        </span>
                      </span>
                      <ChevronDown
                        size={16}
                        aria-hidden
                        className={`shrink-0 text-content-tertiary transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                    <div className="flex shrink-0 gap-1">
                      <button
                        aria-label={`move ${e.name} up`}
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="focus-ring grid h-10 w-10 place-items-center rounded-full text-content-tertiary hover:bg-white/[0.06] hover:text-content-primary disabled:opacity-30"
                      >
                        <ArrowUp size={16} aria-hidden />
                      </button>
                      <button
                        aria-label={`move ${e.name} down`}
                        onClick={() => move(i, 1)}
                        disabled={i === draft.exercises.length - 1}
                        className="focus-ring grid h-10 w-10 place-items-center rounded-full text-content-tertiary hover:bg-white/[0.06] hover:text-content-primary disabled:opacity-30"
                      >
                        <ArrowDown size={16} aria-hidden />
                      </button>
                    </div>
                  </div>
                  {rowError && (
                    <p role="alert" className="px-4 pb-2 text-[0.8rem] text-[var(--accent-pink)]">
                      {rowError}
                    </p>
                  )}

                  {open && (
                    <div id={panelId} className="border-t border-[var(--line-soft)] p-4">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Stepper compact label="sets" value={e.sets} step={1} onChange={(v) => patchEx(i, { sets: clamp(v, 1, 20, 1) })} />
                        <Stepper
                          compact
                          label={e.timed ? "sec from" : "reps from"}
                          value={e.repsMin}
                          step={e.timed ? 5 : 1}
                          onChange={(v) => patchEx(i, { repsMin: clamp(v, 0, e.timed ? 900 : 100, 0) })}
                        />
                        <Stepper
                          compact
                          label={e.timed ? "sec to" : "reps to"}
                          value={e.repsMax}
                          step={e.timed ? 5 : 1}
                          onChange={(v) => patchEx(i, { repsMax: clamp(v, 0, e.timed ? 900 : 100, 0) })}
                        />
                        <Stepper compact label="rest" suffix="sec" value={e.restSec} step={15} onChange={(v) => patchEx(i, { restSec: clamp(v, 0, 600, 0) })} />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                        <label className="flex min-h-9 items-center gap-2 text-[0.84rem] lowercase text-content-secondary">
                          <input
                            type="checkbox"
                            checked={e.timed ?? false}
                            onChange={(ev) => patchEx(i, { timed: ev.target.checked || undefined })}
                            className="h-4 w-4 accent-[var(--accent-lime)]"
                          />
                          timed (seconds, not reps)
                        </label>
                        <label className="flex min-h-9 items-center gap-2 text-[0.84rem] lowercase text-content-secondary">
                          <input
                            type="checkbox"
                            checked={e.perSide ?? false}
                            onChange={(ev) => patchEx(i, { perSide: ev.target.checked || undefined })}
                            className="h-4 w-4 accent-[var(--accent-lime)]"
                          />
                          per side
                        </label>
                      </div>

                      <button
                        onClick={() =>
                          setAdvanced((s) => {
                            const n = new Set(s);
                            if (n.has(i)) n.delete(i);
                            else n.add(i);
                            return n;
                          })
                        }
                        aria-expanded={advanced.has(i)}
                        className="focus-ring mt-2 inline-flex min-h-9 items-center gap-1 rounded-pill text-[0.82rem] lowercase text-content-tertiary hover:text-content-secondary"
                      >
                        <ChevronDown size={14} aria-hidden className={advanced.has(i) ? "rotate-180" : ""} />
                        {advanced.has(i) ? "fewer options" : "more options: effort, warm-up, note"}
                      </button>
                      {advanced.has(i) && (
                        <div className="mt-2 space-y-2">
                          <div className="flex gap-2">
                            <Stepper
                              compact
                              label="target rpe"
                              value={e.rpe ?? null}
                              step={0.5}
                              onChange={(v) => patchEx(i, { rpe: v == null || v === 0 ? undefined : Math.min(10, Math.max(1, v)) })}
                            />
                          </div>
                          <label className="flex min-h-9 items-center gap-2 text-[0.84rem] lowercase text-content-secondary">
                            <input
                              type="checkbox"
                              checked={e.warmup ?? false}
                              onChange={(ev) => patchEx(i, { warmup: ev.target.checked || undefined })}
                              className="h-4 w-4 accent-[var(--accent-lime)]"
                            />
                            add a warm-up set before the working sets
                          </label>
                          <div>
                            <label htmlFor={`note-${i}`} className="label-instrument">
                              note / cue
                            </label>
                            <input
                              id={`note-${i}`}
                              value={e.note ?? ""}
                              onChange={(ev) => patchEx(i, { note: ev.target.value || undefined })}
                              placeholder="e.g. pause at the bottom"
                              className="focus-ring surface-recessed mt-1 min-h-10 w-full rounded-hero px-3 py-2 text-[0.85rem] text-content-secondary outline-none placeholder:text-content-tertiary"
                            />
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--line-soft)] pt-3">
                        <button
                          onClick={() => setReplacing(i)}
                          className="focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-pill border border-[var(--line-soft)] px-3.5 text-[0.8rem] lowercase text-content-secondary hover:text-content-primary"
                        >
                          <Repeat2 size={14} aria-hidden /> replace
                        </button>
                        <button
                          onClick={() => dupEx(i)}
                          className="focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-pill border border-[var(--line-soft)] px-3.5 text-[0.8rem] lowercase text-content-secondary hover:text-content-primary"
                        >
                          <Copy size={14} aria-hidden /> duplicate
                        </button>
                        <button
                          onClick={() => removeEx(i)}
                          className="focus-ring ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-pill border border-[var(--line-soft)] px-3.5 text-[0.8rem] lowercase text-[var(--accent-pink)]"
                        >
                          <Trash2 size={14} aria-hidden /> remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setPicking(true)}
              className="focus-ring flex min-h-12 w-full items-center justify-center gap-1.5 rounded-[var(--radius-large)] border border-dashed border-[var(--line-soft)] text-[0.88rem] lowercase text-content-secondary hover:text-content-primary"
            >
              <Plus size={15} aria-hidden /> add exercise
            </button>
          </li>
        </ol>
      )}

      {save.error && (
        <p role="alert" className="mt-3 text-[0.82rem] text-[var(--accent-pink)]">
          couldn't save: {save.error.message}
        </p>
      )}

      {/* ── undo after remove ──────────────────────────────────────── */}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
        {removed && (
          <div className="surface-float pointer-events-auto flex items-center gap-3 rounded-pill px-4 py-2 text-[0.85rem] lowercase text-content-primary shadow-lg">
            removed {removed.ex.name.toLowerCase()}
            <button onClick={undoRemove} className="focus-ring min-h-9 rounded-pill px-2 font-medium text-[var(--accent-pink)]">
              undo
            </button>
          </div>
        )}
      </div>

      {/* ── footer ─────────────────────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line-highlight)] bg-[var(--surface-opaque)] shadow-[0_-10px_30px_-14px_rgba(20,12,18,0.25)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[720px] flex-wrap items-center gap-2 px-5 py-3">
          <Button onClick={() => attemptSave(false)} disabled={save.pending}>
            {save.pending ? "saving…" : id ? "save changes" : "save workout"}
          </Button>
          <Button variant="ghost" onClick={() => attemptSave(true)} disabled={save.pending}>
            save & start
          </Button>
          <span className="label-instrument ml-1 hidden sm:inline" aria-live="polite">
            {dirty ? "unsaved changes" : "no changes"}
          </span>
          <button
            onClick={() => (dirty ? setConfirmDiscard(true) : discard())}
            className="focus-ring ml-auto min-h-10 rounded-pill px-3 text-[0.82rem] lowercase text-content-tertiary hover:text-[var(--accent-pink)]"
          >
            {dirty ? "discard changes" : "cancel"}
          </button>
        </div>
      </div>

      <ExercisePicker open={picking} onClose={() => setPicking(false)} onPick={(n) => void addEx(n)} />
      <ExercisePicker
        open={replacing != null}
        onClose={() => setReplacing(null)}
        title="replace exercise"
        eyebrow={replacing != null ? `instead of ${draft.exercises[replacing]?.name.toLowerCase() ?? ""}` : undefined}
        suggestions={swapSuggestions}
        verb="swap to"
        onPick={(n) => {
          if (replacing != null) void replaceEx(replacing, n);
        }}
      />

      {/* ── leave with unsaved changes ─────────────────────────────── */}
      <DetailDrawer open={blocker.state === "blocked"} onClose={() => blocker.reset?.()} title="leave without saving?">
        <p className="text-[0.9rem] text-content-secondary">
          your changes are kept as a draft in this browser tab until you save or discard them.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button onClick={() => blocker.reset?.()}>keep editing</Button>
          <Button variant="ghost" onClick={() => blocker.proceed?.()}>
            leave — keep the draft
          </Button>
          <button
            onClick={() => {
              clearDraft();
              leaving.current = true;
              blocker.proceed?.();
            }}
            className="focus-ring min-h-11 rounded-pill text-[0.85rem] lowercase text-[var(--accent-pink)]"
          >
            leave and discard changes
          </button>
        </div>
      </DetailDrawer>

      <DetailDrawer open={confirmDiscard} onClose={() => setConfirmDiscard(false)} title="discard changes?">
        <p className="text-[0.9rem] text-content-secondary">
          {id ? "the saved version stays as it was." : "this workout hasn't been saved yet."} this can't be undone.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={discard}
            className="focus-ring min-h-11 rounded-pill bg-[var(--accent-pink)] px-5 text-[0.85rem] lowercase text-white"
          >
            discard
          </button>
          <Button variant="ghost" onClick={() => setConfirmDiscard(false)}>
            keep editing
          </Button>
        </div>
      </DetailDrawer>

      {/* ── exercises the account can't store ──────────────────────── */}
      <DetailDrawer open={!!pendingSave} onClose={() => setPendingSave(null)} title="some exercises can't be saved">
        {pendingSave && (
          <>
            <p className="text-[0.9rem] text-content-secondary">
              these aren't in the exercise library, so your account can't store them:
            </p>
            <ul className="mt-2 list-disc pl-5 text-[0.88rem] lowercase text-content-primary">
              {pendingSave.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <p className="mt-2 text-[0.85rem] text-content-secondary">replace them with a library exercise, or save without them.</p>
            <div className="mt-5 flex flex-col gap-2">
              <Button onClick={() => setPendingSave(null)}>go back and replace</Button>
              <Button
                variant="ghost"
                onClick={() => {
                  const p = pendingSave;
                  setPendingSave(null);
                  void runSave(p.andStart);
                }}
              >
                save without them
              </Button>
            </div>
          </>
        )}
      </DetailDrawer>
    </div>
  );
}
