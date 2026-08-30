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

Runs against the real API when `frontend/.env` sets `VITE_API_URL`
(see [`frontend/src/api/README.md`](frontend/src/api/README.md)); with no env var
the app serves a bundled demo dataset, which is how the GitHub Pages build runs.

## Deploy

`.github/workflows/deploy.yml` builds `frontend/` and publishes it to GitHub
Pages on every push to `main` that touches `frontend/**`.
