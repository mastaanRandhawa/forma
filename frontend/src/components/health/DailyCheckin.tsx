import { useState } from "react";
import { Check, Moon } from "lucide-react";
import { DetailDrawer } from "../dashboard/DetailDrawer";
import { addCheckin, latestCheckin, useFormaData } from "../../lib/localStore";
import { readinessFromCheckin } from "../../api/localDashboard";
import { API_ENABLED } from "../../api/hooks";
import { api } from "../../api/client";

const today = () => new Date().toISOString().slice(0, 10);

function Slider({
  label,
  value,
  set,
  min,
  max,
  step = 1,
  suffix = "",
}: {
  label: string;
  value: number;
  set: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="py-2.5">
      <div className="mb-1.5 flex items-center justify-between text-[0.85rem]">
        <span className="text-content-primary lowercase">{label}</span>
        <span className="num text-content-secondary">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="focus-ring w-full accent-[var(--accent-pink)]"
      />
    </div>
  );
}

/** The daily recovery check-in editor, in a bottom sheet. */
export function DailyCheckinDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const data = useFormaData();
  const existing = latestCheckin(data);
  const seed = existing?.date === today() ? existing : null;
  const [sleepH, setSleepH] = useState(seed?.sleepH ?? 7);
  const [sleepQuality, setSleepQuality] = useState(seed?.sleepQuality ?? 3);
  const [fatigue, setFatigue] = useState(seed?.fatigue ?? 3);
  const [soreness, setSoreness] = useState(seed?.soreness ?? 3);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    addCheckin({ sleepH, sleepQuality, fatigue, soreness });
    if (API_ENABLED) {
      await api.progress.checkin({ sleepH, sleepQuality, fatigue, soreness }).catch(() => {});
    }
    setSaving(false);
    onClose();
  }

  return (
    <DetailDrawer open={open} onClose={onClose} title="how are you feeling?" eyebrow="daily check-in">
      <p className="mb-3 text-[0.83rem] leading-relaxed text-content-secondary">
        a quick read on sleep and recovery. forma uses it to set today's training intensity.
      </p>
      <div className="divide-y divide-[var(--line-soft)]">
        <Slider label="hours slept" value={sleepH} set={setSleepH} min={3} max={11} step={0.5} suffix="h" />
        <Slider label="sleep quality" value={sleepQuality} set={setSleepQuality} min={1} max={5} />
        <Slider label="fatigue" value={fatigue} set={setFatigue} min={1} max={5} />
        <Slider label="muscle soreness" value={soreness} set={setSoreness} min={1} max={5} />
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="focus-ring tactile mt-4 inline-flex items-center gap-2 rounded-pill px-5 py-2.5 text-[0.86rem] font-medium text-[var(--fill-on-color)] disabled:opacity-50"
        style={{ background: "var(--fill-coral)" }}
      >
        <Check size={15} strokeWidth={2.5} /> {saving ? "saving…" : "complete check-in"}
      </button>
    </DetailDrawer>
  );
}

/**
 * Dashboard entry point for the recovery check-in. Prompts when today's check-in
 * is missing; once done, shows the readiness result with a way to update it.
 */
export function DailyCheckinCard() {
  const data = useFormaData();
  const last = latestCheckin(data);
  const done = last?.date === today();
  const [open, setOpen] = useState(false);
  const readiness = done ? readinessFromCheckin(data) : null;

  return (
    <div className="checkin-card surface-soft p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-pill"
          style={{ background: "color-mix(in srgb, var(--accent-cyan) 16%, transparent)" }}
        >
          <Moon size={16} strokeWidth={1.75} className="text-[var(--accent-cyan)]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="label-soft lowercase">daily check-in</div>
          {done ? (
            <p className="mt-1 text-[0.86rem] leading-relaxed text-content-secondary">
              readiness <span className="text-content-primary">{readiness}</span> · {last?.sleepH}h sleep.
              keeping today's session at planned intensity.
            </p>
          ) : (
            <p className="mt-1 text-[0.86rem] leading-relaxed text-content-secondary">
              how are you feeling today? a quick check-in lets forma tune today's workout.
            </p>
          )}
          <button
            onClick={() => setOpen(true)}
            className="focus-ring tactile mt-3 rounded-pill bg-white/[0.06] px-4 py-1.5 text-[0.8rem] lowercase text-content-primary transition-colors hover:bg-white/[0.12]"
          >
            {done ? "update check-in" : "check in"}
          </button>
        </div>
      </div>
      <DailyCheckinDrawer open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
