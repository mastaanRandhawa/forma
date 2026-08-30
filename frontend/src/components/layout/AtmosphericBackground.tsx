import { memo } from "react";

/**
 * AtmosphericBackground — the environment layer for every screen.
 * A static base gradient + two very slow drifting colour fields, grain and a
 * vignette. Memoized; it never reacts to route or state changes.
 */
export const AtmosphericBackground = memo(function AtmosphericBackground() {
  return (
    <div className="atmosphere" aria-hidden="true">
      <div className="atmosphere__aurora atmosphere__aurora--1" />
      <div className="atmosphere__aurora atmosphere__aurora--2" />
      <div className="atmosphere__aurora atmosphere__aurora--3" />
      <div className="atmosphere__grain" />
      <div className="atmosphere__vignette" />
    </div>
  );
});
