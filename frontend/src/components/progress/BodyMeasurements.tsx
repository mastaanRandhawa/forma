import { useState } from "react";
import { Plus } from "lucide-react";
import { DetailDrawer } from "../dashboard/DetailDrawer";
import { EmptyState } from "../EmptyState";
import { MiniTrend } from "../health/MiniTrend";
import { API_ENABLED, errorMessage, invalidateResource, useResource } from "../../api/hooks";
import { api } from "../../api/client";
import type { BodyMeasurement, BodyMeasurementInput } from "../../api/types";
import { useFormaData } from "../../lib/localStore";
import { addLocalMeasurement, deleteLocalMeasurement, localMeasurements, updateLocalMeasurement } from "../../lib/localMeasurements";

const LB = 2.2046226218;
const IN = 2.54;
const round1 = (n: number) => Math.round(n * 10) / 10;
const field = "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[0.9rem] text-content-primary outline-none focus:border-white/30";
const parse = (s: string) => {
  const n = Number.parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};

type Form = { weight: string; bodyFat: string; waist: string; chest: string; arm: string };
const EMPTY: Form = { weight: "", bodyFat: "", waist: "", chest: "", arm: "" };

/** Bodyweight and tape measurements: log, fix a typo, delete an entry. Works on the server or the local build. */
export function BodyMeasurements() {
  const metric = useFormaData().profile.units === "kg";
  const wUnit = metric ? "kg" : "lb";
  const lUnit = metric ? "cm" : "in";
  const toW = (kg: number) => round1(metric ? kg : kg * LB);
  const fromW = (v: number) => (metric ? v : v / LB);
  const toL = (cm: number) => round1(metric ? cm : cm / IN);
  const fromL = (v: number) => (metric ? v : v * IN);

  const { data, mutate, refetch } = useResource<BodyMeasurement[]>("measurements", () =>
    API_ENABLED ? api.progress.measurements() : Promise.resolve(localMeasurements()),
  );
  const rows = [...(data ?? [])].sort((a, b) => Date.parse(a.recordedAt ?? "") - Date.parse(b.recordedAt ?? ""));
  const weights = rows.filter((m) => m.weightKg).map((m) => toW(m.weightKg!));
  const last = rows[rows.length - 1];

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BodyMeasurement | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const openNew = () => { setEditing(null); setForm(EMPTY); setConfirm(false); setErr(null); setOpen(true); };
  const openEdit = (m: BodyMeasurement) => {
    setEditing(m);
    setForm({
      weight: m.weightKg ? String(toW(m.weightKg)) : "",
      bodyFat: m.bodyFatPct ? String(m.bodyFatPct) : "",
      waist: m.waistCm ? String(toL(m.waistCm)) : "",
      chest: m.chestCm ? String(toL(m.chestCm)) : "",
      arm: m.armCm ? String(toL(m.armCm)) : "",
    });
    setConfirm(false);
    setErr(null);
    setOpen(true);
  };
  const close = () => { setOpen(false); setEditing(null); };

  const values = () => {
    const w = parse(form.weight), bf = parse(form.bodyFat), wa = parse(form.waist), ch = parse(form.chest), ar = parse(form.arm);
    return {
      weightKg: w == null ? null : Math.round(fromW(w) * 100) / 100,
      bodyFatPct: bf,
      waistCm: wa == null ? null : round1(fromL(wa)),
      chestCm: ch == null ? null : round1(fromL(ch)),
      armCm: ar == null ? null : round1(fromL(ar)),
    };
  };
  const any = Object.values(form).some((v) => parse(v) != null);

  const reload = async () => {
    invalidateResource("measurements");
    invalidateResource("dashboard");
    invalidateResource("progress");
    await refetch();
  };

  const run = async (fn: () => Promise<unknown> | void) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      await reload();
      close();
    } catch (e) {
      setErr(errorMessage(e as Error));
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      const v = values();
      if (editing) {
        if (API_ENABLED) await api.progress.updateMeasurement(editing.id, v);
        else updateLocalMeasurement(editing.id, v);
        return;
      }
      const input: BodyMeasurementInput = {};
      for (const [k, val] of Object.entries(v)) if (val != null) (input as Record<string, number>)[k] = val;
      if (API_ENABLED) {
        const row = await api.progress.addMeasurement(input);
        mutate([...(data ?? []), row]);
      } else addLocalMeasurement(input);
    });

  const remove = () =>
    run(async () => {
      if (!editing) return;
      if (API_ENABLED) await api.progress.deleteMeasurement(editing.id);
      else deleteLocalMeasurement(editing.id);
    });

  const recent = [...rows].reverse().slice(0, 8);
  const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");
  const summary = (m: BodyMeasurement) =>
    [m.weightKg ? `${toW(m.weightKg)} ${wUnit}` : null, m.bodyFatPct ? `${m.bodyFatPct}% fat` : null, m.waistCm ? `waist ${toL(m.waistCm)} ${lUnit}` : null].filter(Boolean).join(" · ") || "—";

  const row = (key: keyof Form, label: string, unit: string) => (
    <label key={key} className="flex items-center gap-3">
      <span className="flex-1 text-[0.88rem] lowercase text-content-secondary">{label}</span>
      <input className={`${field} !w-28 text-right`} inputMode="decimal" placeholder="—" value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
      <span className="w-6 label-instrument">{unit}</span>
    </label>
  );

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div className="label-soft lowercase">body measurements</div>
        <button onClick={openNew} className="focus-ring tactile inline-flex items-center gap-1.5 rounded-pill bg-white/[0.07] px-3.5 py-1.5 text-[0.8rem] lowercase text-content-primary hover:bg-white/[0.13]">
          <Plus size={13} strokeWidth={2.25} /> log
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="nothing logged yet"
          body="log your weight and a few tape measurements to see the trend."
          action={{ label: "log a measurement", onClick: openNew }}
        />
      ) : (
        <div className="surface-soft space-y-4 p-5">
          {weights.length >= 2 && <MiniTrend data={weights} fill height={64} caption="bodyweight over time" tooltipFormat={(v) => `${v} ${wUnit}`} />}
          <div className="flex flex-wrap gap-6">
            {last?.weightKg && <Stat value={toW(last.weightKg)} label={`weight ${wUnit}`} />}
            {last?.bodyFatPct && <Stat value={`${last.bodyFatPct}%`} label="body fat" />}
            {last?.waistCm && <Stat value={toL(last.waistCm)} label={`waist ${lUnit}`} />}
          </div>
          <ul className="divide-y divide-[var(--line-soft)]">
            {recent.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5 text-[0.86rem]">
                <span className="w-28 shrink-0 text-content-primary">{fmtDate(m.recordedAt)}</span>
                <span className="flex-1 truncate text-content-secondary">{summary(m)}</span>
                <button onClick={() => openEdit(m)} aria-label={`edit entry from ${fmtDate(m.recordedAt)}`} className="focus-ring rounded-pill px-3 py-1 text-[0.78rem] lowercase text-content-tertiary hover:text-content-primary">
                  edit
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <DetailDrawer open={open} onClose={close} title={editing ? "edit entry" : "log measurement"} eyebrow={editing ? fmtDate(editing.recordedAt) : "body"}>
        <div className="space-y-3">
          <p className="text-[0.8rem] text-content-tertiary">fill in whatever you measured. everything is optional.</p>
          {row("weight", "bodyweight", wUnit)}
          {row("bodyFat", "body fat", "%")}
          {row("waist", "waist", lUnit)}
          {row("chest", "chest", lUnit)}
          {row("arm", "arm", lUnit)}
          {err && <p role="alert" className="text-[0.82rem] text-[var(--accent-amber)]">{err}</p>}
          <button disabled={busy || !any} onClick={save} className="focus-ring tactile w-full rounded-pill bg-[var(--accent-pink)] py-3 text-[0.88rem] lowercase text-white disabled:opacity-40">
            {busy ? "saving…" : editing ? "save changes" : "save"}
          </button>
          {editing &&
            (confirm ? (
              <div className="flex items-center gap-2 rounded-2xl border border-[var(--accent-amber)]/40 p-3">
                <span className="flex-1 text-[0.82rem] text-content-secondary">delete this entry? it leaves your history and charts.</span>
                <button onClick={() => setConfirm(false)} className="focus-ring rounded-pill px-3 py-1.5 text-[0.8rem] lowercase text-content-tertiary">keep</button>
                <button disabled={busy} onClick={remove} className="focus-ring rounded-pill bg-[var(--accent-amber)] px-4 py-1.5 text-[0.8rem] lowercase text-black">delete</button>
              </div>
            ) : (
              <button onClick={() => setConfirm(true)} className="focus-ring w-full rounded-pill py-2.5 text-[0.84rem] lowercase text-content-tertiary hover:text-[var(--accent-amber)]">
                delete entry
              </button>
            ))}
        </div>
      </DetailDrawer>
    </section>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <div className="metric-numeral text-[1.4rem] text-content-primary">{value}</div>
      <div className="label-instrument mt-0.5">{label}</div>
    </div>
  );
}
