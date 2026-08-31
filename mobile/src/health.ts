import { Platform } from "react-native";
import { ingestSamples, type HealthSample } from "./api";

/**
 * The sync agent (§3.2). Reads the last ~7 days of normalized daily metrics from
 * HealthKit (iOS) or Health Connect (Android) and pushes them to
 * `POST /me/health/samples`. The backend dedupes on (userId, type, recordedAt),
 * so running this repeatedly is safe.
 *
 * HealthKit / Health Connect are native modules — this needs an Expo **dev
 * build** (`expo run:ios` / `expo run:android`), not Expo Go.
 */

const DAYS = 7;
const since = () => new Date(Date.now() - DAYS * 86_400_000);

// ── iOS: HealthKit via react-native-health ─────────────────────────────────
async function readAppleHealth(): Promise<HealthSample[]> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AppleHealthKit = require("react-native-health").default as any;
  const HK = require("react-native-health").HealthKitPermissions ?? {};

  const permissions = {
    permissions: {
      read: [
        AppleHealthKit.Constants.Permissions.SleepAnalysis,
        AppleHealthKit.Constants.Permissions.HeartRateVariability,
        AppleHealthKit.Constants.Permissions.RestingHeartRate,
        AppleHealthKit.Constants.Permissions.StepCount,
      ],
      write: [],
    },
  };

  await new Promise<void>((resolve, reject) =>
    AppleHealthKit.initHealthKit(permissions, (err: string) => (err ? reject(new Error(err)) : resolve())),
  );

  const opts = { startDate: since().toISOString(), endDate: new Date().toISOString() };
  const out: HealthSample[] = [];

  const sleep: any[] = await callback((cb) => AppleHealthKit.getSleepSamples(opts, cb));
  // group "ASLEEP" segments by calendar day → hours
  const byDay = new Map<string, number>();
  for (const s of sleep) {
    if (!/ASLEEP|CORE|DEEP|REM/i.test(String(s.value))) continue;
    const day = s.endDate.slice(0, 10);
    const hrs = (Date.parse(s.endDate) - Date.parse(s.startDate)) / 3_600_000;
    byDay.set(day, (byDay.get(day) ?? 0) + hrs);
  }
  for (const [day, hrs] of byDay)
    out.push({ type: "sleep", value: Math.round(hrs * 10) / 10, unit: "h", recordedAt: `${day}T12:00:00.000Z` });

  const hrv: any[] = await callback((cb) => AppleHealthKit.getHeartRateVariabilitySamples(opts, cb));
  for (const h of hrv)
    out.push({ type: "hrv", value: Math.round(h.value * 1000), unit: "ms", recordedAt: h.startDate }); // SDNN in seconds → ms

  const rhr: any[] = await callback((cb) => AppleHealthKit.getRestingHeartRateSamples(opts, cb));
  for (const r of rhr) out.push({ type: "resting_hr", value: Math.round(r.value), unit: "bpm", recordedAt: r.startDate });

  const steps: any[] = await callback((cb) => AppleHealthKit.getDailyStepCountSamples(opts, cb));
  for (const s of steps) out.push({ type: "steps", value: Math.round(s.value), unit: "count", recordedAt: s.endDate });

  return out;
}

const callback = <T,>(fn: (cb: (err: unknown, res: T) => void) => void) =>
  new Promise<T>((resolve, reject) => fn((err, res) => (err ? reject(err) : resolve(res))));

// ── Android: Health Connect via react-native-health-connect ────────────────
async function readHealthConnect(): Promise<HealthSample[]> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const HC = require("react-native-health-connect");
  await HC.initialize();
  await HC.requestPermission([
    { accessType: "read", recordType: "SleepSession" },
    { accessType: "read", recordType: "HeartRateVariabilityRmssd" },
    { accessType: "read", recordType: "RestingHeartRate" },
    { accessType: "read", recordType: "Steps" },
  ]);

  const timeRangeFilter = { operator: "between", startTime: since().toISOString(), endTime: new Date().toISOString() } as const;
  const out: HealthSample[] = [];

  const sleep = await HC.readRecords("SleepSession", { timeRangeFilter });
  for (const r of sleep.records ?? []) {
    const hrs = (Date.parse(r.endTime) - Date.parse(r.startTime)) / 3_600_000;
    out.push({ type: "sleep", value: Math.round(hrs * 10) / 10, unit: "h", recordedAt: r.endTime });
  }
  const hrv = await HC.readRecords("HeartRateVariabilityRmssd", { timeRangeFilter });
  for (const r of hrv.records ?? [])
    out.push({ type: "hrv", value: Math.round(r.heartRateVariabilityMillis), unit: "ms", recordedAt: r.time });

  const rhr = await HC.readRecords("RestingHeartRate", { timeRangeFilter });
  for (const r of rhr.records ?? [])
    out.push({ type: "resting_hr", value: Math.round(r.beatsPerMinute), unit: "bpm", recordedAt: r.time });

  const steps = await HC.readRecords("Steps", { timeRangeFilter });
  for (const r of steps.records ?? [])
    out.push({ type: "steps", value: r.count, unit: "count", recordedAt: r.endTime });

  return out;
}

export type SyncResult = { provider: "apple_health" | "health_connect"; received: number; ingested: number; deduped: number };

/** Read from the platform health store and push to the API. */
export async function runSync(): Promise<SyncResult> {
  const provider = Platform.OS === "ios" ? "apple_health" : "health_connect";
  const samples = Platform.OS === "ios" ? await readAppleHealth() : await readHealthConnect();
  const clean = samples.filter((s) => Number.isFinite(s.value) && s.value > 0);
  const res = await ingestSamples(provider, clean);
  return { provider, ...res };
}
