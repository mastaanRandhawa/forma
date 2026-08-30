import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Reveal } from "../components/Reveal";
import { EmptyState } from "../components/EmptyState";
import { Button, Panel, PillSelector } from "../components/primitives";
import { useFormaData, startSession } from "../lib/localStore";
import { sessionVolume } from "../lib/fitness";
import { ALL_TEMPLATES, todayPlan, upcomingPlans, type DayPlan } from "../lib/program";

const TABS = ["Today", "Calendar", "History", "Templates"] as const;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

export default function Workouts() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Today");
  const nav = useNavigate();
  const data = useFormaData();
  const plan = useMemo(() => todayPlan(data.profile), [data.profile]);
  const upcoming = useMemo(() => upcomingPlans(3), []);

  const start = (p: DayPlan) => {
    startSession(p.name, p.exercises);
    nav("/workouts/active");
  };

  const calendar = useMemo(() => {
    const ref = new Date();
    const year = ref.getFullYear();
    const month = ref.getMonth();
    const first = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const trained = new Set(
      data.sessions
        .filter((s) => {
          const d = new Date(s.finishedAt);
          return d.getFullYear() === year && d.getMonth() === month;
        })
        .map((s) => new Date(s.finishedAt).getDate()),
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
  }, [data.sessions, data.profile.preferredDays]);

  const monthLabel = new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" }).toLowerCase();

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
          <section className="surface-soft p-6 sm:p-8">
            <div className="label-instrument">
              starter template · {data.profile.daysPerWeek ?? 4} days / week
            </div>
            <h2 className="text-heading mt-2 text-content-primary lowercase">{plan.name}</h2>
            <p className="mt-1.5 text-[0.9rem] text-content-secondary lowercase">
              {plan.focus.join(", ").toLowerCase()} · ~{data.profile.sessionMin ?? 45} min
            </p>

            <ol className="mt-6 space-y-2">
              {plan.exercises.map((ex, i) => (
                <li key={ex.name} className="pill-row">
                  <span className="pill-row__dot label-instrument !text-[0.7rem] text-content-tertiary">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-[0.92rem] text-content-primary">{ex.name}</span>
                  <span className="label-instrument shrink-0">{ex.target}</span>
                </li>
              ))}
            </ol>

            <div className="mt-7 flex gap-3">
              <Button onClick={() => start(plan)}>
                {data.active ? "resume workout →" : "start workout →"}
              </Button>
            </div>
            {!data.profile.onboardedAt && (
              <p className="mt-3 label-instrument">
                complete <a href="/onboarding" className="underline">setup</a> to tune this to your goal
              </p>
            )}
          </section>

          <aside>
            <div className="label-soft lowercase">up next</div>
            <ul className="mt-4 space-y-5">
              {upcoming.map((w, i) => (
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
            {data.sessions.length === 0 && (
              <p className="mt-4 label-instrument">
                pink marks land here once you finish a session
              </p>
            )}
          </Panel>
        </Reveal>
      )}

      {tab === "History" && (
        <Reveal key="hist">
          <Panel title="recent sessions">
            {data.sessions.length === 0 ? (
              <EmptyState
                title="no sessions yet"
                body="your finished workouts land here — volume, duration and any PRs."
                action={{ label: "start today's workout", to: "/workouts" }}
              />
            ) : (
              <ul className="divide-y divide-[var(--line-soft)]">
                {data.sessions.map((h) => (
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
            )}
          </Panel>
        </Reveal>
      )}

      {tab === "Templates" && (
        <Reveal key="templates" className="grid gap-4 sm:grid-cols-2">
          {ALL_TEMPLATES.map((t) => (
            <div key={t.name} className="surface-soft flex items-center justify-between p-5">
              <div>
                <div className="text-[0.95rem] text-content-primary lowercase">{t.name}</div>
                <div className="label-instrument mt-0.5">
                  {t.exercises.length} exercises · {t.focus.join(", ").toLowerCase()}
                </div>
              </div>
              <Button variant="ghost" onClick={() => start(t)}>
                start
              </Button>
            </div>
          ))}
        </Reveal>
      )}
    </div>
  );
}
