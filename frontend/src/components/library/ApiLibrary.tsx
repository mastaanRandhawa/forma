import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { DetailDrawer } from "../dashboard/DetailDrawer";
import { EmptyState } from "../EmptyState";
import { ExerciseThumb } from "../ExerciseThumb";
import { api } from "../../api/client";
import { errorMessage, invalidateResource, useResource } from "../../api/hooks";
import type { CustomExerciseInput, Exercise } from "../../api/types";

const CATEGORIES = ["push", "pull", "legs", "core", "cardio", "mobility", "other"] as const;
const EQUIPMENT = ["bodyweight", "barbell", "dumbbell", "kettlebell", "cable", "machine", "bands"];
const LEVELS = ["beginner", "intermediate", "advanced"] as const;
const TRACKING = [["reps", "reps"], ["time", "time"], ["cardio", "cardio"]] as const;
const MUSCLES = ["chest", "shoulders", "rear_delts", "triceps", "biceps", "forearms", "back", "lats", "traps", "abs", "obliques", "glutes", "quads", "hamstrings", "calves", "adductors"];
const nice = (s: string) => s.replace(/_/g, " ");
const field = "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[0.9rem] text-content-primary outline-none focus:border-white/30";

function Chips({ items, active, onPick }: { items: readonly string[]; active: (v: string) => boolean; onPick: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((v) => (
        <button key={v} onClick={() => onPick(v)} aria-pressed={active(v)} className={`focus-ring tactile rounded-pill px-3 py-1.5 text-[0.76rem] lowercase ${active(v) ? "surface-float text-content-primary" : "text-content-tertiary hover:text-content-secondary"}`}>
          {nice(v)}
        </button>
      ))}
    </div>
  );
}

const meta = (e: Exercise) => [e.bodyPart ?? e.category, e.equipment[0], e.difficulty].filter(Boolean).join(" · ");

/** Everything the server has, searched online. */
export function FullLibrary() {
  const [q, setQ] = useState("");
  const [equipment, setEquipment] = useState("all");
  const [needle, setNeedle] = useState("");
  const [take, setTake] = useState(40);
  const [open, setOpen] = useState<Exercise | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setNeedle(q.trim()); setTake(40); }, 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => setTake(40), [equipment]);

  const res = useResource<{ items: Exercise[]; total: number }>(`library:${needle}:${equipment}:${take}`, () =>
    api.library.exercises({ q: needle || undefined, equipment: equipment === "all" ? undefined : equipment, take }),
  );
  const items = res.data?.items ?? [];
  const total = res.data?.total ?? 0;

  return (
    <div className="space-y-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search the full library…" className="focus-ring surface-recessed w-full rounded-pill px-4 py-2.5 text-[0.9rem] text-content-primary outline-none placeholder:text-content-tertiary" />
      <Chips items={["all", ...EQUIPMENT]} active={(v) => v === equipment} onPick={setEquipment} />
      {res.initialLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-[62px] rounded-2xl" />)}</div>
      ) : res.error && items.length === 0 ? (
        <p className="text-[0.86rem] text-content-tertiary">couldn't reach the library. {errorMessage(res.error)}</p>
      ) : items.length === 0 ? (
        <EmptyState title="no matches" body="try a different word or clear the equipment filter." />
      ) : (
        <>
          <ul className="divide-y divide-[var(--line-soft)]">
            {items.map((e) => (
              <li key={e.id}>
                <button onClick={() => setOpen(e)} className="focus-ring flex w-full items-center gap-3.5 py-3 text-left">
                  <ExerciseThumb src={e.imageStartUrl ?? e.imageEndUrl ?? undefined} alt={e.name} size={46} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.95rem] text-content-primary">{e.name}</span>
                    <span className="label-instrument mt-0.5 block truncate">{meta(e)}</span>
                  </span>
                  {e.source === "custom" && <span className="label-instrument">mine</span>}
                </button>
              </li>
            ))}
          </ul>
          {items.length < total && (
            <button onClick={() => setTake((t) => t + 40)} className="focus-ring tactile mx-auto block rounded-pill bg-white/[0.07] px-5 py-2 text-[0.82rem] lowercase text-content-primary hover:bg-white/[0.13]">
              show more · {items.length} of {total}
            </button>
          )}
        </>
      )}
      <DetailDrawer open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ""} eyebrow={open ? meta(open) : undefined}>
        {open && (
          <div className="space-y-4">
            {(open.imageStartUrl || open.imageEndUrl) && (
              <div className="grid grid-cols-2 gap-2 overflow-hidden rounded-2xl bg-white p-1">
                {[open.imageStartUrl, open.imageEndUrl].filter((u, i, a) => u && a.indexOf(u) === i).map((u) => (
                  <img key={u} src={u!} alt={`${open.name} demonstration`} className="aspect-[4/3] w-full object-contain" loading="lazy" />
                ))}
              </div>
            )}
            {(open.muscles?.length ?? 0) > 0 && (
              <p className="text-[0.84rem] text-content-secondary">
                {open.muscles!.filter((m) => m.role === "primary").map((m) => m.muscleGroup.plainName).join(", ")}
                {open.muscles!.some((m) => m.role !== "primary") ? ` · also ${open.muscles!.filter((m) => m.role !== "primary").map((m) => m.muscleGroup.plainName).join(", ")}` : ""}
              </p>
            )}
            {open.instructions.length > 0 && (
              <ol className="list-decimal space-y-1.5 pl-5 text-[0.86rem] text-content-secondary">
                {open.instructions.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            )}
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}

/** Your own exercises: add, edit, delete. */
export function MyExercises() {
  const mine = useResource<Exercise[]>("my-exercises", async () => {
    // the server pages at 100 and allows up to 200 of your own
    const first = await api.library.exercises({ mine: "true", take: 100 });
    if (first.total <= first.items.length) return first.items;
    const more = await api.library.exercises({ mine: "true", take: 100, skip: 100 });
    return [...first.items, ...more.items];
  });
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [creating, setCreating] = useState(false);
  const items = mine.data ?? [];

  return (
    <div className="space-y-4">
      <button onClick={() => setCreating(true)} className="focus-ring tactile inline-flex items-center gap-2 rounded-pill bg-[var(--accent-pink)] px-5 py-2.5 text-[0.86rem] lowercase text-white">
        <Plus size={14} strokeWidth={2.25} /> new exercise
      </button>
      {mine.initialLoading ? (
        <div className="skeleton h-[62px] rounded-2xl" />
      ) : items.length === 0 ? (
        <EmptyState title="no exercises of your own yet" body="add a movement the library doesn't have. it works in routines and workout logging like any other." action={{ label: "add one", onClick: () => setCreating(true) }} />
      ) : (
        <ul className="divide-y divide-[var(--line-soft)]">
          {items.map((e) => (
            <li key={e.id}>
              <button onClick={() => setEditing(e)} aria-label={`edit ${e.name}`} className="focus-ring flex w-full items-center gap-3.5 py-3 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.95rem] text-content-primary">{e.name}</span>
                  <span className="label-instrument mt-0.5 block truncate">{[e.category, e.equipment[0], e.difficulty].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="text-[0.78rem] lowercase text-content-tertiary">edit</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <ExerciseForm
        key={editing?.id ?? "new"}
        open={creating || !!editing}
        entry={editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        onDone={() => { setCreating(false); setEditing(null); invalidateResource("my-exercises"); void mine.refetch(); }}
      />
    </div>
  );
}

function ExerciseForm({ open, entry, onClose, onDone }: { open: boolean; entry: Exercise | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(entry?.name ?? "");
  const [category, setCategory] = useState<string>(entry?.category ?? "other");
  const [tracking, setTracking] = useState<string>((entry as { trackingType?: string } | null)?.trackingType ?? "reps");
  const [equipment, setEquipment] = useState<string[]>(entry?.equipment ?? ["bodyweight"]);
  const [level, setLevel] = useState<string>(entry?.difficulty ?? "intermediate");
  const [primary, setPrimary] = useState<string[]>(entry?.muscles?.filter((m) => m.role === "primary").map((m) => m.muscleGroup.key) ?? []);
  const secondary = entry?.muscles?.filter((m) => m.role !== "primary").map((m) => m.muscleGroup.key) ?? [];
  const [steps, setSteps] = useState((entry?.instructions ?? []).join("\n"));
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const valid = name.trim().length >= 2;

  const go = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      onDone();
    } catch (e) {
      setErr(errorMessage(e as Error));
    } finally {
      setBusy(false);
    }
  };
  const save = () =>
    go(() => {
      const body: CustomExerciseInput = {
        name: name.trim(),
        category: category as CustomExerciseInput["category"],
        equipment,
        difficulty: level as CustomExerciseInput["difficulty"],
        trackingType: tracking as CustomExerciseInput["trackingType"],
        instructions: steps.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 20),
        primaryMuscleKeys: primary,
        secondaryMuscleKeys: secondary.filter((k) => !primary.includes(k)),
      };
      return entry ? api.library.updateCustom(entry.id, body) : api.library.createCustom(body);
    });

  return (
    <DetailDrawer open={open} onClose={onClose} title={entry ? "edit exercise" : "new exercise"} eyebrow="my exercises">
      <div className="space-y-4">
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="name, e.g. sandbag carry" aria-label="name" />
        <div><div className="label-instrument mb-1.5">type</div><Chips items={CATEGORIES} active={(v) => v === category} onPick={setCategory} /></div>
        <div><div className="label-instrument mb-1.5">how it's logged</div><Chips items={TRACKING.map((t) => t[0])} active={(v) => v === tracking} onPick={setTracking} /></div>
        <div><div className="label-instrument mb-1.5">equipment</div><Chips items={EQUIPMENT} active={(v) => equipment.includes(v)} onPick={(v) => toggle(equipment, setEquipment, v)} /></div>
        <div><div className="label-instrument mb-1.5">level</div><Chips items={LEVELS} active={(v) => v === level} onPick={setLevel} /></div>
        <div>
          <div className="label-instrument mb-1.5">main muscles</div>
          <Chips items={MUSCLES} active={(v) => primary.includes(v)} onPick={(v) => toggle(primary, setPrimary, v)} />
          {primary.length === 0 && <p className="mt-1.5 text-[0.76rem] text-content-tertiary">pick at least one so it counts on your muscle map.</p>}
        </div>
        <div>
          <div className="label-instrument mb-1.5">steps · one per line</div>
          <textarea className={`${field} min-h-[88px]`} value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="optional" />
        </div>
        {err && <p role="alert" className="text-[0.82rem] text-[var(--accent-amber)]">{err}</p>}
        <button disabled={busy || !valid} onClick={save} className="focus-ring tactile w-full rounded-pill bg-[var(--accent-pink)] py-3 text-[0.88rem] lowercase text-white disabled:opacity-40">
          {busy ? "saving…" : entry ? "save changes" : "add exercise"}
        </button>
        {entry &&
          (confirm ? (
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--accent-amber)]/40 p-3">
              <span className="flex-1 text-[0.82rem] text-content-secondary">delete this exercise? workouts keep their history.</span>
              <button onClick={() => setConfirm(false)} className="focus-ring rounded-pill px-3 py-1.5 text-[0.8rem] lowercase text-content-tertiary">keep</button>
              <button disabled={busy} onClick={() => go(() => api.library.deleteCustom(entry.id))} className="focus-ring rounded-pill bg-[var(--accent-amber)] px-4 py-1.5 text-[0.8rem] lowercase text-black">delete</button>
            </div>
          ) : (
            <button onClick={() => setConfirm(true)} className="focus-ring w-full rounded-pill py-2.5 text-[0.84rem] lowercase text-content-tertiary hover:text-[var(--accent-amber)]">delete exercise</button>
          ))}
      </div>
    </DetailDrawer>
  );
}
