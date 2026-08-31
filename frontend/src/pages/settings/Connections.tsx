import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { api } from "../../api/client";
import { API_ENABLED, useResource } from "../../api/hooks";
import { usePrefs, useSettings } from "../../api/settings";
import { Section } from "../../components/settings/ui";
import { Toggle } from "../../components/settings/Toggle";
import type { DeviceConnection } from "../../api/types";

const WEARABLES = [
  { key: "whoop", name: "WHOOP" },
  { key: "oura", name: "Oura" },
  { key: "garmin", name: "Garmin" },
] as const;

const SUPPORTED = ["Apple Health", "Health Connect", "WHOOP", "Garmin", "Oura", "Strava"];

function timeAgo(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

function RecoveryData() {
  const prefs = usePrefs();
  const { update } = useSettings();
  return (
    <Section
      title="recovery data"
      description="where forma gets your readiness signal. connect a health source above, or check in manually."
    >
      <div className="divide-y divide-[var(--line-soft)]">
        <Toggle
          label="manual recovery check-ins"
          hint="show a daily check-in on your dashboard when there's no synced data."
          checked={prefs.recovery.manualCheckins}
          onChange={(v) => update({ prefs: { recovery: { manualCheckins: v } } })}
        />
        <Toggle
          label="prompt me before my first workout"
          hint="ask how you're feeling if you haven't checked in yet today."
          checked={prefs.recovery.promptBeforeFirstWorkout}
          onChange={(v) => update({ prefs: { recovery: { promptBeforeFirstWorkout: v } } })}
        />
      </div>
    </Section>
  );
}

export default function Connections() {
  if (!API_ENABLED) {
    return (
      <div className="space-y-5">
        <Section title="connected apps">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="text-[0.92rem] lowercase text-content-primary">no health source connected</div>
            <p className="mt-1.5 text-[0.84rem] leading-relaxed text-content-secondary">
              sync sleep, recovery, heart rate and activity so forma can adjust your training.
              health connections are set up in the forma mobile companion.
            </p>
            <span
              className="focus-ring mt-3 inline-flex items-center gap-2 rounded-pill bg-white/[0.06] px-4 py-2 text-[0.82rem] lowercase text-content-tertiary"
              aria-disabled
            >
              <Smartphone size={13} strokeWidth={2} /> set up on mobile
            </span>
          </div>
          <div className="mt-4 divide-y divide-[var(--line-soft)]">
            {SUPPORTED.map((name) => (
              <div key={name} className="flex items-center justify-between py-3 text-[0.88rem]">
                <span className="text-content-primary">{name}</span>
                <span className="label-instrument">mobile only</span>
              </div>
            ))}
          </div>
        </Section>
        <RecoveryData />
      </div>
    );
  }
  return <ConnectionsLive />;
}

function ConnectionsLive() {
  // Cached across navigation — re-opening Settings won't refetch or clear the list.
  const devices = useResource<DeviceConnection[]>("me-devices", () => api.me.devices());
  const conns = devices.data ?? [];
  const load = devices.refetch;
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("device_connected")) setMsg(`${p.get("device_connected")} connected.`);
    if (p.get("device_error")) setMsg(`Couldn't connect: ${p.get("device_error")}`);
    if (p.get("device_connected") || p.get("device_error"))
      window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const byProvider = Object.fromEntries(conns.map((c) => [c.provider, c]));

  async function connect(key: string) {
    setBusy(key);
    setMsg(null);
    try {
      const r = await api.me.connectDevice(key as "whoop" | "oura" | "garmin");
      if (r.authorizeUrl) window.location.href = r.authorizeUrl;
      else setMsg(r.message ?? `${key} isn't configured on this deployment.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : `${key} isn't available.`);
    } finally {
      setBusy(null);
    }
  }
  async function sync(key: string) {
    setBusy(key);
    try {
      const r = await api.me.syncDevice(key);
      setMsg(`${key}: ${r.ingested} new reading${r.ingested === 1 ? "" : "s"}.`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "sync failed");
    } finally {
      setBusy(null);
    }
  }
  async function disconnect(key: string) {
    setBusy(key);
    await api.me.disconnectDevice(key).catch(() => {});
    setBusy(null);
    load();
  }

  return (
    <div className="space-y-5">
      <Section
        title="connected apps"
        description="apple health & health connect sync through the mobile companion. whoop, oura and garmin connect here over oauth."
      >
        <div className="divide-y divide-[var(--line-soft)]">
          {WEARABLES.map(({ key, name }) => {
            const c = byProvider[key];
            const connected = c?.oauthConnected;
            return (
              <div key={key} className="flex items-center justify-between py-3 text-[0.88rem]">
                <div>
                  <div className="text-content-primary">{name}</div>
                  <div className="label-instrument mt-0.5">
                    {c?.status === "error"
                      ? `last sync failed${c.lastErrorAt ? ` ${timeAgo(c.lastErrorAt)}` : ""}`
                      : connected
                      ? c?.lastSyncAt
                        ? `synced ${timeAgo(c.lastSyncAt)}`
                        : "connected"
                      : "not connected"}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {connected ? (
                    <>
                      <button
                        onClick={() => sync(key)}
                        disabled={busy === key}
                        className="focus-ring rounded-pill bg-white/[0.06] px-3 py-1.5 text-[0.76rem] lowercase text-content-primary hover:bg-white/[0.12] disabled:opacity-50"
                      >
                        sync
                      </button>
                      <button
                        onClick={() => disconnect(key)}
                        disabled={busy === key}
                        className="focus-ring rounded-pill px-3 py-1.5 text-[0.76rem] lowercase text-content-tertiary hover:text-content-secondary disabled:opacity-50"
                      >
                        disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => connect(key)}
                      disabled={busy === key}
                      className="focus-ring rounded-pill bg-white/[0.06] px-3 py-1.5 text-[0.76rem] lowercase text-content-primary hover:bg-white/[0.12] disabled:opacity-50"
                    >
                      {busy === key ? "…" : "connect"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between py-3 text-[0.88rem]">
            <span className="text-content-primary">Apple Health · Health Connect</span>
            <span className="label-instrument">mobile only</span>
          </div>
        </div>
        {msg && <p className="mt-3 text-[0.8rem] text-content-secondary">{msg}</p>}
      </Section>
      <RecoveryData />
    </div>
  );
}
