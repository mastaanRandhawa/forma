import { THEMES } from "./themes";
import { ACCENTS } from "./themes";

export const todayWorkout = {
  name: "Upper Body Push",
  duration: "~45 min",
  exercises: 6,
  muscles: ["Chest", "Shoulders", "Triceps"],
};

export const trainerMessage =
  "Your legs are still recovering from Tuesday's session, so today's upper push should feel strong. Aim to beat 9 reps on your top bench set.";

export const weeklyRing = { done: 3, target: 5 };

export const upcomingWorkouts = [
  { day: "Tomorrow", name: "Lower Body", muscles: ["Quads", "Glutes", "Hamstrings"] },
  { day: "Thursday", name: "Upper Body Pull", muscles: ["Back", "Biceps", "Rear Delts"] },
  { day: "Saturday", name: "Full Body + Conditioning", muscles: ["Full body"] },
];

export const rankedMuscles = [
  { name: "Chest", pct: 95, trend: [0.5, 0.6, 0.7, 0.8, 0.95] },
  { name: "Shoulders", pct: 80, trend: [0.4, 0.5, 0.6, 0.7, 0.8] },
  { name: "Quads", pct: 72, trend: [0.6, 0.65, 0.6, 0.7, 0.72] },
  { name: "Back", pct: 64, trend: [0.5, 0.55, 0.6, 0.58, 0.64] },
  { name: "Hamstrings", pct: 38, trend: [0.5, 0.4, 0.42, 0.35, 0.38] },
  { name: "Calves", pct: 22, trend: [0.3, 0.25, 0.2, 0.22, 0.22] },
];

export const chatThread: { from: "trainer" | "user"; text: string; time: string }[] = [
  { from: "trainer", text: "Hey Alex, chest is fully recovered since Saturday. Ready for today's push session?", time: "8:02 am" },
  { from: "user", text: "Yeah. My left shoulder felt a little off on incline last week though.", time: "8:04 am" },
  {
    from: "trainer",
    text: "Noted. Let's keep incline dumbbell in but drop to a neutral grip and cap RPE at 8. If it still pinches, we'll swap to a low-incline machine press. I've flagged it to watch on the camera set.",
    time: "8:04 am",
  },
];

export const suggestedPrompts = [
  "What should I train today?",
  "How's my bench progressing?",
  "My shoulder hurts on press",
  "Make today's workout shorter",
];

export const insights = [
  {
    id: "sleep",
    tone: "cyan" as const,
    icon: "moon" as const,
    text: "Your sleep duration is up 12% this week. Readiness usually follows within a day or two.",
    actions: ["Add to plan", "Why?"],
  },
  {
    id: "recovery",
    tone: "amber" as const,
    icon: "activity" as const,
    text: "Recovery is 4 points below your 30-day average. Consider capping today's top sets at RPE 8.",
    actions: ["Adjust workout", "Dismiss"],
  },
];

/* ---- customization catalog (coins → cosmetics) ------------------------- *
 * The richer catalog behind /store and Settings › Appearance. Themes and
 * accents are generated from the theme engine so there's one source of truth;
 * the rest (Kai looks, chat skins, profile frames / titles / badges, ambient
 * effects) live here. `slot` is what a purchase equips into; `price === 0`
 * items are owned from the start.                                          */

export type CustomizationSlot =
  | "theme" | "accent" | "effect" | "avatar" | "chatTheme" | "frame" | "title" | "badge"
  | "colorMode" | "font";

export type CustomizationRarity = "common" | "rare" | "epic" | "legendary";

export type CustomizationItem = {
  id: string;
  slot: CustomizationSlot;
  /** tab grouping on the store */
  group: "Themes" | "Accents" | "Effects" | "Kai" | "Chat" | "Profile" | "Appearance" | "Font";
  name: string;
  detail: string;
  price: number;
  rarity: CustomizationRarity;
  /** gradient or colour for the preview chip */
  swatch?: string;
  /** lucide icon name for frames / titles / badges / effects */
  glyph?: string;
};

const themeItems: CustomizationItem[] = THEMES.map((t) => ({
  id: t.id,
  slot: "theme" as const,
  group: "Themes" as const,
  name: t.name,
  detail: t.blurb,
  price: 0,
  rarity: "common",
  swatch: t.swatch,
}));

const accentItems: CustomizationItem[] = ACCENTS.map((a) => ({
  id: a.id,
  slot: "accent" as const,
  group: "Accents" as const,
  name: a.name,
  detail: "recolours buttons, links, rings and glyphs — works in light and dark",
  price: 0,
  rarity: "common",
  swatch: a.color,
}));

const effectItems: CustomizationItem[] = [
  { id: "fx-auto", slot: "effect", group: "Effects", name: "Match theme", detail: "use whatever ambience the theme ships with", price: 0, rarity: "common", glyph: "Wand2" },
  { id: "fx-none", slot: "effect", group: "Effects", name: "Clean", detail: "no ambient motion behind the UI", price: 0, rarity: "common", glyph: "Minus" },
  { id: "fx-glow", slot: "effect", group: "Effects", name: "Accent bloom", detail: "a soft breathing halo in the accent colour", price: 140, rarity: "rare", glyph: "Sun" },
  { id: "fx-particles", slot: "effect", group: "Effects", name: "Drifting particles", detail: "slow motes of light float across the ground", price: 220, rarity: "rare", glyph: "Sparkles" },
  { id: "fx-aurora", slot: "effect", group: "Effects", name: "Fast aurora", detail: "the background aurora moves noticeably quicker", price: 200, rarity: "rare", glyph: "Waves" },
  { id: "fx-grain", slot: "effect", group: "Effects", name: "Film grain", detail: "heavy analogue grain over everything", price: 160, rarity: "rare", glyph: "Grip" },
  { id: "fx-scanlines", slot: "effect", group: "Effects", name: "CRT scanlines", detail: "horizontal scanlines and a faint flicker", price: 260, rarity: "epic", glyph: "Monitor" },
];

const avatarItems: CustomizationItem[] = [
  { id: "l-signature", slot: "avatar", group: "Kai", name: "Signature", detail: "the original pink", price: 0, rarity: "common", swatch: "linear-gradient(135deg,#F06CB0,#7A174F)" },
  { id: "l-aurora", slot: "avatar", group: "Kai", name: "Aurora", detail: "pink into cyan", price: 150, rarity: "common", swatch: "linear-gradient(135deg,#D51A7A,#4D7CFF,#83E9F4)" },
  { id: "l-ember", slot: "avatar", group: "Kai", name: "Ember", detail: "coral and amber", price: 150, rarity: "common", swatch: "linear-gradient(135deg,#FF6B4A,#FFB661)" },
  { id: "l-frost", slot: "avatar", group: "Kai", name: "Frost", detail: "cool blue-white", price: 150, rarity: "common", swatch: "linear-gradient(135deg,#83E9F4,#4D7CFF)" },
  { id: "l-nebula", slot: "avatar", group: "Kai", name: "Nebula", detail: "violet and wine", price: 220, rarity: "rare", swatch: "linear-gradient(135deg,#7F60FF,#7A174F)" },
  { id: "l-jade", slot: "avatar", group: "Kai", name: "Jade", detail: "deep green glass", price: 220, rarity: "rare", swatch: "linear-gradient(135deg,#4FD6A6,#1C5C41)" },
  { id: "l-mono", slot: "avatar", group: "Kai", name: "Monochrome", detail: "graphite and chrome", price: 260, rarity: "rare", swatch: "linear-gradient(135deg,#E8E8EC,#4A4A50)" },
  { id: "l-gold", slot: "avatar", group: "Kai", name: "Midas", detail: "molten gold", price: 600, rarity: "epic", swatch: "linear-gradient(135deg,#F5C63C,#8A6A18)" },
  { id: "l-holo", slot: "avatar", group: "Kai", name: "Holographic", detail: "shifting spectrum foil", price: 900, rarity: "legendary", swatch: "linear-gradient(135deg,#FF6CB0,#7BE0FF,#B6FF5C,#9C7BFF)" },
];

const chatItems: CustomizationItem[] = [
  { id: "t-default", slot: "chatTheme", group: "Chat", name: "Default", detail: "soft frosted bubbles", price: 0, rarity: "common", swatch: "linear-gradient(135deg,#3A2233,#241019)" },
  { id: "t-minimal", slot: "chatTheme", group: "Chat", name: "Minimal", detail: "flat, borderless, tight", price: 100, rarity: "common", swatch: "linear-gradient(135deg,#1C1C1F,#111113)" },
  { id: "t-terminal", slot: "chatTheme", group: "Chat", name: "Terminal", detail: "mono type, green cursor", price: 120, rarity: "common", swatch: "linear-gradient(135deg,#0A160A,#3BFF7A)" },
  { id: "t-paper", slot: "chatTheme", group: "Chat", name: "Paper", detail: "warm off-white note cards", price: 160, rarity: "rare", swatch: "linear-gradient(135deg,#E9E3D6,#C7BEA8)" },
  { id: "t-bubblegum", slot: "chatTheme", group: "Chat", name: "Bubblegum", detail: "rounded, bright, playful", price: 160, rarity: "rare", swatch: "linear-gradient(135deg,#FF8AC4,#7BE0FF)" },
  { id: "t-ink", slot: "chatTheme", group: "Chat", name: "Ink", detail: "high-contrast black on cream", price: 200, rarity: "epic", swatch: "linear-gradient(135deg,#F4EEDF,#15130E)" },
];

const profileItems: CustomizationItem[] = [
  // frames
  { id: "fr-none", slot: "frame", group: "Profile", name: "No frame", detail: "plain avatar pebble", price: 0, rarity: "common", glyph: "Circle" },
  { id: "fr-ring", slot: "frame", group: "Profile", name: "Accent ring", detail: "a glowing ring in your accent colour", price: 120, rarity: "common", glyph: "CircleDot" },
  { id: "fr-laurel", slot: "frame", group: "Profile", name: "Laurel", detail: "for people who finish what they start", price: 300, rarity: "rare", glyph: "Award" },
  { id: "fr-flame", slot: "frame", group: "Profile", name: "Streak flame", detail: "animated flame border, unlocks the vibe", price: 350, rarity: "rare", glyph: "Flame" },
  { id: "fr-prism", slot: "frame", group: "Profile", name: "Prism", detail: "rotating spectrum edge", price: 700, rarity: "epic", glyph: "Aperture" },
  { id: "fr-crown", slot: "frame", group: "Profile", name: "Crown", detail: "gold crown notch. subtle. mostly.", price: 1200, rarity: "legendary", glyph: "Crown" },
  // titles
  { id: "ti-none", slot: "title", group: "Profile", name: "No title", detail: "just your name", price: 0, rarity: "common", glyph: "Minus" },
  { id: "ti-earlybird", slot: "title", group: "Profile", name: "“Early Bird”", detail: "shows under your name across the app", price: 150, rarity: "common", glyph: "Sunrise" },
  { id: "ti-ironwilled", slot: "title", group: "Profile", name: "“Iron-Willed”", detail: "shows under your name across the app", price: 150, rarity: "common", glyph: "Dumbbell" },
  { id: "ti-relentless", slot: "title", group: "Profile", name: "“Relentless”", detail: "shows under your name across the app", price: 250, rarity: "rare", glyph: "Zap" },
  { id: "ti-machine", slot: "title", group: "Profile", name: "“The Machine”", detail: "shows under your name across the app", price: 250, rarity: "rare", glyph: "Cpu" },
  { id: "ti-legend", slot: "title", group: "Profile", name: "“Gym Legend”", detail: "you know why", price: 800, rarity: "epic", glyph: "Trophy" },
  // badges
  { id: "bd-none", slot: "badge", group: "Profile", name: "No badge", detail: "no badge next to your name", price: 0, rarity: "common", glyph: "Minus" },
  { id: "bd-spark", slot: "badge", group: "Profile", name: "Spark badge", detail: "a small accent spark by your name", price: 100, rarity: "common", glyph: "Sparkle" },
  { id: "bd-bolt", slot: "badge", group: "Profile", name: "Bolt badge", detail: "a lightning mark by your name", price: 100, rarity: "common", glyph: "Zap" },
  { id: "bd-star", slot: "badge", group: "Profile", name: "Star badge", detail: "a filled star by your name", price: 200, rarity: "rare", glyph: "Star" },
  { id: "bd-diamond", slot: "badge", group: "Profile", name: "Diamond badge", detail: "a cut-gem mark by your name", price: 500, rarity: "epic", glyph: "Gem" },
];

const colorModeItems: CustomizationItem[] = [
  {
    id: "cm-system",
    slot: "colorMode",
    group: "Appearance",
    name: "Follow system",
    detail: "matches your OS light/dark preference automatically",
    price: 0,
    rarity: "common",
    glyph: "Monitor",
  },
  {
    id: "cm-dark",
    slot: "colorMode",
    group: "Appearance",
    name: "Always dark",
    detail: "full dark mode regardless of OS setting",
    price: 0,
    rarity: "common",
    glyph: "Moon",
  },
  {
    id: "cm-light",
    slot: "colorMode",
    group: "Appearance",
    name: "Always light",
    detail: "bright surface mode — your theme's colours carry over",
    price: 0,
    rarity: "common",
    glyph: "Sun",
  },
];

const fontItems: CustomizationItem[] = [
  {
    id: "fn-system",
    slot: "font",
    group: "Font",
    name: "System default",
    detail: "the OS system sans-serif, clean and familiar",
    price: 0,
    rarity: "common",
    glyph: "Type",
  },
  {
    id: "fn-mono",
    slot: "font",
    group: "Font",
    name: "Monospace",
    detail: "all UI text in monospace — terminal energy",
    price: 80,
    rarity: "rare",
    glyph: "Terminal",
  },
  {
    id: "fn-rounded",
    slot: "font",
    group: "Font",
    name: "Rounded",
    detail: "Nunito — soft rounded letterforms, warm and approachable",
    price: 120,
    rarity: "rare",
    glyph: "Circle",
  },
  {
    id: "fn-serif",
    slot: "font",
    group: "Font",
    name: "Serif",
    detail: "DM Serif Display — editorial, bold, confident headings",
    price: 140,
    rarity: "rare",
    glyph: "BookOpen",
  },
];

export const customizationItems: CustomizationItem[] = [
  ...themeItems,
  ...accentItems,
  ...effectItems,
  ...avatarItems,
  ...chatItems,
  ...profileItems,
  ...colorModeItems,
  ...fontItems,
];

export type GoalTone = "pink" | "cyan" | "lime" | "amber" | "mauve" | "violet";
export type Goal = {
  id: string;
  label: string;
  value: number;
  max: number;
  tone: GoalTone;
  unit: string;
  cadence: "daily" | "weekly";
  streak: number;
  eta: string;
};

export const goals: Goal[] = [
  { id: "workouts", label: "Weekly workouts", value: 4, max: 5, tone: "pink", unit: "sessions", cadence: "weekly", streak: 6, eta: "on track for saturday" },
  { id: "protein", label: "Protein today", value: 132, max: 165, tone: "lime", unit: "g", cadence: "daily", streak: 3, eta: "33 g to go" },
  { id: "steps", label: "Daily steps", value: 10240, max: 10000, tone: "cyan", unit: "steps", cadence: "daily", streak: 11, eta: "goal reached" },
  { id: "sleep", label: "Sleep", value: 7.3, max: 8, tone: "violet", unit: "h", cadence: "daily", streak: 4, eta: "42 min short" },
];

/* ---- streak / achievements --------------------------------------------- */

export const streakData = {
  days: 14,
  best: 14,
  weekTarget: 5,
  weekDone: 4,
  // last 7 days: true = trained
  week: [true, true, false, true, true, true, false],
};

export const achievements = [
  { id: "pr-bench", title: "New bench PR", detail: "195 lb × 3", date: "Aug 12", unlocked: true, icon: "trophy" as const },
  { id: "streak-14", title: "14-day streak", detail: "Longest yet", date: "Aug 29", unlocked: true, icon: "flame" as const },
  { id: "consistency", title: "30 active days", detail: "23 / 30 this month", date: "in progress", unlocked: false, icon: "calendar" as const },
  { id: "volume-1m", title: "1,000,000 lb moved", detail: "842k / 1M all-time", date: "in progress", unlocked: false, icon: "dumbbell" as const },
];
