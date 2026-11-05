import { useEffect, useRef, useState } from "react";
import { Dumbbell } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { repdbFrames, repdbImage, repdbRemoteImage } from "../lib/repdb";

/**
 * ExerciseThumb — a cut-out RepDB figure on a lit stage, with graceful
 * degradation: lazy-loaded, square by default, a soft skeleton until it paints,
 * RepDB's own copy if ours is missing (a checkout without `npm run images:sync`),
 * and a dumbbell glyph when there is no image at all.
 *
 * Give it `file` / `peakFile` from a catalog entry, or a free-text `name` to look
 * them up. With two frames the thumb shows the movement by crossfading between
 * them — on hover / focus of its row (`motion="hover"`, the default) or
 * continuously (`"loop"`, for large figures). Reduced-motion users always get the
 * still start frame.
 *
 * Sizing: `fill` is a responsive square block (the detail figures), `"parent"`
 * fills a positioned parent of any shape, and otherwise it is a fixed `size`px box.
 */
export function ExerciseThumb({
  file,
  peakFile,
  name,
  alt,
  size = 44,
  fill = false,
  motion = "hover",
  className = "",
}: {
  file?: string | null;
  peakFile?: string | null;
  name?: string;
  alt: string;
  size?: number;
  fill?: boolean | "parent";
  motion?: "hover" | "loop" | "none";
  className?: string;
}) {
  const named = name && !file ? repdbFrames(name) : null;
  const startFile = file ?? named?.file ?? null;
  const peak = file ? (peakFile ?? null) : (named?.peakFile ?? null);
  const imageSize = fill || size > 96 ? "full" : "thumb";

  const reduce = useReducedMotion();
  const [state, setState] = useState<"loading" | "ok" | "error">(startFile ? "loading" : "error");
  const [remote, setRemote] = useState(false);
  const [peakReady, setPeakReady] = useState(false);
  const [peakPhase, setPeakPhase] = useState(true);
  const [active, setActive] = useState(motion === "loop");
  const [peakWanted, setPeakWanted] = useState(motion === "loop");
  const hostRef = useRef<HTMLSpanElement>(null);

  // a reused thumb (the workout HUD moving to the next exercise) starts over
  const [seen, setSeen] = useState(startFile);
  if (seen !== startFile) {
    setSeen(startFile);
    setState(startFile ? "loading" : "error");
    setRemote(false);
    setPeakReady(false);
  }

  const animate = Boolean(peak) && !reduce && motion !== "none" && state === "ok";
  const url = (f: string) => (remote ? repdbRemoteImage(f) : repdbImage(f, imageSize));

  // hover / focus anywhere on the enclosing row or card starts the motion
  useEffect(() => {
    if (!animate || motion !== "hover") return;
    const target = hostRef.current?.closest("button, a, li, article, label") ?? hostRef.current;
    if (!target) return;
    const on = () => {
      setActive(true);
      setPeakWanted(true);
    };
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

  const looping = animate && active && peakReady;
  useEffect(() => {
    if (!looping) return;
    const id = setInterval(() => setPeakPhase((p) => !p), 900);
    return () => clearInterval(id);
  }, [looping]);
  const showPeak = looping && peakPhase;

  const box = fill === "parent" ? undefined : fill ? { width: "100%", aspectRatio: "1 / 1" } : { width: size, height: size };
  const glyph = fill ? 40 : size * 0.4;
  const frame = "absolute inset-0 h-full w-full object-contain transition-opacity duration-500 ease-out";
  const shape = fill === "parent" ? "absolute inset-0" : "relative rounded-[var(--radius-small)]";

  return (
    <span
      ref={hostRef}
      className={`block shrink-0 overflow-hidden ${shape} ${state === "error" ? "" : "exercise-stage"} ${className}`}
      style={box}
      aria-hidden={state === "error"}
    >
      {state === "error" || !startFile ? (
        <span className="surface-recessed flex h-full w-full items-center justify-center text-content-tertiary/60">
          <Dumbbell size={glyph} strokeWidth={1.75} />
        </span>
      ) : (
        <>
          {state === "loading" && <span className="absolute inset-0 animate-pulse bg-white/10" />}
          {/* the frames are transparent, so the start frame must fade out as the peak fades in */}
          <img
            src={url(startFile)}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={() => setState("ok")}
            onError={() => (remote ? setState("error") : setRemote(true))}
            className={frame}
            style={{ opacity: state === "ok" && !showPeak ? 1 : 0 }}
          />
          {peak && animate && peakWanted && (
            <img
              src={url(peak)}
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              onLoad={() => setPeakReady(true)}
              className={frame}
              style={{ opacity: showPeak ? 1 : 0 }}
            />
          )}
        </>
      )}
    </span>
  );
}
