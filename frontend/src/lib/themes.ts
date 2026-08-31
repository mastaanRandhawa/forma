/**
 * Forma theme engine.
 *
 * A theme is a full repaint, not a recolour. `buildVars()` turns a compact
 * palette spec into the ~40 CSS custom properties the whole app references
 * (backgrounds, every surface state, text ramp, accents, lines, glass, radius
 * scale, the coral fill, the atmosphere gradient and its drifting aurora
 * blobs). `applyTheme()` writes them onto <html data-theme="…"> and stamps a
 * couple of feature flags (`data-theme-effect`, `data-theme-rarity`).
 *
 * Ownership + persistence live in `customization.ts`; this file is pure data.
 */

export type Rarity = "free" | "rare" | "epic" | "legendary";

type RGB = [number, number, number];

type PaletteSpec = {
  /** solid ground painted on <body> */
  bg: string;
  bgDeep: string;
  bgSoft: string;
  /** frost colour for translucent panels, as "r, g, b" */
  panel: RGB;
  /** panel base opacity (soft surface); other states scale from it */
  frost?: number;
  /** text ink, as [r,g,b] — light themes pass a dark ink */
  ink: RGB;
  /** true when ink is dark (light UI) — flips a few borders/highlights */
  lightUI?: boolean;
  accent: string;
  accentSoft: string;
  accentContrast: string; // the "cool" secondary accent (cyan slot)
  lime?: string;
  amber?: string;
  mauve?: string;
  blue?: string;
  line: string;
  lineHi: string;
  glassRgb: RGB;
  glassBlur: number;
  glassOpacity: number;
  radius: "soft" | "sharp" | "round";
  fill: string; // gradient for the one bold solid tile
  fillInk?: string;
  atmosphere: string; // full `background` shorthand for .atmosphere
  aurora: [string, string, string];
  grain?: number;
};

const RADII = {
  soft: { small: "18px", medium: "24px", large: "32px", xl: "40px", shell: "48px" },
  sharp: { small: "6px", medium: "10px", large: "14px", xl: "18px", shell: "22px" },
  round: { small: "22px", medium: "30px", large: "40px", xl: "48px", shell: "56px" },
};

const rgba = ([r, g, b]: RGB, a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;

function buildVars(p: PaletteSpec): Record<string, string> {
  const frost = p.frost ?? 0.1;
  const r = RADII[p.radius];
  const specular = p.lightUI ? "rgba(20,16,24,0.14)" : "rgba(255,255,255,0.34)";
  const innerHi = p.lightUI ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.16)";
  return {
    "--app-bg": p.bg,
    "--background": p.bg,
    "--background-deep": p.bgDeep,
    "--background-soft": p.bgSoft,

    "--surface": rgba(p.panel, frost),
    "--surface-glass": rgba(p.panel, frost + 0.03),
    "--surface-raised": rgba(p.panel, frost + 0.06),
    "--surface-recessed": rgba(p.glassRgb, p.lightUI ? 0.5 : 0.42),
    "--surface-opaque": p.bgSoft,
    "--surface-float": rgba(p.panel, frost + 0.12),

    "--text-primary": rgba(p.ink, 0.96),
    "--text-secondary": rgba(p.ink, 0.66),
    "--text-tertiary": rgba(p.ink, 0.42),

    "--accent": p.accent,
    "--accent-pink": p.accent,
    "--accent-purple": p.accentSoft,
    "--accent-mauve": p.mauve ?? p.accentSoft,
    "--accent-blue": p.blue ?? p.accentContrast,
    "--accent-cyan": p.accentContrast,
    "--accent-coral": p.accent,
    "--accent-orange": p.amber ?? "#FF9C63",
    "--accent-amber": p.amber ?? "#FFB661",
    "--accent-lime": p.lime ?? "#D8FF63",
    "--accent-jade": p.lime ?? "#4FD6A6",

    "--line-soft": p.line,
    "--line-highlight": p.lineHi,
    "--specular": specular,

    "--glass-tint-rgb": `${p.glassRgb[0]}, ${p.glassRgb[1]}, ${p.glassRgb[2]}`,
    "--glass-blur": `${p.glassBlur}px`,
    "--glass-opacity": String(p.glassOpacity),

    "--radius-small": r.small,
    "--radius-medium": r.medium,
    "--radius-large": r.large,
    "--radius-xl": r.xl,
    "--radius-shell": r.shell,

    "--fill-coral": p.fill,
    "--fill-on-color": p.fillInk ?? "rgba(255, 250, 248, 0.96)",

    "--atmosphere-bg": p.atmosphere,
    "--aurora-1": p.aurora[0],
    "--aurora-2": p.aurora[1],
    "--aurora-3": p.aurora[2],
    "--grain-opacity": String(p.grain ?? 0.028),

    "--btn-white": p.lightUI ? "#1B1620" : "#FBF3F6",
    "--btn-white-ink": p.lightUI ? "#FBF3F6" : "#23131D",
    "--inner-hi": innerHi,
  };
}

export type Theme = {
  id: string;
  name: string;
  blurb: string;
  rarity: Rarity;
  price: number;
  /** swatch gradient for the picker card */
  swatch: string;
  /** an ambient effect this theme turns on by default (user can override) */
  effect?: ThemeEffect;
  vars: Record<string, string>;
};

export type ThemeEffect = "none" | "particles" | "scanlines" | "grain-heavy" | "glow" | "aurora-fast";

export const THEME_EFFECTS: { id: ThemeEffect; label: string }[] = [
  { id: "none", label: "None" },
  { id: "aurora-fast", label: "Fast aurora" },
  { id: "particles", label: "Floating particles" },
  { id: "glow", label: "Accent bloom" },
  { id: "grain-heavy", label: "Heavy grain" },
  { id: "scanlines", label: "CRT scanlines" },
];

export const THEMES: Theme[] = [
  {
    id: "aurora-plum",
    name: "Aurora Plum",
    blurb: "The Forma signature — warm plum ground, pink aurora.",
    rarity: "free",
    price: 0,
    swatch: "linear-gradient(140deg,#2A1120,#7A174F 60%,#D51A7A)",
    vars: buildVars({
      bg: "#170D17", bgDeep: "#100A11", bgSoft: "#34132D",
      panel: [255, 244, 250], frost: 0.1,
      ink: [255, 249, 252],
      accent: "#D51A7A", accentSoft: "#7A174F", accentContrast: "#83E9F4",
      line: "rgba(255,255,255,0.09)", lineHi: "rgba(255,255,255,0.2)",
      glassRgb: [42, 22, 35], glassBlur: 18, glassOpacity: 0.72,
      radius: "soft",
      fill: "linear-gradient(150deg,#FF7E58 0%,#E64A2B 100%)",
      atmosphere:
        "radial-gradient(120% 90% at 50% -14%, rgba(122,23,79,0.34), transparent 60%)," +
        "radial-gradient(90% 70% at 8% 2%, rgba(255,156,99,0.16), transparent 55%)," +
        "radial-gradient(95% 75% at 20% 26%, rgba(232,165,197,0.18), transparent 55%)," +
        "radial-gradient(85% 70% at 92% 12%, rgba(77,124,255,0.13), transparent 55%)," +
        "radial-gradient(95% 85% at 66% 104%, rgba(213,26,122,0.24), transparent 60%)," +
        "linear-gradient(168deg, rgba(52,19,45,0.55) 0%, rgba(27,14,26,0.45) 48%, rgba(16,10,17,0.5) 100%)",
      aurora: ["rgba(213,26,122,0.28)", "rgba(122,23,79,0.34)", "rgba(179,101,150,0.18)"],
    }),
  },
  {
    id: "midnight",
    name: "Midnight",
    blurb: "Deep indigo and steel. Calm, low-key, focused.",
    rarity: "free",
    price: 0,
    swatch: "linear-gradient(140deg,#0C0D12,#1B2340 60%,#7CA3FF)",
    vars: buildVars({
      bg: "#0B0C11", bgDeep: "#08090D", bgSoft: "#151826",
      panel: [224, 231, 255], frost: 0.08,
      ink: [233, 238, 255],
      accent: "#7CA3FF", accentSoft: "#3B4C86", accentContrast: "#8FE3D6",
      lime: "#8DE6B0", amber: "#F5C06B", mauve: "#9E8BE0",
      line: "rgba(255,255,255,0.07)", lineHi: "rgba(255,255,255,0.16)",
      glassRgb: [20, 24, 38], glassBlur: 22, glassOpacity: 0.62,
      radius: "soft",
      fill: "linear-gradient(150deg,#5C7CF0 0%,#33449E 100%)",
      atmosphere:
        "radial-gradient(120% 90% at 50% -14%, rgba(59,76,134,0.4), transparent 62%)," +
        "radial-gradient(80% 70% at 88% 8%, rgba(124,163,255,0.16), transparent 55%)," +
        "radial-gradient(90% 80% at 12% 90%, rgba(87,58,140,0.22), transparent 60%)," +
        "linear-gradient(170deg, rgba(21,24,38,0.6) 0%, rgba(11,12,17,0.5) 100%)",
      aurora: ["rgba(124,163,255,0.22)", "rgba(58,44,110,0.3)", "rgba(80,120,200,0.16)"],
    }),
  },
  {
    id: "carbon",
    name: "Carbon",
    blurb: "Monochrome graphite, hard edges, one red line.",
    rarity: "rare",
    price: 420,
    swatch: "linear-gradient(140deg,#0E0E10,#2A2A2E 70%,#FF4438)",
    effect: "grain-heavy",
    vars: buildVars({
      bg: "#0D0D0F", bgDeep: "#0A0A0B", bgSoft: "#1A1A1D",
      panel: [235, 235, 240], frost: 0.06,
      ink: [240, 240, 244],
      accent: "#FF4438", accentSoft: "#7A2420", accentContrast: "#C8C8CE",
      lime: "#D6D6DA", amber: "#E8A13C", mauve: "#A0A0A8",
      line: "rgba(255,255,255,0.08)", lineHi: "rgba(255,255,255,0.18)",
      glassRgb: [26, 26, 30], glassBlur: 10, glassOpacity: 0.8,
      radius: "sharp",
      fill: "linear-gradient(150deg,#FF4438 0%,#B01E15 100%)",
      atmosphere:
        "radial-gradient(100% 80% at 50% -10%, rgba(60,60,66,0.4), transparent 60%)," +
        "radial-gradient(70% 60% at 90% 90%, rgba(255,68,56,0.08), transparent 55%)," +
        "linear-gradient(180deg, rgba(20,20,22,0.7) 0%, rgba(10,10,11,0.6) 100%)",
      aurora: ["rgba(255,68,56,0.1)", "rgba(50,50,56,0.5)", "rgba(80,80,88,0.2)"],
      grain: 0.05,
    }),
  },
  {
    id: "sunset",
    name: "Sunset Boulevard",
    blurb: "Coral, tangerine and magenta bleeding into dusk.",
    rarity: "rare",
    price: 460,
    swatch: "linear-gradient(140deg,#2A1018,#C43C5B 55%,#FFB347)",
    vars: buildVars({
      bg: "#1C0E12", bgDeep: "#140A0D", bgSoft: "#3A1626",
      panel: [255, 236, 224], frost: 0.11,
      ink: [255, 244, 236],
      accent: "#FF6B4A", accentSoft: "#C43C5B", accentContrast: "#FFC46B",
      lime: "#FFD98A", amber: "#FFB347", mauve: "#E074A0",
      line: "rgba(255,235,220,0.1)", lineHi: "rgba(255,235,220,0.22)",
      glassRgb: [58, 26, 30], glassBlur: 16, glassOpacity: 0.7,
      radius: "round",
      fill: "linear-gradient(150deg,#FF8A3D 0%,#E63C5B 100%)",
      atmosphere:
        "radial-gradient(120% 90% at 50% -12%, rgba(255,150,90,0.3), transparent 60%)," +
        "radial-gradient(90% 70% at 10% 0%, rgba(255,179,71,0.2), transparent 55%)," +
        "radial-gradient(95% 80% at 78% 100%, rgba(196,60,91,0.34), transparent 60%)," +
        "linear-gradient(165deg, rgba(58,22,38,0.55) 0%, rgba(28,14,18,0.5) 100%)",
      aurora: ["rgba(255,140,80,0.26)", "rgba(196,60,91,0.3)", "rgba(255,196,107,0.2)"],
    }),
  },
  {
    id: "forest",
    name: "Deep Forest",
    blurb: "Wet moss, pine shadow, a single jade light.",
    rarity: "rare",
    price: 440,
    swatch: "linear-gradient(140deg,#0B120E,#173226 60%,#63C98C)",
    vars: buildVars({
      bg: "#0C1310", bgDeep: "#080D0B", bgSoft: "#16241B",
      panel: [226, 245, 233], frost: 0.09,
      ink: [232, 245, 237],
      accent: "#63C98C", accentSoft: "#2C5C41", accentContrast: "#8FE0C6",
      lime: "#B7E36A", amber: "#E0B15C", mauve: "#7FB59A",
      line: "rgba(230,255,240,0.08)", lineHi: "rgba(230,255,240,0.18)",
      glassRgb: [22, 34, 26], glassBlur: 18, glassOpacity: 0.7,
      radius: "soft",
      fill: "linear-gradient(150deg,#5DBF83 0%,#2E6B47 100%)",
      atmosphere:
        "radial-gradient(120% 90% at 50% -14%, rgba(44,92,65,0.42), transparent 62%)," +
        "radial-gradient(80% 65% at 88% 10%, rgba(99,201,140,0.14), transparent 55%)," +
        "radial-gradient(90% 80% at 14% 92%, rgba(20,50,35,0.5), transparent 60%)," +
        "linear-gradient(170deg, rgba(22,36,27,0.6) 0%, rgba(12,19,16,0.5) 100%)",
      aurora: ["rgba(99,201,140,0.18)", "rgba(20,50,35,0.42)", "rgba(140,200,170,0.14)"],
    }),
  },
  {
    id: "arctic",
    name: "Arctic Glass",
    blurb: "Pale ice over navy, heavy frost, everything luminous.",
    rarity: "epic",
    price: 720,
    swatch: "linear-gradient(140deg,#0B1622,#2C4A66 55%,#C6E8FF)",
    effect: "glow",
    vars: buildVars({
      bg: "#0B1420", bgDeep: "#070E17", bgSoft: "#16283A",
      panel: [220, 240, 255], frost: 0.12,
      ink: [235, 246, 255],
      accent: "#6EC7FF", accentSoft: "#2C4A66", accentContrast: "#B7ECFF",
      lime: "#9DE8D0", amber: "#FFD98A", mauve: "#A9C4E8",
      line: "rgba(200,232,255,0.12)", lineHi: "rgba(200,232,255,0.26)",
      glassRgb: [22, 40, 58], glassBlur: 30, glassOpacity: 0.6,
      radius: "round",
      fill: "linear-gradient(150deg,#7CCBFF 0%,#3E7FB8 100%)",
      atmosphere:
        "radial-gradient(120% 90% at 50% -14%, rgba(44,74,102,0.5), transparent 62%)," +
        "radial-gradient(85% 70% at 12% 4%, rgba(110,199,255,0.2), transparent 55%)," +
        "radial-gradient(90% 78% at 86% 96%, rgba(183,236,255,0.16), transparent 58%)," +
        "linear-gradient(170deg, rgba(22,40,58,0.55) 0%, rgba(11,20,32,0.5) 100%)",
      aurora: ["rgba(110,199,255,0.22)", "rgba(44,74,102,0.4)", "rgba(183,236,255,0.16)"],
    }),
  },
  {
    id: "synthwave",
    name: "Synthwave",
    blurb: "Neon grid energy — magenta, violet and electric cyan.",
    rarity: "epic",
    price: 780,
    swatch: "linear-gradient(140deg,#160B2A,#7A1E9E 50%,#00E5FF)",
    effect: "glow",
    vars: buildVars({
      bg: "#120926", bgDeep: "#0C0619", bgSoft: "#28114A",
      panel: [244, 224, 255], frost: 0.1,
      ink: [245, 235, 255],
      accent: "#FF3DBE", accentSoft: "#7A1E9E", accentContrast: "#2FE9FF",
      lime: "#B6FF5C", amber: "#FFC24B", mauve: "#B76BFF",
      line: "rgba(255,225,255,0.1)", lineHi: "rgba(255,225,255,0.24)",
      glassRgb: [40, 17, 74], glassBlur: 20, glassOpacity: 0.66,
      radius: "sharp",
      fill: "linear-gradient(150deg,#FF3DBE 0%,#7A1E9E 100%)",
      atmosphere:
        "radial-gradient(120% 90% at 50% -12%, rgba(122,30,158,0.44), transparent 60%)," +
        "radial-gradient(85% 70% at 8% 2%, rgba(255,61,190,0.22), transparent 55%)," +
        "radial-gradient(90% 78% at 92% 100%, rgba(47,233,255,0.2), transparent 58%)," +
        "linear-gradient(168deg, rgba(40,17,74,0.6) 0%, rgba(18,9,38,0.55) 100%)",
      aurora: ["rgba(255,61,190,0.26)", "rgba(122,30,158,0.4)", "rgba(47,233,255,0.2)"],
    }),
  },
  {
    id: "sakura",
    name: "Sakura",
    blurb: "Soft blossom pink and warm paper. The gentlest theme.",
    rarity: "epic",
    price: 700,
    swatch: "linear-gradient(140deg,#2A2024,#8A5A6E 55%,#FBD9E4)",
    vars: buildVars({
      bg: "#211A1D", bgDeep: "#191316", bgSoft: "#3A2A31",
      panel: [255, 240, 245], frost: 0.13,
      ink: [255, 246, 249],
      accent: "#F49CC0", accentSoft: "#8A5A6E", accentContrast: "#9ED8CE",
      lime: "#CDE8A6", amber: "#F2C98E", mauve: "#D8A9C4",
      line: "rgba(255,240,246,0.11)", lineHi: "rgba(255,240,246,0.24)",
      glassRgb: [58, 42, 49], glassBlur: 16, glassOpacity: 0.74,
      radius: "round",
      fill: "linear-gradient(150deg,#F7A8C6 0%,#C56E92 100%)",
      atmosphere:
        "radial-gradient(120% 90% at 50% -14%, rgba(138,90,110,0.4), transparent 62%)," +
        "radial-gradient(85% 70% at 10% 2%, rgba(244,156,192,0.2), transparent 55%)," +
        "radial-gradient(90% 78% at 88% 98%, rgba(251,217,228,0.18), transparent 58%)," +
        "linear-gradient(168deg, rgba(58,42,49,0.5) 0%, rgba(33,26,29,0.5) 100%)",
      aurora: ["rgba(244,156,192,0.22)", "rgba(138,90,110,0.32)", "rgba(251,217,228,0.18)"],
    }),
  },
  {
    id: "gold-vault",
    name: "Gold Vault",
    blurb: "Obsidian and 24k. Reserved for people who saved up.",
    rarity: "legendary",
    price: 1600,
    swatch: "linear-gradient(140deg,#0B0A07,#3A2E12 55%,#F5C63C)",
    effect: "particles",
    vars: buildVars({
      bg: "#0C0B08", bgDeep: "#080704", bgSoft: "#1C1710",
      panel: [255, 245, 220], frost: 0.07,
      ink: [250, 244, 228],
      accent: "#F5C63C", accentSoft: "#7A5E1C", accentContrast: "#E8D9A8",
      lime: "#D8D06A", amber: "#F5C63C", mauve: "#C6A96E",
      line: "rgba(245,210,120,0.12)", lineHi: "rgba(245,210,120,0.28)",
      glassRgb: [28, 23, 16], glassBlur: 14, glassOpacity: 0.78,
      radius: "round",
      fill: "linear-gradient(150deg,#F5C63C 0%,#A9801E 100%)",
      fillInk: "rgba(28,20,6,0.96)",
      atmosphere:
        "radial-gradient(120% 90% at 50% -12%, rgba(122,94,28,0.4), transparent 60%)," +
        "radial-gradient(80% 65% at 88% 8%, rgba(245,198,60,0.14), transparent 55%)," +
        "radial-gradient(90% 80% at 14% 94%, rgba(60,46,18,0.5), transparent 60%)," +
        "linear-gradient(172deg, rgba(28,23,16,0.66) 0%, rgba(12,11,8,0.6) 100%)",
      aurora: ["rgba(245,198,60,0.16)", "rgba(60,46,18,0.44)", "rgba(200,169,110,0.14)"],
      grain: 0.02,
    }),
  },
  {
    id: "nebula",
    name: "Nebula",
    blurb: "Cosmic violet and stardust. The aurora never stops.",
    rarity: "legendary",
    price: 1500,
    swatch: "linear-gradient(140deg,#0C0716,#3A1C6E 55%,#9C7BFF)",
    effect: "aurora-fast",
    vars: buildVars({
      bg: "#0D0819", bgDeep: "#080512", bgSoft: "#231041",
      panel: [235, 226, 255], frost: 0.1,
      ink: [240, 234, 255],
      accent: "#9C7BFF", accentSoft: "#3A1C6E", accentContrast: "#7BE0FF",
      lime: "#9DF0C6", amber: "#F5C98A", mauve: "#C08BFF",
      line: "rgba(230,222,255,0.09)", lineHi: "rgba(230,222,255,0.22)",
      glassRgb: [29, 19, 48], glassBlur: 24, glassOpacity: 0.62,
      radius: "soft",
      fill: "linear-gradient(150deg,#9C7BFF 0%,#5A2C9E 100%)",
      atmosphere:
        "radial-gradient(120% 90% at 50% -12%, rgba(58,28,110,0.46), transparent 60%)," +
        "radial-gradient(85% 70% at 8% 2%, rgba(156,123,255,0.2), transparent 55%)," +
        "radial-gradient(90% 78% at 92% 100%, rgba(123,224,255,0.16), transparent 58%)," +
        "radial-gradient(70% 60% at 60% 40%, rgba(200,139,255,0.14), transparent 60%)," +
        "linear-gradient(168deg, rgba(35,16,65,0.6) 0%, rgba(13,8,25,0.55) 100%)",
      aurora: ["rgba(156,123,255,0.26)", "rgba(58,28,110,0.42)", "rgba(123,224,255,0.18)"],
    }),
  },
  {
    id: "terminal",
    name: "Terminal",
    blurb: "Green phosphor on black. Monospace everything, scanlines on.",
    rarity: "legendary",
    price: 1400,
    swatch: "linear-gradient(140deg,#050805,#0A160A 60%,#3BFF7A)",
    effect: "scanlines",
    vars: buildVars({
      bg: "#050805", bgDeep: "#030503", bgSoft: "#0C160C",
      panel: [180, 255, 200], frost: 0.05,
      ink: [180, 255, 190],
      accent: "#3BFF7A", accentSoft: "#1C7A3C", accentContrast: "#7CFFB0",
      lime: "#8CFF9C", amber: "#E8E85C", mauve: "#5CE8C0",
      line: "rgba(59,255,122,0.14)", lineHi: "rgba(59,255,122,0.3)",
      glassRgb: [8, 20, 10], glassBlur: 6, glassOpacity: 0.86,
      radius: "sharp",
      fill: "linear-gradient(150deg,#3BFF7A 0%,#149140 100%)",
      fillInk: "rgba(3,12,5,0.96)",
      atmosphere:
        "radial-gradient(100% 80% at 50% -10%, rgba(28,122,60,0.3), transparent 58%)," +
        "radial-gradient(70% 60% at 88% 92%, rgba(59,255,122,0.06), transparent 55%)," +
        "linear-gradient(180deg, rgba(12,22,12,0.72) 0%, rgba(5,8,5,0.66) 100%)",
      aurora: ["rgba(59,255,122,0.08)", "rgba(20,60,30,0.4)", "rgba(59,255,122,0.05)"],
      grain: 0.04,
    }),
  },
];

export const THEME_MAP: Record<string, Theme> = Object.fromEntries(THEMES.map((t) => [t.id, t]));
export const DEFAULT_THEME_ID = "aurora-plum";

export function applyTheme(themeId: string, opts: { effect?: ThemeEffect; accentOverride?: string | null } = {}) {
  if (typeof document === "undefined") return;
  const theme = THEME_MAP[themeId] ?? THEME_MAP[DEFAULT_THEME_ID];
  const root = document.documentElement;
  for (const [k, v] of Object.entries(theme.vars)) root.style.setProperty(k, v);
  if (opts.accentOverride) {
    root.style.setProperty("--accent", opts.accentOverride);
    root.style.setProperty("--accent-pink", opts.accentOverride);
    root.style.setProperty("--accent-coral", opts.accentOverride);
  }
  root.dataset.theme = theme.id;
  root.dataset.themeRarity = theme.rarity;
  root.dataset.themeEffect = opts.effect ?? theme.effect ?? "none";
  root.dataset.themeRadius =
    theme.vars["--radius-large"] === RADII.sharp.large
      ? "sharp"
      : theme.vars["--radius-large"] === RADII.round.large
        ? "round"
        : "soft";
}

// ── accent packs (cheap, universal recolour of the primary accent) ──────────
export const ACCENTS: { id: string; name: string; color: string; price: number }[] = [
  { id: "ac-brand", name: "Signature", color: "#D51A7A", price: 0 },
  { id: "ac-ember", name: "Ember", color: "#FF6B4A", price: 90 },
  { id: "ac-cyan", name: "Ion", color: "#4CC6E0", price: 90 },
  { id: "ac-lime", name: "Volt", color: "#B8E637", price: 120 },
  { id: "ac-violet", name: "Ultraviolet", color: "#9C7BFF", price: 120 },
  { id: "ac-gold", name: "Gilded", color: "#F5C63C", price: 200 },
  { id: "ac-mint", name: "Mint", color: "#4FD6A6", price: 120 },
  { id: "ac-blood", name: "Redline", color: "#FF3B47", price: 160 },
];
export const ACCENT_MAP = Object.fromEntries(ACCENTS.map((a) => [a.id, a]));
