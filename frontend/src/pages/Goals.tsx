import { useState } from "react";
import { Plus, X } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Reveal } from "../components/Reveal";
import { GoalWidget } from "../components/dashboard/GoalWidget";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { type Goal, type GoalTone } from "../lib/data";
import { useGoals, useAction, API_ENABLED, errorMessage } from "../api/hooks";
import { goalToWidget } from "../api/adapt";
import { api } from "../api";

const TEMPLATES: { label: string; key: string; unit: string; max: number; tone: GoalTone; cadence: "daily" | "weekly" }[] = [
  { label: "Daily steps", key: "steps", unit: "steps", max: 10000, tone: "cyan", cadence: "daily" },
  { label: "Protein", key: "protein", unit: "g", max: 160, tone: "lime", cadence: "daily" },
  { label: "Sleep", key: "sleep", unit: "h", max: 8, tone: "violet", cadence: "daily" },
  { label: "Water", key: "water", unit: "oz", max: 100, tone: "cyan", cadence: "daily" },
  { label: "Weekly workouts", key: "weekly_workouts", unit: "sessions", max: 5, tone: "pink", cadence: "weekly" },
  { label: "Running distance", key: "running", unit: "mi", max: 15, tone: "amber", cadence: "weekly" },
];

export default function Goals() {
  const { data, error, initialLoading, refetch } = useGoals();
  const [local, setLocal] = useState<Goal[]>([]); // optimistically-added, not yet in the fetched set
  const [picking, setPicking] = useState(false);
  const addGoal = useAction(api.goals.upsert);

  const fetched = (data ?? []).filter((g) => g.active).map((g, i) => goalToWidget(g, i));
  const goals = [...fetched, ...local];

  const add = async (t: (typeof TEMPLATES)[number]) => {
    setLocal((g) => [
      ...g,
      {
        id: `${t.key}-${Date.now()}`,
        label: t.label,
        value: 0,
        max: t.max,
        tone: t.tone,
        unit: t.unit,
        cadence: t.cadence,
        streak: 0,
        eta: "just started",
      },
    ]);
    setPicking(false);
    if (API_ENABLED) {
      await addGoal.run({ key: t.key, label: t.label, target: t.max, unit: t.unit, cadence: t.cadence, tone: t.tone });
      refetch();
      setLocal([]);
    }
  };

  const active = goals.filter((g) => g.value < g.max);
  const done = goals.filter((g) => g.value >= g.max);

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

      {picking && (
        <Reveal className="mb-8 grid gap-2 sm:grid-cols-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.key}
              onClick={() => add(t)}
              className="focus-ring tactile lift flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-left hover:border-white/20"
            >
              <span className="text-[0.9rem] lowercase text-content-primary">{t.label}</span>
              <span className="num text-[0.76rem] text-content-tertiary">
                {t.max.toLocaleString()} {t.unit} · {t.cadence}
              </span>
            </button>
          ))}
        </Reveal>
      )}

      {initialLoading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-[76px] rounded-2xl" />
          ))}
        </div>
      ) : error && goals.length === 0 ? (
        <ErrorState message={errorMessage(error)} onRetry={refetch} />
      ) : goals.length === 0 ? (
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
              <div className="space-y-2.5">
                {active.map((g) => (
                  <GoalWidget key={g.id} goal={g} />
                ))}
              </div>
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
              <div className="space-y-2.5">
                {done.map((g) => (
                  <GoalWidget key={g.id} goal={g} />
                ))}
              </div>
            </Reveal>
          )}
        </div>
      )}
    </div>
  );
}
