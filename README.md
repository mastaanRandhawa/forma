# Forma — Web App

Companion web app for **Forma**, an AI personal-trainer product. The cloud API
lives in its own repository; this repo is the frontend only.

**Live:** https://mastaanrandhawa.github.io/forma/

```bash
cd frontend
npm install
npm run dev        # → http://localhost:5178
```

## Stack

- Vite 5 + React 18 + TypeScript
- React Router (real URLs per screen)
- Tailwind CSS with the Forma design tokens
- Motion (motion.dev) for animation

## Backend

Runs against the real API when `VITE_API_URL` is set (see
[`frontend/src/api/README.md`](frontend/src/api/README.md)); with no env var the
app serves a bundled demo dataset. Locally, put it in `frontend/.env`; in
production it's a build-time variable on the host (below).

## Companion apps

- `backend/` — the API (its own repo; gitignored here).
- `mobile/` — Expo health-sync agent for HealthKit / Health Connect
  ([`mobile/README.md`](mobile/README.md)). The browser can't read native health
  data, so this pushes sleep / HRV / resting-HR / steps to `POST /me/health/samples`.

## Deploy

Hosted on **GitHub Pages**. `.github/workflows/deploy.yml` builds `frontend/`
and publishes on every push to `main` that touches `frontend/**`. The build uses
`base: "/forma/"` (Pages project sub-path) and copies `index.html` → `404.html`
so client-side routes survive a deep link / hard refresh.

One-time setup:

1. Repo → **Settings → Pages** → Source: **GitHub Actions**.
2. Repo → **Settings → Secrets and variables → Actions → Variables** → add
   `VITE_API_URL` = the API origin (e.g. `https://api.forma.app/api/v1`). Omit it
   to ship demo mode.
3. The API's `WEB_ORIGIN` must include `https://<user>.github.io` for CORS.

Serving from a custom domain instead? Set repo variable `VITE_BASE=/` (or pass it
in the workflow) so assets resolve from the domain root, and point `WEB_ORIGIN`
at the domain.

## Credits

Exercise data & illustrations by [RepDB (repdb.co)](https://repdb.co), used under
the RepDB free-tier licence (commercial in-app use with attribution). Folded into
the app's own schema by `backend/npm run db:import-repdb`; the compact client
catalog for the no-backend build is `frontend/src/lib/repdb.catalog.json`
(regenerate with `node frontend/scripts/build-repdb-catalog.mjs`).
