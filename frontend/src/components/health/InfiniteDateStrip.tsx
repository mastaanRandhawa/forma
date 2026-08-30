import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { tween, usePrefersReducedMotion } from "../../lib/motion";

const CELL = 58;
const HALF = 21; // 43 cells rendered; re-anchored well before an edge shows
const REANCHOR_MARGIN = 7;

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const todayISO = () => iso(new Date());

const addDays = (base: Date, n: number) => {
  const x = new Date(base);
  x.setDate(x.getDate() + n);
  x.setHours(0, 0, 0, 0);
  return x;
};

const wkShort = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const wkLong = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });

type Cell = { iso: string; wd: string; label: string; day: number; today: boolean };

/**
 * InfiniteDateStrip — a centered, endlessly scrollable day wheel.
 * Native pointer drag + a rAF tween on release (no animation library). Day cells
 * are formatted once per anchor; the strip re-renders only when the selection
 * actually changes, never per drag frame. The track moves via a direct
 * `transform` write to the DOM.
 */
export const InfiniteDateStrip = memo(function InfiniteDateStrip({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
}) {
  const reduce = usePrefersReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(0);
  const xRef = useRef(0);
  const stopTween = useRef<(() => void) | null>(null);
  const moved = useRef(false);
  const drag = useRef<{ active: boolean; startX: number; startVal: number; id: number }>({
    active: false,
    startX: 0,
    startVal: 0,
    id: -1,
  });

  const [anchor, setAnchor] = useState(() => addDays(new Date(value + "T00:00:00"), 0));
  const [centerIdx, setCenterIdx] = useState(HALF);

  const days = useMemo<Cell[]>(() => {
    const t = todayISO();
    return Array.from({ length: HALF * 2 + 1 }, (_, i) => {
      const d = addDays(anchor, i - HALF);
      return {
        iso: iso(d),
        wd: wkShort.format(d).slice(0, 3).toLowerCase(),
        label: wkLong.format(d),
        day: d.getDate(),
        today: iso(d) === t,
      };
    });
  }, [anchor]);

  const setX = useCallback((v: number) => {
    xRef.current = v;
    if (trackRef.current) trackRef.current.style.transform = `translate3d(${v}px,0,0)`;
  }, []);
  const setLive = useCallback((on: boolean) => {
    if (trackRef.current) trackRef.current.style.willChange = on ? "transform" : "auto";
  }, []);

  const centerX = useCallback((i: number) => widthRef.current / 2 - i * CELL - CELL / 2, []);
  const recenter = useCallback(() => setX(centerX(HALF)), [setX, centerX]);

  useLayoutEffect(() => {
    const measure = () => {
      widthRef.current = wrapRef.current?.clientWidth ?? 0;
      recenter();
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => {
      ro.disconnect();
      stopTween.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    recenter();
  }, [anchor, recenter]);

  useEffect(() => {
    if (days[HALF].iso !== value) {
      setAnchor(addDays(new Date(value + "T00:00:00"), 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const nearestIndex = () => {
    const raw = (widthRef.current / 2 - CELL / 2 - xRef.current) / CELL;
    return Math.max(0, Math.min(days.length - 1, Math.round(raw)));
  };

  const settle = (idx: number) => {
    stopTween.current?.();
    setLive(true);
    setCenterIdx(idx);
    const target = centerX(idx);
    const done = () => {
      const picked = days[idx];
      if (picked.iso !== value) onChange(picked.iso);
      if (idx < REANCHOR_MARGIN || idx > days.length - 1 - REANCHOR_MARGIN) {
        setAnchor(addDays(new Date(picked.iso + "T00:00:00"), 0));
        setCenterIdx(HALF);
      }
    };
    if (reduce) {
      setX(target);
      done();
      setLive(false);
    } else {
      stopTween.current = tween(xRef.current, target, 340, setX, () => {
        done();
        setLive(false);
      });
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    stopTween.current?.();
    setLive(true);
    moved.current = false;
    drag.current = { active: true, startX: e.clientX, startVal: xRef.current, id: e.pointerId };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active || drag.current.id !== e.pointerId) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) moved.current = true;
    setX(drag.current.startVal + dx);
  };
  const endDrag = (e: React.PointerEvent) => {
    if (!drag.current.active || drag.current.id !== e.pointerId) return;
    drag.current.active = false;
    settle(nearestIndex());
  };

  return (
    <div
      ref={wrapRef}
      className={`no-scrollbar relative mx-auto h-[76px] w-full max-w-[420px] select-none overflow-hidden ${className}`}
      style={{
        WebkitMaskImage: "linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent)",
        maskImage: "linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[19px] border border-white/20"
        style={{
          width: CELL - 4,
          height: 64,
          background:
            "linear-gradient(180deg, rgba(255,244,250,0.16), rgba(213,26,122,0.14))",
          boxShadow:
            "0 10px 26px -8px rgba(213,26,122,0.45), inset 0 1px 0 rgba(255,255,255,0.28)",
        }}
      />

      <div
        ref={trackRef}
        className="absolute inset-y-0 flex items-center"
        style={{ touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {days.map((d, i) => {
          const active = i === centerIdx;
          return (
            <button
              key={d.iso}
              type="button"
              onClick={() => {
                if (moved.current) {
                  moved.current = false;
                  return;
                }
                settle(i);
              }}
              className={`focus-ring relative z-10 flex h-full shrink-0 flex-col items-center justify-center gap-1 rounded-[18px] transition-colors ${
                active ? "text-content-primary" : "text-content-tertiary"
              }`}
              style={{ width: CELL }}
              aria-label={d.label}
              aria-current={active ? "date" : undefined}
            >
              <span
                className={`label-instrument !tracking-[0.1em] ${active ? "!text-[var(--accent-pink)]" : ""}`}
              >
                {d.wd}
              </span>
              <span
                className={`num tabular-nums ${active ? "text-[1.1rem] font-semibold" : "text-[0.95rem]"}`}
              >
                {d.day}
              </span>
              <span
                className="h-1 w-1 rounded-full"
                style={{ background: d.today ? "var(--accent-pink)" : "transparent" }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
});
