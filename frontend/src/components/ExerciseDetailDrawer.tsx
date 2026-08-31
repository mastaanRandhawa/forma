import { DetailDrawer } from "./dashboard/DetailDrawer";
import { ExerciseThumb } from "./ExerciseThumb";
import { repdbImage, type RepDbCatalogEntry } from "../lib/repdb";

/**
 * ExerciseDetailDrawer — the deep-dive for one exercise, reusing the app's
 * bottom-sheet. Every section is conditional: nothing renders a "none" / "N/A"
 * row. Start + peak illustrations sit side by side when both exist.
 */
export function ExerciseDetailDrawer({
  exercise,
  onClose,
}: {
  exercise: RepDbCatalogEntry | null;
  onClose: () => void;
}) {
  const e = exercise;
  const start = repdbImage(e?.imgStart);
  const end = repdbImage(e?.imgEnd);

  const chips = [
    e?.equipment,
    cap(e?.difficulty),
    cap(e?.mechanic),
    e?.force && e.force !== "static" && e.force !== "dynamic" ? cap(e.force) : null,
    e?.bodyweight ? "Bodyweight" : null,
    e?.unilateral ? "Unilateral" : null,
  ].filter(Boolean) as string[];

  return (
    <DetailDrawer open={Boolean(e)} onClose={onClose} title={e?.name ?? ""} eyebrow={e?.bodyPart}>
      {e && (
        <div className="space-y-6">
          {(start || end) && (
            <div className="flex gap-3">
              {start && <Figure src={start} label={end ? "start" : undefined} alt={`${e.name} — start position`} />}
              {end && <Figure src={end} label="peak" alt={`${e.name} — peak position`} />}
            </div>
          )}

          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <span key={c} className="label-instrument rounded-pill surface-recessed px-3 py-1">
                  {c.toLowerCase()}
                </span>
              ))}
            </div>
          )}

          {e.description && (
            <p className="text-[0.92rem] leading-relaxed text-content-secondary">{e.description}</p>
          )}

          <MuscleRow label="primary muscles" muscles={e.primary} tone="var(--accent-pink)" />
          <MuscleRow label="secondary muscles" muscles={e.secondary} tone="var(--accent-mauve)" />

          {e.instructions.length > 0 && (
            <Section title="instructions">
              <ol className="space-y-2">
                {e.instructions.map((step, i) => (
                  <li key={i} className="flex gap-3 text-[0.9rem] leading-relaxed text-content-secondary">
                    <span className="label-instrument shrink-0 pt-0.5 !text-[0.7rem] text-content-tertiary">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {e.tips.length > 0 && (
            <Section title="form tips">
              <ul className="space-y-1.5">
                {e.tips.map((t, i) => (
                  <li key={i} className="flex gap-2 text-[0.9rem] leading-relaxed text-content-secondary">
                    <span aria-hidden style={{ color: "var(--accent-cyan)" }}>
                      ·
                    </span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {(e.goals.length > 0 || e.met != null) && (
            <div className="label-instrument flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--line-soft)] pt-4">
              {e.goals.length > 0 && <span>best for: {e.goals.join(", ")}</span>}
              {e.met != null && <span>{e.met} MET</span>}
            </div>
          )}
        </div>
      )}
    </DetailDrawer>
  );
}

const cap = (s: string | null | undefined) => (s ? s[0].toUpperCase() + s.slice(1) : null);

function Figure({ src, label, alt }: { src: string; label?: string; alt: string }) {
  return (
    <figure className="flex-1">
      <ExerciseThumb src={src} alt={alt} fill />
      {label && <figcaption className="label-instrument mt-1 text-center">{label}</figcaption>}
    </figure>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="label-soft mb-2 lowercase">{title}</h3>
      {children}
    </section>
  );
}

function MuscleRow({ label, muscles, tone }: { label: string; muscles: string[]; tone: string }) {
  if (muscles.length === 0) return null;
  return (
    <div>
      <h3 className="label-soft mb-2 lowercase">{label}</h3>
      <div className="flex flex-wrap gap-1.5">
        {muscles.map((m) => (
          <span
            key={m}
            className="rounded-pill px-3 py-1 text-[0.8rem] lowercase"
            style={{ background: `color-mix(in srgb, ${tone} 14%, transparent)`, color: tone }}
          >
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}
