# Forma

AI personal-trainer product. This repo holds two apps:

| Folder | What |
|---|---|
| [`frontend/`](frontend) | Vite + React web companion (this document) |
| [`backend/`](backend) | TypeScript + Express + Prisma cloud API — see [`backend/BACKEND.md`](backend/BACKEND.md) |

```bash
cd frontend && npm install && npm run dev   # web app  → :5178
cd backend  && npm install && npm run dev   # API      → :4000  (see BACKEND.md for DB setup)
```

---

## Frontend — Web App

Companion web app for **Forma**. Built from the `forma-*` spec docs and the
biometric/wellness moodboard references.

## Stack

- Vite + React 18 + TypeScript
- React Router (real URLs per screen)
- Tailwind CSS with the Forma design tokens

> Spec calls for Next.js App Router; this build uses Vite + React Router for a
> fast, self-contained showcase. The component layer and tokens port directly.

## Design system (from `forma-design-language.md`)

- Ground `#0A0A0C`, surface `#16161A`, warm ink `#F5F4F0`
- Signature accent **Ion** `#4C63FF` — interactive chrome only
- Five data-identity gradients: Ember, Chartreuse, Orchid, Jade, Aurum
- Manrope (voice) + JetBrains Mono (data)
- `InstrumentReadout` — dot-matrix hero numeral, **one per screen max**
- `RingGauge` — dotted-tick progress ring
- Persistent left sidebar (desktop) / floating pill tab bar (mobile)

## Screens

**`/` — marketing landing** (premium editorial redesign): floating glass nav,
92vh hero with product visual + ambient glow orbs, metrics band, massive feature
section, bento grid, browser-framed dashboard demo, alternating body section,
light editorial break, dark philosophy section, gradient CTA, spacious footer.
Scroll-reveal motion, fully responsive, respects `prefers-reduced-motion`.

**App** (behind the `/` CTA, wrapped in `AppShell` sidebar/tab-bar):
`/dashboard` Home · `/workouts` (Today / Calendar / History / Templates) ·
`/workouts/active` (manual logging + "Continue on your phone" camera hand-off) ·
`/trainer` chat · `/body` muscle map · `/progress` analytics ·
`/exercise-library` · `/settings`

All data in `src/lib/data.ts` is mock.

## Third-party integrations

- **`body-muscles`** (npm) — 70+ muscle SVG heatmap. Wrapped in
  [`BodyMuscles.tsx`](src/components/BodyMuscles.tsx); drives the Body page and the
  landing body section.
- **Framer components** vendored into [`src/vendor/framer/`](src/vendor/framer)
  (a ~15-line `framer` runtime shim aliased in `vite.config.ts`; `framer-motion` is
  a real dep):
  - `DitheringHover` → [`DitheringImage.tsx`](src/components/DitheringImage.tsx),
    on the landing product-demo screenshot.
  - `infinite-3d-carousel` → [`ScreenCarousel.tsx`](src/components/ScreenCarousel.tsx),
    a new landing section cycling five app screenshots.
- **Liquid Glass Footer** — the Framer module has a deep nested-module +
  framer-runtime dependency that can't be cleanly vendored, so `GlassFooter` in
  [`Landing.tsx`](src/pages/Landing.tsx) is an in-house equivalent (`.glass-liquid`
  in `index.css`).

## Design review

`design-review/Forma-Design-Inspection.pdf` — 32-page inspection (tokens, palette,
components, interactions, `high-end-visual-design` audit, integrations, all screen
captures). Regenerate: `cd design-review && python build_pdf.py`.

## Run

```bash
cd frontend
npm install
npm run dev
```
