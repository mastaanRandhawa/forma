import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Reveal } from "../components/Reveal";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Button, Panel, PillSelector } from "../components/primitives";
import { ExerciseThumb } from "../components/ExerciseThumb";
import { repdbThumb } from "../lib/repdb";
import { useFormaData, startSession } from "../lib/localStore";
import { sessionVolume } from "../lib/fitness";
import { startApiSessionFromWorkout, fromKg } from "../lib/lifecycle";
import { API_ENABLED, usePlannedWorkouts, useWorkoutTemplates, useSessionHistory, useAction } from "../api/hooks";
import { api } from "../api/client";
import { ALL_TEMPLATES, todayPlan, upcomingPlans, type DayPlan } from "../lib/program";
import type { Workout } from "../api/types";

const TABS = ["Today", "Calendar", "History", "Templates"] as const;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

export default function Workouts() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Today");
  const nav = useNavigate();
  const data = useFormaData();
  const units = data.profile.units;

  const localPlan = useMemo(() => todayPlan(data.profile), [data.profile]);
  const upcoming = useMemo(() => upcomingPlans(3), []);

  const planned = usePlannedWorkouts();
  const templates = useWorkoutTemplates();
  const history = useSessionHistory();

  const apiWorkout = API_ENABLED ? planned.data?.[0] ?? null : null;

  const startLocal = (p: DayPlan) => {
    startSession(p.name, p.exercises);
    nav("/workouts/active");
  };

  const startApi = useAction(async (w: Workout) => {
    await startApiSessionFromWorkout(w, units);
    nav("/workouts/active");
  });

  const generate = useAction(async () => {
    const focus = (localPlan.focus.length ? localPlan.focus : ["chest", "back", "quads"]).map((f) => f.toLowerCase());
    const w = (await api.workouts.generate({
      focus,
      durationMin: data.profile.sessionMin ?? 45,
      save: true,
    })) as Workout;
    planned.refetch();
    if (w?.id) {
      await startApiSessionFromWorkout(w, units);
      nav("/workouts/active");
    }
  });

  const calendar = useMemo(() => {
    const ref = new Date();
    const year = ref.getFullYear();
    const month = ref.getMonth();
    const first = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const apiDays = API_ENABLED
      ? (history.data ?? []).map((s) => new Date(s.startedAt))
      : data.sessions.map((s) => new Date(s.finishedAt));
    const trained = new Set(
      apiDays.filter((d) => d.getFullYear() === year && d.getMonth() === month).map((d) => d.getDate()),
    );
    return Array.from({ length: 42 }).map((_, i) => {
      const day = i - first + 1;
      const inMonth = day >= 1 && day <= daysInMonth;
      const dow = new Date(year, month, day).getDay();
      return {
        day,
        inMonth,
        status: !inMonth
          ? null
          : trained.has(day)
          ? "done"
          : data.profile.preferredDays.includes(dow) && new Date(year, month, day) >= new Date(new Date().toDateString())
          ? "planned"
          : null,
      };
    });
  }, [data.sessions, data.profile.preferredDays, history.data]);

  const monthLabel = new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" }).toLowerCase();
  const hasActive = Boolean(data.active);

  return (
    <div className="mx-auto max-w-[1120px]">
      <PageHeader eyebrow="train" title="plan" ghost="& history">
        <Button variant="ghost" onClick={() => setTab("Templates")}>
          browse templates
        </Button>
      </PageHeader>

      <div className="mb-8">
        <PillSelector options={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === "Today" && (
        <Reveal key="today" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {API_ENABLED && !apiWorkout ? (
            <section className="surface-soft p-6 sm:p-8">
              {planned.initialLoading ? (
                <p className="label-instrument">loading your plan…</p>
              ) : planned.error ? (
                <ErrorState message="couldn't load your plan" onRetry={planned.refetch} />
              ) : (
                <>
                  <h2 className="text-heading text-content-primary lowercase">no workout scheduled</h2>
                  <p className="mt-1.5 text-[0.9rem] text-content-secondary lowercase">
                    generate one tuned to your goal and start training.
                  </p>
                  <div className="mt-7">
                    <Button onClick={() => generate.run()} disabled={generate.pending}>
                      {generate.pending ? "generating…" : "generate a workout →"}
                    </Button>
                  </div>
                  {generate.error && <p className="mt-3 label-instrument text-[var(--accent-pink)]">{generate.error.message}</p>}
                </>
              )}
            </section>
          ) : (
            <section className="surface-soft p-6 sm:p-8">
              <div className="label-instrument">
                {apiWorkout
                  ? apiWorkout.scheduledDate
                    ? `scheduled · ${fmtDate(apiWorkout.scheduledDate).toLowerCase()}`
                    : "your plan"
                  : `starter template · ${data.profile.daysPerWeek ?? 4} days / week`}
              </div>
              <h2 className="text-heading mt-2 text-content-primary lowercase">
                {apiWorkout ? apiWorkout.name : localPlan.name}
              </h2>
              <p className="mt-1.5 text-[0.9rem] text-content-secondary lowercase">
                {(apiWorkout ? apiWorkout.targetMuscleKeys : localPlan.focus).join(", ").toLowerCase()} · ~
                {(apiWorkout?.estimatedDurationMin ?? data.profile.sessionMin ?? 45)} min
              </p>

              <ol className="mt-6 space-y-2">
                {(apiWorkout ? apiWorkout.exercises : localPlan.exercises).map((ex, i) => {
                  const name = "exercise" in ex ? ex.exercise.name : ex.name;
                  const target =
                    "exercise" in ex
                      ? `${ex.targetSets} × ${ex.targetRepsMin ?? ""}${ex.targetRepsMax ? "–" + ex.targetRepsMax : ""}` +
                        (ex.targetWeightKg ? ` · ${fromKg(ex.targetWeightKg, units)} ${units}` : "")
                      : ex.target;
                  return (
                    <li key={i} className="pill-row">
                      <ExerciseThumb src={repdbThumb(name)} alt="" size={30} />
                      <span className="flex-1 text-[0.92rem] text-content-primary">{name}</span>
                      <span className="label-instrument shrink-0">{target}</span>
                    </li>
                  );
                })}
              </ol>

              <div className="mt-7 flex gap-3">
                {hasActive ? (
                  <Button onClick={() => nav("/workouts/active")}>resume workout →</Button>
                ) : apiWorkout ? (
                  <Button onClick={() => startApi.run(apiWorkout)} disabled={startApi.pending}>
                    {startApi.pending ? "starting…" : "start workout →"}
                  </Button>
                ) : (
                  <Button onClick={() => startLocal(localPlan)}>start workout →</Button>
                )}
              </div>
              {startApi.error && <p className="mt-3 label-instrument text-[var(--accent-pink)]">{startApi.error.message}</p>}
              {!API_ENABLED && !data.profile.onboardedAt && (
                <p className="mt-3 label-instrument">
                  complete <a href="/onboarding" className="underline">setup</a> to tune this to your goal
                </p>
              )}
            </section>
          )}

          <aside>
            <div className="label-soft lowercase">up next</div>
            <ul className="mt-4 space-y-5">
              {(API_ENABLED ? (planned.data ?? []).slice(1, 4) : []).map((w) => (
                <li key={w.id}>
                  <div className="text-[0.95rem] text-content-primary">{w.name}</div>
                  <div className="label-instrument mt-1">
                    {w.scheduledDate ? fmtDate(w.scheduledDate).toLowerCase() : "unscheduled"} ·{" "}
                    {w.targetMuscleKeys.join(", ").toLowerCase()}
                  </div>
                </li>
              ))}
              {!API_ENABLED &&
                upcoming.map((w, i) => (
                  <li key={i}>
                    <div className="text-[0.95rem] text-content-primary">{w.plan.name}</div>
                    <div className="label-instrument mt-1">
                      {w.when.toLowerCase()} · {w.plan.focus.join(", ").toLowerCase()}
                    </div>
                  </li>
                ))}
            </ul>
          </aside>
        </Reveal>
      )}

      {tab === "Calendar" && (
        <Reveal key="cal">
          <Panel title={monthLabel}>
            <div className="grid grid-cols-7 gap-2 text-center">
              {["s", "m", "t", "w", "t", "f", "s"].map((d, i) => (
                <div key={i} className="label-instrument pb-2">
                  {d}
                </div>
              ))}
              {calendar.map((c, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-[var(--radius-small)] flex flex-col items-center justify-center gap-1 ${
                    c.inMonth ? "surface-recessed" : "text-content-tertiary"
                  }`}
                >
                  <span className="tabular-nums text-[0.8rem] text-content-secondary">{c.inMonth ? c.day : ""}</span>
                  {c.status && (
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: c.status === "done" ? "var(--accent-pink)" : "transparent",
                        border: c.status === "planned" ? "1px solid var(--accent-mauve)" : "none",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </Reveal>
      )}

      {tab === "History" && (
        <Reveal key="hist">
          <Panel title="recent sessions">
            <HistoryList
              apiSessions={API_ENABLED ? history.data : null}
              loading={API_ENABLED && history.initialLoading}
              error={API_ENABLED ? history.error : null}
              onRetry={history.refetch}
              localSessions={data.sessions}
            />
          </Panel>
        </Reveal>
      )}

      {tab === "Templates" && (
        <Reveal key="templates" className="grid gap-4 sm:grid-cols-2">
          {API_ENABLED
            ? (templates.data ?? []).map((t) => (
                <div key={t.id} className="surface-soft flex items-center justify-between p-5">
                  <div>
                    <div className="text-[0.95rem] text-content-primary lowercase">{t.name}</div>
                    <div className="label-instrument mt-0.5">
                      {t.exercises.length} exercises · {t.targetMuscleKeys.join(", ").toLowerCase()}
                    </div>
                  </div>
                  <Button variant="ghost" onClick={() => startApi.run(t)} disabled={startApi.pending}>
                    start
                  </Button>
                </div>
              ))
            : ALL_TEMPLATES.map((t) => (
                <div key={t.name} className="surface-soft flex items-center justify-between p-5">
                  <div>
                    <div className="text-[0.95rem] text-content-primary lowercase">{t.name}</div>
                    <div className="label-instrument mt-0.5">
                      {t.exercises.length} exercises · {t.focus.join(", ").toLowerCase()}
                    </div>
                  </div>
                  <Button variant="ghost" onClick={() => startLocal(t)}>
                    start
                  </Button>
                </div>
              ))}
          {API_ENABLED && !templates.initialLoading && (templates.data ?? []).length === 0 && (
            <p className="label-instrument">no templates yet — generate a program to create some.</p>
          )}
        </Reveal>
      )}
    </div>
  );
}

function HistoryList({
  apiSessions,
  loading,
  error,
  onRetry,
  localSessions,
}: {
  apiSessions: import("../api/types").WorkoutSession[] | null;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  localSessions: ReturnType<typeof useFormaData>["sessions"];
}) {
  if (loading) return <p className="label-instrument">loading…</p>;
  if (error) return <ErrorState message="couldn't load history" onRetry={onRetry} />;

  if (apiSessions) {
    if (apiSessions.length === 0)
      return (
        <EmptyState
          title="no sessions yet"
          body="your finished workouts land here — volume, duration and any PRs."
          action={{ label: "start today's workout", to: "/workouts" }}
        />
      );
    return (
      <ul className="divide-y divide-[var(--line-soft)]">
        {apiSessions.map((s) => (
          <li key={s.id} className="flex items-center justify-between py-4 first:pt-0">
            <div>
              <div className="text-[0.95rem] text-content-primary lowercase">{s.name}</div>
              <div className="label-instrument mt-0.5">
                {fmtDate(s.startedAt).toLowerCase()} · {Math.round(s.durationSeconds / 60)} min
              </div>
            </div>
            <div className="text-right">
              <div className="label-instrument">{Math.round(s.totalVolumeKg).toLocaleString()} kg</div>
              {(s.personalRecords?.length ?? 0) > 0 && (
                <div className="text-[0.78rem] tabular-nums" style={{ color: "var(--accent-lime)" }}>
                  {s.personalRecords!.length} pr{s.personalRecords!.length > 1 ? "s" : ""}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (localSessions.length === 0)
    return (
      <EmptyState
        title="no sessions yet"
        body="your finished workouts land here — volume, duration and any PRs."
        action={{ label: "start today's workout", to: "/workouts" }}
      />
    );
  return (
    <ul className="divide-y divide-[var(--line-soft)]">
      {localSessions.map((h) => (
        <li key={h.id} className="flex items-center justify-between py-4 first:pt-0">
          <div>
            <div className="text-[0.95rem] text-content-primary lowercase">{h.name}</div>
            <div className="label-instrument mt-0.5">
              {fmtDate(h.finishedAt).toLowerCase()} · {Math.round(h.durationSec / 60)} min
            </div>
          </div>
          <div className="text-right">
            <div className="label-instrument">
              {Math.round(sessionVolume(h.exercises)).toLocaleString()} {h.units}
            </div>
            {h.prs.length > 0 && (
              <div className="text-[0.78rem] tabular-nums" style={{ color: "var(--accent-lime)" }}>
                {h.prs.length} pr{h.prs.length > 1 ? "s" : ""}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
