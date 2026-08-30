#!/usr/bin/env python3
"""Forma - Design Inspection PDF generator."""
import os
from PIL import Image, ImageDraw, ImageFont
from fpdf import FPDF

HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(HERE, "shots")
OUT = os.path.join(HERE, "Forma-Design-Inspection.pdf")

INK = (245, 244, 240)
DIM = (155, 154, 163)
GROUND = (10, 10, 12)
SURFACE = (22, 22, 26)
ION = (76, 99, 255)
LINE = (43, 43, 50)

# ---------------------------------------------------------------- palette swatch
PALETTE = [
    ("ground",      "#0A0A0C", "App / screen background"),
    ("surface",     "#16161A", "Card background"),
    ("surface-2",   "#1E1E24", "Raised / nested surface"),
    ("line",        "#2B2B32", "Hairline borders"),
    ("ink",         "#F5F4F0", "Primary text (warm off-white)"),
    ("ink-dim",     "#9B9AA3", "Secondary text"),
    ("ink-faint",   "#5B5A62", "Tertiary / disabled"),
    ("ion",         "#4C63FF", "Signature accent - interactive chrome ONLY"),
    ("ion-soft",    "#7C8CFF", "Hover / pressed tint"),
    ("ember",       "#FF8A5B to #C2410C", "Effort / heart rate / intensity"),
    ("chartreuse",  "#DEF76B to #7FA829", "Form score / movement quality"),
    ("orchid",      "#CB63FF to #6E2C91", "Recovery / readiness"),
    ("jade",        "#52E3B4 to #0E8F6D", "Muscle activation / training volume"),
    ("aurum",       "#FFCE5C to #B87F1B", "Streaks / consistency / achievements"),
]

def hex2rgb(h):
    h = h.strip().lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def build_palette_png(path):
    row_h, w = 92, 1400
    img = Image.new("RGB", (w, row_h * len(PALETTE) + 20), GROUND)
    d = ImageDraw.Draw(img)
    try:
        fb = ImageFont.truetype("arialbd.ttf", 26)
        fr = ImageFont.truetype("arial.ttf", 22)
        fm = ImageFont.truetype("consola.ttf", 20)
    except Exception:
        fb = fr = fm = ImageFont.load_default()
    y = 10
    for name, val, use in PALETTE:
        if "to" in val:
            a, b = [hex2rgb(x) for x in val.split("to")]
            for i in range(160):
                t = i / 159
                col = tuple(int(a[k] + (b[k] - a[k]) * t) for k in range(3))
                d.rectangle([40 + i, y + 16, 41 + i, y + row_h - 16], fill=col)
        else:
            d.rounded_rectangle([40, y + 16, 200, y + row_h - 16], radius=14,
                                fill=hex2rgb(val), outline=LINE)
        d.text((230, y + 20), name, font=fb, fill=INK)
        d.text((230, y + 52), val, font=fm, fill=DIM)
        d.text((620, y + 34), use, font=fr, fill=DIM)
        y += row_h
    img.save(path)

PALETTE_PNG = os.path.join(HERE, "_palette.png")
build_palette_png(PALETTE_PNG)

# ---------------------------------------------------------------- pdf
PW, PH = 297, 210          # A4 landscape (mm)
M = 16

class PDF(FPDF):
    def header(self):
        pass
    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(120)
        self.cell(0, 8, f"Forma - Design Inspection    -    {self.page_no()}",
                  align="C")

pdf = PDF(orientation="L", unit="mm", format="A4")
pdf.set_auto_page_break(False)
pdf.set_title("Forma - Design Inspection")

def bg(r=10, g=10, b=12):
    pdf.set_fill_color(r, g, b)
    pdf.rect(0, 0, PW, PH, "F")

def h1(t, y=None):
    if y is not None: pdf.set_y(y)
    pdf.set_x(M)
    pdf.set_font("Helvetica", "B", 24)
    pdf.set_text_color(*INK)
    pdf.multi_cell(PW - 2 * M, 10, t)

def eyebrow(t):
    pdf.set_x(M)
    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(124, 140, 255)
    pdf.cell(0, 6, t.upper())
    pdf.ln(7)

def body(t, size=11, color=DIM, gap=5.4):
    pdf.set_x(M)
    pdf.set_font("Helvetica", "", size)
    pdf.set_text_color(*color)
    pdf.multi_cell(PW - 2 * M, gap, t)

def bullets(items, color=DIM):
    pdf.set_font("Helvetica", "", 10.5)
    for it in items:
        pdf.set_x(M + 2)
        pdf.set_text_color(124, 140, 255)
        pdf.cell(5, 5.2, "-")
        pdf.set_text_color(*color)
        pdf.multi_cell(PW - 2 * M - 7, 5.2, it)
    pdf.ln(1)

def shot_page(fname, title, notes):
    pdf.add_page(); bg()
    eyebrow("Screen")
    h1(title)
    pdf.ln(2)
    img = os.path.join(SHOTS, fname)
    iw, ih = Image.open(img).size
    avail_w = PW - 2 * M - 96
    avail_h = PH - 46
    scale = min(avail_w / iw, avail_h / ih)
    w, h = iw * scale, ih * scale
    x = M
    y = 42
    # frame
    pdf.set_draw_color(*LINE)
    pdf.set_fill_color(0, 0, 0)
    pdf.rect(x - 1.5, y - 1.5, w + 3, h + 3, "DF")
    pdf.image(img, x=x, y=y, w=w, h=h)
    # notes column
    nx = x + w + 10
    pdf.set_xy(nx, y)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*INK)
    pdf.cell(PW - nx - M, 6, "Notes")
    pdf.ln(7)
    pdf.set_font("Helvetica", "", 9.3)
    for n in notes:
        pdf.set_x(nx)
        pdf.set_text_color(124, 140, 255); pdf.cell(4, 4.8, ">")
        pdf.set_text_color(*DIM)
        pdf.multi_cell(PW - nx - M, 4.8, n)
        pdf.ln(0.6)

# ---- cover
pdf.add_page(); bg(8, 8, 11)
pdf.set_fill_color(*ION)
pdf.rect(0, 0, 4, PH, "F")
pdf.set_xy(M, 66)
pdf.set_font("Helvetica", "B", 46)
pdf.set_text_color(*INK)
pdf.cell(0, 20, "Forma")
pdf.ln(22)
pdf.set_x(M)
pdf.set_font("Helvetica", "", 17)
pdf.set_text_color(*DIM)
pdf.cell(0, 10, "AI Personal Trainer  -  Web App  -  Design Inspection")
pdf.ln(20)
pdf.set_x(M); pdf.set_font("Helvetica", "", 10.5); pdf.set_text_color(150)
pdf.multi_cell(PW - 2*M - 80, 5.6,
   "A visual and systemic review of the redesigned Forma web app: a premium "
   "marketing landing page plus the full logged-in product surface (dashboard, "
   "workouts, AI trainer, 3D muscle map, progress). Built with Vite + React + "
   "TypeScript + Tailwind. Dark-first, editorial, Apple/Linear-tier language.")
pdf.ln(4)
pdf.set_x(M); pdf.set_font("Courier", "", 9); pdf.set_text_color(110)
pdf.multi_cell(0, 5, "Generated 2026-08-28  -  viewport captures 1440x900 (desktop) & 390x844 (mobile)")

# ---- design language
pdf.add_page(); bg()
eyebrow("Design language")
h1("The system in one page")
pdf.ln(2)
body("One idea carried through every surface: the single most important number "
     "on a screen is rendered as a grid of glowing dots - an instrument readout, "
     "not a label - and kept rare (one per screen, maximum). Everything else "
     "supports that: near-black ground, one cobalt accent reserved strictly for "
     "interactive chrome, and five saturated gradient identities used only on "
     "data cards.", color=INK, gap=5.6)
pdf.ln(3)
two = [
 ("Typography",
  ["Manrope (voice) - headings 550-650 weight, tracking -0.03em, short measures",
   "JetBrains Mono (data) - every number, unit, eyebrow, timestamp; tabular figures",
   "Hero clamp(44-92px); section heads clamp(30-56px); body 17-21px"]),
 ("Shape & depth",
  ["Radius scale: 12 (chips) / 24 (cards) / 28-32 (hero) / 40-48 (bezel) / 999 (pills)",
   "Double-bezel: machined outer tray (p-6, hairline) + inner core with inset highlight",
   "Flat 3-step surface ladder - no Material drop shadows; one soft glow per view"]),
 ("Colour roles",
  ["ion #4C63FF - buttons, active nav, focus, links, brand ONLY (never a card fill)",
   "ember / chartreuse / orchid / jade / aurum - data cards & badges ONLY",
   "Gradient tiles: hue blooms at the edges, clear near-black centre (inverse vignette)"]),
 ("Motion",
  ["Easing cubic-bezier(0.22,1,0.36,1) and (0.32,0.72,0,1) - never linear / ease-in-out",
   "Scroll reveal: fade + 24px rise + 6px deblur, IntersectionObserver (no scroll listener)",
   "Button-in-button: nested icon translates diagonally on hover; press scales 0.98",
   "prefers-reduced-motion fully respected (reveals + drift freeze)"]),
]
for t, items in two:
    pdf.set_x(M); pdf.set_font("Helvetica", "B", 12); pdf.set_text_color(*INK)
    pdf.cell(0, 7, t); pdf.ln(7.5)
    bullets(items)

# ---- palette
pdf.add_page(); bg()
eyebrow("Colour scheme")
h1("Tokens")
pdf.ln(2)
iw, ih = Image.open(PALETTE_PNG).size
w = PW - 2 * M
h = ih * (w / iw)
if h > PH - 44:
    h = PH - 44; w = iw * (h / ih)
pdf.image(PALETTE_PNG, x=M, y=40, w=w, h=h)

# ---- components
pdf.add_page(); bg()
eyebrow("Component library")
h1("Reusable parts")
pdf.ln(2)
comps = [
 ("InstrumentReadout", "Dot-matrix hero numeral. 5x7 filled-circle glyphs, vertical "
  "identity gradient, soft glow. role=img with aria-label. One per screen. "
  "Used: hero est. duration, active-workout total volume, progress e1RM."),
 ("StatCard", "Gradient identity tile - mono eyebrow, tabular value + unit, optional "
  "sparkline. Edge-bloom / clear-centre fill, inset top highlight."),
 ("RingGauge", "46 discrete dots around a circle; filled arc in identity colour, "
  "mono numeral + '/100' centre. Readiness (orchid) on the dashboard."),
 ("MuscleMap", "Lightweight 2D SVG stand-in for the body. Ion ramp neutral to ion "
  "by activation 0-1. Kept for small thumbnails (Home, bento)."),
 ("BodyMuscles  [body-muscles npm]", "React wrapper around the imperative "
  "BodyChart class - 70+ anatomical muscle regions, 0-10 intensity heatmap "
  "(slate to yellow to red), clickable, front/back. Our simple {group:0..1} model "
  "is expanded to per-side muscle ids. Used on the Body page + landing body section."),
 ("DitheringImage  [framer.com/m/DitheringHover]", "Vendored Framer component: "
  "an image with a Bayer-8 dithered radial zone (ragged fringe) that tracks the "
  "cursor on a canvas. Drives the landing product-demo screenshot inside the "
  "browser frame. framer runtime shimmed locally; framer-motion springs kept."),
 ("ScreenCarousel  [framer.com/m/infinite-3d-carousel]", "Vendored Framer "
  "component: draggable + auto-playing 3D coverflow with perspective, per-card "
  "depth blur and edge fade, momentum, keyboard + pointer, reduced-motion aware. "
  "New landing section cycling five real app screenshots."),
 ("GlassFooter", "Liquid-glass footer panel - layered translucency, a specular "
  "sweep across the top edge, a violet refracted rim, inner floor shadow, "
  "backdrop-blur (single element). Newsletter field + button-in-button, glass "
  "social chips, link columns. Built in-house; see note on the Framer module."),
 ("PillSelector", "Single pill track, mono labels, filled ion active pill with glow. "
  "Today/Week/Month, Front/Back, Workouts sub-tabs."),
 ("Double-Bezel", "Outer tray (.bezel: p-6, r-40, hairline) + inner core "
  "(r-34, inset 0 1px white/12). Wraps the feature card and the browser frame."),
 ("Cta (button-in-button)", "Pill, pl-8 pr-2, trailing arrow nested in its own "
  "circle; hover lifts -2px, icon shifts diagonally, active scale 0.98."),
 ("Floating nav", "Detached glass pill, w-max, sentinel-driven scroll state "
  "(no scroll listener); hamburger morphs to X; full-screen overlay with "
  "staggered link reveal."),
 ("Reveal", "IntersectionObserver wrapper - fade+rise+deblur over 600ms, "
  "2.5s failsafe so content is never stuck hidden, reduced-motion aware."),
 ("AppShell", "Persistent left sidebar (at least 768px) / floating bottom tab bar (<768px) "
  "- mirrors the native apps' 5-tab IA; Exercise Library promoted on web."),
]
pdf.set_font("Helvetica", "", 9.6)
for name, desc in comps:
    pdf.set_x(M)
    pdf.set_font("Helvetica", "B", 10); pdf.set_text_color(*INK)
    pdf.cell(0, 5.6, name); pdf.ln(5.4)
    pdf.set_x(M + 3)
    pdf.set_font("Helvetica", "", 9.4); pdf.set_text_color(*DIM)
    pdf.multi_cell(PW - 2 * M - 3, 4.7, desc)
    pdf.ln(1.6)

# ---- interactions
pdf.add_page(); bg()
eyebrow("Interactions")
h1("Behaviour")
pdf.ln(2)
bullets([
 "Nav: transparent at the top; on scroll past an 8px sentinel it fades in the glass "
 "fill, hairline and a soft 70px shadow over 500ms.",
 "Hamburger to X: the two bars rotate +/-45deg and converge; the overlay's links "
 "fade-rise with 60ms stagger; 'Open app' last.",
 "Primary CTAs: hover raises the pill 2px and pushes the nested arrow circle "
 "diagonally out; press scales the whole control to 0.98.",
 "Scroll: every major block enters with a heavy fade-up + deblur; staggered by "
 "60-220ms within a section. Freezes entirely under Reduce Motion.",
 "Camera hand-off: choosing camera mode in an active workout opens a centred "
 "'Continue on your phone' modal - QR + short link + plain-language reason.",
 "Trainer chat: tapping a suggested prompt or sending a message appends a user "
 "bubble and a trainer reply; sliders show the five coaching-style dials.",
 "Ambient glow: one blurred orb per view drifts slowly (14s) behind the hero "
 "content; never a full-screen wash.",
])
pdf.ln(2)
eyebrow("Responsive")
bullets([
 "Breakpoints 640 / 1024 / 1440. Sidebar to bottom tab bar under 768px.",
 "Bento collapses to a single column; metrics go 2x2; hero CTAs stack full-width.",
 "Hero keeps full type scale on mobile - not a shrunk desktop layout.",
 "min-h-[100dvh] (not h-screen) to avoid iOS Safari viewport jump.",
])

# ---- skill compliance
pdf.add_page(); bg()
eyebrow("Audit")
h1("high-end-visual-design checklist")
pdf.ln(2)
checks = [
 ("Banned fonts (Inter/Roboto/Arial/Helvetica)", "PASS - Manrope + JetBrains Mono, self-hosted via Google Fonts"),
 ("Banned harsh borders / dark drop shadows", "PASS - hairline white/8 borders, inset highlights, one soft glow"),
 ("Edge-to-edge sticky navbar", "PASS - detached floating glass pill, w-max, mt-4"),
 ("Vibe + layout archetype chosen", "PASS - Ethereal Glass + Asymmetrical Bento"),
 ("Double-bezel nested architecture", "PARTIAL - feature card + browser frame; not every card"),
 ("Button-in-button trailing icon", "PASS - Cta component + nav 'Open app'"),
 ("Section padding at least  py-24", "PASS - py-24 / sm:py-32 / lg:py-40"),
 ("Custom cubic-bezier only", "PASS - .ease-fluid + reveal easing; no linear/ease-in-out"),
 ("Scroll entry animations", "PASS - Reveal on every block"),
 ("Collapses to single column < 768px", "PASS"),
 ("Animate transform/opacity only", "PASS - no width/height/top animation"),
 ("backdrop-blur only on fixed/sticky", "PASS - .glass on nav + overlay only; .panel-tr (no blur) in content"),
 ("Grain overlay fixed + pointer-events-none", "PASS - position:fixed pseudo-element"),
 ("No scroll listener", "PASS - IntersectionObserver sentinel"),
]
pdf.set_font("Helvetica", "", 9.3)
for k, v in checks:
    pdf.set_x(M)
    ok = v.startswith("PASS")
    pdf.set_text_color(*(hex2rgb("7FA829") if ok else hex2rgb("FF8A5B")))
    pdf.cell(6, 5, "OK" if ok else "~")
    pdf.set_text_color(*INK); pdf.set_font("Helvetica", "B", 9.3)
    pdf.cell(96, 5, k[:52])
    pdf.set_font("Helvetica", "", 9.3); pdf.set_text_color(*DIM)
    pdf.multi_cell(PW - 2*M - 102, 5, v)
pdf.ln(3)
eyebrow("Open follow-ups")
bullets([
 "Extend the double-bezel to bento + dashboard cards for full consistency.",
 "Gradient-tile centre reads slightly muddy at small sizes - soften the vignette.",
 "Mobile overlay menu is very dark (blur over pure black) - add a faint gradient.",
 "Consider a genuine premium display face (Clash / PP Editorial) for hero H1.",
 "Hook Reveal stagger to real per-item delays in the bento (currently uniform).",
], color=DIM)

# ---- third-party integrations
pdf.add_page(); bg()
eyebrow("Third-party integrations")
h1("Vendored components")
pdf.ln(2)
body("Four external pieces were integrated without disturbing routing, data flow "
     "or the existing component API. The Framer components import a `framer` "
     "runtime; a ~15-line local shim (addPropertyControls no-op, ControlType "
     "proxy, useIsStaticRenderer to false) replaces it via a Vite alias, and "
     "framer-motion is a real dependency.", color=INK, gap=5.6)
pdf.ln(3)
integ = [
 ("body-muscles  (npm, Apache-2.0, 0 deps)",
  "Imperative SVG BodyChart, 70+ muscles, 0-10 heatmap. Wrapped in "
  "BodyMuscles.tsx; app's {group:0..1} model expanded to per-side ids. Now the "
  "Body page + landing body-section visual. Native slate to yellow to red palette "
  "kept (matches the spec's activation tiers)."),
 ("framer.com/m/DitheringHover",
  "Self-contained (react + framer-motion + framer shim). Vendored to "
  "src/vendor/framer/. Drives the landing product-demo screenshot; Bayer-8 "
  "dither zone tracks the cursor on a canvas."),
 ("framer.com/m/infinite-3d-carousel",
  "Self-contained. Vendored. New landing section - a 3D coverflow of five real "
  "app screenshots, drag + autoplay + momentum + keyboard, reduced-motion aware."),
 ("framer.com/m/Liquid-Glass-Footer",
  "NOT vendored: the module pulls a deep tree of nested framerusercontent "
  "sub-modules and heavy framer-runtime APIs (FormContainer, RichText, withCSS, "
  "useVariantState, addFonts...). Shimming it faithfully would be fragile. "
  "Built an equivalent GlassFooter in the design system instead - same intent "
  "(specular liquid-glass panel, newsletter, social chips, columns)."),
]
for name, desc in integ:
    pdf.set_x(M); pdf.set_font("Helvetica", "B", 10); pdf.set_text_color(*INK)
    pdf.cell(0, 5.8, name); pdf.ln(5.6)
    pdf.set_x(M + 3); pdf.set_font("Helvetica", "", 9.4); pdf.set_text_color(*DIM)
    pdf.multi_cell(PW - 2 * M - 3, 4.7, desc)
    pdf.ln(2)

# ---- screens
SCREENS = [
 ("01-hero.png", "Landing - Hero", [
   "min-h 100dvh, eyebrow pill, clamp(44-92px) H1 with ion emphasis span",
   "Z-axis: phone mock + two translucent stat panels overlapping the glow",
   "Two button-in-button CTAs; ion + orchid orbs behind"]),
 ("02-metrics.png", "Landing - Credibility band", [
   "Four clamp(40-64px) mono figures on a hairline-ruled band",
   "Short supporting lines, ~24ch measure"]),
 ("03-feature.png", "Landing - Massive feature", [
   "Double-bezel split card, 48px outer radius",
   "Copy left / phone mock right on a faint ion wash",
   "Benefit list with 1.5px ion dots"]),
 ("04-bento.png", "Landing - Bento grid", [
   "6-col grid; cards span 2/3/4 cols and 2 rows",
   "One idea per card; embedded coaching-style dials + muscle map",
   "Hover lifts the hairline to white/15"]),
 ("05-dashboard-demo.png", "Landing - Product demo", [
   "Browser frame (double-bezel), flush; the dashboard screenshot is a "
   "DitheringHover surface - hover it to see the effect",
   "'Hover the screen' caption; centred glow behind the headline"]),
 ("23-dither.png", "Landing - Dithering hover (active)", [
   "Vendored framer.com/m/DitheringHover",
   "Bayer-8 dithered radial zone with a ragged fringe follows the cursor",
   "Spring-tracked position + radius (framer-motion); canvas getImageData"]),
 ("24-carousel.png", "Landing - 3D screen carousel", [
   "Vendored framer.com/m/infinite-3d-carousel - NEW section",
   "Five real app screenshots; perspective, per-card depth blur + fade, "
   "momentum drag, autoplay, keyboard, reduced-motion aware",
   "'Fifty-five screens. One system.'"]),
 ("06-body.png", "Landing - Body section", [
   "Alternating text / visual; jade eyebrow",
   "body-muscles BodyChart (70+ muscles) in a 36px-radius surface card"]),
 ("07-editorial.png", "Landing - Editorial break", [
   "Warm off-white (#F3F1EC), near-black type - deliberate rhythm break",
   "Blockquote of product principle 01, ~40ch measure"]),
 ("08-philosophy.png", "Landing - Philosophy", [
   "0.9/1.1 split; 4-card sub-grid (Seen / Personal / Visible / Honest)"]),
 ("09-cta.png", "Landing - Final CTA", [
   "48px-radius container, ion to orchid corner blooms over #0b0b12",
   "clamp(34-72px) headline, single button-in-button"]),
 ("10-footer.png", "Landing - Liquid-glass footer", [
   "GlassFooter: layered translucency + specular top-edge sweep + violet rim",
   "backdrop-blur (single element), inset floor shadow",
   "Newsletter field + button-in-button, glass social chips, link columns"]),
 ("11-app-dashboard.png", "App - Home dashboard", [
   "Persistent sidebar; trainer message band; hero workout card",
   "InstrumentReadout (est. duration) + orchid RingGauge (readiness)",
   "Three gradient StatCards; muscle-map thumbnail"]),
 ("12-app-workouts.png", "App - Workouts", [
   "PillSelector: Today / Calendar / History / Templates",
   "Program header, numbered exercise list, primary CTA"]),
 ("13-app-active-workout.png", "App - Active workout", [
   "Per-exercise set tables with ghosted previous values, RPE",
   "Total volume as the screen's one InstrumentReadout (jade)",
   "'Track with camera' triggers the hand-off"]),
 ("14-app-camera-handoff.png", "App - Camera hand-off", [
   "Centred modal: 'Continue on your phone' + QR + short link",
   "Plain-language reason; 'keep logging here' escape",
   "The 'web app knows its place' moment"]),
 ("15-app-trainer.png", "App - Trainer chat", [
   "Chat thread, user bubbles in ion; suggested-prompt chips",
   "Right rail: five coaching-style sliders + recent insight"]),
 ("16-app-body.png", "App - Muscle map", [
   "body-muscles BodyChart replaces the 2D stand-in: 70+ clickable regions, "
   "slate to yellow to red intensity, front/back",
   "Tap a muscle to its name surfaces below; Rest/Light/Heavy legend",
   "Ranked muscle list with sparklines; balance + undertrained panels"]),
 ("17-app-progress.png", "App - Progress", [
   "AI 8-week summary; three gradient StatCards",
   "SVG line chart + e1RM InstrumentReadout (ember)",
   "Consistency heatmap; PR list"]),
 ("18-app-library.png", "App - Exercise library", [
   "Search + muscle filter chips; two-col result rows",
   "'Form' badge marks camera-tracked exercises"]),
 ("19-app-settings.png", "App - Settings", [
   "Two-col panel grid; custom toggle rows",
   "Camera & privacy statement; integrations; subscription"]),
 ("20-mobile-hero.png", "Mobile - Hero", [
   "Full type scale preserved; CTAs stack full-width",
   "Product visual flows beneath, near edge-to-edge"]),
 ("21-mobile-menu.png", "Mobile - Overlay menu", [
   "Full-screen glass overlay; staggered link reveal; hamburger is now X"]),
 ("25-mobile-carousel.png", "Mobile - 3D carousel", [
   "Same vendored component; cards bleed past the viewport, clipped by the "
   "section; drag works, autoplay pauses off-screen"]),
 ("22-mobile-dashboard.png", "Mobile - Dashboard", [
   "Sidebar to floating bottom tab bar; single-column stack",
   "StatCards full-width; readiness ring retained"]),
]
for f, t, n in SCREENS:
    if os.path.exists(os.path.join(SHOTS, f)):
        shot_page(f, t, n)

pdf.output(OUT)
print("wrote", OUT)
