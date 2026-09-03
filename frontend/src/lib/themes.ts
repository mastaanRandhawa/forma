/**
 * Forma theme engine.
 *
 * Two independent axes:
 *
 *   1. THEME  — a colour world (accent family, atmosphere hue, radius, ambient
 *      effect). Every theme is free and renders in BOTH light and dark.
 *   2. COLOR MODE — light / dark / system. A separate switch, not a purchase.
 *
 * A theme is authored once as a `PaletteSpec`. `buildVars()` renders it dark,
 * `buildLightVars()` renders the SAME spec light (light ground, dark ink, the
 * theme's own accent hue carried through and contrast-corrected). `applyTheme()`
 * writes the chosen set onto <html> and stamps `data-color-mode` + a couple of
 * feature flags (`data-theme-effect`, `data-theme-rarity`, `data-theme-radius`).
 *
 * Ownership + persistence live in `customization.ts`; this file is pure data.
 */

export type Rarity = "free";

type RGB = [number, number, number];

type PaletteSpec = {
  /** solid ground painted on <body> (dark) */
  bg: string;
  bgDeep: string;
  bgSoft: string;
  /** frost colour for translucent panels, as [r,g,b] */
  panel: RGB;
  /** panel base opacity (soft surface); other states scale from it */
  frost?: number;
  /** text ink for dark mode, as [r,g,b] */
  ink: RGB;
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
  atmosphere: string; // full `background` shorthand for .atmosphere (dark)
  aurora: [string, string, string];
  grain?: number;
};

const RADII = {
  soft: { small: "18px", medium: "24px", large: "32px", xl: "40px", shell: "48px" },
  sharp: { small: "6px", medium: "10px", large: "14px", xl: "18px", shell: "22px" },
  round: { small: "22px", medium: "30px", large: "40px", xl: "48px", shell: "56px" },
};

// ── colour maths ───────────────────────────────────────────────────────────
const rgba = ([r, g, b]: RGB, a: number) => `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;

function hexToRgb(hex: string): RGB {
  const s = hex.replace("#", "").trim();
  const full = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
function rgbToHex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map((v) => clamp255(v).toString(16).padStart(2, "0")).join("");
}
function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function relLuminance([r, g, b]: RGB): number {
  const f = (c: number) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/**
 * Nudge a colour dark enough to read as text/fills on a near-white background.
 * Leaves already-deep colours alone.
 */
export function onLight(hex: string): string {
  let c = hexToRgb(hex);
  let guard = 0;
  while (relLuminance(c) > 0.34 && guard++ < 24) c = mix(c, [0, 0, 0], 0.12);
  return rgbToHex(c);
}

// ── dark render ────────────────────────────────────────────────────────────
function buildVars(p: PaletteSpec): Record<string, string> {
  const frost = p.frost ?? 0.1;
  const r = RADII[p.radius];
  return {
    "--app-bg": p.bg,
    "--background": p.bg,
    "--background-deep": p.bgDeep,
    "--background-soft": p.bgSoft,

    "--surface": rgba(p.panel, frost),
    "--surface-glass": rgba(p.panel, frost + 0.03),
    "--surface-raised": rgba(p.panel, frost + 0.06),
    "--surface-recessed": rgba(p.glassRgb, 0.42),
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
    "--specular": "rgba(255,255,255,0.34)",

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

    "--btn-white": "#FBF3F6",
    "--btn-white-ink": "#23131D",
    "--inner-hi": "rgba(255,255,255,0.16)",
  };
}

// ── light render — a NEUTRAL off-white canvas that keeps only the theme's
//    accent identity. Not an inverted dark theme: cards are white glass,
//    shadows are neutral, the hue shows up only as a faint ambient wash and
//    in the accents / the one bold fill tile. (See the light-mode override
//    layer at the end of index.css for the surface-class translations.)
function buildLightVars(p: PaletteSpec): Record<string, string> {
  const r = RADII[p.radius];
  const white: RGB = [255, 255, 255];
  const hue = hexToRgb(p.accent);
  const cool = hexToRgb(onLight(p.accentContrast));
  const hs = `${clamp255(hue[0])}, ${clamp255(hue[1])}, ${clamp255(hue[2])}`;
  const cs = `${clamp255(cool[0])}, ${clamp255(cool[1])}, ${clamp255(cool[2])}`;

  // a light ground that clearly carries the theme's hue — as a tint of
  // near-white, not a wash. Cards stay crisp white; the hue lives in the
  // canvas, the atmosphere and the accents.
  const bg = rgbToHex(mix(white, hue, 0.06));
  const bgDeep = rgbToHex(mix(white, hue, 0.13));

  return {
    "--app-bg": bg,
    "--background": bg,
    "--background-deep": bgDeep,
    "--background-soft": rgbToHex(mix(white, hue, 0.02)),

    "--surface": "rgba(255, 255, 255, 0.8)",
    "--surface-glass": "rgba(255, 255, 255, 0.58)",
    "--surface-raised": "rgba(255, 255, 255, 0.95)",
    "--surface-recessed": `rgba(${hs}, 0.07)`,
    "--surface-opaque": rgbToHex(mix(white, hue, 0.015)),
    "--surface-float": "rgba(255, 255, 255, 0.97)",

    "--text-primary": "#211A24",
    "--text-secondary": "#5B5162",
    "--text-tertiary": "#8C8391",

    "--accent": onLight(p.accent),
    "--accent-pink": onLight(p.accent),
    "--accent-purple": onLight(p.accentSoft),
    "--accent-mauve": onLight(p.mauve ?? p.accentSoft),
    "--accent-blue": onLight(p.blue ?? p.accentContrast),
    "--accent-cyan": onLight(p.accentContrast),
    "--accent-coral": onLight(p.accent),
    "--accent-orange": onLight(p.amber ?? "#FF9C63"),
    "--accent-amber": onLight(p.amber ?? "#E0920A"),
    "--accent-lime": onLight(p.lime ?? "#5CA018"),
    "--accent-jade": onLight(p.lime ?? "#1EA870"),

    "--line-soft": "rgba(41, 28, 45, 0.07)",
    "--line-highlight": "rgba(41, 28, 45, 0.12)",
    "--specular": "rgba(41, 28, 45, 0.05)",

    "--glass-tint-rgb": "255, 255, 255",
    "--glass-blur": `${Math.min(p.glassBlur, 24)}px`,
    "--glass-opacity": "0.82",

    "--radius-small": r.small,
    "--radius-medium": r.medium,
    "--radius-large": r.large,
    "--radius-xl": r.xl,
    "--radius-shell": r.shell,

    "--fill-coral": p.fill,
    "--fill-on-color": p.fillInk ?? "rgba(255, 250, 248, 0.96)",

    // the theme hue as a visible-but-soft canvas + corner washes
    "--atmosphere-bg": [
      `radial-gradient(760px circle at 8% 0%, rgba(${hs}, 0.09), transparent 55%)`,
      `radial-gradient(820px circle at 94% 100%, rgba(${cs}, 0.065), transparent 55%)`,
      `linear-gradient(168deg, ${bg} 0%, ${bgDeep} 100%)`,
    ].join(","),
    "--aurora-1": `rgba(${hs}, 0.07)`,
    "--aurora-2": `rgba(${cs}, 0.05)`,
    "--aurora-3": `rgba(${hs}, 0.045)`,
    "--grain-opacity": "0.009",

    // circular action button / active pill → dark on light (see guideline §7)
    "--btn-white": "#2A2130",
    "--btn-white-ink": "#FFFFFF",
    "--inner-hi": "rgba(255, 255, 255, 0.7)",
  };
}

export type ThemeEffect = "none" | "particles" | "scanlines" | "grain-heavy" | "glow" | "aurora-fast";

export const THEME_EFFECTS: { id: ThemeEffect; label: string }[] = [
  { id: "none", label: "None" },
  { id: "aurora-fast", label: "Fast aurora" },
  { id: "particles", label: "Floating particles" },
  { id: "glow", label: "Accent bloom" },
  { id: "grain-heavy", label: "Heavy grain" },
  { id: "scanlines", label: "CRT scanlines" },
];

export type Theme = {
  id: string;
  name: string;
  blurb: string;
  rarity: Rarity;
  price: 0;
  /** swatch gradient for the picker card — dark-mode rendering */
  swatch: string;
  /** swatch gradient for the picker card — light-mode rendering */
  swatchLight: string;
  /** an ambient effect this theme turns on by default (user can override) */
  effect?: ThemeEffect;
  spec: PaletteSpec;
  vars: Record<string, string>;
  varsLight: Record<string, string>;
};

/** a light-mode preview swatch: neutral canvas → faint tint → the accent */
function lightSwatch(spec: PaletteSpec): string {
  const acc = hexToRgb(spec.accent);
  const tint = rgbToHex(mix([255, 255, 255], acc, 0.16));
  return `linear-gradient(140deg,#FCFBFD 0%,${tint} 46%,${onLight(spec.accent)} 100%)`;
}

/** compact theme entry → resolved Theme (dark + light var sets) */
function theme(
  meta: { id: string; name: string; blurb: string; swatch: string; effect?: ThemeEffect },
  spec: PaletteSpec,
): Theme {
  return {
    ...meta,
    rarity: "free",
    price: 0,
    swatchLight: lightSwatch(spec),
    spec,
    vars: buildVars(spec),
    varsLight: buildLightVars(spec),
  };
}

export const THEMES: Theme[] = [
  theme(
    {
      id: "aurora-plum",
      name: "Aurora Plum",
      blurb: "The Forma signature — plum ground, pink aurora.",
      swatch: "linear-gradient(140deg,#2A1120,#7A174F 60%,#D51A7A)",
    },
    {
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
    },
  ),
  theme(
    {
      id: "midnight",
      name: "Midnight",
      blurb: "Deep indigo and steel. Calm, low-key, focused.",
      swatch: "linear-gradient(140deg,#0C0D12,#1B2340 60%,#7CA3FF)",
    },
    {
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
    },
  ),
  theme(
    {
      id: "carbon",
      name: "Carbon",
      blurb: "Monochrome graphite, hard edges, one red line.",
      swatch: "linear-gradient(140deg,#0E0E10,#2A2A2E 70%,#FF4438)",
      effect: "grain-heavy",
    },
    {
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
    },
  ),
  theme(
    {
      id: "sunset",
      name: "Sunset Boulevard",
      blurb: "Coral, tangerine and magenta bleeding into dusk.",
      swatch: "linear-gradient(140deg,#2A1018,#C43C5B 55%,#FFB347)",
    },
    {
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
    },
  ),
  theme(
    {
      id: "forest",
      name: "Deep Forest",
      blurb: "Wet moss, pine shadow, a single jade light.",
      swatch: "linear-gradient(140deg,#0B120E,#173226 60%,#63C98C)",
    },
    {
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
    },
  ),
  theme(
    {
      id: "arctic",
      name: "Arctic Glass",
      blurb: "Pale ice over navy, heavy frost, everything luminous.",
      swatch: "linear-gradient(140deg,#0B1622,#2C4A66 55%,#C6E8FF)",
      effect: "glow",
    },
    {
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
    },
  ),
  theme(
    {
      id: "synthwave",
      name: "Synthwave",
      blurb: "Neon grid energy — magenta, violet and electric cyan.",
      swatch: "linear-gradient(140deg,#160B2A,#7A1E9E 50%,#00E5FF)",
      effect: "glow",
    },
    {
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
    },
  ),
  theme(
    {
      id: "sakura",
      name: "Sakura",
      blurb: "Soft blossom pink and warm paper. The gentlest theme.",
      swatch: "linear-gradient(140deg,#2A2024,#8A5A6E 55%,#FBD9E4)",
    },
    {
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
    },
  ),
  theme(
    {
      id: "gold-vault",
      name: "Gold Vault",
      blurb: "Obsidian and 24k. Quiet money.",
      swatch: "linear-gradient(140deg,#0B0A07,#3A2E12 55%,#F5C63C)",
      effect: "particles",
    },
    {
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
    },
  ),
  theme(
    {
      id: "nebula",
      name: "Nebula",
      blurb: "Cosmic violet and stardust. The aurora never stops.",
      swatch: "linear-gradient(140deg,#0C0716,#3A1C6E 55%,#9C7BFF)",
      effect: "aurora-fast",
    },
    {
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
    },
  ),
  theme(
    {
      id: "terminal",
      name: "Terminal",
      blurb: "Green phosphor on black. Monospace everything, scanlines on.",
      swatch: "linear-gradient(140deg,#050805,#0A160A 60%,#3BFF7A)",
      effect: "scanlines",
    },
    {
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
    },
  ),
];

export const THEME_MAP: Record<string, Theme> = Object.fromEntries(THEMES.map((t) => [t.id, t]));
export const DEFAULT_THEME_ID = "aurora-plum";

/** themes that were removed when light became a mode → nearest surviving hue */
export const LEGACY_THEME_ALIAS: Record<string, string> = {
  cloud: "aurora-plum",
  dusk: "sunset",
};
export const resolveThemeId = (id: string | undefined): string =>
  (id && (THEME_MAP[id] ? id : LEGACY_THEME_ALIAS[id])) || DEFAULT_THEME_ID;

export type ColorMode = "light" | "dark";

/** Resolve the "cm-*" slot value + OS preference to a concrete light/dark. */
export function resolveColorMode(cmId: string | undefined): ColorMode {
  if (cmId === "cm-light") return "light";
  if (cmId === "cm-dark") return "dark";
  const prefersDark =
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export function applyTheme(
  themeId: string,
  opts: { mode?: ColorMode; effect?: ThemeEffect; accentOverride?: string | null } = {},
) {
  if (typeof document === "undefined") return;
  const theme = THEME_MAP[resolveThemeId(themeId)];
  const root = document.documentElement;
  const mode: ColorMode = opts.mode ?? "dark";
  const vars = mode === "light" ? theme.varsLight : theme.vars;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  if (opts.accentOverride) {
    const a = mode === "light" ? onLight(opts.accentOverride) : opts.accentOverride;
    root.style.setProperty("--accent", a);
    root.style.setProperty("--accent-pink", a);
    root.style.setProperty("--accent-coral", a);
  }
  root.dataset.theme = theme.id;
  root.dataset.colorMode = mode;
  root.dataset.themeRarity = theme.rarity;
  root.dataset.themeEffect = opts.effect ?? theme.effect ?? "none";
  root.dataset.themeRadius = theme.spec.radius;
}

// ── accent packs — a universal recolour of the primary accent, all free ─────
export const ACCENTS: { id: string; name: string; color: string; price: 0 }[] = [
  { id: "ac-brand", name: "Signature", color: "#D51A7A", price: 0 },
  { id: "ac-ember", name: "Ember", color: "#FF6B4A", price: 0 },
  { id: "ac-cyan", name: "Ion", color: "#4CC6E0", price: 0 },
  { id: "ac-lime", name: "Volt", color: "#B8E637", price: 0 },
  { id: "ac-violet", name: "Ultraviolet", color: "#9C7BFF", price: 0 },
  { id: "ac-gold", name: "Gilded", color: "#F5C63C", price: 0 },
  { id: "ac-mint", name: "Mint", color: "#4FD6A6", price: 0 },
  { id: "ac-blood", name: "Redline", color: "#FF3B47", price: 0 },
  { id: "ac-rose", name: "Crimson", color: "#E8294A", price: 0 },
  { id: "ac-teal", name: "Teal", color: "#2CB4B4", price: 0 },
  { id: "ac-peach", name: "Peach", color: "#FF9472", price: 0 },
  { id: "ac-indigo", name: "Midnight", color: "#5A6BFF", price: 0 },
  { id: "ac-forest", name: "Forest", color: "#3DAA6A", price: 0 },
  { id: "ac-amber", name: "Amber", color: "#F5A623", price: 0 },
];
export const ACCENT_MAP = Object.fromEntries(ACCENTS.map((a) => [a.id, a]));

// ── font pack ─────────────────────────────────────────────────────────────

const FONT_STACKS: Record<string, string> = {
  "fn-system": "",
  "fn-mono": "ui-monospace, 'Cascadia Code', 'SF Mono', Menlo, monospace",
  "fn-rounded": "'Nunito', system-ui, sans-serif",
  "fn-serif": "'DM Serif Display', Georgia, serif",
};

const FONT_URLS: Record<string, string> = {
  "fn-rounded": "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap",
  "fn-serif": "https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap",
};

export function applyFont(fontId: string): void {
  if (typeof document === "undefined") return;
  const url = FONT_URLS[fontId];
  if (url) {
    const linkId = `forma-font-${fontId}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      link.id = linkId;
      document.head.appendChild(link);
    }
  }
  document.body.style.fontFamily = FONT_STACKS[fontId] ?? "";
}
