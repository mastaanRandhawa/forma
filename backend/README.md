# Forma — Backend

Cloud API for **Forma**, the AI personal-trainer product. TypeScript · Express 4 ·
Prisma 6 · PostgreSQL. Backs the React Native app and the web companion.

- **[`BACKEND.md`](BACKEND.md)** — architecture, data model, every endpoint, how it maps to the product spec
- **[`API.md`](API.md)** — API conventions, auth flow, the settings bundle, the active-workout write path
- **[`openapi.yaml`](openapi.yaml)** — the machine-readable contract (also served at `GET /api/v1/docs`)
- **[`docs-appearance-progression.md`](docs-appearance-progression.md)** — the appearance / disclosure / progression feature spec

> This repo is a read-only mirror of the `backend/` folder of the Forma monorepo.

---

## Run it

**Prerequisites:** Node 22, and a PostgreSQL 16 database.

```bash
cp .env.example .env          # then edit: set JWT secrets, point DATABASE_URL at your DB
npm install
```

### Database — pick one

**a) Docker (easiest)** — `docker-compose.yml` provisions Postgres at the exact
`DATABASE_URL` in `.env.example`:

```bash
docker compose up -d
```

**b) An existing local Postgres** — create the database and user, then set
`DATABASE_URL` in `.env` to match:

```sql
CREATE ROLE forma WITH LOGIN PASSWORD 'forma';
CREATE DATABASE forma OWNER forma;
```

```
DATABASE_URL="postgresql://forma:forma@localhost:5432/forma?schema=public"
```

**c) A hosted Postgres** (Neon, Supabase, RDS…) — just paste its connection
string into `DATABASE_URL`.

### Migrate, seed, start

```bash
npm run prisma:migrate      # first run: name the migration "init"
npm run db:seed             # reference data (exercises, muscles, presets) + demo user
npm run dev                 # API → http://localhost:4000/api/v1
```

Open **http://localhost:4000/api/v1/docs** for the interactive API reference.

Demo login: `alex@forma.app` / `forma1234`

```bash
curl -s localhost:4000/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"alex@forma.app","password":"forma1234"}'
```

### Other processes / commands

```bash
npm run worker        # background cron jobs (token cleanup, reminders, weekly rollup) — separate terminal
npm test              # contract + rule-table tests (no database needed)
npm run db:backfill   # one-off: default appearance/disclosure rows + progression eval for existing users
npm run build && npm start          # production build
npm run prisma:studio               # browse the DB
```

### Connecting the web app

In the frontend's `.env`:

```
VITE_API_URL=http://localhost:4000/api/v1
```

### Deploy

`Dockerfile` builds a production image that runs `prisma migrate deploy` then the
server. Provide `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
`WEB_ORIGIN` (and optionally `ANTHROPIC_API_KEY`) as environment variables.

```bash
docker build -t forma-backend .
docker run -p 4000:4000 --env-file .env forma-backend
```
