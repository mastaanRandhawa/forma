import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronLeft, Copy, GripVertical, Link2, Link2Off, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/primitives";
import { ExerciseThumb } from "../components/ExerciseThumb";
import { ExercisePicker } from "../components/workout/ExercisePicker";
import { Stepper } from "../components/workout/Stepper";
import { repdbThumb } from "../lib/repdb";
import { useAction, invalidateTemplates, invalidateResource } from "../api/hooks";
import { useFormaData } from "../lib/localStore";
import {
  createTemplate,
  updateTemplate,
  getTemplate,
  startFromTemplateRow,
  type TemplateRow,
} from "../lib/templates";
import { templateById, templateDurationMin, type TemplateExercise } from "../lib/workoutTemplates";
import { normalizeSupersets, supersetLetter } from "../lib/session";

const DRAFT_KEY = (id: string) => `forma.builder.${id}`;

const blankExercise = (name: string): TemplateExercise => ({
  name,
  sets: 3,
  repsMin: 8,
  repsMax: 12,
  restSec: 90,
});

interface Draft {
  name: string;
  description: string;
  exercises: TemplateExercise[];
}

export default function WorkoutBuilder() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const fromPreset = params.get("from");
  const nav = useNavigate();
  const data = useFormaData();
  const units = data.profile.units;

  const [draft, setDraft] = useState<Draft>({ name: "", description: "", exercises: [] });
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);
  const [muscleMap, setMuscleMap] = useState<Record<string, string[]>>({});
  const editingRow = useRef<TemplateRow | null>(null);
  const loadStarted = useRef(false);

  const draftId = id ?? fromPreset ?? "new";

  // ── load existing template / preset / saved draft (once) ─────────────────
  useEffect(() => {
    if (loadStarted.current) return;
    loadStarted.current = true;
    let alive = true;
    (async () => {
      // an in-progress draft only counts as "resume" if it has real content —
      // an empty {} written by a racing autosave must never shadow the source
      const savedRaw = sessionStorage.getItem(DRAFT_KEY(draftId));
      if (savedRaw) {
        try {
          const parsed = JSON.parse(savedRaw) as Draft;
          if (parsed.exercises?.length || parsed.name?.trim()) {
            setDraft(parsed);
            setLoaded(true);
            return;
          }
        } catch {
          /* fall through */
        }
      }
      if (id) {
        const row = await getTemplate(id);
        if (!alive) return;
        editingRow.current = row;
        if (row)
          setDraft({ name: row.name, description: row.description, exercises: row.exercises });
      } else if (fromPreset) {
        const p = templateById(fromPreset);
        if (p)
          setDraft({
            name: `${p.name} (my copy)`,
            description: p.description,
            exercises: p.exercises.map((e) => ({ ...e })),
          });
      }
      if (alive) setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [id, fromPreset, draftId]);

  // ── autosave draft ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    try {
      sessionStorage.setItem(DRAFT_KEY(draftId), JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [draft, draftId, loaded]);

  // ── resolve target muscles from the RepDB catalog ───────────────────────
  useEffect(() => {
    const missing = draft.exercises.map((e) => e.name).filter((n) => !(n in muscleMap));
    if (missing.length === 0) return;
    let alive = true;
    void import("../lib/repdb.catalog").then((m) => {
      if (!alive) return;
      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const next: Record<string, string[]> = {};
      for (const name of missing) {
        const key = norm(name);
        const hit =
          m.REPDB_CATALOG.find((c) => norm(c.name) === key) ??
          m.REPDB_CATALOG.find((c) => norm(c.name).includes(key));
        next[name] = hit?.primary ?? [];
      }
      setMuscleMap((prev) => ({ ...prev, ...next }));
    });
    return () => {
      alive = false;
    };
  }, [draft.exercises, muscleMap]);

  const targetMuscles = useMemo(() => {
    const s = new Set<string>();
    for (const e of draft.exercises) (muscleMap[e.name] ?? []).forEach((m) => s.add(m));
    return [...s].slice(0, 6);
  }, [draft.exercises, muscleMap]);

  const durationMin = templateDurationMin(draft.exercises);
  const canSave = draft.name.trim().length > 0 && draft.exercises.length > 0;

  // ── mutations ───────────────────────────────────────────────────────────
  const patchEx = (i: number, patch: Partial<TemplateExercise>) =>
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((e, idx) => (idx === i ? { ...e, ...patch } : e)),
    }));

  const move = (i: number, dir: -1 | 1) =>
    setDraft((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.exercises.length) return d;
      const next = [...d.exercises];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...d, exercises: normalizeSupersets(next) };
    });

  const removeEx = (i: number) =>
    setDraft((d) => ({
      ...d,
      exercises: normalizeSupersets(d.exercises.filter((_, idx) => idx !== i)),
    }));

  const dupEx = (i: number) =>
    setDraft((d) => ({
      ...d,
      exercises: normalizeSupersets([
        ...d.exercises.slice(0, i + 1),
        { ...d.exercises[i], supersetGroup: undefined },
        ...d.exercises.slice(i + 1),
      ]),
    }));

  const linkedUp = (i: number) =>
    i > 0 &&
    draft.exercises[i].supersetGroup != null &&
    draft.exercises[i].supersetGroup === draft.exercises[i - 1].supersetGroup;

  const toggleLink = (i: number) =>
    setDraft((d) => {
      if (i < 1) return d;
      const exs = d.exercises.map((e) => ({ ...e }));
      const linked = exs[i].supersetGroup != null && exs[i].supersetGroup === exs[i - 1].supersetGroup;
      if (linked) {
        exs[i].supersetGroup = undefined;
      } else {
        const g = exs[i - 1].supersetGroup ?? -1;
        exs[i - 1].supersetGroup = g;
        exs[i].supersetGroup = g;
      }
      return { ...d, exercises: normalizeSupersets(exs) };
    });

  const addEx = (name: string) => {
    setDraft((d) => ({ ...d, exercises: [...d.exercises, blankExercise(name)] }));
    setExpanded(draft.exercises.length);
  };

  const clearDraft = () => {
    try {
      sessionStorage.removeItem(DRAFT_KEY(draftId));
    } catch {
      /* ignore */
    }
  };

  const persist = async (): Promise<TemplateRow> => {
    const input = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      targetMuscles,
      exercises: draft.exercises,
    };
    const row = id ? await updateTemplate(id, input) : await createTemplate(input);
    invalidateTemplates();
    invalidateResource("workout-templates");
    invalidateResource("planned-workouts");
    clearDraft();
    return row;
  };

  const save = useAction(async () => {
    await persist();
    nav("/workouts", { state: { tab: "Templates" } });
  });

  const saveAndStart = useAction(async () => {
    const row = await persist();
    await startFromTemplateRow(row, units);
    nav("/workouts/active");
  });

  const duplicate = useAction(async () => {
    const input = {
      name: `${draft.name.trim()} copy`,
      description: draft.description.trim(),
      targetMuscles,
      exercises: draft.exercises,
    };
    await createTemplate(input);
    invalidateTemplates();
    clearDraft();
    nav("/workouts", { state: { tab: "Templates" } });
  });

  if (!loaded) {
    return <p className="label-instrument mx-auto max-w-[720px]">loading…</p>;
  }

  return (
    <div className="mx-auto max-w-[720px] pb-32">
      <button
        onClick={() => nav(-1)}
        className="focus-ring -ml-1 mb-3 flex items-center gap-1 text-[0.8rem] lowercase text-content-tertiary hover:text-content-secondary"
      >
        <ChevronLeft size={15} /> back
      </button>
      <PageHeader eyebrow="build" title={id ? "edit workout" : "create workout"} />

      {/* header fields */}
      <div className="surface-soft mt-6 space-y-3 p-5">
        <input
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="workout name"
          className="focus-ring surface-recessed w-full rounded-hero px-3.5 py-2.5 text-[1.15rem] font-medium lowercase text-content-primary outline-none placeholder:text-content-tertiary"
        />
        <textarea
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          placeholder="description (optional)"
          rows={2}
          className="focus-ring surface-recessed w-full resize-none rounded-hero px-3.5 py-2.5 text-[0.88rem] text-content-secondary outline-none placeholder:text-content-tertiary"
        />
        <div className="label-instrument flex flex-wrap gap-x-3 gap-y-1">
          <span>{draft.exercises.length} exercises</span>
          <span>· ~{durationMin} min</span>
          {targetMuscles.length > 0 && <span>· {targetMuscles.join(", ").toLowerCase()}</span>}
        </div>
      </div>

      {/* exercise list */}
      <div className="mt-4 space-y-2">
        {draft.exercises.map((e, i) => {
          const grp = e.supersetGroup ?? null;
          const prevGrp = i > 0 ? draft.exercises[i - 1].supersetGroup ?? null : null;
          const groupHeader = grp != null && grp !== prevGrp;
          return (
          <div key={i}>
            {i > 0 && (
              <div className="flex justify-center py-0.5">
                <button
                  onClick={() => toggleLink(i)}
                  className={`focus-ring inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-[0.68rem] lowercase transition-colors ${
                    linkedUp(i)
                      ? "text-[var(--accent-mauve)]"
                      : "text-content-tertiary hover:text-content-secondary"
                  }`}
                >
                  {linkedUp(i) ? <Link2 size={11} /> : <Link2Off size={11} />}
                  {linkedUp(i) ? "superset — tap to unlink" : "link into superset"}
                </button>
              </div>
            )}
            {groupHeader && (
              <div className="label-instrument mb-1 px-1 uppercase tracking-[0.1em] text-[var(--accent-mauve)]">
                superset {supersetLetter(grp!)}
              </div>
            )}
          <div
            className={`surface-soft overflow-hidden ${
              grp != null ? "border-l-2 border-[color-mix(in_srgb,var(--accent-mauve)_45%,transparent)]" : ""
            }`}
          >
            <div className="flex items-center gap-3 p-3">
              <div className="flex flex-col">
                <button
                  aria-label="move up"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="focus-ring text-content-tertiary hover:text-content-secondary disabled:opacity-30"
                >
                  <ChevronDown size={14} className="rotate-180" />
                </button>
                <button
                  aria-label="move down"
                  onClick={() => move(i, 1)}
                  disabled={i === draft.exercises.length - 1}
                  className="focus-ring text-content-tertiary hover:text-content-secondary disabled:opacity-30"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              <ExerciseThumb src={repdbThumb(e.name)} alt="" size={36} />
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="focus-ring min-w-0 flex-1 text-left"
              >
                <div className="truncate text-[0.94rem] lowercase text-content-primary">{e.name}</div>
                <div className="label-instrument">
                  {e.sets} × {e.repsMin === e.repsMax ? e.repsMin : `${e.repsMin}–${e.repsMax}`} ·{" "}
                  {e.restSec}s rest{e.rpe != null ? ` · rpe ${e.rpe}` : ""}
                </div>
              </button>
              <button
                aria-label="duplicate"
                onClick={() => dupEx(i)}
                className="focus-ring text-content-tertiary hover:text-content-secondary"
              >
                <Copy size={14} />
              </button>
              <button
                aria-label="remove"
                onClick={() => removeEx(i)}
                className="focus-ring text-content-tertiary hover:text-[var(--accent-pink)]"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {expanded === i && (
              <div className="border-t border-[var(--line-soft)] p-4">
                <div className="flex gap-2">
                  <Stepper compact label="sets" value={e.sets} step={1} onChange={(v) => patchEx(i, { sets: Math.max(1, v ?? 1) })} />
                  <Stepper compact label="reps min" value={e.repsMin} step={1} onChange={(v) => patchEx(i, { repsMin: v ?? 0 })} />
                  <Stepper compact label="reps max" value={e.repsMax} step={1} onChange={(v) => patchEx(i, { repsMax: v ?? 0 })} />
                </div>
                <div className="mt-2 flex gap-2">
                  <Stepper compact label="rest" suffix="sec" value={e.restSec} step={15} onChange={(v) => patchEx(i, { restSec: v ?? 0 })} />
                  <Stepper compact label="rpe / rir" value={e.rpe ?? null} step={0.5} onChange={(v) => patchEx(i, { rpe: v ?? undefined })} />
                </div>
                <input
                  value={e.note ?? ""}
                  onChange={(ev) => patchEx(i, { note: ev.target.value || undefined })}
                  placeholder="note / cue (optional)"
                  className="focus-ring surface-recessed mt-2 w-full rounded-hero px-3 py-2 text-[0.85rem] text-content-secondary outline-none placeholder:text-content-tertiary"
                />
                <label className="mt-2 flex items-center gap-2 text-[0.82rem] lowercase text-content-secondary">
                  <input
                    type="checkbox"
                    checked={e.warmup ?? false}
                    onChange={(ev) => patchEx(i, { warmup: ev.target.checked })}
                    className="accent-[var(--accent-lime)]"
                  />
                  include a warm-up set
                </label>
              </div>
            )}
          </div>
          </div>
          );
        })}

        <button
          onClick={() => setPicking(true)}
          className="focus-ring flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-large)] border border-dashed border-[var(--line-soft)] py-3.5 text-[0.85rem] lowercase text-content-tertiary hover:text-content-secondary"
        >
          <Plus size={14} /> add exercise
        </button>
      </div>

      {(save.error || saveAndStart.error) && (
        <p className="mt-3 label-instrument text-[var(--accent-pink)]">
          {(save.error ?? saveAndStart.error)?.message}
        </p>
      )}

      {/* footer actions */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line-highlight)] bg-[var(--surface-opaque)] shadow-[0_-10px_30px_-14px_rgba(20,12,18,0.25)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[720px] flex-wrap items-center gap-2 px-5 py-3">
          <Button onClick={() => save.run()} disabled={!canSave || save.pending}>
            {save.pending ? "saving…" : id ? "save changes" : "save template"}
          </Button>
          <Button variant="ghost" onClick={() => saveAndStart.run()} disabled={!canSave || saveAndStart.pending}>
            {saveAndStart.pending ? "starting…" : "save & start"}
          </Button>
          {id && (
            <button
              onClick={() => duplicate.run()}
              className="focus-ring flex items-center gap-1.5 text-[0.8rem] lowercase text-content-tertiary hover:text-content-secondary"
            >
              <GripVertical size={12} /> duplicate
            </button>
          )}
          <button
            onClick={() => {
              clearDraft();
              nav("/workouts", { state: { tab: id ? "Templates" : "Today" } });
            }}
            className="focus-ring ml-auto text-[0.8rem] lowercase text-content-tertiary hover:text-[var(--accent-pink)]"
          >
            discard
          </button>
        </div>
      </div>

      <ExercisePicker open={picking} onClose={() => setPicking(false)} onPick={addEx} />
    </div>
  );
}
