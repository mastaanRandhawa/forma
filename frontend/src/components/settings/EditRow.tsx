import { useState, type ReactNode } from "react";
import { DetailDrawer } from "../dashboard/DetailDrawer";
import { Row } from "./ui";

/**
 * A settings row that opens a focused editor in a bottom sheet. The editor
 * (`children`) persists changes itself — typically autosaving on selection — and
 * calls `close()` when done.
 */
export function EditRow({
  label,
  value,
  eyebrow,
  children,
}: {
  label: string;
  value: ReactNode;
  eyebrow?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Row label={label} value={value} onClick={() => setOpen(true)} />
      <DetailDrawer
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        eyebrow={eyebrow ?? "edit"}
      >
        {children(() => setOpen(false))}
      </DetailDrawer>
    </>
  );
}

/** Chip button used inside editors — mirrors the onboarding chip styling. */
export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-ring tactile rounded-pill border px-3.5 py-1.5 text-[0.82rem] lowercase transition-colors ${
        active
          ? "border-[var(--accent-pink)] bg-[color-mix(in_srgb,var(--accent-pink)_12%,transparent)] text-content-primary"
          : "border-white/10 text-content-tertiary hover:text-content-secondary"
      }`}
    >
      {children}
    </button>
  );
}
