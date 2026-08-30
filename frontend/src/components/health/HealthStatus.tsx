import { ReactNode } from "react";

type Tone = "good" | "steady" | "caution" | "rest";

const TONE: Record<Tone, { dot: string; word: string }> = {
  good: { dot: "var(--status-good)", word: "text-content-primary" },
  steady: { dot: "var(--status-steady)", word: "text-content-primary" },
  caution: { dot: "var(--status-caution)", word: "text-content-primary" },
  rest: { dot: "var(--status-rest)", word: "text-content-primary" },
};

/**
 * HealthStatus — compact, calm top-level state. Not a card.
 * Phrase + minimal indicator + optional context copy.
 */
export function HealthStatus({
  phrase,
  tone = "steady",
  context,
  className = "",
}: {
  phrase: string;
  tone?: Tone;
  context?: ReactNode;
  className?: string;
}) {
  const t = TONE[tone];
  return (
    <div className={`flex flex-col items-center gap-2 text-center ${className}`}>
      <span className="inline-flex items-center gap-2.5 surface-glass rounded-pill px-4 py-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: t.dot, boxShadow: `0 0 10px ${t.dot}` }}
        />
        <span className={`text-[0.9rem] font-medium lowercase tracking-[0.01em] ${t.word}`}>
          {phrase}
        </span>
      </span>
      {context && (
        <p className="text-[0.82rem] leading-relaxed text-content-secondary max-w-[46ch]">
          {context}
        </p>
      )}
    </div>
  );
}
