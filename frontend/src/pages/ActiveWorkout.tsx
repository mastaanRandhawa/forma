import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { InstrumentReadout } from "../components/InstrumentReadout";
import { Reveal } from "../components/Reveal";
import { Button } from "../components/primitives";
import { activeSession } from "../lib/data";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function ActiveWorkout() {
  const [handoff, setHandoff] = useState(false);
  const reduce = useReducedMotion();

  return (
    <div className="mx-auto max-w-[1120px]">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="label-instrument mb-2">
            active session · {activeSession.elapsed}
          </div>
          <h1 className="text-title text-content-primary lowercase">{activeSession.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setHandoff(true)}>
            camera mode
          </Button>
          <Link to="/workouts">
            <Button variant="ghost">finish</Button>
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Reveal className="space-y-4">
          {activeSession.exercises.map((ex) => (
            <div
              key={ex.name}
              className={`surface-soft p-5 sm:p-6 ${
                ex.current ? "ring-1 ring-[var(--accent-pink)]/40" : ""
              }`}
              style={
                ex.current
                  ? { boxShadow: "var(--shadow-soft), 0 0 50px -12px rgba(213,26,122,0.4)" }
                  : undefined
              }
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-[1rem] text-content-primary lowercase">{ex.name}</h3>
                  <div className="label-instrument mt-0.5">{ex.target}</div>
                </div>
                {ex.done && (
                  <span className="label-instrument" style={{ color: "var(--accent-lime)" }}>
                    ✓ done
                  </span>
                )}
              </div>

              {ex.sets.length > 0 && (
                <table className="w-full text-[0.88rem]">
                  <thead>
                    <tr className="text-left">
                      {["set", "weight", "reps", "rpe"].map((h) => (
                        <th key={h} className="label-instrument py-1 font-normal">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {ex.sets.map((s, i) => (
                      <tr key={i} className="border-t border-[var(--line-soft)]">
                        <td className="py-2 text-content-tertiary">{i + 1}</td>
                        <td className="py-2 text-content-primary">{s.w ?? "—"}</td>
                        <td className="py-2 text-content-primary">{s.r ?? "—"}</td>
                        <td className="py-2 text-content-tertiary">{s.rpe ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {ex.current && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button className="!px-4 !py-2 !text-[0.8rem]">log set</Button>
                  <Button variant="ghost" className="!px-4 !py-2 !text-[0.8rem]">
                    rest timer
                  </Button>
                  <Button
                    variant="ghost"
                    className="!px-4 !py-2 !text-[0.8rem]"
                    onClick={() => setHandoff(true)}
                  >
                    track with camera
                  </Button>
                </div>
              )}
            </div>
          ))}
        </Reveal>

        <Reveal as="aside" onView delay={0.08} className="space-y-8">
          <div className="surface-recessed flex flex-col items-center rounded-hero p-6">
            <div className="label-soft lowercase">total volume</div>
            <div className="my-3">
              <InstrumentReadout
                value={activeSession.totalVolume.toLocaleString()}
                identity="pink"
                dot={6}
                gap={2.5}
              />
            </div>
            <div className="label-instrument">pounds moved this session</div>
          </div>

          <div>
            <div className="label-soft lowercase">trainer</div>
            <p className="mt-3 text-[0.92rem] leading-relaxed text-content-secondary">
              Bench top set slowed on the last two reps, which is expected at week 4.
              Keep Cable Fly strict, no bouncing at the bottom.
            </p>
          </div>
        </Reveal>
      </div>

      <AnimatePresence>
        {handoff && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(16,10,17,0.72)] p-4 backdrop-blur-sm"
          onClick={() => setHandoff(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          <motion.div
            className="w-full max-w-md surface-glass rounded-shell p-8 text-center"
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.26, ease: EASE }}
          >
            <h2 className="text-heading text-content-primary lowercase">continue on your phone</h2>
            <p className="mx-auto mt-2 max-w-[38ch] text-[0.9rem] text-content-secondary">
              Camera coaching needs a phone propped up where it can see your full body. Scan
              this and we'll pick up right where you left off.
            </p>
            <div className="mx-auto my-6 h-44 w-44 rounded-[var(--radius-medium)] bg-[var(--text-primary)] p-3">
              <div
                className="h-full w-full"
                style={{
                  backgroundImage:
                    "repeating-conic-gradient(#170D17 0% 25%, #FFF9FC 0% 50%)",
                  backgroundSize: "16px 16px",
                }}
              />
            </div>
            <div className="label-instrument mb-6 break-all" style={{ color: "var(--accent-cyan)" }}>
              forma.app/s/8fK2-Q1x9
            </div>
            <Button variant="ghost" onClick={() => setHandoff(false)}>
              keep logging here instead
            </Button>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
