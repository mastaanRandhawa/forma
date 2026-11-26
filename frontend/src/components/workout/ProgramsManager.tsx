import { useState } from "react";
import { DetailDrawer } from "../dashboard/DetailDrawer";
import { api } from "../../api/client";
import { errorMessage, invalidateResource, useResource } from "../../api/hooks";
import type { Program } from "../../api/types";

/** Multi-week programs: see them, make one active, delete one. Needs the server. */
export function ProgramsManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const programs = useResource<Program[]>("programs-list", () => api.programs.list());
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const list = programs.data ?? [];

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setErr(null);
    try {
      await fn();
      invalidateResource("programs");
      invalidateResource("dashboard");
      invalidateResource("planned");
      await programs.refetch();
      setConfirm(null);
    } catch (e) {
      setErr(errorMessage(e as Error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <DetailDrawer open={open} onClose={onClose} title="programs" eyebrow="multi-week plans">
      <div className="space-y-3">
        {err && <p role="alert" className="text-[0.82rem] text-[var(--accent-amber)]">{err}</p>}
        {programs.initialLoading ? (
          <div className="skeleton h-[64px] rounded-2xl" />
        ) : list.length === 0 ? (
          <p className="text-[0.88rem] text-content-secondary">no programs yet. ask your trainer to build one.</p>
        ) : (
          list.map((p) => (
            <div key={p.id} className="surface-recessed space-y-2.5 rounded-hero p-3.5">
              <div>
                <div className="text-[0.92rem] lowercase text-content-primary">{p.name}</div>
                <div className="label-instrument mt-0.5">{p.durationWeeks} weeks{p.active ? " · active" : ""}</div>
              </div>
              {confirm === p.id ? (
                <div className="flex items-center gap-2 rounded-2xl border border-[var(--accent-amber)]/40 p-2.5">
                  <span className="flex-1 text-[0.8rem] text-content-secondary">delete this program and its schedule? finished workouts stay.</span>
                  <button onClick={() => setConfirm(null)} className="focus-ring rounded-pill px-3 py-1.5 text-[0.8rem] lowercase text-content-tertiary">keep</button>
                  <button disabled={busy === `del:${p.id}`} onClick={() => run(`del:${p.id}`, () => api.programs.remove(p.id))} className="focus-ring rounded-pill bg-[var(--accent-amber)] px-4 py-1.5 text-[0.8rem] lowercase text-black">delete</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {!p.active && (
                    <button disabled={busy === `act:${p.id}`} onClick={() => run(`act:${p.id}`, () => api.programs.activate(p.id))} className="focus-ring tactile rounded-pill bg-white/[0.08] px-4 py-1.5 text-[0.8rem] lowercase text-content-primary hover:bg-white/[0.14] disabled:opacity-50">
                      {busy === `act:${p.id}` ? "…" : "make active"}
                    </button>
                  )}
                  <button onClick={() => setConfirm(p.id)} className="focus-ring rounded-pill px-3 py-1.5 text-[0.8rem] lowercase text-content-tertiary hover:text-[var(--accent-amber)]">
                    delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </DetailDrawer>
  );
}
