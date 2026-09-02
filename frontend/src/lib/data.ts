import { THEMES } from "./themes";
import { ACCENTS } from "./themes";

export const user = { name: "Alex", greeting: "Good morning" };

export const todayWorkout = {
  name: "Upper Body Push",
  duration: "~45 min",
  exercises: 6,
  muscles: ["Chest", "Shoulders", "Triceps"],
};

export const trainerMessage =
  "Your legs are still recovering from Tuesday's session, so today's upper push should feel strong. Aim to beat 9 reps on your top bench set.";

export const weeklyRing = { done: 3, target: 5 };
export const readiness = 78;
export const streakDays = 14;

export const recentPRs = [
  { lift: "Bench Press", detail: "185 lb × 5", delta: "+2.5 kg" },
  { lift: "Back Squat", detail: "275 lb × 3", delta: "+5 kg" },
];

export const homeStats = [
  {
    label: "Weekly Volume",
    value: "48.2",
    unit: "k lb",
    identity: "jade" as const,
    spark: [0.4, 0.55, 0.5, 0.7, 0.65, 0.85, 0.9],
  },
  {
    label: "Avg Form Score",
    value: "87",
    unit: "%",
    identity: "chartreuse" as const,
    spark: [0.5, 0.6, 0.58, 0.7, 0.75, 0.8, 0.87],
  },
  {
    label: "Streak",
    value: "14",
    unit: "days",
    identity: "aurum" as const,
    spark: [0.3, 0.4, 0.5, 0.6, 0.7, 0.85, 1],
  },
];

// 14-point mock trends for the dashboard mini-charts
export const trends = {
  volume: [0.32, 0.4, 0.37, 0.5, 0.44, 0.56, 0.5, 0.62, 0.57, 0.71, 0.66, 0.83, 0.79, 0.92],
  form: [0.5, 0.55, 0.52, 0.6, 0.57, 0.64, 0.61, 0.7, 0.72, 0.75, 0.72, 0.8, 0.83, 0.87],
  streak: [0.18, 0.28, 0.34, 0.3, 0.44, 0.5, 0.55, 0.6, 0.66, 0.72, 0.79, 0.86, 0.93, 1],
  readiness: [0.55, 0.62, 0.58, 0.68, 0.72, 0.65, 0.74, 0.7, 0.79, 0.76, 0.82, 0.8, 0.74, 0.78],
};

export const upcomingWorkouts = [
  { day: "Tomorrow", name: "Lower Body", muscles: ["Quads", "Glutes", "Hamstrings"] },
  { day: "Thursday", name: "Upper Body Pull", muscles: ["Back", "Biceps", "Rear Delts"] },
  { day: "Saturday", name: "Full Body + Conditioning", muscles: ["Full body"] },
];

export const program = {
  name: "Hypertrophy Block · Week 4 of 8",
  split: "Push / Pull / Legs · 5 days",
};

export const activeSession = {
  name: "Upper Body Push",
  elapsed: "32:14",
  totalVolume: 24680,
  exercises: [
    {
      name: "Barbell Bench Press",
      target: "4 × 8–10",
      done: true,
      sets: [
        { w: 175, r: 10, rpe: 7 },
        { w: 185, r: 9, rpe: 8 },
        { w: 185, r: 8, rpe: 9 },
        { w: 185, r: 8, rpe: 9 },
      ],
    },
    {
      name: "Incline Dumbbell Press",
      target: "4 × 8–10",
      done: true,
      sets: [
        { w: 70, r: 10, rpe: 7 },
        { w: 70, r: 9, rpe: 8 },
        { w: 70, r: 8, rpe: 8 },
        { w: 65, r: 9, rpe: 9 },
      ],
    },
    {
      name: "Cable Fly",
      target: "3 × 12–15",
      current: true,
      sets: [
        { w: 35, r: 15, rpe: 7 },
        { w: 35, r: 13, rpe: 8 },
        { w: null, r: null, rpe: null },
      ],
    },
    { name: "Overhead Press", target: "4 × 8–10", sets: [] },
    { name: "Lateral Raise", target: "3 × 15", sets: [] },
    { name: "Triceps Rope Pushdown", target: "3 × 12–15", sets: [] },
  ],
};

export const muscleActivation: Record<string, number> = {
  chest: 0.95,
  shoulders: 0.8,
  triceps: 0.7,
  abs: 0.3,
  biceps: 0.1,
  quads: 0.05,
  back: 0.15,
  glutes: 0.0,
  hamstrings: 0.0,
  calves: 0.0,
};

export const rankedMuscles = [
  { name: "Chest", pct: 95, trend: [0.5, 0.6, 0.7, 0.8, 0.95] },
  { name: "Shoulders", pct: 80, trend: [0.4, 0.5, 0.6, 0.7, 0.8] },
  { name: "Quads", pct: 72, trend: [0.6, 0.65, 0.6, 0.7, 0.72] },
  { name: "Back", pct: 64, trend: [0.5, 0.55, 0.6, 0.58, 0.64] },
  { name: "Hamstrings", pct: 38, trend: [0.5, 0.4, 0.42, 0.35, 0.38] },
  { name: "Calves", pct: 22, trend: [0.3, 0.25, 0.2, 0.22, 0.22] },
];

export const strengthSeries = [
  { label: "Bench Press", e1rm: 232, data: [200, 205, 210, 208, 218, 224, 232] },
  { label: "Back Squat", e1rm: 315, data: [270, 280, 285, 295, 300, 308, 315] },
  { label: "Deadlift", e1rm: 405, data: [350, 360, 370, 375, 388, 396, 405] },
];

export const progressSummary =
  "Over the last 8 weeks you've added 12% to your bench press, trained 4 days a week without a missed session, and your squat form score climbed from 64 to 81. Your posterior chain volume is still trailing, so next week's plan front-loads back and hamstring work.";

export const exercises = [
  { name: "Barbell Bench Press", muscle: "Chest", equipment: "Barbell", level: "Intermediate", camera: true },
  { name: "Back Squat", muscle: "Quads", equipment: "Barbell", level: "Intermediate", camera: true },
  { name: "Conventional Deadlift", muscle: "Back", equipment: "Barbell", level: "Advanced", camera: true },
  { name: "Pull-up", muscle: "Lats", equipment: "Bodyweight", level: "Intermediate", camera: true },
  { name: "Overhead Press", muscle: "Shoulders", equipment: "Barbell", level: "Intermediate", camera: true },
  { name: "Romanian Deadlift", muscle: "Hamstrings", equipment: "Barbell", level: "Intermediate", camera: true },
  { name: "Dumbbell Row", muscle: "Back", equipment: "Dumbbell", level: "Beginner", camera: true },
  { name: "Goblet Squat", muscle: "Quads", equipment: "Dumbbell", level: "Beginner", camera: true },
  { name: "Bicep Curl", muscle: "Biceps", equipment: "Dumbbell", level: "Beginner", camera: true },
  { name: "Lateral Raise", muscle: "Shoulders", equipment: "Dumbbell", level: "Beginner", camera: false },
  { name: "Cable Fly", muscle: "Chest", equipment: "Cable", level: "Beginner", camera: false },
  { name: "Plank", muscle: "Core", equipment: "Bodyweight", level: "Beginner", camera: true },
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

/* ---- dashboard: context, insights, goals, weekly summary ------------------ */

export const dashboardMetrics = {
  volume: { value: "48.2", unit: "k lb this week", delta: { text: "+8% vs last week", dir: "up" as const } },
  form: { value: "87", unit: "% clean reps", delta: { text: "+3 pts vs 30-day avg", dir: "up" as const } },
  streak: {
    value: 14,
    unit: "day workout streak",
    delta: { text: "personal best", dir: "up" as const },
    goal: { value: 4, max: 5, suffix: "this wk" },
  },
  readinessTrend: { value: 78, unit: "readiness · 14-day", delta: { text: "-4 vs 30-day avg", dir: "warn" as const } },
};

export const weeklySummary = {
  stats: [
    { id: "workouts", label: "workouts", value: "4", delta: "+1", spark: [0.4, 0.6, 0.5, 0.8, 0.7, 1, 0.9], detail: "week" },
    { id: "volume", label: "volume lb", value: "148k", delta: "+12%", spark: [0.5, 0.55, 0.5, 0.7, 0.66, 0.85, 1], detail: "volume" },
    { id: "form", label: "avg form", value: "87%", delta: "+3", spark: [0.6, 0.62, 0.58, 0.72, 0.75, 0.8, 0.87], detail: "form" },
    { id: "sleep", label: "sleep avg", value: "7h 18m", delta: "+22m", spark: [0.6, 0.5, 0.7, 0.65, 0.8, 0.78, 0.9], detail: null },
  ],
  takeaway: "Recovery improved 1.2% and your training volume is up. Next week front-loads pull work.",
};

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

export const infoCopy: Record<string, string> = {
  readiness:
    "A 0–100 score blending last night's sleep, HRV, resting heart rate and yesterday's training strain. Higher means you're primed to train hard.",
  volume: "Total weight moved across all working sets this week (sets × reps × load).",
  form: "Average camera form score across every rep this week. 100 is textbook range of motion and tempo.",
  streak: "Consecutive days with a logged workout. Rest days you scheduled don't break it.",
};

/* week chart — this-week vs last-week training volume for the dashboard area chart */
export const weekChart = {
  days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
  thisWeek: [3200, 5400, 4100, 6800, 5200, 7600, 4800],
  lastWeek: [2800, 4200, 3900, 5100, 4800, 5600, 4300],
};

export const ringStats = [
  { id: "readiness", label: "readiness", value: "78", pct: 78, tone: "pink" as const, sub: "cleared to train" },
  { id: "volume", label: "weekly volume", value: "48.2k", pct: 82, tone: "cyan" as const, sub: "lb this week" },
  { id: "form", label: "avg form", value: "87%", pct: 87, tone: "lime" as const, sub: "+3 pts" },
];

export const progressStats = [
  { id: "week", label: "weekly goal", value: "4 / 5", delta: "+1", pct: 0.8, tone: "pink" as const },
  { id: "protein", label: "protein today", value: "132 g", delta: "80%", pct: 0.8, tone: "lime" as const },
];

/* ---- coins + trainer store --------------------------------------------- */

export const wallet = {
  balance: 720,
  earnedThisWeek: 180,
  recent: [
    { label: "5-workout week", amount: 60 },
    { label: "14-day streak", amount: 80 },
    { label: "protein goal · 4 days", amount: 40 },
  ],
};

export type StoreCategory = "voice" | "personality" | "look" | "theme";

export type StoreItem = {
  id: string;
  category: StoreCategory;
  name: string;
  detail: string;
  price: number;
  owned?: boolean;
  equipped?: boolean;
  /** personality presets set the coaching-style sliders */
  style?: { directness: number; warmth: number; detail: number; intensity: number; humor: number };
  swatch?: string;
};

export const storeItems: StoreItem[] = [
  // voices
  { id: "v-marcus", category: "voice", name: "Marcus", detail: "warm, measured baritone", price: 0, owned: true, equipped: true },
  { id: "v-nova", category: "voice", name: "Nova", detail: "bright, quick, energetic", price: 280 },
  { id: "v-atlas", category: "voice", name: "Atlas", detail: "deep, calm, deliberate", price: 320 },
  { id: "v-sable", category: "voice", name: "Sable", detail: "low, dry, understated", price: 360 },

  // personalities (preset the coaching sliders)
  {
    id: "p-drill", category: "personality", name: "Drill Sergeant", detail: "blunt, relentless, no excuses",
    price: 500, style: { directness: 0.95, warmth: 0.2, detail: 0.5, intensity: 0.95, humor: 0.15 },
  },
  {
    id: "p-zen", category: "personality", name: "The Zen Coach", detail: "patient, encouraging, low-pressure",
    price: 500, style: { directness: 0.4, warmth: 0.9, detail: 0.6, intensity: 0.3, humor: 0.45 },
  },
  {
    id: "p-analyst", category: "personality", name: "The Analyst", detail: "numbers-first, precise, thorough",
    price: 500, style: { directness: 0.7, warmth: 0.4, detail: 0.98, intensity: 0.5, humor: 0.2 },
  },
  {
    id: "p-hype", category: "personality", name: "Hype Squad", detail: "loud, positive, big energy",
    price: 500, style: { directness: 0.6, warmth: 0.85, detail: 0.4, intensity: 0.8, humor: 0.8 },
  },

  // looks (Kai's avatar gradient)
  { id: "l-signature", category: "look", name: "Signature", detail: "the original pink", price: 0, owned: true, equipped: true, swatch: "linear-gradient(135deg,#F06CB0,#7A174F)" },
  { id: "l-aurora", category: "look", name: "Aurora", detail: "pink into cyan", price: 150, swatch: "linear-gradient(135deg,#D51A7A,#4D7CFF,#83E9F4)" },
  { id: "l-ember", category: "look", name: "Ember", detail: "coral and amber", price: 150, swatch: "linear-gradient(135deg,#FF6B4A,#FFB661)" },
  { id: "l-frost", category: "look", name: "Frost", detail: "cool blue-white", price: 150, swatch: "linear-gradient(135deg,#83E9F4,#4D7CFF)" },
  { id: "l-nebula", category: "look", name: "Nebula", detail: "violet and wine", price: 220, swatch: "linear-gradient(135deg,#7F60FF,#7A174F)" },

  // chat themes
  { id: "t-default", category: "theme", name: "Default", detail: "soft frosted bubbles", price: 0, owned: true, equipped: true },
  { id: "t-minimal", category: "theme", name: "Minimal", detail: "flat, no borders, tight", price: 100 },
  { id: "t-terminal", category: "theme", name: "Terminal", detail: "mono type, green cursor", price: 120 },
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

const RARITY_FROM_THEME: Record<string, CustomizationRarity> = {
  free: "common", rare: "rare", epic: "epic", legendary: "legendary",
};

const themeItems: CustomizationItem[] = THEMES.map((t) => ({
  id: t.id,
  slot: "theme" as const,
  group: "Themes" as const,
  name: t.name,
  detail: t.blurb,
  price: t.price,
  rarity: RARITY_FROM_THEME[t.rarity],
  swatch: t.swatch,
}));

const accentItems: CustomizationItem[] = ACCENTS.map((a) => ({
  id: a.id,
  slot: "accent" as const,
  group: "Accents" as const,
  name: a.name,
  detail: a.price === 0 ? "the built-in accent" : "recolours buttons, links, rings and glyphs app-wide",
  price: a.price,
  rarity: a.price >= 200 ? "rare" : "common",
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
    detail: "bright surface mode — pairs with Cloud or Warm Dusk themes",
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

/* ---- metric deep-dive content (DetailDrawer) --------------------------- */

export const metricDetails: Record<
  string,
  {
    eyebrow: string;
    title: string;
    value: string;
    unit: string;
    chart: number[];
    color: string;
    mode: "curve" | "bars";
    factors: { label: string; value: string; fraction: number }[];
    recommendation: string;
    to: string;
  }
> = {
  readiness: {
    eyebrow: "today · 0–100",
    title: "readiness",
    value: "78",
    unit: "cleared to train hard",
    chart: trends.readiness,
    color: "var(--accent-pink)",
    mode: "curve",
    factors: [
      { label: "sleep", value: "7h 18m · good", fraction: 0.82 },
      { label: "hrv", value: "68 ms · +6 vs avg", fraction: 0.74 },
      { label: "resting hr", value: "52 bpm · steady", fraction: 0.66 },
      { label: "prior-day strain", value: "moderate", fraction: 0.48 },
    ],
    recommendation: "Sleep and HRV are carrying the score. Full-intensity training is cleared, but keep an eye on the top set RPE.",
    to: "/progress",
  },
  volume: {
    eyebrow: "this week",
    title: "weekly volume",
    value: "48.2k",
    unit: "lb lifted · +8% vs last week",
    chart: trends.volume,
    color: "var(--accent-cyan)",
    mode: "bars",
    factors: [
      { label: "push", value: "21.4k lb", fraction: 0.9 },
      { label: "pull", value: "14.1k lb", fraction: 0.58 },
      { label: "legs", value: "12.7k lb", fraction: 0.52 },
    ],
    recommendation: "Push volume is running ahead of pull. Next week's plan front-loads back and hamstring work to even it out.",
    to: "/progress",
  },
  form: {
    eyebrow: "this week · camera-scored",
    title: "avg form",
    value: "87%",
    unit: "clean reps · +3 pts vs 30-day avg",
    chart: trends.form,
    color: "var(--accent-lime)",
    mode: "curve",
    factors: [
      { label: "range of motion", value: "91% of target", fraction: 0.91 },
      { label: "tempo control", value: "85%", fraction: 0.85 },
      { label: "bar path", value: "82%", fraction: 0.82 },
    ],
    recommendation: "Tempo is the weak link, mostly on the eccentric. A 3-second lower on your first two sets should lift this to 90%.",
    to: "/progress",
  },
  streak: {
    eyebrow: "consecutive days",
    title: "day streak",
    value: "14",
    unit: "days · personal best",
    chart: trends.streak,
    color: "var(--accent-amber)",
    mode: "bars",
    factors: [
      { label: "this week", value: "4 / 5 sessions", fraction: 0.8 },
      { label: "this month", value: "23 active days", fraction: 0.77 },
      { label: "adherence", value: "82% of plan", fraction: 0.82 },
    ],
    recommendation: "Two more sessions this week keeps the weekly target intact. Tomorrow's Lower Body is the natural next one.",
    to: "/progress",
  },
  week: {
    eyebrow: "this week",
    title: "this week",
    value: "3 / 5",
    unit: "sessions completed",
    chart: [0.2, 0.4, 0.4, 0.6, 0.6, 0.6, 0.6],
    color: "var(--accent-mauve)",
    mode: "bars",
    factors: [
      { label: "completed", value: "mon, wed, fri", fraction: 0.6 },
      { label: "remaining", value: "sat · sun", fraction: 0.4 },
      { label: "vs last week", value: "+1 session", fraction: 0.8 },
    ],
    recommendation: "You're one session ahead of last week's pace. Saturday's Full Body + Conditioning closes the target.",
    to: "/workouts",
  },
};
