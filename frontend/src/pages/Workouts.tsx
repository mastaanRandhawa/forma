import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Reveal } from "../components/Reveal";
import { EmptyState } from "../components/EmptyState";
import { Button, Panel, PillSelector } from "../components/primitives";
import { BodyView } from "./Body";
import { program, todayWorkout, upcomingWorkouts } from "../lib/data";

const TABS = ["Today", "Body", "Calendar", "History", "Templates"] as const;

const calendar = Array.from({ length: 35 }).map((_, i) => {
  const day = i - 2;
  return {
    day,
    inMonth: day >= 1 && day <= 30,
    status:
      [1, 3, 5, 8, 10, 12, 15, 17, 19].includes(day)
        ? "done"
        : [22, 24, 26].includes(day)
        ? "planned"
        : null,
  };
});

const history = [
  { date: "Mon, Aug 26", name: "Upper Body Push", volume: "24.7k lb", form: 88 },
  { date: "Sat, Aug 24", name: "Lower Body", volume: "38.1k lb", form: 84 },
  { date: "Thu, Aug 22", name: "Upper Body Pull", volume: "21.3k lb", form: 90 },
  { date: "Tue, Aug 20", name: "Full Body + Conditioning", volume: "17.9k lb", form: 82 },
];

const templates = [
  { name: "Push A · Chest Focus", meta: "6 exercises, ~50 min" },
  { name: "Pull A · Width", meta: "6 exercises, ~48 min" },
  { name: "Legs A · Quad Focus", meta: "7 exercises, ~55 min" },
  { name: "Full Body Express", meta: "4 exercises, ~30 min" },
];

const todayExercises = [
  ["Barbell Bench Press", "4 × 8-10"],
  ["Incline Dumbbell Press", "4 × 8-10"],
  ["Cable Fly", "3 × 12-15"],
  ["Overhead Press", "4 × 8-10"],
  ["Lateral Raise", "3 × 15"],
  ["Triceps Rope Pushdown", "3 × 12-15"],
];

export default function Workouts() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Today");

  return (
    <div className="mx-auto max-w-[1120px]">
      <PageHeader eyebrow="train" title="plan" ghost="& body">
        <div className="flex gap-2">
          <Button variant="ghost">ai generate</Button>
          <Button variant="ghost">build manually</Button>
        </div>
      </PageHeader>

      <div className="mb-8">
        <PillSelector options={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === "Today" && (
        <Reveal key="today" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="surface-soft p-6 sm:p-8">
            <div className="label-instrument">{program.name.toLowerCase()}</div>
            <h2 className="text-heading mt-2 text-content-primary lowercase">{todayWorkout.name}</h2>
            <p className="mt-1.5 text-[0.9rem] text-content-secondary lowercase">
              {program.split}, {todayWorkout.duration}
            </p>

            <ol className="mt-6 space-y-2">
              {todayExercises.map(([name, scheme], i) => (
                <li key={name} className="pill-row">
                  <span className="pill-row__dot label-instrument !text-[0.7rem] text-content-tertiary">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-[0.92rem] text-content-primary">{name}</span>
                  <span className="label-instrument shrink-0">{scheme}</span>
                </li>
              ))}
            </ol>

            <div className="mt-7 flex gap-3">
              <Link to="/workouts/active">
                <Button>start workout →</Button>
              </Link>
              <Button variant="ghost">edit plan</Button>
            </div>
          </section>

          <aside>
            <div className="label-soft lowercase">up next</div>
            {upcomingWorkouts.length === 0 ? (
              <p className="mt-4 text-[0.86rem] leading-relaxed text-content-tertiary">
                nothing scheduled. generate a plan or build one to fill your week.
              </p>
            ) : (
              <ul className="mt-4 space-y-5">
                {upcomingWorkouts.map((w) => (
                  <li key={w.day}>
                    <div className="text-[0.95rem] text-content-primary">{w.name}</div>
                    <div className="label-instrument mt-1">
                      {w.day.toLowerCase()} · {w.muscles.join(", ").toLowerCase()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </Reveal>
      )}

      {tab === "Body" && <BodyView />}

      {tab === "Calendar" && (
        <Reveal key="cal">
        <Panel title="august 2026">
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
          {history.length === 0 ? (
            <EmptyState
              title="no sessions yet"
              body="your finished workouts land here — volume, form score and the date."
              action={{ label: "start today's workout", to: "/workouts/active" }}
            />
          ) : (
          <ul className="divide-y divide-[var(--line-soft)]">
            {history.map((h) => (
              <li key={h.date} className="flex items-center justify-between py-4 first:pt-0">
                <div>
                  <div className="text-[0.95rem] text-content-primary">{h.name}</div>
                  <div className="label-instrument mt-0.5">{h.date.toLowerCase()}</div>
                </div>
                <div className="text-right">
                  <div className="label-instrument">{h.volume}</div>
                  <div className="text-[0.78rem] tabular-nums" style={{ color: "var(--accent-lime)" }}>
                    form {h.form}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          )}
        </Panel>
        </Reveal>
      )}

      {tab === "Templates" && (
        templates.length === 0 ? (
          <EmptyState
            title="no templates"
            body="save a workout as a template and it'll be one tap to start next time."
            action={{ label: "build a workout", to: "/workouts" }}
          />
        ) : (
        <Reveal key="templates" className="grid gap-4 sm:grid-cols-2">
          {templates.map((t) => (
            <div
              key={t.name}
              className="surface-soft lift flex items-center justify-between p-5"
            >
              <div>
                <div className="text-[0.95rem] text-content-primary lowercase">{t.name}</div>
                <div className="label-instrument mt-0.5">{t.meta}</div>
              </div>
              <Button variant="ghost">use</Button>
            </div>
          ))}
        </Reveal>
        )
      )}
    </div>
  );
}
