import { useRef, useState } from "react";
import { Check } from "lucide-react";

/**
 * A settings switch. Controlled only — the parent owns the value and persists it.
 * After a change the switch flashes a subtle "saved" pill so every toggle in the
 * app confirms persistence the same way (review §8). No global Save button.
 */
export function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const timer = useRef<number>();

  const toggle = async () => {
    if (disabled) return;
    await onChange(!checked);
    setSaved(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <span className="min-w-0">
        <span className="block text-[0.92rem] text-content-primary lowercase">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-[0.8rem] leading-snug text-content-tertiary">{hint}</span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span
          aria-hidden
          className={`label-instrument inline-flex items-center gap-1 transition-opacity duration-200 ${
            saved ? "opacity-100" : "opacity-0"
          }`}
          style={{ color: "var(--accent-lime)" }}
        >
          <Check size={11} strokeWidth={3} /> saved
        </span>
        <button
          onClick={toggle}
          role="switch"
          aria-checked={checked}
          aria-label={label}
          disabled={disabled}
          className="focus-ring disabled:opacity-40"
        >
          <span
            className="relative block h-6 w-11 rounded-pill transition-colors surface-recessed"
            style={
              checked
                ? { background: "var(--accent-pink)", boxShadow: "0 0 16px -2px rgba(213,26,122,0.6)" }
                : undefined
            }
          >
            <span
              className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full surface-float"
              style={{
                transform: checked ? "translateX(20px)" : "translateX(0)",
                transition: "transform 200ms var(--ease-luxury)",
              }}
            />
          </span>
        </button>
      </span>
    </div>
  );
}
