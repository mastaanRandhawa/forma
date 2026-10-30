#!/usr/bin/env node
/**
 * One-command E2E run: migrate + seed a disposable Postgres, then let Playwright
 * start the API (:4000) and Vite (:5178) and run the suite.
 *
 *   DATABASE_URL=postgresql://USER:PASS@localhost:5432/forma_e2e npm run test:e2e:stack
 *   npm run test:e2e:stack -- tests/e2e/auth.spec.ts      (extra args go to Playwright)
 *
 * The API reads its other settings (JWT secrets, …) from backend/.env, but the
 * DATABASE_URL given here wins, and ANTHROPIC_API_KEY is cleared so chat tests
 * get canned replies instead of billing a real key.
 *
 * The seed creates the demo user alex@forma.app / forma1234, so this refuses any
 * database not on this machine — unless E2E_ALLOW_DB_HOST names that exact host,
 * for a disposable hosted test database:
 *
 *   E2E_ALLOW_DB_HOST=dpg-xxxx.oregon-postgres.render.com DATABASE_URL=… npm run test:e2e:stack
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontend, "../backend");
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const url = process.env.DATABASE_URL;
if (!url) fail("set DATABASE_URL to a disposable local Postgres database; it will be migrated and seeded.");
let host;
try {
  host = new URL(url).hostname;
} catch {
  fail("DATABASE_URL is not a valid URL.");
}
if (!LOCAL_HOSTS.has(host) && process.env.E2E_ALLOW_DB_HOST !== host) {
  fail(
    `refusing to seed "${host}": the seed creates a demo user with a known password. ` +
      `Use a database on this machine, or set E2E_ALLOW_DB_HOST=${host} if it is a disposable test database.`,
  );
}

run("npx prisma migrate deploy", backend);
run("npm run db:seed", backend);
const args = process.argv.slice(2).map((a) => JSON.stringify(a)).join(" ");
const tests = spawnSync(`npx playwright test ${args}`, {
  cwd: frontend,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, E2E_START_STACK: "1", ANTHROPIC_API_KEY: "" },
});
process.exit(tests.status ?? 1);

function run(command, cwd) {
  const r = spawnSync(command, { cwd, stdio: "inherit", shell: true, env: process.env });
  if (r.status !== 0) fail(`"${command}" failed in ${path.basename(cwd)}/`);
}

function fail(message) {
  console.error(`e2e-stack: ${message}`);
  process.exit(1);
}
