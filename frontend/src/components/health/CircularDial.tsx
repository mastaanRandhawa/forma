import { useCallback, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./RadialMetric";

type Props = {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (v: number) => void;
  size?: number;
  label: string;
  /** formats the value for the accessible text + optional center display */
  format?: (v: number) => string;
  icon?: React.ReactNode;
  className?: string;
};

/**
 * CircularDial — tactile control inspired by physical wellness devices.
 * Recessed outer track, floating raised core, radial indicator tick, drag +
 * full keyboard support, spring-eased visual response.
 */
export function CircularDial({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  size = 168,
  label,
  format = (v) => String(Math.round(v)),
  icon,
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const reduce = usePrefersReducedMotion();
  const frac = (value - min) / (max - min);
  const sweep = 0.75;
  const angle = (frac * sweep + (1 - sweep) / 2) * 360; // open-bottom

  const setFromPoint = useCallback(
    (clientX: number, clientY: number) => {
      const el = ref.current;
      if (!el || !onChange) return;
      const rect = el.getBoundingClientRect();
      const dx = clientX - (rect.left + rect.width / 2);
      const dy = clientY - (rect.top + rect.height / 2);
      let a = Math.atan2(dy, dx) * (180 / Math.PI) + 90; // 0 at top
      if (a < 0) a += 360;
      // map the 270° active arc (opening centered at bottom = 180..-180 wrap)
      let norm = (a - (1 - sweep) * 180) / (sweep * 360);
      norm = Math.max(0, Math.min(1, norm));
      const raw = min + norm * (max - min);
      const snapped = Math.round(raw / step) * step;
      onChange(Math.max(min, Math.min(max, snapped)));
    },
    [min, max, step, onChange, sweep]
  );

  const onKey = (e: React.KeyboardEvent) => {
    if (!onChange) return;
    const big = step * 10;
    let next = value;
    if (["ArrowUp", "ArrowRight"].includes(e.key)) next = value + step;
    else if (["ArrowDown", "ArrowLeft"].includes(e.key)) next = value - step;
    else if (e.key === "PageUp") next = value + big;
    else if (e.key === "PageDown") next = value - big;
    else if (e.key === "Home") next = min;
    else if (e.key === "End") next = max;
    else return;
    e.preventDefault();
    onChange(Math.max(min, Math.min(max, next)));
  };

  const stroke = Math.max(5, size * 0.028);
  const r = size / 2 - stroke * 1.6;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;

  return (
    <div
      ref={ref}
      className={`relative select-none focus-ring rounded-full ${className}`}
      style={{ width: size, height: size, touchAction: "none" }}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={format(value)}
      onKeyDown={onKey}
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        setDragging(true);
        setFromPoint(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => dragging && setFromPoint(e.clientX, e.clientY)}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
    >
      {/* recessed outer track */}
      <div className="absolute inset-0 rounded-full surface-recessed" />
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
        style={{ transform: "rotate(135deg)" }}
      >
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circ * sweep} ${circ}`}
        />
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="var(--accent-pink)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circ * sweep * frac} ${circ}`}
          style={{
            filter: "drop-shadow(0 0 8px rgba(213,26,122,0.55))",
            transition: reduce ? "none" : "stroke-dasharray 320ms var(--ease-spring-soft)",
          }}
        />
      </svg>

      {/* raised floating core */}
      <div
        className="absolute rounded-full surface-raised grid place-items-center"
        style={{
          inset: stroke * 3,
          boxShadow: dragging
            ? "var(--shadow-press)"
            : "var(--shadow-raised)",
          transition: reduce ? "none" : "box-shadow 200ms var(--ease-luxury), transform 200ms var(--ease-luxury)",
          transform: dragging ? "scale(0.985)" : "scale(1)",
        }}
      >
        <div className="text-center">
          {icon && <div className="text-content-secondary mb-1 grid place-items-center">{icon}</div>}
          <div className="metric-numeral text-content-primary" style={{ fontSize: size * 0.2 }}>
            {format(value)}
          </div>
        </div>
      </div>

      {/* radial indicator thumb on the track */}
      <div
        className="absolute left-1/2 top-1/2 origin-left"
        style={{
          transform: `rotate(${angle}deg) translateX(${r}px)`,
          transition: reduce || dragging ? "none" : "transform 320ms var(--ease-spring-soft)",
        }}
      >
        <div className="surface-float" style={{ width: stroke * 2.2, height: stroke * 2.2, marginLeft: -stroke * 1.1, marginTop: -stroke * 1.1 }} />
      </div>
    </div>
  );
}
