import { useState } from "react";
import { Link } from "react-router-dom";
import { saveProfile, useFormaData, type Profile } from "../../lib/localStore";
import { api } from "../../api/client";
import { API_ENABLED } from "../../api/hooks";
import {
  DAYS,
  DURATIONS,
  ENVIRONMENTS,
  EQUIPMENT,
  EXPERIENCE,
  GOALS,
  GOAL_LABELS,
  GOAL_TO_API,
  UNITS,
  WEEKDAYS,
} from "../../lib/profileOptions";
import { Section } from "../../components/settings/ui";
import { EditRow, Chip } from "../../components/settings/EditRow";
import type { ProfilePatch, TrainingLocation, UnitPreference } from "../../api/types";

/** Persist a profile change locally, and mirror the fields the API knows about. */
function persist(patch: Partial<Profile>) {
  saveProfile(patch);
  if (!API_ENABLED) return;
  const p: ProfilePatch = {};
  if (patch.goal != null) p.fitnessGoal = GOAL_TO_API[patch.goal];
  if (patch.experience != null) p.experienceLevel = patch.experience;
  if (patch.daysPerWeek != null) p.trainingFrequencyTarget = patch.daysPerWeek;
  if (patch.sessionMin != null) p.sessionLengthTargetMin = patch.sessionMin;
  if (patch.environment != null) p.trainingLocation = patch.environment as TrainingLocation;
  if (patch.units != null) p.unitPreference = (patch.units === "kg" ? "metric" : "imperial") as UnitPreference;
  if (Object.keys(p).length) void api.me.update(p).catch(() => {});
}

const toggle = <T,>(list: T[], v: T) =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

export default function TrainingProfile() {
  const { profile } = useFormaData();
  const u = profile.units;

  return (
    <div className="space-y-5">
      <Section
        title="training profile"
        description="edit any field directly — changes save as you make them. no need to redo setup."
      >
        <EditRow
          label="goal"
          value={profile.goal ? GOAL_LABELS[profile.goal] ?? profile.goal : "not set"}
        >
          {(close) => (
            <div className="flex flex-wrap gap-2">
              {GOALS.map((g) => (
                <Chip
                  key={g.id}
                  active={profile.goal === g.id}
                  onClick={() => {
                    persist({ goal: g.id });
                    close();
                  }}
                >
                  {g.label}
                </Chip>
              ))}
            </div>
          )}
        </EditRow>

        <EditRow label="experience" value={profile.experience ?? "not set"}>
          {(close) => (
            <div className="flex flex-col gap-2">
              {EXPERIENCE.map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    persist({ experience: e.id });
                    close();
                  }}
                  className={`focus-ring tactile rounded-2xl border p-3.5 text-left transition-colors ${
                    profile.experience === e.id
                      ? "border-[var(--accent-pink)] bg-[color-mix(in_srgb,var(--accent-pink)_12%,transparent)]"
                      : "border-white/[0.08] bg-white/[0.03] hover:border-white/20"
                  }`}
                >
                  <div className="text-[0.9rem] lowercase text-content-primary">{e.label}</div>
                  <div className="label-instrument mt-0.5 normal-case">{e.hint}</div>
                </button>
              ))}
            </div>
          )}
        </EditRow>

        <EditRow
          label="training frequency"
          value={profile.daysPerWeek ? `${profile.daysPerWeek} days / week` : "not set"}
        >
          {(close) => (
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <Chip
                  key={d}
                  active={profile.daysPerWeek === d}
                  onClick={() => {
                    persist({ daysPerWeek: d });
                    close();
                  }}
                >
                  {d} days
                </Chip>
              ))}
            </div>
          )}
        </EditRow>

        <EditRow
          label="session length"
          value={profile.sessionMin ? `${profile.sessionMin} min` : "not set"}
        >
          {(close) => (
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <Chip
                  key={d}
                  active={profile.sessionMin === d}
                  onClick={() => {
                    persist({ sessionMin: d });
                    close();
                  }}
                >
                  {d} min
                </Chip>
              ))}
            </div>
          )}
        </EditRow>

        <EditRow
          label="training environment"
          value={ENVIRONMENTS.find((e) => e.id === profile.environment)?.label ?? "not set"}
        >
          {(close) => (
            <div className="flex flex-wrap gap-2">
              {ENVIRONMENTS.map((e) => (
                <Chip
                  key={e.id}
                  active={profile.environment === e.id}
                  onClick={() => {
                    persist({ environment: e.id });
                    close();
                  }}
                >
                  {e.label}
                </Chip>
              ))}
            </div>
          )}
        </EditRow>

        <EditRow
          label="equipment"
          value={profile.equipment.length ? profile.equipment.join(", ") : "not set"}
        >
          {() => (
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT.map((eq) => (
                <Chip
                  key={eq}
                  active={profile.equipment.includes(eq)}
                  onClick={() => persist({ equipment: toggle(profile.equipment, eq) })}
                >
                  {eq}
                </Chip>
              ))}
            </div>
          )}
        </EditRow>

        <EditRow
          label="preferred training days"
          value={
            profile.preferredDays.length
              ? [...profile.preferredDays].sort((a, b) => a - b).map((d) => WEEKDAYS[d]).join(" · ")
              : "not set"
          }
        >
          {() => (
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d, i) => (
                <Chip
                  key={d}
                  active={profile.preferredDays.includes(i)}
                  onClick={() => persist({ preferredDays: toggle(profile.preferredDays, i) })}
                >
                  {d}
                </Chip>
              ))}
            </div>
          )}
        </EditRow>

        <EditRow label="injuries & limitations" value={profile.injuries || "none"}>
          {(close) => <InjuriesEditor value={profile.injuries} onDone={close} />}
        </EditRow>

        <EditRow label="units" value={u}>
          {(close) => (
            <div className="flex flex-wrap gap-2">
              {UNITS.map((unit) => (
                <Chip
                  key={unit}
                  active={u === unit}
                  onClick={() => {
                    persist({ units: unit });
                    close();
                  }}
                >
                  {unit}
                </Chip>
              ))}
            </div>
          )}
        </EditRow>

        <EditRow
          label="bodyweight"
          value={profile.bodyweight ? `${profile.bodyweight} ${u}` : "not logged"}
        >
          {(close) => <BodyweightEditor units={u} value={profile.bodyweight} onDone={close} />}
        </EditRow>
      </Section>

      <p className="text-[0.82rem] text-content-tertiary">
        want to start over?{" "}
        <Link to="/onboarding" className="focus-ring underline hover:text-content-secondary">
          redo full setup
        </Link>
      </p>
    </div>
  );
}

function InjuriesEditor({ value, onDone }: { value: string; onDone: () => void }) {
  const [text, setText] = useState(value);
  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="e.g. left shoulder — no heavy overhead pressing"
        className="focus-ring w-full resize-none rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-[0.9rem] text-content-primary outline-none placeholder:text-content-tertiary"
      />
      <button
        onClick={() => {
          persist({ injuries: text.trim() });
          onDone();
        }}
        className="focus-ring tactile mt-4 rounded-pill bg-white/[0.06] px-4 py-2 text-[0.82rem] lowercase text-content-primary hover:bg-white/[0.12]"
      >
        save
      </button>
    </div>
  );
}

function BodyweightEditor({
  units,
  value,
  onDone,
}: {
  units: string;
  value: number | null;
  onDone: () => void;
}) {
  const [raw, setRaw] = useState(value ? String(value) : "");
  return (
    <div>
      <div className="label-instrument mb-2">bodyweight ({units})</div>
      <input
        inputMode="decimal"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder={units === "kg" ? "80" : "178"}
        className="focus-ring w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5 text-[0.9rem] text-content-primary outline-none placeholder:text-content-tertiary"
      />
      <button
        onClick={() => {
          const n = Number.parseFloat(raw);
          persist({ bodyweight: Number.isFinite(n) && n > 0 ? n : null });
          onDone();
        }}
        className="focus-ring tactile mt-4 rounded-pill bg-white/[0.06] px-4 py-2 text-[0.82rem] lowercase text-content-primary hover:bg-white/[0.12]"
      >
        save
      </button>
    </div>
  );
}
