# Forma — Web App

Companion web app for **Forma**, an AI personal-trainer product. The cloud API
lives in its own repository; this repo is the frontend only.

**Live:** deployed on Cloudflare Pages (see [Deploy](#deploy)).

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

Hosted on **Cloudflare Pages**. Everything under `frontend/` builds to a static
site (`base: "/"`); `frontend/public/_redirects` gives the SPA its deep-link
fallback and `frontend/public/_headers` sets cache policy.

### Option A — GitHub Actions (in this repo)

`.github/workflows/deploy.yml` builds and publishes on every push to `main` that
touches `frontend/**`. One-time setup:

1. Create the Pages project once (matches `name` in `frontend/wrangler.toml`):
   ```bash
   cd frontend && npx wrangler pages project create forma-web --production-branch main
   ```
2. Repo → **Settings → Secrets and variables → Actions**:
   - Secrets: `CLOUDFLARE_API_TOKEN` (token with the *Cloudflare Pages: Edit*
     permission), `CLOUDFLARE_ACCOUNT_ID`.
   - Variables: `VITE_API_URL` — the API origin, e.g.
     `https://api.forma.app/api/v1`. Omit to ship demo mode.

### Option B — Cloudflare Pages Git integration (no CI secrets)

In the Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**:

| Setting | Value |
| --- | --- |
| Root directory | `frontend` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Environment variables | `VITE_API_URL` (Production **and** Preview) |

If you use Option B, delete `.github/workflows/deploy.yml` so the two don't race.

### Manual one-off

```bash
cd frontend
npm run build
VITE_API_URL=… npm run build      # to bake in the API origin
npx wrangler pages deploy         # reads frontend/wrangler.toml
```

### CORS

The API's `WEB_ORIGIN` must include the deployed origin (the `*.pages.dev`
domain and any custom domain, comma-separated).
