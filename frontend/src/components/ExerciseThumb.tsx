import { useState } from "react";
import { Dumbbell } from "lucide-react";

/**
 * ExerciseThumb — a RepDB illustration with graceful degradation: lazy-loaded,
 * square by default, a soft skeleton until it paints, and a dumbbell glyph
 * fallback when there is no image or the fetch fails.
 *
 * `fill` makes it a responsive square block (used for the detail figures);
 * otherwise it is a fixed `size`px box (used for list thumbnails).
 */
export function ExerciseThumb({
  src,
  alt,
  size = 44,
  fill = false,
  className = "",
}: {
  src: string | null | undefined;
  alt: string;
  size?: number;
  fill?: boolean;
  className?: string;
}) {
  const [state, setState] = useState<"loading" | "ok" | "error">(src ? "loading" : "error");
  const box = fill ? { width: "100%", aspectRatio: "1 / 1" } : { width: size, height: size };
  const glyph = fill ? 40 : size * 0.4;

  return (
    <span
      className={`relative block shrink-0 overflow-hidden rounded-[var(--radius-small)] surface-recessed ${className}`}
      style={box}
      aria-hidden={state === "error"}
    >
      {state === "error" ? (
        <span className="flex h-full w-full items-center justify-center text-content-tertiary/60">
          <Dumbbell size={glyph} strokeWidth={1.75} />
        </span>
      ) : (
        <>
          {state === "loading" && <span className="absolute inset-0 animate-pulse bg-white/[0.04]" />}
          <img
            src={src ?? undefined}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={() => setState("ok")}
            onError={() => setState("error")}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
            style={{ opacity: state === "ok" ? 1 : 0, background: "#1a0f16" }}
          />
        </>
      )}
    </span>
  );
}
