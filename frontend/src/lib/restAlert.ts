/**
 * restAlert — the end-of-rest chime and the workout screen wake lock.
 *
 * Vibration alone does nothing on iOS Safari or desktops, so the end of a rest
 * went unnoticed unless you were watching the timer. Browsers only allow audio
 * after a user gesture, so `primeRestAlert()` runs on "complete set" and the
 * chime later plays from that unlocked context.
 */
import { useEffect } from "react";

let ctx: AudioContext | null = null;

/** Call from a tap. Creates / resumes the audio context the chime will use. */
export function primeRestAlert(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* no Web Audio */
  }
}

/** Two short, soft tones. Silent if audio was never unlocked (e.g. right after a reload). */
export function playRestChime(): void {
  if (!ctx || ctx.state !== "running") return;
  const t0 = ctx.currentTime;
  [880, 1320].forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    const start = t0 + i * 0.18;
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(start);
    osc.stop(start + 0.18);
  });
}

/**
 * Keep the screen on while `active`. The browser drops the lock whenever the
 * page is hidden, so it's re-requested when the page comes back.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = () => {
      if (document.visibilityState !== "visible" || (sentinel && !sentinel.released)) return;
      navigator.wakeLock
        .request("screen")
        .then((s) => {
          if (cancelled) void s.release();
          else sentinel = s;
        })
        .catch(() => {
          /* denied (battery saver, unsupported context) — not worth surfacing */
        });
    };
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", acquire);
      void sentinel?.release().catch(() => {});
    };
  }, [active]);
}
