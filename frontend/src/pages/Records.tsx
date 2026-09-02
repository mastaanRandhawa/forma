import { useMemo, useState } from "react";
import { Trophy, Users } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { useFormaData } from "../lib/localStore";
import { allTimePRs, strengthSeriesFor } from "../lib/fitness";
import { API_ENABLED, useResource } from "../api/hooks";
import { api } from "../api/client";
import type { PRRow } from "../lib/fitness";

const MUSCLE_GROUPS = ["all", "chest", "back", "shoulders", "arms", "legs", "core"];

function PRCard({ row, sessions, units }: { row: PRRow; sessions: ReturnType<typeof useFormaData>["sessions"]; units: string }) {
  const series = useMemo(() => strengthSeriesFor(sessions, row.exercise), [sessions, row.exercise]);
  const first = series[0]?.e1rm ?? 0;
  const pctGain = first > 0 ? Math.round(((row.e1rm - first) / first) * 100) : 0;

  return (
    <div className="surface-soft rounded-[var(--radius-large)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[0.95rem] lowercase text-content-primary">{row.exercise}</div>
          <div className="label-instrument mt-0.5 tabular-nums">{row.detail} {units}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <div
            className="metric-numeral text-[1.35rem] leading-none tabular-nums"
            style={{ color: "var(--accent-lime)" }}
          >
            {row.e1rm}
          </div>
          <div className="label-instrument">est. 1RM {units}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        {series.length > 1 && (
          <MiniSparkline series={series.map((p) => p.e1rm)} />
        )}
        <div className="ml-auto flex items-center gap-3 text-[0.78rem] text-content-tertiary">
          {pctGain > 0 && (
            <span style={{ color: "var(--accent-lime)" }}>+{pctGain}% since first log</span>
          )}
          <span>{row.date}</span>
        </div>
      </div>
      <CohortBar exercise={row.exercise} e1rm={row.e1rm} units={units} />
    </div>
  );
}

function MiniSparkline({ series }: { series: number[] }) {
  const w = 80;
  const h = 28;
  const pad = 2;
  const max = Math.max(...series);
  const min = Math.min(...series);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (series.length - 1 || 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - ((v - min) / span) * (h - pad * 2);
  const pts = series.map((v, i) => `${x(i)},${y(v)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke="var(--accent-pink)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={x(series.length - 1)} cy={y(series[series.length - 1]!)} r={2.5} fill="var(--accent-lime)" />
    </svg>
  );
}

function CohortBar({ exercise, e1rm, units }: { exercise: string; e1rm: number; units: string }) {
  const cohort = useResource(
    `cohort:${exercise}`,
    () => API_ENABLED ? api.progress.cohort(exercise) : Promise.reject(new Error("offline")),
  );
  if (!API_ENABLED || cohort.initialLoading || !cohort.data) return null;
  if (cohort.data.insufficient_data || cohort.data.no_pr) return null;
  const pct = cohort.data.percentile ?? 0;
  return (
    <div className="mt-3 flex items-center gap-3">
      <Users size={11} className="shrink-0 text-content-tertiary" />
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            background: pct >= 75 ? "var(--accent-lime)" : pct >= 50 ? "var(--accent-cyan)" : "var(--accent-mauve)",
          }}
        />
      </div>
      <span className="shrink-0 tabular-nums text-[0.74rem] text-content-tertiary">
        top {100 - pct}% · {cohort.data.cohortSize} users · {cohort.data.yourE1rm ?? e1rm} {units} e1rm
      </span>
    </div>
  );
}

export default function Records() {
  const data = useFormaData();
  const sessions = data.sessions;
  const units = data.profile.units ?? "kg";
  const [filter, setFilter] = useState("all");

  const prs = useMemo(() => allTimePRs(sessions), [sessions]);

  const filtered = useMemo(() => {
    if (filter === "all") return prs;
    return prs; // muscle group filtering requires catalog lookup — kept simple for now
  }, [prs, filter]);

  return (
    <div className="mx-auto max-w-[640px]">
      <PageHeader title="records" eyebrow="personal bests" />

      {prs.length === 0 ? (
        <EmptyState
          title="no records yet"
          body="finish your first workout and log some sets — your all-time bests will appear here."
          action={{ label: "start a workout", to: "/workouts" }}
        />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2">
            <Trophy size={15} style={{ color: "var(--accent-lime)" }} />
            <span className="label-instrument">
              {prs.length} lift{prs.length !== 1 ? "s" : ""} tracked
            </span>
          </div>

          <div className="mb-5 flex flex-wrap gap-1.5">
            {MUSCLE_GROUPS.map((g) => (
              <button
                key={g}
                onClick={() => setFilter(g)}
                className={`focus-ring rounded-pill px-3 py-1 text-[0.78rem] lowercase transition-colors ${
                  filter === g
                    ? "bg-[var(--accent-lime)] text-[#0c0c0c]"
                    : "surface-recessed text-content-secondary hover:text-content-primary"
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filtered.map((row) => (
              <PRCard key={row.exercise} row={row} sessions={sessions} units={units} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
