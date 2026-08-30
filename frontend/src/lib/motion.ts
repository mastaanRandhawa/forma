import { useEffect, useRef, useState } from "react";

/**
 * useInViewOnce — becomes true the first time `ref` nears the viewport and
 * stays true. For deferring the mount of heavy below-the-fold sections.
 */
export function useInViewOnce(rootMargin = "300px") {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (seen || !ref.current || typeof IntersectionObserver === "undefined") return;
    const el = ref.current;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, rootMargin]);
  return [ref, seen] as const;
}

/**
 * useFakeLoad — a one-shot "data is loading" gate, keyed so it only plays the
 * first time a given card/section mounts in the session (repeat navigation is
 * instant). Drives the MetricCard skeleton states.
 */
const loadedKeys = new Set<string>();
export function useFakeLoad(key: string, ms = 650): boolean {
  const [loading, setLoading] = useState(!loadedKeys.has(key));
  useEffect(() => {
    if (loadedKeys.has(key)) return;
    const t = setTimeout(() => {
      loadedKeys.add(key);
      setLoading(false);
    }, ms);
    return () => clearTimeout(t);
  }, [key, ms]);
  return loading;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * tween — a cancelable rAF interpolation from `from` to `to`.
 * Returns a stop() function. Cheaper than pulling in an animation library.
 */
export function tween(
  from: number,
  to: number,
  durationMs: number,
  onUpdate: (v: number) => void,
  onDone?: () => void,
  ease: (t: number) => number = easeOutCubic
): () => void {
  let raf = 0;
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs);
    onUpdate(from + (to - from) * ease(t));
    if (t < 1) raf = requestAnimationFrame(step);
    else onDone?.();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}
