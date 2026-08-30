import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plus, Dumbbell, Scale, Droplets, Check } from "lucide-react";
import { DetailDrawer } from "../dashboard/DetailDrawer";
import { addQuickLog, useFormaData } from "../../lib/localStore";

const EASE = [0.22, 1, 0.36, 1] as const;

type Action = { id: string; label: string; icon: typeof Dumbbell; unit: string; placeholder: string };

/** Floating quick-action menu. Hidden on the active-workout and onboarding views. */
export function QuickActions() {
  const reduce = useReducedMotion();
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { profile } = useFormaData();
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState<Action | null>(null);
  const [val, setVal] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const ACTIONS: Action[] = [
    { id: "workout", label: "start workout", icon: Dumbbell, unit: "", placeholder: "" },
    { id: "weight", label: "log weight", icon: Scale, unit: profile.units, placeholder: profile.units === "kg" ? "80" : "178" },
    { id: "water", label: "add water", icon: Droplets, unit: "oz", placeholder: "16" },
  ];

  if (pathname.startsWith("/workouts/active") || pathname.startsWith("/onboarding")) return null;

  const save = () => {
    if (!sheet) return;
    if (sheet.id === "workout") {
      setSheet(null);
      nav("/workouts");
      return;
    }
    const num = Number(val.replace(",", "."));
    if (!Number.isNaN(num) && num > 0) {
      addQuickLog(sheet.id === "weight" ? "bodyweight" : "water", num, sheet.unit);
      setToast(`${sheet.label.replace("log ", "").replace("add ", "")} saved`);
    }
    setSheet(null);
    setVal("");
    setTimeout(() => setToast(null), 2200);
  };

  return (
    <>
      <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-2 sm:bottom-7 sm:right-7">
        <AnimatePresence>
          {open &&
            ACTIONS.map((a, i) => (
              <motion.button
                key={a.id}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.9 }}
                transition={{ duration: 0.16, ease: EASE, delay: reduce ? 0 : i * 0.035 }}
                onClick={() => {
                  setOpen(false);
                  if (a.id === "workout") nav("/workouts");
                  else setSheet(a);
                }}
                className="focus-ring tactile flex items-center gap-2.5 rounded-pill border border-white/10 bg-[rgba(24,13,20,0.94)] py-2 pl-3.5 pr-4 text-[0.84rem] lowercase text-content-primary shadow-[0_16px_36px_-14px_rgba(0,0,0,0.6)] backdrop-blur-md"
              >
                <a.icon size={15} strokeWidth={1.9} className="text-[var(--accent-pink)]" />
                {a.label}
              </motion.button>
            ))}
        </AnimatePresence>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close quick actions" : "Quick actions"}
          aria-expanded={open}
          className="focus-ring tactile grid place-items-center rounded-full text-[var(--fill-on-color)] shadow-[0_18px_40px_-12px_rgba(213,26,122,0.5)]"
          style={{ background: "var(--fill-coral)", height: 52, width: 52 }}
        >
          <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2, ease: EASE }}>
            <Plus size={22} strokeWidth={2.25} />
          </motion.span>
        </button>
      </div>

      <DetailDrawer
        open={!!sheet}
        onClose={() => setSheet(null)}
        eyebrow="quick log"
        title={sheet?.label ?? ""}
      >
        {sheet && (
          <div>
            <div className="flex items-end gap-3">
              <input
                autoFocus
                inputMode="decimal"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                placeholder={sheet.placeholder}
                className="focus-ring w-32 border-b border-white/15 bg-transparent pb-1 text-[2.4rem] font-medium tabular-nums text-content-primary outline-none placeholder:text-content-tertiary"
                style={{ fontFamily: "'Space Grotesk', monospace" }}
              />
              <span className="metric-card__unit mb-2">{sheet.unit}</span>
            </div>
            <div className="mt-6 flex gap-2.5">
              <button
                onClick={save}
                disabled={!val}
                className="focus-ring tactile inline-flex items-center gap-2 rounded-pill px-5 py-2.5 text-[0.88rem] font-medium text-[var(--fill-on-color)] disabled:opacity-40"
                style={{ background: "var(--fill-coral)" }}
              >
                <Check size={15} strokeWidth={2.5} /> save
              </button>
              <button
                onClick={() => setSheet(null)}
                className="focus-ring rounded-pill px-5 py-2.5 text-[0.88rem] lowercase text-content-tertiary transition-colors hover:text-content-secondary"
              >
                cancel
              </button>
            </div>
          </div>
        )}
      </DetailDrawer>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="fixed bottom-5 left-1/2 z-[75] flex -translate-x-1/2 items-center gap-2 rounded-pill border border-white/10 bg-[rgba(24,13,20,0.96)] px-4 py-2.5 text-[0.85rem] lowercase text-content-primary shadow-[0_16px_40px_-14px_rgba(0,0,0,0.6)] backdrop-blur-md"
          >
            <Check size={14} strokeWidth={2.5} className="text-[var(--accent-lime)]" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
