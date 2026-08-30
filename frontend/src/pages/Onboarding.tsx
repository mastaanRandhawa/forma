import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowLeft, Check, Activity, Dumbbell, HeartPulse, Moon, Scale, Sparkles } from "lucide-react";
import { AtmosphericBackground } from "../components/layout/AtmosphericBackground";

const EASE = [0.22, 1, 0.36, 1] as const;

const GOALS = [
  { id: "lose", label: "lose weight", icon: Scale },
  { id: "muscle", label: "build muscle", icon: Dumbbell },
  { id: "fitness", label: "improve fitness", icon: Activity },
  { id: "sleep", label: "improve sleep", icon: Moon },
  { id: "recovery", label: "improve recovery", icon: HeartPulse },
  { id: "maintain", label: "maintain health", icon: Sparkles },
];

const ACTIVITY = ["sedentary", "lightly active", "active", "very active"];
const FREQ = ["1–2", "3–4", "5–6", "daily"];
const DEVICES = ["Apple Health", "Garmin", "Fitbit", "WHOOP", "Oura", "Strava"];

export default function Onboarding() {
  const nav = useNavigate();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<string | null>(null);
  const [activity, setActivity] = useState<string | null>(null);
  const [freq, setFreq] = useState<string | null>(null);
  const [device, setDevice] = useState<string | null>(null);

  const steps = ["goal", "about you", "training", "device", "done"];
  const canNext =
    (step === 0 && goal) ||
    (step === 1 && activity) ||
    (step === 2 && freq) ||
    step === 3 ||
    step === 4;

  const next = () => (step < 4 ? setStep(step + 1) : nav("/dashboard"));
  const back = () => setStep(Math.max(0, step - 1));

  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      <AtmosphericBackground />

      <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col px-5 py-8">
        {/* progress */}
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
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
          step {Math.min(step + 1, 5)} of 5 · {steps[step]}
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
                    a little about you
                  </h1>
                  <div className="mt-6 grid grid-cols-3 gap-2.5">
                    {[
                      ["age", "29"],
                      ["height", "5'11\""],
                      ["weight", "178 lb"],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5">
                        <div className="label-instrument">{k}</div>
                        <div className="metric-numeral mt-1 text-[1.1rem] text-content-primary">{v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 label-instrument">activity level</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ACTIVITY.map((a) => (
                      <button
                        key={a}
                        onClick={() => setActivity(a)}
                        className={`focus-ring rounded-pill border px-3.5 py-1.5 text-[0.8rem] lowercase transition-colors ${
                          activity === a
                            ? "border-[var(--accent-pink)] text-content-primary"
                            : "border-white/10 text-content-tertiary hover:text-content-secondary"
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h1 className="text-[1.7rem] font-light lowercase leading-tight text-content-primary">
                    how often do you train?
                  </h1>
                  <p className="mt-2 text-[0.9rem] text-content-secondary">sessions per week</p>
                  <div className="mt-5 grid grid-cols-4 gap-2.5">
                    {FREQ.map((f) => (
                      <button
                        key={f}
                        onClick={() => setFreq(f)}
                        className={`focus-ring tactile rounded-2xl border py-4 text-center transition-colors ${
                          freq === f
                            ? "border-[var(--accent-pink)] bg-[color-mix(in_srgb,var(--accent-pink)_12%,transparent)]"
                            : "border-white/[0.08] bg-white/[0.03] hover:border-white/20"
                        }`}
                      >
                        <span className="metric-numeral text-[1.05rem] text-content-primary">{f}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <h1 className="text-[1.7rem] font-light lowercase leading-tight text-content-primary">
                    connect a device
                  </h1>
                  <p className="mt-2 text-[0.9rem] text-content-secondary">
                    optional — pulls in sleep, HRV and steps automatically. you can do this later.
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-2.5">
                    {DEVICES.map((d) => (
                      <button
                        key={d}
                        onClick={() => setDevice(device === d ? null : d)}
                        className={`focus-ring tactile flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                          device === d
                            ? "border-[var(--accent-cyan)] bg-[color-mix(in_srgb,var(--accent-cyan)_10%,transparent)]"
                            : "border-white/[0.08] bg-white/[0.03] hover:border-white/20"
                        }`}
                      >
                        <span className="text-[0.86rem] text-content-primary">{d}</span>
                        {device === d && <Check size={14} strokeWidth={2.5} className="text-[var(--accent-cyan)]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 4 && (
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
                    your dashboard is ready
                  </h1>
                  <p className="mx-auto mt-2 max-w-[36ch] text-[0.9rem] text-content-secondary">
                    tuned to {GOALS.find((g) => g.id === goal)?.label ?? "your goals"}
                    {device ? ` and synced with ${device}` : ""}. you can change any of this in settings.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* nav */}
        <div className="flex items-center justify-between">
          {step > 0 && step < 4 ? (
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
            {step === 3 && (
              <button
                onClick={next}
                className="focus-ring text-[0.85rem] lowercase text-content-tertiary transition-colors hover:text-content-secondary"
              >
                skip
              </button>
            )}
            <button
              onClick={next}
              disabled={!canNext}
              className="focus-ring tactile inline-flex items-center gap-2 rounded-pill py-2.5 pl-6 pr-2.5 text-[0.9rem] font-medium text-[var(--fill-on-color)] disabled:opacity-40"
              style={{ background: "var(--fill-coral)" }}
            >
              {step === 4 ? "enter forma" : "continue"}
              <span className="grid h-7 w-7 place-items-center rounded-pill bg-[rgba(255,250,248,0.22)]">
                <ArrowRight size={14} strokeWidth={2.25} />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
