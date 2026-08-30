import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

/**
 * Minimal Forma API client for the companion app. Mirrors the bearer + refresh
 * flow of `frontend/src/api/client.ts` but only the endpoints the sync agent
 * needs: auth + `POST /me/health/samples`.
 */

const API_URL: string =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  "http://localhost:4000/api/v1";

const ACCESS_KEY = "forma.access";
const REFRESH_KEY = "forma.refresh";

export async function getTokens() {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
  ]);
  return { accessToken, refreshToken };
}

async function setTokens(t: { accessToken: string; refreshToken: string } | null) {
  if (!t) {
    await Promise.all([SecureStore.deleteItemAsync(ACCESS_KEY), SecureStore.deleteItemAsync(REFRESH_KEY)]);
    return;
  }
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, t.accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, t.refreshToken),
  ]);
}

export async function isAuthed() {
  return !!(await SecureStore.getItemAsync(REFRESH_KEY));
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Wrong email or password");
  const s = (await res.json()) as { accessToken: string; refreshToken: string; user: { name: string } };
  await setTokens(s);
  return s.user;
}

export async function logout() {
  const { refreshToken } = await getTokens();
  if (refreshToken)
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {});
  await setTokens(null);
}

async function refresh(): Promise<boolean> {
  const { refreshToken } = await getTokens();
  if (!refreshToken) return false;
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    await setTokens(null);
    return false;
  }
  await setTokens((await res.json()) as { accessToken: string; refreshToken: string });
  return true;
}

async function authed(path: string, init: RequestInit, retry = true): Promise<Response> {
  const { accessToken } = await getTokens();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}`, ...(init.headers ?? {}) },
  });
  if (res.status === 401 && retry && (await refresh())) return authed(path, init, false);
  return res;
}

export interface HealthSample {
  type: "sleep" | "hrv" | "resting_hr" | "steps";
  value: number;
  unit: string;
  recordedAt: string; // ISO
  sourceBundleId?: string;
}

export async function ingestSamples(provider: "apple_health" | "health_connect", samples: HealthSample[]) {
  if (samples.length === 0) return { received: 0, ingested: 0, deduped: 0 };
  const res = await authed("/me/health/samples", {
    method: "POST",
    body: JSON.stringify({ provider, samples }),
  });
  if (!res.ok) throw new Error(`ingest failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { received: number; ingested: number; deduped: number };
}
