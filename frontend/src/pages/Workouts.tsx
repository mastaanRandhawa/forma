import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Dumbbell, History as HistoryIcon, Plus, Zap, CalendarDays } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { TrainingTabs } from "../components/layout/TrainingTabs";
import { Reveal } from "../components/Reveal";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Button, Panel, PillSelector } from "../components/primitives";
import { ExerciseThumb } from "../components/ExerciseThumb";
import { DetailDrawer } from "../components/dashboard/DetailDrawer";
import { TemplateCard } from "../components/workout/TemplateCard";
import { TemplateLibrary } from "../components/workout/TemplateLibrary";
import { TemplatePreview } from "../components/workout/TemplatePreview";
import { PlanPreview } from "../components/workout/PlanViews";
import { SessionDetailDrawer } from "../components/workout/SessionDetailDrawer";
import { WeekStrip } from "../components/workout/WeekStrip";
import { useFormaData, startSession, loadData, abandonSession, type CompletedSession } from "../lib/localStore";
import { sessionVolume } from "../lib/fitness";
import { sessionElapsedLabel, sessionProgress } from "../lib/session";
import { WORKOUT_PLANS, planTemplates, type WorkoutPlan } from "../lib/workoutPlans";
import {
  startApiSessionFromWorkout,
  apiSessionToCompleted,
  abandonApiSession,
  fromKg,
} from "../lib/lifecycle";
import {
  API_ENABLED,
  usePlannedWorkouts,
  useSessionHistory,
  useTemplates,
  useAction,
  useResource,
  invalidateTemplates,
} from "../api/hooks";
import { api } from "../api/client";
import { todayPlan, upcomingPlans, type DayPlan } from "../lib/program";
import { WORKOUT_TEMPLATES, recommendTemplates, type WorkoutTemplate } from "../lib/workoutTemplates";
import {
  presetToRow,
  createTemplate,
  startFromPreset,
  startFromTemplateRow,
  startQuick,
  startRepeat,
  deleteTemplate,
  duplicateTemplate,
  renameTemplate,
  saveSessionAsTemplate,
  type TemplateRow,
} from "../lib/templates";
import type { Workout } from "../api/types";

const TABS = ["Today", "Calendar", "History", "Templates"] as const;
type TabName = (typeof TABS)[number];

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

export default function Workouts() {
  const loc = useLocation();
  const nav = useNavigate();
  const [tab, setTab] = useState<TabName>((loc.state as { tab?: TabName } | null)?.tab ?? "Today");
  const data = useFormaData();
  const units = data.profile.units;

  const localPlan = useMemo(() => todayPlan(data.profile), [data.profile]);
  const upcoming = useMemo(() => upcomingPlans(3), []);

  const planned = usePlannedWorkouts();
  const templates = useTemplates();
  const history = useSessionHistory();
  const programs = useResource(
    "programs-list",
    () => API_ENABLED ? api.programs.list() : Promise.reject(new Error("offline")),
  );
  const activeProgram = programs.data?.find((p) => p.active) ?? null;

  // Compute current week index from the program's creation date
  const programWeekInfo = useMemo(() => {
    if (!activeProgram) return null;
    const startMs = new Date(activeProgram.createdAt).getTime();
    const weekIndex = Math.max(0, Math.floor((Date.now() - startMs) / (7 * 24 * 60 * 60 * 1000)));
    const currentWeek = Math.min(weekIndex + 1, activeProgram.durationWeeks);
    const isDeloadWeek = activeProgram.durationWeeks >= 4 && currentWeek % 4 === 0;
    return { currentWeek, totalWeeks: activeProgram.durationWeeks, isDeloadWeek, name: activeProgram.name };
  }, [activeProgram]);

  const apiWorkout = API_ENABLED ? planned.data?.[0] ?? null : null;
  const hasActive = Boolean(data.active);

  // ── recent completed sessions (normalized to CompletedSession) ───────────
  const recentSessions: CompletedSession[] = useMemo(() => {
    if (API_ENABLED) return (history.data ?? []).map((s) => apiSessionToCompleted(s, units));
    return data.sessions;
  }, [history.data, data.sessions, units]);

  const recommended = useMemo(
    () => recommendTemplates(data.profile, [], 3).map(presetToRow),
    [data.profile],
  );

  // ── start actions ───────────────────────────────────────────────────────
  const go = () => nav("/workouts/active");

  // Starting anything while a workout is open would silently replace it, so
  // every start asks first. Reads the live store (actions keep stale closures).
  const [replacing, setReplacing] = useState<{ name: string; retry: () => void } | null>(null);
  const askIfActive = (retry: () => void): boolean => {
    const open = loadData().active;
    if (!open) return false;
    setReplacing({ name: open.name, retry });
    return true;
  };
  const discardOpenAndRetry = () => {
    const open = loadData().active;
    if (open) void abandonApiSession(open);
    abandonSession();
    const retry = replacing?.retry;
    setReplacing(null);
    retry?.();
  };

  const startLocalPlan = (p: DayPlan, force = false) => {
    if (!force && askIfActive(() => startLocalPlan(p, true))) return;
    startSession(p.name, p.exercises.map((e) => ({ name: e.name, target: e.target })));
    go();
  };
  const startApi = useAction(async (w: Workout, force = false) => {
    if (!force && askIfActive(() => void startApi.run(w, true))) return;
    await startApiSessionFromWorkout(w, units);
    go();
  });
  const startPreset = useAction(async (id: string, force = false) => {
    if (!force && askIfActive(() => void startPreset.run(id, true))) return;
    const t = WORKOUT_TEMPLATES.find((x) => x.id === id)!;
    await startFromPreset(t, units);
    go();
  });
  const startTemplate = useAction(async (row: TemplateRow, force = false) => {
    if (!force && askIfActive(() => void startTemplate.run(row, true))) return;
    await startFromTemplateRow(row, units);
    go();
  });
  const quickStart = useAction(async (force = false) => {
    if (!force && askIfActive(() => void quickStart.run(true))) return;
    await startQuick();
    go();
  });
  const repeat = useAction(async (s: CompletedSession, force = false) => {
    if (!force && askIfActive(() => void repeat.run(s, true))) return;
    await startRepeat(s, units);
    go();
  });
  const saveTpl = useAction(async (s: CompletedSession) => {
    await saveSessionAsTemplate(s);
    invalidateTemplates();
    templates.refetch();
  });

  // ── drawers + template mutations ────────────────────────────────────────
  const [preview, setPreview] = useState<TemplateRow | null>(null);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [detail, setDetail] = useState<CompletedSession | null>(null);
  const [renaming, setRenaming] = useState<TemplateRow | null>(null);
  const [deleting, setDeleting] = useState<TemplateRow | null>(null);
  const [notice, setNotice] = useState<string | null>((loc.state as { notice?: string } | null)?.notice ?? null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const afterTemplateChange = () => {
    invalidateTemplates();
    templates.refetch();
  };
  const saveCopy = useAction(async (row: TemplateRow) => {
    const copy = await duplicateTemplate(row);
    afterTemplateChange();
    setTab("Templates");
    setNotice(`saved “${copy.name}” to my workouts`);
  });
  const savePlan = useAction(async (p: WorkoutPlan) => {
    const short = p.name.split(" — ")[0];
    for (const { label, template } of planTemplates(p)) {
      await createTemplate({
        name: `${short} · ${label}`,
        description: template.description,
        targetMuscles: template.targetMuscles,
        exercises: template.exercises,
        sourceId: template.id,
      });
    }
    afterTemplateChange();
    setPlan(null);
    setTab("Templates");
    setNotice(`saved ${p.days.length} workouts from “${short}” to my workouts`);
  });
  const dup = useAction(async (row: TemplateRow) => {
    const copy = await duplicateTemplate(row);
    afterTemplateChange();
    setNotice(`duplicated as “${copy.name}”`);
  });
  const del = useAction(async (row: TemplateRow) => {
    await deleteTemplate(row.id);
    afterTemplateChange();
    setNotice(`deleted “${row.name}”`);
  });
  const renameTpl = useAction(async (row: TemplateRow, name: string) => {
    await renameTemplate(row, name);
    afterTemplateChange();
    setNotice(`renamed to “${name}”`);
  });
  const startPresetTemplate = (t: WorkoutTemplate) => {
    setPlan(null);
    startPreset.run(t.id);
  };

  const generate = useAction(async () => {
    const focus = (localPlan.focus.length ? localPlan.focus : ["chest", "back", "quads"]).map((f) =>
      f.toLowerCase(),
    );
    const w = (await api.workouts.generate({
      focus,
      durationMin: data.profile.sessionMin ?? 45,
      save: true,
    })) as Workout;
    planned.refetch();
    if (w?.id) {
      await startApiSessionFromWorkout(w, units);
      go();
    }
  });

  // ── calendar (unchanged) ────────────────────────────────────────────────
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
          : data.profile.preferredDays.includes(dow) &&
            new Date(year, month, day) >= new Date(new Date().toDateString())
          ? "planned"
          : null,
      };
    });
  }, [data.sessions, data.profile.preferredDays, history.data]);

  const monthLabel = new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" }).toLowerCase();

  return (
    <div className="mx-auto max-w-[1120px]">
      <TrainingTabs className="mb-6" />
      <PageHeader eyebrow="train" title="workouts" ghost="& history">
        <Button variant="ghost" onClick={() => nav("/workouts/builder")}>
          create workout
        </Button>
      </PageHeader>

      <div className="mb-8">
        <PillSelector options={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === "Today" && (
        <Reveal key="today" className="space-y-6">
          <WeekStrip sessions={recentSessions} goal={data.profile.daysPerWeek ?? null} />

          {/* ── program week banner ─────────────────────────────────── */}
          {programWeekInfo && (
            <div
              className="flex items-center gap-3 rounded-[var(--radius-medium)] px-4 py-3"
              style={{ background: programWeekInfo.isDeloadWeek ? "rgba(var(--accent-cyan-rgb,131,233,244),0.08)" : "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <CalendarDays size={14} className="shrink-0" style={{ color: programWeekInfo.isDeloadWeek ? "var(--accent-cyan)" : "var(--content-tertiary)" }} />
              <div className="flex-1 min-w-0">
                <span className="text-[0.84rem] text-content-primary lowercase">{programWeekInfo.name}</span>
                <span className="mx-2 text-content-tertiary">·</span>
                <span className="text-[0.84rem] text-content-secondary lowercase">
                  week {programWeekInfo.currentWeek} / {programWeekInfo.totalWeeks}
                </span>
                {programWeekInfo.isDeloadWeek && (
                  <span className="ml-2 rounded-sm px-1.5 py-0.5 text-[0.7rem] font-medium uppercase tracking-wide" style={{ background: "rgba(131,233,244,0.15)", color: "var(--accent-cyan)" }}>
                    deload week
                  </span>
                )}
                {!programWeekInfo.isDeloadWeek && programWeekInfo.currentWeek < programWeekInfo.totalWeeks && programWeekInfo.currentWeek % 4 === 3 && (
                  <span className="ml-2 text-[0.76rem] text-content-tertiary lowercase">deload next week</span>
                )}
              </div>
            </div>
          )}

          {/* ── workout in progress ─────────────────────────────────── */}
          {hasActive && data.active && (
            <section className="surface-soft border border-[color-mix(in_srgb,var(--accent-pink)_28%,transparent)] p-6">
              <div className="label-instrument" style={{ color: "var(--accent-pink)" }}>
                {data.active.paused ? "workout paused" : "workout in progress"}
              </div>
              <h2 className="text-heading mt-1.5 text-content-primary lowercase">{data.active.name}</h2>
              <p className="mt-1 text-[0.9rem] text-content-secondary lowercase tabular-nums">
                {sessionElapsedLabel(data.active)} elapsed ·{" "}
                {(() => {
                  const p = sessionProgress(data.active);
                  return `${p.setsDone}/${p.setsTotal} sets · ${p.exercisesDone}/${p.exercisesTotal} exercises`;
                })()}
              </p>
              <div className="mt-5">
                <Button onClick={go}>resume workout →</Button>
              </div>
            </section>
          )}

          {/* ── start today ─────────────────────────────────────────── */}
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
                    generate one tuned to your goal, pick a template, or start empty.
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Button onClick={() => generate.run()} disabled={generate.pending}>
                      {generate.pending ? "generating…" : "generate a workout →"}
                    </Button>
                    <Button variant="ghost" onClick={() => quickStart.run()} disabled={quickStart.pending}>
                      quick start
                    </Button>
                  </div>
                  {generate.error && (
                    <p className="mt-3 label-instrument text-[var(--accent-pink)]">{generate.error.message}</p>
                  )}
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
                {apiWorkout?.estimatedDurationMin ?? data.profile.sessionMin ?? 45} min
              </p>

              <ol className="mt-6 space-y-2">
                {(apiWorkout ? apiWorkout.exercises : localPlan.exercises).map((ex, i) => {
                  const name = "exercise" in ex ? ex.exercise.name : ex.name;
                  const target =
                    "exercise" in ex
                      ? `${ex.targetSets} × ${ex.targetRepsMin ?? ""}${
                          ex.targetRepsMax ? "–" + ex.targetRepsMax : ""
                        }` + (ex.targetWeightKg ? ` · ${fromKg(ex.targetWeightKg, units)} ${units}` : "")
                      : ex.target;
                  return (
                    <li key={i} className="pill-row">
                      <ExerciseThumb name={name} alt="" size={40} />
                      <span className="flex-1 text-[0.92rem] text-content-primary">{name}</span>
                      <span className="label-instrument shrink-0">{target}</span>
                    </li>
                  );
                })}
              </ol>

              <div className="mt-7 flex flex-wrap gap-3">
                {hasActive ? (
                  <Button onClick={go}>resume workout →</Button>
                ) : apiWorkout ? (
                  <Button onClick={() => startApi.run(apiWorkout)} disabled={startApi.pending}>
                    {startApi.pending ? "starting…" : "start workout →"}
                  </Button>
                ) : (
                  <Button onClick={() => startLocalPlan(localPlan)}>start workout →</Button>
                )}
                <Button variant="ghost" onClick={() => quickStart.run()} disabled={quickStart.pending}>
                  quick start
                </Button>
              </div>
              {startApi.error && (
                <p className="mt-3 label-instrument text-[var(--accent-pink)]">{startApi.error.message}</p>
              )}
            </section>
          )}

          {/* ── quick actions ───────────────────────────────────────── */}
          <div className="grid gap-3 sm:grid-cols-3">
            <HubAction icon={Zap} label="quick start" hint="empty session — add as you go" onClick={() => quickStart.run()} />
            <HubAction icon={Plus} label="create workout" hint="build a custom template" onClick={() => nav("/workouts/builder")} />
            <HubAction
              icon={Dumbbell}
              label="browse templates"
              hint={`${WORKOUT_PLANS.length} plans · ${WORKOUT_TEMPLATES.length} workouts`}
              onClick={() => setTab("Templates")}
            />
          </div>

          {/* ── recommended ─────────────────────────────────────────── */}
          <section>
            <div className="label-soft mb-3 lowercase">for you</div>
            <p className="label-instrument mb-4">based on your goal and recent training.</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recommended.map((row) => (
                <TemplateCard
                  key={row.id}
                  row={row}
                  starting={startPreset.pending}
                  onStart={() => startPreset.run(row.id)}
                  onOpen={() => setPreview(row)}
                  actions={[{ label: "save a copy", onClick: () => saveCopy.run(row) }]}
                />
              ))}
            </div>
          </section>

          {/* ── recent ──────────────────────────────────────────────── */}
          <section>
            <div className="label-soft mb-3 lowercase">recent workouts</div>
            {recentSessions.length === 0 ? (
              <p className="label-instrument">no finished sessions yet.</p>
            ) : (
              <ul className="space-y-2">
                {recentSessions.slice(0, 4).map((s) => (
                  <li key={s.id} className="surface-soft flex items-center justify-between p-4">
                    <button onClick={() => setDetail(s)} className="focus-ring min-w-0 flex-1 text-left">
                      <div className="text-[0.95rem] text-content-primary lowercase">{s.name}</div>
                      <div className="label-instrument mt-0.5">
                        {fmtDate(s.finishedAt).toLowerCase()} · {Math.round(s.durationSec / 60)} min ·{" "}
                        {Math.round(s.volume || sessionVolume(s.exercises)).toLocaleString()} {s.units}
                      </div>
                    </button>
                    <button
                      onClick={() => repeat.run(s)}
                      disabled={repeat.pending}
                      className="focus-ring shrink-0 rounded-pill surface-recessed px-3.5 py-1.5 text-[0.8rem] lowercase text-content-secondary hover:text-content-primary"
                    >
                      repeat
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => setTab("History")}
              className="focus-ring mt-3 inline-flex items-center gap-1.5 text-[0.82rem] lowercase text-content-tertiary hover:text-content-secondary"
            >
              <HistoryIcon size={13} /> full workout history
            </button>
          </section>

          {/* up next */}
          {!API_ENABLED && (
            <section>
              <div className="label-soft mb-3 lowercase">up next</div>
              <ul className="space-y-3">
                {upcoming.map((w, i) => (
                  <li key={i} className="text-[0.9rem]">
                    <span className="text-content-primary">{w.plan.name}</span>
                    <span className="label-instrument ml-2">
                      {w.when.toLowerCase()} · {w.plan.focus.join(", ").toLowerCase()}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
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
                  <span className="tabular-nums text-[0.8rem] text-content-secondary">
                    {c.inMonth ? c.day : ""}
                  </span>
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
            {API_ENABLED && history.initialLoading ? (
              <p className="label-instrument">loading…</p>
            ) : history.error && API_ENABLED ? (
              <ErrorState message="couldn't load history" onRetry={history.refetch} />
            ) : recentSessions.length === 0 ? (
              <EmptyState
                title="no sessions yet"
                body="your finished workouts land here — volume, duration and any PRs."
                action={{ label: "start today's workout", to: "/workouts" }}
              />
            ) : (
              <ul className="divide-y divide-[var(--line-soft)]">
                {recentSessions.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => setDetail(s)}
                      className="focus-ring flex w-full items-center justify-between py-3 text-left first:pt-0.5"
                    >
                      <div>
                        <div className="text-[0.95rem] text-content-primary lowercase">{s.name}</div>
                        <div className="label-instrument mt-0.5">
                          {fmtDate(s.finishedAt).toLowerCase()} · {Math.round(s.durationSec / 60)} min
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="label-instrument">
                          {Math.round(s.volume || sessionVolume(s.exercises)).toLocaleString()} {s.units}
                        </div>
                        {s.prs.length > 0 && (
                          <div className="text-[0.78rem] tabular-nums" style={{ color: "var(--accent-lime)" }}>
                            {s.prs.length} pr{s.prs.length > 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </Reveal>
      )}

      {tab === "Templates" && (
        <Reveal key="templates">
          <TemplateLibrary
            templates={templates}
            starting={startTemplate.pending}
            onStart={(row) => startTemplate.run(row)}
            onStartPreset={(id) => startPreset.run(id)}
            startingPreset={startPreset.pending}
            onCreate={() => nav("/workouts/builder")}
            onEdit={(row) => nav(`/workouts/builder/${row.id}`)}
            onCustomize={(id) => nav(`/workouts/builder?from=${id}`)}
            onSaveCopy={(row) => saveCopy.run(row)}
            onDuplicate={(row) => dup.run(row)}
            onRename={(row) => setRenaming(row)}
            onDelete={(row) => setDeleting(row)}
            onPreview={(row) => setPreview(row)}
            onOpenPlan={(p) => setPlan(p)}
          />
        </Reveal>
      )}

      {/* ── plan drawer ────────────────────────────────────────────── */}
      <DetailDrawer
        open={!!plan && !preview}
        onClose={() => setPlan(null)}
        title={plan?.name ?? ""}
        eyebrow={plan ? `${plan.days.length} workouts · ${plan.daysPerWeek} days / week` : ""}
      >
        {plan && (
          <PlanPreview
            plan={plan}
            busy={savePlan.pending || startPreset.pending}
            onPreviewDay={(t) => setPreview(presetToRow(t))}
            onStartDay={startPresetTemplate}
            onSaveAll={() => savePlan.run(plan)}
          />
        )}
        {savePlan.error && <p className="mt-3 label-instrument text-[var(--accent-pink)]">{savePlan.error.message}</p>}
      </DetailDrawer>

      {/* ── template preview drawer ────────────────────────────────── */}
      <DetailDrawer
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.name ?? ""}
        eyebrow={preview ? `~${preview.durationMin} min · ${preview.exerciseCount} exercises` : ""}
      >
        {preview && (
          <TemplatePreview
            row={preview}
            busy={startPreset.pending || startTemplate.pending}
            onStart={() => {
              const p = preview;
              setPreview(null);
              setPlan(null);
              if (p.origin === "preset") startPreset.run(p.id);
              else startTemplate.run(p);
            }}
            onCustomize={() => {
              const p = preview;
              setPreview(null);
              if (p.origin === "preset") nav(`/workouts/builder?from=${p.id}`);
              else nav(`/workouts/builder/${p.id}`);
            }}
            onSaveCopy={
              preview.origin === "preset"
                ? () => {
                    const p = preview;
                    setPreview(null);
                    setPlan(null);
                    saveCopy.run(p);
                  }
                : undefined
            }
          />
        )}
      </DetailDrawer>

      {/* ── starting while a workout is open ───────────────────────── */}
      <DetailDrawer open={!!replacing} onClose={() => setReplacing(null)} title="a workout is already in progress">
        {replacing && (
          <div>
            <p className="text-[0.9rem] text-content-secondary">
              “{replacing.name}” is still open. starting another workout replaces it and its logged sets are not saved.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button
                onClick={() => {
                  setReplacing(null);
                  go();
                }}
              >
                resume “{replacing.name}”
              </Button>
              <button
                onClick={discardOpenAndRetry}
                className="focus-ring min-h-11 rounded-pill border border-[var(--line-soft)] text-[0.85rem] lowercase text-[var(--accent-pink)]"
              >
                discard it and start the new one
              </button>
              <button
                onClick={() => setReplacing(null)}
                className="focus-ring min-h-11 rounded-pill text-[0.85rem] lowercase text-content-secondary hover:text-content-primary"
              >
                cancel
              </button>
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* ── status message after saves, copies, deletes ─────────────── */}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
        {notice && (
          <div className="surface-float rounded-pill px-4 py-2.5 text-[0.85rem] lowercase text-content-primary shadow-lg">
            {notice}
          </div>
        )}
      </div>
      {(saveCopy.error || dup.error || del.error || renameTpl.error) && (
        <p role="alert" className="mt-4 label-instrument text-[var(--accent-pink)]">
          {(saveCopy.error ?? dup.error ?? del.error ?? renameTpl.error)?.message}
        </p>
      )}

      {/* ── session detail ────────────────────────────────────────── */}
      <SessionDetailDrawer
        session={detail}
        priorSessions={recentSessions}
        onClose={() => setDetail(null)}
        onRepeat={(s) => {
          setDetail(null);
          repeat.run(s);
        }}
        onSaveAsTemplate={(s) => saveTpl.run(s)}
        busy={repeat.pending ? "repeat" : saveTpl.pending ? "template" : null}
      />

      {/* ── rename ────────────────────────────────────────────────── */}
      <DetailDrawer open={!!renaming} onClose={() => setRenaming(null)} title="rename template">
        {renaming && (
          <RenameBody
            row={renaming}
            onDone={async (name) => {
              await renameTpl.run(renaming, name);
              setRenaming(null);
            }}
          />
        )}
      </DetailDrawer>

      {/* ── delete confirm ───────────────────────────────────────── */}
      <DetailDrawer open={!!deleting} onClose={() => setDeleting(null)} title="delete template?">
        {deleting && (
          <div>
            <p className="text-[0.9rem] text-content-secondary lowercase">
              "{deleting.name}" will be removed. this can't be undone.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={async () => {
                  await del.run(deleting);
                  setDeleting(null);
                }}
                className="focus-ring rounded-pill bg-[var(--accent-pink)] px-4 py-2.5 text-[0.85rem] lowercase text-white"
              >
                delete
              </button>
              <button
                onClick={() => setDeleting(null)}
                className="focus-ring rounded-pill px-4 py-2.5 text-[0.85rem] lowercase text-content-secondary hover:text-content-primary"
              >
                keep it
              </button>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}

// state + mutation hooks split out to keep the component body readable
function HubAction({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: typeof Zap;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="focus-ring tactile surface-soft flex items-center gap-3 p-4 text-left hover:surface-float"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full surface-recessed text-[var(--accent-pink)]">
        <Icon size={17} strokeWidth={1.9} />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.92rem] lowercase text-content-primary">{label}</span>
        <span className="label-instrument block truncate">{hint}</span>
      </span>
    </button>
  );
}

function RenameBody({ row, onDone }: { row: TemplateRow; onDone: (name: string) => void }) {
  const [name, setName] = useState(row.name);
  const empty = name.trim() === "";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!empty) onDone(name.trim());
      }}
    >
      <label className="label-instrument" htmlFor="rename-input">
        workout name
      </label>
      <input
        id="rename-input"
        autoFocus
        value={name}
        maxLength={120}
        aria-invalid={empty}
        aria-describedby={empty ? "rename-error" : undefined}
        onChange={(e) => setName(e.target.value)}
        className="focus-ring surface-recessed mt-1 min-h-11 w-full rounded-pill px-4 py-2.5 text-[0.95rem] text-content-primary outline-none"
      />
      {empty && (
        <p id="rename-error" className="mt-1.5 text-[0.8rem] text-[var(--accent-pink)]">
          give it a name
        </p>
      )}
      <div className="mt-4">
        <Button type="submit" disabled={empty}>
          save
        </Button>
      </div>
    </form>
  );
}
