import { CSSProperties } from "react";

/** A single shimmering placeholder box. */
export function Skel({
  className = "",
  style,
  round = false,
}: {
  className?: string;
  style?: CSSProperties;
  round?: boolean;
}) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ ...style, ...(round ? { borderRadius: 999 } : null) }}
      aria-hidden
    />
  );
}

/** A stack of text-line placeholders; the last line is shorter. */
export function SkelText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skel
          key={i}
          className="h-3.5"
          style={{ width: i === lines - 1 ? "58%" : "100%", borderRadius: 6 }}
        />
      ))}
    </div>
  );
}
