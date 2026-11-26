import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowLeft, Check, Gauge, Leaf, type LucideIcon } from "lucide-react";
import { AtmosphericBackground } from "../components/layout/AtmosphericBackground";
import { saveProfile, type Environment, type Experience, type Units } from "../lib/localStore";
import { todayPlan } from "../lib/program";
import {
  GOALS,
  GOAL_TO_API,
  EXPERIENCE,
  DAYS,
  DAYS_HINT,
  DURATIONS,
  ENVIRONMENTS,
  EQUIPMENT,
  COACH_STYLES,
  HEALTH_AREAS,
  WEEKDAYS,
  LB_TO_KG,
  IN_TO_CM,
} from "../lib/profileOptions";
import { api } from "../api/client";
import { API_ENABLED } from "../api/hooks";
import { useAuth } from "../api/auth";
import { useSettings } from "../api/settings";
import type { Equipment, TrainingLocation, ProfilePatch } from "../api/types";

type BiologicalSex = NonNullable<ProfilePatch["biologicalSex"]>;

const EASE = [0.22, 1, 0.36, 1] as const;

const STEPS = [
  { id: "goal", label: "goal" },
  { id: "experience", label: "experience" },
  { id: "schedule", label: "schedule" },
  { id: "place", label: "where you train" },
  { id: "health", label: "health" },
  { id: "about", label: "about you" },
  { id: "coach", label: "coaching" },
  { id: "review", label: "review" },
] as const;
const LAST = STEPS.length - 1;
/** steps that can be skipped */
const OPTIONAL = new Set([4, 5, 6]);

const SEXES: { id: BiologicalSex; label: string }[] = [
  { id: "female", label: "female" },
  { id: "male", label: "male" },
  { id: "other", label: "other" },
  { id: "prefer_not_to_say", label: "prefer not to say" },
];

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

const field =
  "focus-ring w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5 text-[0.9rem] text-content-primary outline-none placeholder:text-content-tertiary";

const chip = (active: boolean) =>
  `focus-ring tactile rounded-pill border px-3.5 py-1.5 text-[0.8rem] lowercase transition-colors ${
    active
      ? "border-[var(--accent-pink)] bg-[color-mix(in_srgb,var(--accent-pink)_12%,transparent)] text-content-primary"
      : "border-white/10 text-content-tertiary hover:text-content-secondary"
  }`;

/** A tappable answer: icon, title, a line of help, and a clear selected state. */
function Choice({
  icon: Icon,
  title,
  hint,
  active,
  onClick,
  tile,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  active: boolean;
  onClick: () => void;
  tile?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`focus-ring tactile rounded-2xl border p-3.5 text-left transition-colors ${
        tile ? "flex flex-col gap-2.5 p-4" : "flex items-center gap-3.5"
      } ${
        active
          ? "border-[var(--accent-pink)] bg-[color-mix(in_srgb,var(--accent-pink)_12%,transparent)]"
          : "border-white/[0.08] bg-white/[0.03] hover:border-white/20"
      }`}
    >
      {Icon ? (
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
          style={{ background: active ? "color-mix(in srgb, var(--accent-pink) 24%, transparent)" : "rgba(255,255,255,0.06)" }}
        >
          <Icon size={17} strokeWidth={1.75} className={active ? "text-[var(--accent-pink)]" : "text-content-secondary"} />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-[0.92rem] lowercase text-content-primary">{title}</span>
        {hint ? <span className="mt-0.5 block text-[0.8rem] leading-snug text-content-tertiary">{hint}</span> : null}
      </span>
      {!tile ? (
        <span
          aria-hidden
          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
            active ? "border-transparent bg-[var(--accent-pink)]" : "border-white/25"
          }`}
        >
          {active ? <Check size={12} strokeWidth={3} className="text-white" /> : null}
        </span>
      ) : null}
    </button>
  );
}

function Heading({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <>
      <h1 className="text-[1.7rem] font-light lowercase leading-tight text-content-primary">{title}</h1>
      {sub ? <p className="mt-2 text-[0.9rem] text-content-secondary">{sub}</p> : null}
    </>
  );
}

const Group = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="mt-6">
    <div className="label-instrument">{label}</div>
    <div className="mt-2">{children}</div>
  </div>
);

export default function Onboarding() {
  const nav = useNavigate();
  const reduce = useReducedMotion();
  const { refreshUser, user } = useAuth();
  const { update: updateSettings } = useSettings();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [goal, setGoal] = useState<string | null>(null);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [daysPerWeek, setDaysPerWeek] = useState<number | null>(null);
  const [sessionMin, setSessionMin] = useState<number | null>(45);
  const [preferredDays, setPreferredDays] = useState<number[]>([]);
  const [mondayStart, setMondayStart] = useState(false);
  const [units, setUnits] = useState<Units>("lb");
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [equipmentAll, setEquipmentAll] = useState<Array<{ key: string; name: string }>>(
    EQUIPMENT.map((e) => ({ key: e, name: e })),
  );
  const [equipment, setEquipment] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [injuryNote, setInjuryNote] = useState("");
  const [bodyweight, setBodyweight] = useState("");
  const [heightPrimary, setHeightPrimary] = useState(""); // cm, or feet when units === "lb"
  const [heightInches, setHeightInches] = useState(""); // only when units === "lb"
  const [birthYear, setBirthYear] = useState("");
  const [sex, setSex] = useState<BiologicalSex | null>(null);
  const [coach, setCoach] = useState("steady");
  const [calm, setCalm] = useState(false);

  // with a backend, equipment answers are saved by key, so use the server's list
  useEffect(() => {
    if (!API_ENABLED) return;
    api.me
      .equipment()
      .then((l: Array<Equipment & { owned: boolean }>) => l.length && setEquipmentAll(l.map((e) => ({ key: e.key, name: e.name.toLowerCase() }))))
      .catch(() => {});
  }, []);

  const plan = useMemo(() => todayPlan(), []);
  const nextTrainingDay = useMemo(() => {
    if (!preferredDays.length) return "your next session";
    const dow = new Date().getDay();
    const sorted = [...preferredDays].sort((a, b) => a - b);
    const next = sorted.find((d) => d > dow) ?? sorted[0];
    return next === (dow + 1) % 7 ? "tomorrow" : WEEKDAYS[next];
  }, [preferredDays]);

  const goalInfo = GOALS.find((g) => g.id === goal);
  const canNext = [
    !!goal,
    !!experience,
    !!daysPerWeek && !!sessionMin && preferredDays.length > 0,
    !!environment,
    true,
    true,
    true,
    true,
  ][step];

  const pickEnvironment = (id: Environment) => {
    setEnvironment(id);
    // a full gym has everything: save a dozen taps
    if (id === "gym" && !equipment.length) setEquipment(equipmentAll.map((e) => e.key));
  };

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
    const dateOfBirth = Number.isFinite(yr) && yr >= 1900 && yr <= nowYear ? `${yr}-01-01` : undefined;

    const note = injuryNote.trim();
    // areas become named injuries; a note rides on the first one. A note with no area stays a free-text entry.
    const injuries = areas.length
      ? areas.map((a, i) => ({ tag: a.toLowerCase(), ...(i === 0 && note ? { note } : {}) }))
      : note
        ? [{ tag: note }]
        : undefined;

    saveProfile({
      goal,
      experience,
      daysPerWeek,
      sessionMin,
      units,
      environment,
      equipment,
      injuries: [...areas.map((a) => a.toLowerCase()), note].filter(Boolean).join(", "),
      preferredDays,
      bodyweight: bw,
    });

    setSubmitting(true);
    setSubmitError(null);
    try {
      if (API_ENABLED) {
        await api.me.onboarding({
          fitnessGoal: goal ? GOAL_TO_API[goal] : undefined,
          experienceLevel: experience ?? undefined,
          trainingLocation: (environment as TrainingLocation | null) ?? undefined,
          unitPreference: units === "kg" ? "metric" : "imperial",
          weekStartsMonday: mondayStart,
          trainingFrequencyTarget: daysPerWeek ?? undefined,
          sessionLengthTargetMin: sessionMin ?? undefined,
          equipmentKeys: equipment.length ? equipment : undefined,
          injuries,
          weightKg: weightKg == null ? undefined : Math.round(weightKg * 10) / 10,
          heightCm: heightCm == null ? undefined : Math.round(heightCm),
          dateOfBirth,
          biologicalSex: sex ?? undefined,
          trainer: COACH_STYLES.find((c) => c.id === coach)?.v,
          experience: { calmMode: calm },
        });
      }
      // the server only applies "calm" when it creates your settings, and the app has usually fetched them by now: set it explicitly
      if (calm) await updateSettings({ disclosure: { mode: "on_interaction" } }).catch(() => {});
      if (API_ENABLED) await refreshUser();
      nav("/dashboard");
    } catch (e) {
      setSubmitting(false);
      setSubmitError(e instanceof Error ? e.message : "Couldn't save your setup. Try again.");
    }
  };

  const next = () => (step < LAST ? setStep(step + 1) : void finish());
  const back = () => setStep(Math.max(0, step - 1));

  const wUnit = units === "kg" ? "kg" : "lb";
  const recap = [
    { step: 0, label: "goal", value: goalInfo?.label ?? "—" },
    { step: 1, label: "experience", value: experience ?? "—" },
    {
      step: 2,
      label: "schedule",
      value: `${daysPerWeek ?? "—"} days a week · ${sessionMin ?? "—"} min · ${
        [...preferredDays].sort((a, b) => a - b).map((d) => WEEKDAYS[d]).join(", ") || "no days picked"
      }`,
    },
    {
      step: 3,
      label: "where you train",
      value: `${ENVIRONMENTS.find((e) => e.id === environment)?.label ?? "—"}${equipment.length ? ` · ${equipment.length} equipment` : ""}`,
    },
    { step: 4, label: "work around", value: areas.length ? areas.join(", ").toLowerCase() : injuryNote.trim() || "nothing" },
    {
      step: 5,
      label: "about you",
      value:
        [
          bodyweight && `${bodyweight} ${wUnit}`,
          heightPrimary && (units === "lb" ? `${heightPrimary}'${heightInches || 0}"` : `${heightPrimary} cm`),
          birthYear && `born ${birthYear}`,
        ]
          .filter(Boolean)
          .join(" · ") || "skipped",
    },
    {
      step: 6,
      label: "coaching",
      value: `${COACH_STYLES.find((c) => c.id === coach)?.name} · ${calm ? "calm dashboard" : "full dashboard"}`,
    },
  ];

  const slide = {
    initial: reduce ? { opacity: 0 } : { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: reduce ? { opacity: 0 } : { opacity: 0, x: -24 },
    transition: { duration: 0.28, ease: EASE },
  } as const;

  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      <AtmosphericBackground />

      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-5 py-8">
        <div
          className="flex items-center gap-1.5"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          aria-label="onboarding progress"
        >
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex-1">
              <div className="h-1 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-[var(--accent-pink)]"
                  initial={false}
                  animate={{ width: i < step ? "100%" : i === step ? "50%" : "0%" }}
                  transition={{ duration: 0.4, ease: EASE }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 label-instrument">
          step {step + 1} of {STEPS.length} · {STEPS[step].label}
        </div>

        <div className="flex flex-1 flex-col justify-center overflow-x-clip py-8">
          <AnimatePresence mode="wait">
            <motion.div key={step} {...slide}>
              {step === 0 && (
                <>
                  <Heading title="what's your main goal?" sub="pick one. it shapes your program and what kai coaches." />
                  <div role="radiogroup" className="mt-6 grid grid-cols-2 gap-2.5 [&>*:last-child:nth-child(odd)]:col-span-2">
                    {GOALS.map((g) => (
                      <Choice key={g.id} tile icon={g.icon} title={g.label} hint={g.hint} active={goal === g.id} onClick={() => setGoal(g.id)} />
                    ))}
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <Heading title="how experienced are you?" sub="be honest. it sets your starting weights and how fast we progress." />
                  <div role="radiogroup" className="mt-6 flex flex-col gap-2.5">
                    {EXPERIENCE.map((e) => (
                      <Choice key={e.id} icon={e.icon} title={e.label} hint={e.help} active={experience === e.id} onClick={() => setExperience(e.id)} />
                    ))}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <Heading title="build your week" sub={experience ? `${DAYS_HINT[experience]}.` : "how often, how long, and on which days."} />
                  <Group label="days per week">
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map((d) => (
                        <button key={d} onClick={() => setDaysPerWeek(d)} className={chip(daysPerWeek === d)}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </Group>
                  <Group label="session length">
                    <div className="flex flex-wrap gap-2">
                      {DURATIONS.map((d) => (
                        <button key={d} onClick={() => setSessionMin(d)} className={chip(sessionMin === d)}>
                          {d} min
                        </button>
                      ))}
                    </div>
                  </Group>
                  <Group label="which days work best">
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map((d, i) => (
                        <button key={d} onClick={() => setPreferredDays(toggle(preferredDays, i))} className={chip(preferredDays.includes(i))}>
                          {d}
                        </button>
                      ))}
                    </div>
                    {daysPerWeek && preferredDays.length > 0 && preferredDays.length !== daysPerWeek ? (
                      <p className="mt-2 label-instrument normal-case">
                        {preferredDays.length < daysPerWeek
                          ? `you picked ${preferredDays.length} of ${daysPerWeek} days. we'll fit the rest around them.`
                          : `that's more than ${daysPerWeek} days, so we'll use the ones that fit best.`}
                      </p>
                    ) : null}
                  </Group>
                  <Group label="week starts on">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setMondayStart(false)} className={chip(!mondayStart)}>sunday</button>
                      <button onClick={() => setMondayStart(true)} className={chip(mondayStart)}>monday</button>
                    </div>
                  </Group>
                </>
              )}

              {step === 3 && (
                <>
                  <Heading title="where do you train?" sub="this picks which exercises you'll see." />
                  <div role="radiogroup" className="mt-6 flex flex-col gap-2.5">
                    {ENVIRONMENTS.map((e) => (
                      <Choice key={e.id} icon={e.icon} title={e.label} hint={e.hint} active={environment === e.id} onClick={() => pickEnvironment(e.id)} />
                    ))}
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <div className="label-instrument">
                      equipment · {equipment.length} of {equipmentAll.length}
                    </div>
                    <button
                      onClick={() => setEquipment(equipment.length === equipmentAll.length ? [] : equipmentAll.map((e) => e.key))}
                      className="focus-ring text-[0.78rem] lowercase text-[var(--accent-pink)]"
                    >
                      {equipment.length === equipmentAll.length ? "clear" : "select all"}
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {equipmentAll.map((eq) => (
                      <button key={eq.key} onClick={() => setEquipment(toggle(equipment, eq.key))} className={chip(equipment.includes(eq.key))}>
                        {eq.name}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <Heading
                    title="anything to work around?"
                    sub="tap any area that's sore, injured or off limits. kai will check in on these. skip if nothing applies."
                  />
                  <div className="mt-6 flex flex-wrap gap-2">
                    {HEALTH_AREAS.map((a) => (
                      <button key={a} onClick={() => setAreas(toggle(areas, a))} className={chip(areas.includes(a))}>
                        {a.toLowerCase()}
                      </button>
                    ))}
                  </div>
                  <Group label="anything else? (optional)">
                    <textarea
                      value={injuryNote}
                      onChange={(e) => setInjuryNote(e.target.value)}
                      rows={3}
                      placeholder="e.g. no heavy overhead pressing, past acl surgery"
                      className={`${field} resize-none`}
                    />
                  </Group>
                </>
              )}

              {step === 5 && (
                <>
                  <Heading title="a few basics" sub="optional. helps forma size your loads, calories and recovery targets." />
                  <Group label="units">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setUnits("lb")} className={chip(units === "lb")}>pounds, feet</button>
                      <button onClick={() => setUnits("kg")} className={chip(units === "kg")}>kilograms, cm</button>
                    </div>
                  </Group>
                  <Group label={`bodyweight (${wUnit})`}>
                    <input
                      inputMode="decimal"
                      value={bodyweight}
                      onChange={(e) => setBodyweight(e.target.value)}
                      placeholder={units === "kg" ? "80" : "178"}
                      className={field}
                    />
                  </Group>
                  <Group label="height">
                    {units === "lb" ? (
                      <div className="flex gap-2">
                        <input inputMode="numeric" value={heightPrimary} onChange={(e) => setHeightPrimary(e.target.value)} placeholder="5 ft" aria-label="height feet" className={field} />
                        <input inputMode="numeric" value={heightInches} onChange={(e) => setHeightInches(e.target.value)} placeholder="10 in" aria-label="height inches" className={field} />
                      </div>
                    ) : (
                      <input inputMode="numeric" value={heightPrimary} onChange={(e) => setHeightPrimary(e.target.value)} placeholder="178 cm" aria-label="height in centimetres" className={field} />
                    )}
                  </Group>
                  <Group label="year of birth">
                    <input inputMode="numeric" maxLength={4} value={birthYear} onChange={(e) => setBirthYear(e.target.value)} placeholder="1995" className={field} />
                  </Group>
                  <Group label="biological sex">
                    <div className="flex flex-wrap gap-2">
                      {SEXES.map((s) => (
                        <button key={s.id} onClick={() => setSex(s.id)} className={chip(sex === s.id)}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </Group>
                </>
              )}

              {step === 6 && (
                <>
                  <Heading title="how should kai coach you?" sub="you can change this anytime in settings or on the trainer screen." />
                  <div role="radiogroup" className="mt-6 flex flex-col gap-2.5">
                    {COACH_STYLES.map((c) => (
                      <Choice key={c.id} icon={c.icon} title={c.name} hint={c.line} active={coach === c.id} onClick={() => setCoach(c.id)} />
                    ))}
                  </div>
                  <Group label="how should forma feel?">
                    <div role="radiogroup" className="flex flex-col gap-2.5">
                      <Choice icon={Gauge} title="full" hint="every number and chart, all features from day one." active={!calm} onClick={() => setCalm(false)} />
                      <Choice icon={Leaf} title="calm" hint="details appear when you tap or scroll to them. features unlock as you train." active={calm} onClick={() => setCalm(true)} />
                    </div>
                  </Group>
                </>
              )}

              {step === 7 && (
                <div>
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
                      you're set{user?.name ? `, ${user.name.split(" ")[0].toLowerCase()}` : ""}
                    </h1>
                    <p className="mx-auto mt-2 max-w-[44ch] text-[0.9rem] text-content-secondary">
                      {daysPerWeek ?? 4} sessions a week, tuned to {goalInfo?.label ?? "your goal"}. first up:{" "}
                      <span className="text-content-primary">{plan.name.toLowerCase()}</span>, {nextTrainingDay}.
                    </p>
                  </div>
                  <ul className="mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                    {recap.map((r, i) => (
                      <li key={r.label} className={i ? "border-t border-white/[0.06]" : ""}>
                        <button onClick={() => setStep(r.step)} className="focus-ring flex w-full items-center gap-3 px-4 py-3 text-left" aria-label={`edit ${r.label}`}>
                          <span className="min-w-0 flex-1">
                            <span className="label-instrument block">{r.label}</span>
                            <span className="block truncate text-[0.9rem] lowercase text-content-primary">{r.value}</span>
                          </span>
                          <span className="text-[0.78rem] lowercase text-[var(--accent-pink)]">edit</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between">
          {step > 0 ? (
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
            {OPTIONAL.has(step) && (
              <button
                onClick={next}
                className="focus-ring text-[0.85rem] lowercase text-content-tertiary transition-colors hover:text-content-secondary"
              >
                skip for now
              </button>
            )}
            <button
              onClick={next}
              disabled={!canNext || submitting}
              className="focus-ring tactile inline-flex items-center gap-2 rounded-pill py-2.5 pl-6 pr-2.5 text-[0.9rem] font-medium text-[var(--fill-on-color)] disabled:opacity-40"
              style={{ background: "var(--fill-coral)" }}
            >
              {step === LAST ? (submitting ? "saving…" : "enter forma") : "continue"}
              <span className="grid h-7 w-7 place-items-center rounded-pill bg-[rgba(255,250,248,0.22)]">
                <ArrowRight size={14} strokeWidth={2.25} />
              </span>
            </button>
          </div>
        </div>
        {submitError && (
          <p role="alert" className="mt-3 text-right text-[0.8rem] text-[var(--accent-pink)]">
            {submitError}
          </p>
        )}
      </div>
    </div>
  );
}
