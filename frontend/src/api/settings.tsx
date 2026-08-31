/**
 * Settings bundle — appearance, progressive disclosure and unlock progression.
 *
 * `<SettingsProvider>` fetches `GET /me/settings` once (or a demo default when
 * there's no backend), applies `appearance` to CSS custom properties, and hands
 * the rest of the app hooks: `useAppearance`, `useWidgetMode`, `useProgression`.
 *
 * In demo mode every change is persisted to localStorage so the app behaves like
 * a real one without a server.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "./client";
import { API_ENABLED } from "./hooks";
import type {
  AppearanceSettings,
  DisclosureMode,
  FeatureKey,
  LocalPrefs,
  ProgressionState,
  SettingsBundle,
  SettingsPatch,
} from "./types";

const LS_KEY = "forma.settings";
const BRAND_ACCENT = "#D51A7A";

// ── defaults (match the shipped look) ───────────────────────────────────────
const DEFAULT_APPEARANCE: AppearanceSettings = {
  presetId: "aurora-plum",
  backgroundMode: "solid",
  backgroundColor: "#170D17",
  backgroundGradient: null,
  backgroundImageUrl: null,
  backgroundDim: 0,
  glass: { opacity: 0.72, blurPx: 18, tint: "#2A1623" },
  accentColor: BRAND_ACCENT,
  reduceMotion: false,
  updatedAt: new Date(0).toISOString(),
};

/** Every feature the demo starts with unlocked (gating off → full app). */
const ALL_FEATURES: FeatureKey[] = [
  "dashboard", "workouts", "trainer", "body_map", "progress_basic", "goals",
  "programs", "progress_advanced", "achievements", "store", "insights", "voice_chat",
];
/** What "ease me in" mode reveals — the calm starter set (spec tier "starter"). */
export const STARTER_FEATURES: FeatureKey[] = ["dashboard", "workouts", "trainer"];

export const DEFAULT_PREFS: LocalPrefs = {
  camera: { formTracking: true },
  recovery: { manualCheckins: true, promptBeforeFirstWorkout: true },
  research: { anonFormData: false },
  notifications: {
    workoutReminders: true,
    trainerCheckins: true,
    milestones: true,
    weeklyDigest: true,
  },
};

const DEFAULT_BUNDLE: SettingsBundle = {
  camera: { formDataVerbosity: "categorical", saveHighlightClips: false },
  units: { unitPreference: "imperial", weekStartsMonday: false },
  appearance: DEFAULT_APPEARANCE,
  disclosure: { mode: "always", widgetOverrides: {} },
  progression: {
    tier: "full",
    unlockedFeatures: ALL_FEATURES,
    gatingEnabled: false,
    nextUnlock: null,
  },
  prefs: DEFAULT_PREFS,
};

/** Deep-merge a partial prefs patch onto a full prefs object. */
function mergePrefs(base: LocalPrefs, p?: SettingsPatch["prefs"]): LocalPrefs {
  if (!p) return base;
  return {
    camera: { ...base.camera, ...p.camera },
    recovery: { ...base.recovery, ...p.recovery },
    research: { ...base.research, ...p.research },
    notifications: { ...base.notifications, ...p.notifications },
  };
}

// ── curated presets (mirrors the backend's config/appearance-presets) ───────
export interface Preset {
  id: string;
  name: string;
  appearance: Partial<AppearanceSettings>;
  premium?: boolean;
}
export const PRESETS: Preset[] = [
  {
    id: "aurora-plum",
    name: "Aurora Plum",
    appearance: {
      backgroundMode: "solid", backgroundColor: "#170D17", backgroundDim: 0,
      glass: { opacity: 0.72, blurPx: 18, tint: "#2A1623" }, accentColor: BRAND_ACCENT,
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    appearance: {
      backgroundMode: "solid", backgroundColor: "#0C0D12", backgroundDim: 0.1,
      glass: { opacity: 0.6, blurPx: 22, tint: "#15171F" }, accentColor: "#7CA3FF",
    },
  },
  {
    id: "warm-clay",
    name: "Warm Clay",
    appearance: {
      backgroundMode: "solid", backgroundColor: "#1A1310", backgroundDim: 0,
      glass: { opacity: 0.78, blurPx: 14, tint: "#241A14" }, accentColor: "#FF8A5B",
    },
  },
  {
    id: "paper",
    name: "Paper",
    appearance: {
      backgroundMode: "solid", backgroundColor: "#12100F", backgroundDim: 0,
      glass: { opacity: 0.9, blurPx: 6, tint: "#1C1A18" }, accentColor: "#D8B24A",
    },
  },
  {
    id: "forest",
    name: "Forest",
    appearance: {
      backgroundMode: "gradient", backgroundColor: "#0E1512",
      backgroundGradient: { angle: 165, stops: [{ color: "#132019", at: 0 }, { color: "#0B0F0D", at: 1 }] },
      backgroundDim: 0.05, glass: { opacity: 0.7, blurPx: 18, tint: "#16201A" }, accentColor: "#63C98C",
    },
  },
  {
    id: "nebula",
    name: "Nebula",
    premium: true,
    appearance: {
      backgroundMode: "gradient", backgroundColor: "#140B1F",
      backgroundGradient: { angle: 155, stops: [{ color: "#221041", at: 0 }, { color: "#0C0716", at: 1 }] },
      backgroundDim: 0, glass: { opacity: 0.62, blurPx: 24, tint: "#1D1330" }, accentColor: "#9C7BFF",
    },
  },
];

// ── storage ─────────────────────────────────────────────────────────────────
function loadLocal(): SettingsBundle | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SettingsBundle>;
    return {
      ...DEFAULT_BUNDLE,
      ...parsed,
      prefs: mergePrefs(DEFAULT_PREFS, parsed.prefs as SettingsPatch["prefs"]),
    };
  } catch {
    return null;
  }
}
function saveLocal(b: SettingsBundle) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(b));
  } catch {
    /* private mode */
  }
}

function mergeBundle(b: SettingsBundle, p: SettingsPatch): SettingsBundle {
  return {
    ...b,
    camera: { ...b.camera, ...p.camera },
    units: { ...b.units, ...p.units },
    appearance: {
      ...b.appearance,
      ...p.appearance,
      glass: { ...b.appearance.glass, ...p.appearance?.glass },
      accentColor: p.appearance?.accentColor === null ? BRAND_ACCENT : p.appearance?.accentColor ?? b.appearance.accentColor,
      updatedAt: new Date().toISOString(),
    },
    disclosure: {
      ...b.disclosure,
      ...p.disclosure,
      widgetOverrides: { ...b.disclosure.widgetOverrides, ...p.disclosure?.widgetOverrides },
    },
    prefs: mergePrefs(b.prefs ?? DEFAULT_PREFS, p.prefs),
  };
}

// ── apply appearance → CSS custom properties ────────────────────────────────
function applyAppearance(a: AppearanceSettings) {
  const root = document.documentElement;
  // The theme engine (src/lib/themes.ts, driven by the customization store) now
  // owns backgrounds, surfaces, accents, glass and radius. Appearance keeps only
  // the cross-cutting motion switch plus an optional dim overlay.
  root.style.setProperty("--app-bg-dim", String(a.backgroundDim));
  root.dataset.reduceMotion = a.reduceMotion ? "true" : "false";
}

// ── context ─────────────────────────────────────────────────────────────────
interface SettingsCtx {
  bundle: SettingsBundle;
  loading: boolean;
  error: Error | null;
  update: (patch: SettingsPatch) => Promise<void>;
  applyPreset: (id: string) => Promise<void>;
  setGating: (on: boolean) => Promise<void>;
  refetch: () => void;
}
const Ctx = createContext<SettingsCtx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [bundle, setBundle] = useState<SettingsBundle>(() => loadLocal() ?? DEFAULT_BUNDLE);
  const [loading, setLoading] = useState(API_ENABLED);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  // apply appearance whenever it changes
  useEffect(() => {
    applyAppearance(bundle.appearance);
  }, [bundle.appearance]);

  // initial fetch (API mode only)
  useEffect(() => {
    if (!API_ENABLED) return;
    let cancelled = false;
    setLoading(true);
    api.me
      .settings()
      .then((b) => {
        // the server bundle owns everything except the frontend `prefs` slice
        if (!cancelled) setBundle((prev) => ({ ...b, prefs: prev.prefs ?? DEFAULT_PREFS }));
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const update = useCallback(
    async (patch: SettingsPatch) => {
      // `prefs` is frontend-only — always persisted locally, never sent to the API.
      setBundle((prev) => {
        const next = mergeBundle(prev, patch);
        saveLocal(next);
        return next;
      });
      const { prefs: _prefs, ...serverPatch } = patch;
      if (API_ENABLED && Object.keys(serverPatch).length) {
        try {
          const fresh = await api.me.updateSettings(serverPatch);
          setBundle((cur) => ({ ...fresh, prefs: cur.prefs }));
        } catch (e) {
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      }
    },
    [],
  );

  const applyPreset = useCallback(
    async (id: string) => {
      const p = PRESETS.find((x) => x.id === id);
      if (!p) return;
      await update({ appearance: { presetId: id, ...p.appearance } as SettingsPatch["appearance"] });
    },
    [update],
  );

  const setGating = useCallback(
    async (on: boolean) => {
      setBundle((prev) => {
        const next: SettingsBundle = {
          ...prev,
          progression: {
            ...prev.progression,
            gatingEnabled: on,
            unlockedFeatures: on
              ? prev.progression.unlockedFeatures.length && prev.progression.unlockedFeatures.length < ALL_FEATURES.length
                ? prev.progression.unlockedFeatures
                : STARTER_FEATURES
              : ALL_FEATURES,
            tier: on ? "starter" : "full",
            nextUnlock: on
              ? { feature: "body_map", requirement: "Finish your first workout", progress: { current: 0, target: 1 } }
              : null,
          },
        };
        saveLocal(next);
        return next;
      });
      if (API_ENABLED) {
        try {
          const r = await api.me.progression.setGating(on);
          setBundle((prev) => ({ ...prev, progression: r }));
        } catch (e) {
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      }
    },
    [],
  );

  const value = useMemo<SettingsCtx>(
    () => ({ bundle, loading, error, update, applyPreset, setGating, refetch: () => setTick((t) => t + 1) }),
    [bundle, loading, error, update, applyPreset, setGating],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function useSettingsCtx() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}

export const useSettings = useSettingsCtx;
export const useAppearance = () => useSettingsCtx().bundle.appearance;
export const usePrefs = () => useSettingsCtx().bundle.prefs;

/** Effective disclosure mode for a widget: its override, or the global mode. */
export function useWidgetMode(key: string): DisclosureMode {
  const { disclosure } = useSettingsCtx().bundle;
  return disclosure.widgetOverrides[key] ?? disclosure.mode;
}

export function useProgression(): ProgressionState & { has: (f: FeatureKey) => boolean } {
  const { progression } = useSettingsCtx().bundle;
  return {
    ...progression,
    has: (f: FeatureKey) => !progression.gatingEnabled || progression.unlockedFeatures.includes(f),
  };
}
