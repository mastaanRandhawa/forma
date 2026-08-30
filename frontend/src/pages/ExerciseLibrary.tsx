import { useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Reveal } from "../components/Reveal";
import { exercises } from "../lib/data";

const MUSCLES = ["All", "Chest", "Back", "Shoulders", "Quads", "Hamstrings", "Biceps", "Core"];

export default function ExerciseLibrary() {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState("All");

  const filtered = useMemo(
    () =>
      exercises.filter(
        (e) =>
          (muscle === "All" || e.muscle === muscle) &&
          e.name.toLowerCase().includes(q.toLowerCase())
      ),
    [q, muscle]
  );

  return (
    <div className="mx-auto max-w-[1120px]">
      <PageHeader eyebrow="library" title="exercises" />

      <Reveal className="mb-8 flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search exercises…"
          className="focus-ring surface-recessed min-w-[220px] flex-1 rounded-pill px-4 py-2.5 text-[0.9rem] text-content-primary outline-none placeholder:text-content-tertiary"
        />
        <div className="flex flex-wrap gap-1.5">
          {MUSCLES.map((m) => (
            <button
              key={m}
              onClick={() => setMuscle(m)}
              className={`focus-ring tactile rounded-pill px-3.5 py-1.5 text-[0.76rem] lowercase tracking-[0.03em] ${
                muscle === m
                  ? "surface-float text-content-primary"
                  : "text-content-tertiary hover:text-content-secondary"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal as="ul" onView delay={0.05} className="divide-y divide-[var(--line-soft)]">
        {filtered.map((e) => (
          <li key={e.name} className="flex items-center justify-between gap-4 py-4">
            <div>
              <div className="text-[0.95rem] text-content-primary lowercase">{e.name}</div>
              <div className="label-instrument mt-0.5">
                {e.muscle} · {e.equipment}
                <span className="ml-2 text-content-tertiary/70">{e.level}</span>
              </div>
            </div>
            {e.camera && (
              <span
                title="AI camera form-tracking supported"
                className="label-instrument shrink-0 rounded-pill surface-recessed px-3 py-1"
                style={{ color: "var(--accent-cyan)" }}
              >
                form
              </span>
            )}
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="py-6 text-[0.9rem] text-content-tertiary">No exercises match those filters.</li>
        )}
      </Reveal>
    </div>
  );
}
