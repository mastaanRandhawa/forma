import { useEffect, useRef, useState } from "react";
import { Dumbbell } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { repdbFrames } from "../lib/repdb";

/**
 * ExerciseThumb — a RepDB illustration with graceful degradation: lazy-loaded,
 * square by default, a soft light skeleton until it paints (the illustrations
 * sit on pale blue, so a dark placeholder read as a hole), and a dumbbell
 * glyph fallback when there is no image or the fetch fails.
 *
 * Pass `name` to resolve the start and peak frames; the thumb then shows the
 * movement by crossfading between them — on hover / focus of its row
 * (`motion="hover"`, the default) or continuously (`"loop"`, for large
 * figures). Reduced-motion users always get the still start frame.
 *
 * `fill` makes it a responsive square block (used for the detail figures);
 * otherwise it is a fixed `size`px box (used for list thumbnails).
 */
export function ExerciseThumb({
  src,
  name,
  alt,
  size = 44,
  fill = false,
  motion = "hover",
  className = "",
}: {
  src?: string | null;
  name?: string;
  alt: string;
  size?: number;
  fill?: boolean;
  motion?: "hover" | "loop" | "none";
  className?: string;
}) {
  const frames = name ? repdbFrames(name) : { start: null, peak: null };
  const start = src ?? frames.start;
  const peak = frames.peak;
  const reduce = useReducedMotion();
  const [state, setState] = useState<"loading" | "ok" | "error">(start ? "loading" : "error");
  const [showPeak, setShowPeak] = useState(false);
  const [active, setActive] = useState(motion === "loop");
  const hostRef = useRef<HTMLSpanElement>(null);
  const animate = Boolean(peak) && !reduce && motion !== "none" && state === "ok";

  // hover / focus anywhere on the enclosing row or card starts the motion
  useEffect(() => {
    if (!animate || motion !== "hover") return;
    const target = hostRef.current?.closest("button, a, li, article, label") ?? hostRef.current;
    if (!target) return;
    const on = () => setActive(true);
    const off = () => setActive(false);
    // the pointer may already be over the row when the image finishes loading
    if (target.matches(":hover") || target.contains(document.activeElement)) on();
    target.addEventListener("pointerenter", on);
    target.addEventListener("pointerleave", off);
    target.addEventListener("focusin", on);
    target.addEventListener("focusout", off);
    return () => {
      target.removeEventListener("pointerenter", on);
      target.removeEventListener("pointerleave", off);
      target.removeEventListener("focusin", on);
      target.removeEventListener("focusout", off);
    };
  }, [animate, motion]);

  useEffect(() => {
    if (!animate || !active) {
      setShowPeak(false);
      return;
    }
    setShowPeak(true);
    const id = setInterval(() => setShowPeak((p) => !p), 900);
    return () => clearInterval(id);
  }, [animate, active]);

  const box = fill ? { width: "100%", aspectRatio: "1 / 1" } : { width: size, height: size };
  const glyph = fill ? 40 : size * 0.4;
  const img = "absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-out";

  return (
    <span
      ref={hostRef}
      className={`relative block shrink-0 overflow-hidden rounded-[var(--radius-small)] ${className}`}
      style={{ ...box, background: state === "error" ? undefined : "#e4f3fb" }}
      aria-hidden={state === "error"}
    >
      {state === "error" ? (
        <span className="surface-recessed flex h-full w-full items-center justify-center text-content-tertiary/60">
          <Dumbbell size={glyph} strokeWidth={1.75} />
        </span>
      ) : (
        <>
          {state === "loading" && <span className="absolute inset-0 animate-pulse bg-white/40" />}
          <img
            src={start ?? undefined}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={() => setState("ok")}
            onError={() => setState("error")}
            className={img}
            style={{ opacity: state === "ok" ? 1 : 0 }}
          />
          {peak && animate && (
            <img
              src={peak}
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              className={img}
              style={{ opacity: showPeak ? 1 : 0 }}
            />
          )}
        </>
      )}
    </span>
  );
}
