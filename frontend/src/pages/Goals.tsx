import { useState } from "react";
import { Plus, X } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Reveal } from "../components/Reveal";
import { Quiet } from "../components/Quiet";
import { GoalWidget } from "../components/dashboard/GoalWidget";
import { DetailDrawer } from "../components/dashboard/DetailDrawer";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { useGoals, API_ENABLED, errorMessage, invalidateResource } from "../api/hooks";
import { goalToWidget } from "../api/adapt";
import { api } from "../api";
import type { GoalCadence, GoalInput, GoalWithProgress } from "../api/types";
import { addLocalGoal, logLocalGoal, removeLocalGoal, updateLocalGoal } from "../lib/localGoals";

const TONES = ["pink", "cyan", "lime", "amber", "mauve", "violet"] as const;

const TEMPLATES: { label: string; key: string; unit: string; max: number; tone: string; cadence: GoalCadence }[] = [
  { label: "Daily steps", key: "steps", unit: "steps", max: 10000, tone: "cyan", cadence: "daily" },
  { label: "Protein", key: "protein", unit: "g", max: 160, tone: "lime", cadence: "daily" },
  { label: "Sleep", key: "sleep", unit: "h", max: 8, tone: "violet", cadence: "daily" },
  { label: "Water", key: "water", unit: "oz", max: 100, tone: "cyan", cadence: "daily" },
  { label: "Weekly workouts", key: "weekly_workouts", unit: "sessions", max: 5, tone: "pink", cadence: "weekly" },
  { label: "Running distance", key: "running", unit: "mi", max: 15, tone: "amber", cadence: "weekly" },
];

const field = "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[0.92rem] text-content-primary outline-none focus:border-white/30";
const num = (v: string) => Number.parseFloat(v.replace(",", "."));
const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "goal";

export default function Goals() {
  const { data, error, initialLoading, refetch, mutate } = useGoals();
  const [picking, setPicking] = useState(false);
  const [logging, setLogging] = useState<GoalWithProgress | null>(null);
  const [editing, setEditing] = useState<GoalWithProgress | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const list = (data ?? []).filter((g) => g.active);
  const byId = new Map(list.map((g) => [g.id, g]));
  const widgets = list.map((g, i) => ({ g, w: goalToWidget(g, i) }));
  const active = widgets.filter((x) => !x.g.completed);
  const done = widgets.filter((x) => x.g.completed);

  const reload = async () => {
    invalidateResource("goals");
    invalidateResource("dashboard");
    await refetch();
  };

  const create = async (input: GoalInput) => {
    setMsg(null);
    try {
      if (API_ENABLED) await api.goals.upsert(input);
      else addLocalGoal(input);
      await reload();
      setPicking(false);
      setEditing(null);
    } catch (e) {
      setMsg(errorMessage(e as Error));
    }
  };

  const log = async (g: GoalWithProgress, value: number, mode: "set" | "increment") => {
    setMsg(null);
    try {
      const next = API_ENABLED ? await api.goals.log(g.id, value, mode) : logLocalGoal(g.id, value, mode);
      if (next) mutate((data ?? []).map((x) => (x.id === g.id ? { ...x, ...next } : x)));
      await reload();
      setLogging(null);
    } catch (e) {
      setMsg(errorMessage(e as Error));
    }
  };

  const remove = async (g: GoalWithProgress) => {
    setMsg(null);
    try {
      if (API_ENABLED) await api.goals.remove(g.id);
      else removeLocalGoal(g.id);
      await reload();
      setEditing(null);
    } catch (e) {
      setMsg(errorMessage(e as Error));
    }
  };

  const save = async (g: GoalWithProgress, patch: { label: string; target: number; unit: string; cadence: GoalCadence }) => {
    setMsg(null);
    try {
      if (API_ENABLED) await api.goals.upsert({ key: g.key, tone: g.tone, ...patch });
      else updateLocalGoal(g.id, patch);
      await reload();
      setEditing(null);
    } catch (e) {
      setMsg(errorMessage(e as Error));
    }
  };

  const card = ({ g, w }: { g: GoalWithProgress; w: ReturnType<typeof goalToWidget> }) => (
    <GoalWidget key={g.id} goal={w} onLog={() => setLogging(byId.get(g.id) ?? g)} onEdit={() => setEditing(byId.get(g.id) ?? g)} />
  );

  return (
    <div className="mx-auto max-w-[720px]">
      <PageHeader eyebrow="goals" title="what you're" ghost="working toward">
        <button
          onClick={() => setPicking((v) => !v)}
          className="focus-ring tactile inline-flex items-center gap-2 rounded-pill bg-white/[0.07] px-4 py-2 text-[0.84rem] lowercase text-content-primary transition-colors hover:bg-white/[0.13]"
        >
          {picking ? <X size={14} strokeWidth={2.25} /> : <Plus size={14} strokeWidth={2.25} />}
          {picking ? "cancel" : "new goal"}
        </button>
      </PageHeader>

      {msg && <p role="alert" className="mb-4 text-[0.84rem] text-[var(--accent-amber)]">{msg}</p>}

      {picking && (
        <Reveal className="mb-8">
          <div className="grid gap-2 sm:grid-cols-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.key}
                onClick={() => create({ key: t.key, label: t.label, target: t.max, unit: t.unit, cadence: t.cadence, tone: t.tone })}
                className="focus-ring tactile lift flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-left hover:border-white/20"
              >
                <span className="text-[0.9rem] lowercase text-content-primary">{t.label}</span>
                <span className="num text-[0.76rem] text-content-tertiary">
                  {t.max.toLocaleString()} {t.unit} · {t.cadence}
                </span>
              </button>
            ))}
          </div>
          <CustomGoalForm onCreate={(i) => create({ ...i, tone: TONES[list.length % TONES.length] })} />
        </Reveal>
      )}

      {initialLoading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-[76px] rounded-2xl" />
          ))}
        </div>
      ) : error && list.length === 0 ? (
        <ErrorState message={errorMessage(error)} onRetry={refetch} />
      ) : list.length === 0 ? (
        <EmptyState
          title="no goals yet"
          body="a goal turns your numbers into progress. start with steps, protein or a weekly training target."
          action={{ label: "add your first goal", onClick: () => setPicking(true) }}
        />
      ) : (
        <div className="space-y-8">
          {active.length > 0 ? (
            <Reveal as="section" onView>
              <div className="label-instrument mb-3">in progress · {active.length}</div>
              <Quiet widgetKey="goals-list"><div className="space-y-2.5">{active.map(card)}</div></Quiet>
            </Reveal>
          ) : (
            <EmptyState
              title="everything's done"
              body="every goal is complete for this period. add another target or take the win."
              action={{ label: "add a goal", onClick: () => setPicking(true) }}
            />
          )}
          {done.length > 0 && (
            <Reveal as="section" onView delay={0.05}>
              <div className="label-instrument mb-3" style={{ color: "var(--accent-lime)" }}>
                completed · {done.length}
              </div>
              <Quiet widgetKey="goals-list"><div className="space-y-2.5">{done.map(card)}</div></Quiet>
            </Reveal>
          )}
        </div>
      )}

      <LogDrawer goal={logging} onClose={() => setLogging(null)} onLog={log} />
      <EditDrawer goal={editing} onClose={() => setEditing(null)} onSave={save} onRemove={remove} />
    </div>
  );
}

function CustomGoalForm({ onCreate }: { onCreate: (i: { key: string; label: string; target: number; unit: string; cadence: GoalCadence }) => void }) {
  const [label, setLabel] = useState("");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("");
  const [cadence, setCadence] = useState<GoalCadence>("daily");
  const ok = label.trim() && num(target) > 0 && unit.trim();
  return (
    <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
      <div className="label-instrument mb-3">your own goal</div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={`${field} sm:col-span-2`} placeholder="what are you working toward?" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} />
        <input className={field} inputMode="decimal" placeholder="target, e.g. 30" value={target} onChange={(e) => setTarget(e.target.value)} />
        <input className={field} placeholder="unit, e.g. min" value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={16} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <CadencePick value={cadence} onChange={setCadence} />
        <span className="flex-1" />
        <button
          disabled={!ok}
          onClick={() => onCreate({ key: `${slug(label)}_${Date.now().toString(36)}`, label: label.trim(), target: num(target), unit: unit.trim(), cadence })}
          className="focus-ring tactile rounded-pill bg-[var(--accent-pink)] px-5 py-2 text-[0.84rem] lowercase text-white disabled:opacity-40"
        >
          add goal
        </button>
      </div>
    </div>
  );
}

function CadencePick({ value, onChange }: { value: GoalCadence; onChange: (c: GoalCadence) => void }) {
  return (
    <div className="inline-flex rounded-pill bg-white/[0.06] p-1">
      {(["daily", "weekly"] as const).map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          aria-pressed={value === c}
          className={`focus-ring rounded-pill px-3.5 py-1.5 text-[0.78rem] lowercase ${value === c ? "bg-white/[0.14] text-content-primary" : "text-content-tertiary"}`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

function LogDrawer({ goal, onClose, onLog }: { goal: GoalWithProgress | null; onClose: () => void; onLog: (g: GoalWithProgress, v: number, m: "set" | "increment") => Promise<void> }) {
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const n = num(val);
  const go = async (mode: "set" | "increment") => {
    if (!goal || !Number.isFinite(n)) return;
    setBusy(true);
    await onLog(goal, n, mode);
    setBusy(false);
    setVal("");
  };
  return (
    <DetailDrawer open={!!goal} onClose={onClose} title={goal ? `log ${goal.label.toLowerCase()}` : "log"} eyebrow={goal ? `${goal.cadence} goal` : undefined}>
      {goal && (
        <div className="space-y-4">
          <p className="text-[0.86rem] text-content-secondary">
            so far: {goal.current.toLocaleString()} / {goal.target.toLocaleString()} {goal.unit}
          </p>
          <div className="flex items-end gap-2">
            <input autoFocus className={`${field} text-[1.4rem]`} inputMode="decimal" placeholder="0" value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go("increment")} />
            <span className="pb-3 text-content-tertiary">{goal.unit}</span>
          </div>
          <div className="flex gap-2">
            <button disabled={busy || !Number.isFinite(n) || n === 0} onClick={() => go("increment")} className="focus-ring tactile flex-1 rounded-pill bg-[var(--accent-pink)] py-3 text-[0.88rem] lowercase text-white disabled:opacity-40">
              add
            </button>
            <button disabled={busy || !Number.isFinite(n)} onClick={() => go("set")} className="focus-ring tactile flex-1 rounded-pill bg-white/[0.08] py-3 text-[0.88rem] lowercase text-content-primary disabled:opacity-40">
              set total
            </button>
          </div>
        </div>
      )}
    </DetailDrawer>
  );
}

function EditDrawer({
  goal, onClose, onSave, onRemove,
}: {
  goal: GoalWithProgress | null;
  onClose: () => void;
  onSave: (g: GoalWithProgress, p: { label: string; target: number; unit: string; cadence: GoalCadence }) => Promise<void>;
  onRemove: (g: GoalWithProgress) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("");
  const [cadence, setCadence] = useState<GoalCadence>("daily");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seen, setSeen] = useState<string | null>(null);
  if (goal && goal.id !== seen) {
    setSeen(goal.id);
    setLabel(goal.label);
    setTarget(String(goal.target));
    setUnit(goal.unit);
    setCadence(goal.cadence);
    setConfirm(false);
  }
  const ok = label.trim() && num(target) > 0 && unit.trim();
  return (
    <DetailDrawer open={!!goal} onClose={onClose} title={goal ? goal.label.toLowerCase() : "goal"} eyebrow="edit goal">
      {goal && (
        <div className="space-y-3">
          <input className={field} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} aria-label="name" />
          <div className="grid grid-cols-2 gap-2">
            <input className={field} inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="target" />
            <input className={field} value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={16} aria-label="unit" />
          </div>
          <CadencePick value={cadence} onChange={setCadence} />
          <button
            disabled={busy || !ok}
            onClick={async () => {
              setBusy(true);
              await onSave(goal, { label: label.trim(), target: num(target), unit: unit.trim(), cadence });
              setBusy(false);
            }}
            className="focus-ring tactile w-full rounded-pill bg-[var(--accent-pink)] py-3 text-[0.88rem] lowercase text-white disabled:opacity-40"
          >
            save changes
          </button>
          {confirm ? (
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--accent-amber)]/40 p-3">
              <span className="flex-1 text-[0.82rem] text-content-secondary">remove this goal and its progress?</span>
              <button onClick={() => setConfirm(false)} className="focus-ring rounded-pill px-3 py-1.5 text-[0.8rem] lowercase text-content-tertiary">keep</button>
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await onRemove(goal);
                  setBusy(false);
                }}
                className="focus-ring rounded-pill bg-[var(--accent-amber)] px-4 py-1.5 text-[0.8rem] lowercase text-black"
              >
                remove
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirm(true)} className="focus-ring w-full rounded-pill py-2.5 text-[0.84rem] lowercase text-content-tertiary hover:text-[var(--accent-amber)]">
              remove goal
            </button>
          )}
        </div>
      )}
    </DetailDrawer>
  );
}
