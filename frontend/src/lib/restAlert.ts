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

type Note = { freq: number; at: number; length: number; wave?: OscillatorType; volume?: number; slideTo?: number };

/** The rest-timer sounds in the store. All synthesised, so there's nothing to download. */
const REST_SOUNDS: Record<string, Note[]> = {
  // two short, soft tones
  "rs-chime": [
    { freq: 880, at: 0, length: 0.16 },
    { freq: 1320, at: 0.18, length: 0.16 },
  ],
  // two struck hits, each with a bright overtone
  "rs-bell": [
    { freq: 1250, at: 0, length: 0.5, wave: "triangle", volume: 0.3 },
    { freq: 3100, at: 0, length: 0.2, volume: 0.1 },
    { freq: 1250, at: 0.28, length: 0.6, wave: "triangle", volume: 0.3 },
    { freq: 3100, at: 0.28, length: 0.25, volume: 0.1 },
  ],
  // a rising 8-bit run
  "rs-arcade": [
    { freq: 523, at: 0, length: 0.08, wave: "square", volume: 0.12 },
    { freq: 659, at: 0.08, length: 0.08, wave: "square", volume: 0.12 },
    { freq: 784, at: 0.16, length: 0.08, wave: "square", volume: 0.12 },
    { freq: 1047, at: 0.24, length: 0.2, wave: "square", volume: 0.12 },
  ],
  // a low ping that falls away
  "rs-sonar": [
    { freq: 1200, at: 0, length: 0.7, slideTo: 800, volume: 0.28 },
    { freq: 1200, at: 0.75, length: 0.45, slideTo: 900, volume: 0.1 },
  ],
  // a long, slow tone with a soft fifth above it
  "rs-bowl": [
    { freq: 293, at: 0, length: 1.8, volume: 0.28 },
    { freq: 440, at: 0, length: 1.4, volume: 0.1 },
    { freq: 880, at: 0, length: 0.8, volume: 0.05 },
  ],
};

/** Silent if audio was never unlocked (e.g. right after a reload). */
export function playRestSound(soundId: string): void {
  if (!ctx || ctx.state !== "running") return;
  const t0 = ctx.currentTime;
  for (const n of REST_SOUNDS[soundId] ?? REST_SOUNDS["rs-chime"]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = t0 + n.at;
    osc.type = n.wave ?? "sine";
    osc.frequency.setValueAtTime(n.freq, start);
    if (n.slideTo) osc.frequency.exponentialRampToValueAtTime(n.slideTo, start + n.length);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(n.volume ?? 0.25, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + n.length);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + n.length + 0.02);
  }
}

/** The store's preview button: it's a tap, so this can unlock audio itself. */
export function previewRestSound(soundId: string): void {
  primeRestAlert();
  if (ctx?.state === "running") playRestSound(soundId);
  else void ctx?.resume().then(() => playRestSound(soundId));
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
