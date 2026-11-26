/** Body measurements for the no-backend build, kept in the local store. */
import type { BodyMeasurement, BodyMeasurementInput } from "../api/types";
import { loadData, mutate } from "./localStore";

export const localMeasurements = (): BodyMeasurement[] =>
  [...loadData().measurements].sort((a, b) => Date.parse(a.recordedAt ?? "") - Date.parse(b.recordedAt ?? ""));

export function addLocalMeasurement(input: BodyMeasurementInput): BodyMeasurement {
  const row: BodyMeasurement = { ...input, id: `m-${Date.now()}-${Math.floor(Math.random() * 1e4)}`, recordedAt: input.recordedAt ?? new Date().toISOString() };
  mutate((d) => ({ ...d, measurements: [...d.measurements, row] }));
  return row;
}

export function updateLocalMeasurement(id: string, patch: { [K in keyof BodyMeasurementInput]: BodyMeasurementInput[K] | null }): void {
  mutate((d) => ({
    ...d,
    measurements: d.measurements.map((m) => {
      if (m.id !== id) return m;
      const next: Record<string, unknown> = { ...m };
      for (const [k, v] of Object.entries(patch)) if (v === null) delete next[k]; else if (v !== undefined) next[k] = v;
      return next as unknown as BodyMeasurement;
    }),
  }));
}

export function deleteLocalMeasurement(id: string): void {
  mutate((d) => ({ ...d, measurements: d.measurements.filter((m) => m.id !== id) }));
}
