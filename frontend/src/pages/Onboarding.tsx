import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowLeft, Check, Activity, Dumbbell, HeartPulse, Moon, Scale, Sparkles } from "lucide-react";
import { AtmosphericBackground } from "../components/layout/AtmosphericBackground";
import { saveProfile, type Environment, type Experience, type Units } from "../lib/localStore";
import { todayPlan } from "../lib/program";
import { api } from "../api/client";
import { API_ENABLED } from "../api/hooks";
import { useAuth } from "../api/auth";
import type { FitnessGoal, TrainingLocation, ProfilePatch } from "../api/types";

type BiologicalSex = NonNullable<ProfilePatch["biologicalSex"]>;

const GOAL_TO_API: Record<string, FitnessGoal> = {
  lose: "lose_fat",
  muscle: "build_muscle",
  strength: "get_stronger",
  fitness: "general_fitness",
  sleep: "general_fitness",
  maintain: "maintain",
};

const EASE = [0.22, 1, 0.36, 1] as const;

const GOALS = [
  { id: "lose", label: "lose fat", icon: Scale },
  { id: "muscle", label: "build muscle", icon: Dumbbell },
  { id: "strength", label: "get stronger", icon: Activity },
  { id: "fitness", label: "general fitness", icon: HeartPulse },
  { id: "sleep", label: "sleep & recovery", icon: Moon },
  { id: "maintain", label: "maintain", icon: Sparkles },
];

const EXPERIENCE: { id: Experience; label: string; hint: string }[] = [
  { id: "beginner", label: "beginner", hint: "new, or back after a long break" },
  { id: "intermediate", label: "intermediate", hint: "training consistently for 6+ months" },
  { id: "advanced", label: "advanced", hint: "years of structured training" },
];

const DAYS = [2, 3, 4, 5, 6];
const DURATIONS = [30, 45, 60, 75];
const ENVIRONMENTS: { id: Environment; label: string }[] = [
  { id: "gym", label: "full gym" },
  { id: "home", label: "home setup" },
  { id: "both", label: "both" },
];
const EQUIPMENT = ["Barbell", "Dumbbells", "Machines", "Cables", "Kettlebell", "Bands", "Pull-up bar", "Bodyweight only"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STEPS = ["goal", "baseline", "environment", "safety", "schedule", "basics", "ready"] as const;

const SEXES: { id: BiologicalSex; label: string }[] = [
  { id: "female", label: "female" },
  { id: "male", label: "male" },
  { id: "other", label: "other" },
  { id: "prefer_not_to_say", label: "prefer not to say" },
];

const LB_TO_KG = 0.453592;
const IN_TO_CM = 2.54;

export default function Onboarding() {
  const nav = useNavigate();
  const reduce = useReducedMotion();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [goal, setGoal] = useState<string | null>(null);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [daysPerWeek, setDaysPerWeek] = useState<number | null>(null);
  const [sessionMin, setSessionMin] = useState<number | null>(45);
  const [units, setUnits] = useState<Units>("lb");
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [injuries, setInjuries] = useState("");
  const [preferredDays, setPreferredDays] = useState<number[]>([]);
  const [bodyweight, setBodyweight] = useState("");
  const [heightPrimary, setHeightPrimary] = useState(""); // cm, or feet when units === "lb"
  const [heightInches, setHeightInches] = useState(""); // only when units === "lb"
  const [birthYear, setBirthYear] = useState("");
  const [sex, setSex] = useState<BiologicalSex | null>(null);

  const plan = useMemo(() => todayPlan(), []);
  const nextTrainingDay = useMemo(() => {
    if (!preferredDays.length) return "your next session";
    const dow = new Date().getDay();
    const sorted = [...preferredDays].sort((a, b) => a - b);
    const next = sorted.find((d) => d > dow) ?? sorted[0];
    return next === (dow + 1) % 7 ? "tomorrow" : WEEKDAYS[next];
  }, [preferredDays]);

  const canNext =
    (step === 0 && goal) ||
    (step === 1 && experience && daysPerWeek && sessionMin) ||
    (step === 2 && environment) ||
    step === 3 ||
    (step === 4 && preferredDays.length > 0) ||
    step === 5 ||
    step === 6;

  const finish = async () => {
    const bwNum = Number.parseFloat(bodyweight);
    const bw = Number.isFinite(bwNum) && bwNum > 0 ? bwNum : null;
    const weightKg = bw == null ? undefined : units === "lb" ? bw * LB_TO_KG : bw;

    let heightCm: number | undefined;
    if (units === "lb") {
      const ft = Number.parseFloat(heightPrimary);
      const inch = Number.parseFloat(heightInches) || 0;
      if (Number.isFinite(ft) && ft > 0) heightCm = (ft * 12 + inch) * IN_TO_CM;
    } else {
      const cm = Number.parseFloat(heightPrimary);
      if (Number.isFinite(cm) && cm > 0) heightCm = cm;
    }

    const yr = Number.parseInt(birthYear, 10);
    const nowYear = new Date().getFullYear();
    const dateOfBirth =
      Number.isFinite(yr) && yr >= 1900 && yr <= nowYear ? `${yr}-01-01` : undefined;

    saveProfile({
      goal,
      experience,
      daysPerWeek,
      sessionMin,
      units,
      environment,
      equipment,
      injuries: injuries.trim(),
      preferredDays,
      bodyweight: bw,
    });

    if (API_ENABLED) {
      setSubmitting(true);
      setSubmitError(null);
      try {
        await api.me.onboarding({
          fitnessGoal: goal ? GOAL_TO_API[goal] : undefined,
          experienceLevel: experience ?? undefined,
          trainingLocation: (environment as TrainingLocation | null) ?? undefined,
          unitPreference: units === "kg" ? "metric" : "imperial",
          trainingFrequencyTarget: daysPerWeek ?? undefined,
          sessionLengthTargetMin: sessionMin ?? undefined,
          equipmentKeys: equipment.length ? equipment : undefined,
          injuries: injuries.trim() ? [{ tag: injuries.trim() }] : undefined,
          weightKg: weightKg == null ? undefined : Math.round(weightKg * 10) / 10,
          heightCm: heightCm == null ? undefined : Math.round(heightCm),
          dateOfBirth,
          biologicalSex: sex ?? undefined,
        });
        await refreshUser();
      } catch (e) {
        setSubmitting(false);
        setSubmitError(e instanceof Error ? e.message : "Couldn't save your setup. Try again.");
        return;
      }
    }
    nav("/dashboard");
  };

  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : void finish());
  const back = () => setStep(Math.max(0, step - 1));

  const toggle = <T,>(list: T[], v: T, set: (l: T[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const chip = (active: boolean) =>
    `focus-ring tactile rounded-pill border px-3.5 py-1.5 text-[0.8rem] lowercase transition-colors ${
      active
        ? "border-[var(--accent-pink)] bg-[color-mix(in_srgb,var(--accent-pink)_12%,transparent)] text-content-primary"
        : "border-white/10 text-content-tertiary hover:text-content-secondary"
    }`;

  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      <AtmosphericBackground />

      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-5 py-8">
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className="h-1 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-[var(--accent-pink)]"
                  initial={false}
                  animate={{ width: i < step ? "100%" : i === step ? "45%" : "0%" }}
                  transition={{ duration: 0.4, ease: EASE }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 label-instrument">
          step {step + 1} of {STEPS.length} · {STEPS[step]}
        </div>

        <div className="flex flex-1 flex-col justify-center py-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
              transition={{ duration: 0.28, ease: EASE }}
            >
              {step === 0 && (
                <>
                  <h1 className="text-[1.7rem] font-light lowercase leading-tight text-content-primary">
                    what's your primary goal?
                  </h1>
                  <p className="mt-2 text-[0.9rem] text-content-secondary">pick one — it shapes your program.</p>
                  <div className="mt-6 grid grid-cols-2 gap-2.5">
                    {GOALS.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => setGoal(id)}
                        className={`focus-ring tactile flex flex-col gap-2.5 rounded-2xl border p-4 text-left transition-colors ${
                          goal === id
                            ? "border-[var(--accent-pink)] bg-[color-mix(in_srgb,var(--accent-pink)_12%,transparent)]"
                            : "border-white/[0.08] bg-white/[0.03] hover:border-white/20"
                        }`}
                      >
                        <Icon size={18} strokeWidth={1.75} className="text-[var(--accent-pink)]" />
                        <span className="text-[0.88rem] lowercase text-content-primary">{label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <h1 className="text-[1.7rem] font-light lowercase leading-tight text-content-primary">
                    your training baseline
                  </h1>
                  <div className="mt-6 label-instrument">experience</div>
                  <div className="mt-2 flex flex-col gap-2">
                    {EXPERIENCE.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => setExperience(e.id)}
                        className={`focus-ring tactile rounded-2xl border p-3.5 text-left transition-colors ${
                          experience === e.id
                            ? "border-[var(--accent-pink)] bg-[color-mix(in_srgb,var(--accent-pink)_12%,transparent)]"
                            : "border-white/[0.08] bg-white/[0.03] hover:border-white/20"
                        }`}
                      >
                        <div className="text-[0.9rem] lowercase text-content-primary">{e.label}</div>
                        <div className="label-instrument mt-0.5 normal-case">{e.hint}</div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 label-instrument">training days per week</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DAYS.map((d) => (
                      <button key={d} onClick={() => setDaysPerWeek(d)} className={chip(daysPerWeek === d)}>
                        {d}
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 label-instrument">session length</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DURATIONS.map((d) => (
                      <button key={d} onClick={() => setSessionMin(d)} className={chip(sessionMin === d)}>
                        {d} min
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 label-instrument">units</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["lb", "kg"] as Units[]).map((u) => (
                      <button key={u} onClick={() => setUnits(u)} className={chip(units === u)}>
                        {u}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h1 className="text-[1.7rem] font-light lowercase leading-tight text-content-primary">
                    where do you train?
                  </h1>
                  <p className="mt-2 text-[0.9rem] text-content-secondary">this picks which exercises you'll see.</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {ENVIRONMENTS.map((e) => (
                      <button key={e.id} onClick={() => setEnvironment(e.id)} className={chip(environment === e.id)}>
                        {e.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-5 label-instrument">available equipment</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {EQUIPMENT.map((eq) => (
                      <button
                        key={eq}
                        onClick={() => toggle(equipment, eq, setEquipment)}
                        className={chip(equipment.includes(eq))}
                      >
                        {eq}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <h1 className="text-[1.7rem] font-light lowercase leading-tight text-content-primary">
                    anything to work around?
                  </h1>
                  <p className="mt-2 text-[0.9rem] text-content-secondary">
                    injuries, limitations, or lifts to avoid. optional — skip if nothing applies.
                  </p>
                  <textarea
                    value={injuries}
                    onChange={(e) => setInjuries(e.target.value)}
                    rows={4}
                    placeholder="e.g. left shoulder — no heavy overhead pressing"
                    className="focus-ring mt-5 w-full resize-none rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-[0.9rem] text-content-primary outline-none placeholder:text-content-tertiary"
                  />
                </>
              )}

              {step === 4 && (
                <>
                  <h1 className="text-[1.7rem] font-light lowercase leading-tight text-content-primary">
                    which days work best?
                  </h1>
                  <p className="mt-2 text-[0.9rem] text-content-secondary">
                    pick {daysPerWeek ?? "a few"} — we'll schedule your sessions around them.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {WEEKDAYS.map((d, i) => (
                      <button
                        key={d}
                        onClick={() => toggle(preferredDays, i, setPreferredDays)}
                        className={chip(preferredDays.includes(i))}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 5 && (
                <>
                  <h1 className="text-[1.7rem] font-light lowercase leading-tight text-content-primary">
                    the basics
                  </h1>
                  <p className="mt-2 text-[0.9rem] text-content-secondary">
                    sets your starting point for weight, strength and recovery targets. optional — skip
                    if you'd rather not.
                  </p>

                  <div className="mt-6 label-instrument">bodyweight ({units})</div>
                  <input
                    inputMode="decimal"
                    value={bodyweight}
                    onChange={(e) => setBodyweight(e.target.value)}
                    placeholder={units === "kg" ? "80" : "178"}
                    className="focus-ring mt-2 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5 text-[0.9rem] text-content-primary outline-none placeholder:text-content-tertiary"
                  />

                  <div className="mt-5 label-instrument">height</div>
                  {units === "lb" ? (
                    <div className="mt-2 flex gap-2">
                      <input
                        inputMode="numeric"
                        value={heightPrimary}
                        onChange={(e) => setHeightPrimary(e.target.value)}
                        placeholder="5"
                        aria-label="height feet"
                        className="focus-ring w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5 text-[0.9rem] text-content-primary outline-none placeholder:text-content-tertiary"
                      />
                      <input
                        inputMode="numeric"
                        value={heightInches}
                        onChange={(e) => setHeightInches(e.target.value)}
                        placeholder="10 in"
                        aria-label="height inches"
                        className="focus-ring w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5 text-[0.9rem] text-content-primary outline-none placeholder:text-content-tertiary"
                      />
                    </div>
                  ) : (
                    <input
                      inputMode="numeric"
                      value={heightPrimary}
                      onChange={(e) => setHeightPrimary(e.target.value)}
                      placeholder="178 cm"
                      aria-label="height in centimetres"
                      className="focus-ring mt-2 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5 text-[0.9rem] text-content-primary outline-none placeholder:text-content-tertiary"
                    />
                  )}

                  <div className="mt-5 label-instrument">year of birth</div>
                  <input
                    inputMode="numeric"
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    placeholder="1995"
                    className="focus-ring mt-2 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5 text-[0.9rem] text-content-primary outline-none placeholder:text-content-tertiary"
                  />

                  <div className="mt-5 label-instrument">biological sex</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {SEXES.map((s) => (
                      <button key={s.id} onClick={() => setSex(s.id)} className={chip(sex === s.id)}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 6 && (
                <div className="text-center">
                  <motion.span
                    className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full"
                    style={{ background: "color-mix(in srgb, var(--accent-lime) 18%, transparent)" }}
                    initial={reduce ? { opacity: 1 } : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  >
                    <Check size={26} strokeWidth={2.5} className="text-[var(--accent-lime)]" />
                  </motion.span>
                  <h1 className="text-[1.7rem] font-light lowercase leading-tight text-content-primary">
                    your first week is ready
                  </h1>
                  <p className="mx-auto mt-2 max-w-[40ch] text-[0.9rem] text-content-secondary">
                    {daysPerWeek ?? 4} sessions a week, tuned to{" "}
                    {GOALS.find((g) => g.id === goal)?.label ?? "your goal"}. first up:{" "}
                    <span className="text-content-primary">{plan.name.toLowerCase()}</span>, {nextTrainingDay}.
                  </p>
                  <div className="mx-auto mt-5 max-w-[36ch] rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-left">
                    <div className="label-instrument">{plan.name.toLowerCase()}</div>
                    <ul className="mt-2 space-y-1 text-[0.84rem] text-content-secondary">
                      {plan.exercises.slice(0, 4).map((e) => (
                        <li key={e.name}>{e.name}</li>
                      ))}
                      {plan.exercises.length > 4 && <li className="label-instrument">+{plan.exercises.length - 4} more</li>}
                    </ul>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between">
          {step > 0 && step < STEPS.length - 1 ? (
            <button
              onClick={back}
              className="focus-ring flex items-center gap-1.5 text-[0.85rem] lowercase text-content-tertiary transition-colors hover:text-content-secondary"
            >
              <ArrowLeft size={15} strokeWidth={2} /> back
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            {(step === 3 || step === 5) && (
              <button
                onClick={next}
                className="focus-ring text-[0.85rem] lowercase text-content-tertiary transition-colors hover:text-content-secondary"
              >
                skip
              </button>
            )}
            <button
              onClick={next}
              disabled={!canNext || submitting}
              className="focus-ring tactile inline-flex items-center gap-2 rounded-pill py-2.5 pl-6 pr-2.5 text-[0.9rem] font-medium text-[var(--fill-on-color)] disabled:opacity-40"
              style={{ background: "var(--fill-coral)" }}
            >
              {step === STEPS.length - 1 ? (submitting ? "saving…" : "enter forma") : "continue"}
              <span className="grid h-7 w-7 place-items-center rounded-pill bg-[rgba(255,250,248,0.22)]">
                <ArrowRight size={14} strokeWidth={2.25} />
              </span>
            </button>
          </div>
        </div>
        {submitError && (
          <p role="alert" className="mt-3 text-right text-[0.8rem] text-[var(--accent-pink)]">{submitError}</p>
        )}
      </div>
    </div>
  );
}
