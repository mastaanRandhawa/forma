import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CountUp } from "../health/CountUp";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * JarvisOrb — the dashboard's centrepiece. A circular ambient readout: a
 * progress ring for the readiness score, two slow counter-rotating scan rings,
 * a breathing core, and orbiting particles. Tap to open the score breakdown.
 * All motion collapses to static under prefers-reduced-motion.
 */
export function JarvisOrb({
  value,
  label = "readiness",
  caption,
  onSelect,
  size = 268,
}: {
  value: number;
  label?: string;
  caption?: string;
  onSelect?: () => void;
  size?: number;
}) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const ringRef = useRef<SVGCircleElement>(null);

  const stroke = 3;
  const r = size / 2 - 18;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, value / 100));

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const dash = reduce || !mounted ? c * frac : c * frac;
  const offset = reduce || mounted ? c - c * frac : c;

  const Wrap = onSelect ? "button" : "div";

  return (
    <div className="relative mx-auto grid place-items-center" style={{ width: size, height: size }}>
      {/* ambient glow */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(213,26,122,0.45), rgba(122,23,79,0.12) 45%, transparent 72%)",
        }}
        animate={reduce ? undefined : { scale: [1, 1.08, 1], opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* counter-rotating scan rings */}
      <div
        aria-hidden
        className={`orb-ring absolute rounded-full border border-white/[0.09] ${reduce ? "" : "orb-spin-slow"}`}
        style={{ inset: 8 }}
      />
      <div
        aria-hidden
        className={`orb-ring absolute rounded-full border border-dashed border-white/[0.13] ${reduce ? "" : "orb-spin-rev"}`}
        style={{ inset: 26 }}
      />

      {/* orbiting particles — ride the outer scan ring */}
      {!reduce && (
        <div aria-hidden className="orb-spin-mid absolute inset-0 grid place-items-center">
          {[0, 130, 245].map((deg) => (
            <span
              key={deg}
              className="absolute h-1.5 w-1.5 rounded-full"
              style={{
                background: "var(--accent-pink)",
                boxShadow: "0 0 10px var(--accent-pink)",
                transform: `rotate(${deg}deg) translateY(-${r + 2}px)`,
              }}
            />
          ))}
        </div>
      )}

      {/* progress ring */}
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          ref={ringRef}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent-pink)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          strokeDashoffset={reduce ? 0 : offset}
          style={{
            filter: "drop-shadow(0 0 6px var(--accent-pink))",
            transition: reduce ? "none" : "stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </svg>

      {/* breathing core + centre content */}
      <motion.div
        className="absolute grid place-items-center rounded-full"
        style={{
          inset: 40,
          background:
            "radial-gradient(circle at 50% 38%, rgba(255,244,250,0.1), rgba(29,15,25,0.55) 60%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
        }}
        animate={reduce ? undefined : { scale: [1, 1.035, 1] }}
        transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <Wrap
          {...(onSelect ? { type: "button" as const, onClick: onSelect } : {})}
          className="focus-ring grid place-items-center rounded-full text-center"
          style={{ width: "78%", height: "78%" }}
          aria-label={onSelect ? `${label} ${value} of 100, open breakdown` : undefined}
        >
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
          >
            <div className="label-instrument !text-[0.62rem]">{label}</div>
            <CountUp
              value={value}
              className="metric-numeral mt-1 block text-content-primary"
              style={{ fontSize: size * 0.28 }}
            />
            {caption && (
              <div className="mt-1 max-w-[16ch] text-[0.72rem] leading-tight text-content-secondary">
                {caption}
              </div>
            )}
          </motion.div>
        </Wrap>
      </motion.div>
    </div>
  );
}
