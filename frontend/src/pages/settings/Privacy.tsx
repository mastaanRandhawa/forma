import { useState } from "react";
import { Check, Download, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import { API_ENABLED } from "../../api/hooks";
import { usePrefs, useSettings } from "../../api/settings";
import { loadData } from "../../lib/localStore";
import { Section, Row } from "../../components/settings/ui";
import { Toggle } from "../../components/settings/Toggle";

const ASSURANCES = [
  "processed on this device",
  "raw video never uploaded",
  "raw video never stored",
];

function downloadJSON(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Privacy() {
  const { bundle, update } = useSettings();
  const prefs = usePrefs();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function exportData() {
    setBusy(true);
    try {
      if (API_ENABLED) downloadJSON("forma-export.json", await api.me.export());
      else downloadJSON("forma-data.json", loadData());
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  async function deleteData() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (API_ENABLED) {
      await api.me.deleteAccount().catch(() => {});
    }
    try {
      localStorage.removeItem("forma.data.v1");
      localStorage.removeItem("forma.settings");
    } catch {
      /* private mode */
    }
    window.location.reload();
  }

  return (
    <div className="space-y-5">
      <Section
        title="form tracking"
        description="pose estimation for exercise technique runs entirely on your device."
      >
        <div className="divide-y divide-[var(--line-soft)]">
          <Toggle
            label="camera form tracking"
            hint="analyze exercise technique using your device's camera."
            checked={prefs.camera.formTracking}
            onChange={(v) => update({ prefs: { camera: { formTracking: v } } })}
          />
          <div className="flex items-center justify-between py-3.5 text-[0.9rem]">
            <span className="text-content-tertiary lowercase">video processing</span>
            <span className="text-content-primary lowercase">on-device</span>
          </div>
          <div className="flex items-center justify-between py-3.5 text-[0.9rem]">
            <span className="text-content-tertiary lowercase">store video</span>
            <span className="text-content-primary lowercase">never</span>
          </div>
        </div>
        <ul className="mt-4 space-y-1.5">
          {ASSURANCES.map((a) => (
            <li key={a} className="flex items-center gap-2 text-[0.84rem] text-content-secondary">
              <Check size={13} strokeWidth={2.75} className="text-[var(--accent-lime)]" /> {a}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="privacy & data">
        <div className="divide-y divide-[var(--line-soft)]">
          <Toggle
            label="save form highlight clips"
            hint="keep short clips of notable sets. stored on-device only."
            checked={bundle.camera.saveHighlightClips}
            onChange={(v) => update({ camera: { saveHighlightClips: v } })}
          />
          <Toggle
            label="anonymous research data"
            hint="share de-identified form scores to help improve forma's models."
            checked={prefs.research.anonFormData}
            onChange={(v) => update({ prefs: { research: { anonFormData: v } } })}
          />
        </div>
        <div className="mt-4 divide-y divide-[var(--line-soft)]">
          <Row
            label={busy ? "preparing…" : "export my data"}
            icon={<Download size={15} strokeWidth={2} />}
            onClick={exportData}
          />
          <Row
            label={confirmDelete ? "tap again to confirm — this can't be undone" : "delete my data"}
            icon={<Trash2 size={15} strokeWidth={2} />}
            onClick={deleteData}
          />
          <Row label="privacy policy" to="/settings/account" />
        </div>
      </Section>
    </div>
  );
}
