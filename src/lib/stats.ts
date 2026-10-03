import type {
  Batch,
  BatchMember,
  Pallet,
  PalletShare,
  Pause,
  Worker,
} from "@/db/schema";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export interface BatchGraph {
  batch: Batch;
  members: BatchMember[];
  pauses: Pause[];
  pallets: Pallet[];
  shares: PalletShare[];
}

export interface BatchTiming {
  elapsedMs: number; // wall-clock total
  pauseMs: number; // all downtime (incl. currently running pause)
  activeMs: number; // elapsed - pause (never negative)
}

export interface LeaderboardRow {
  worker: Worker;
  points: number;
  activeHours: number;
  pph: number; // points per active hour
  qualified: boolean; // activeHours >= race.minHours
  pallets: number; // distinct pallets this worker shared
}

export const PAUSE_REASONS = [
  "מחסור בקבוקים / חומרי גלם",
  "תחזוקת מכונה",
  "החלפה / ניקיון",
  "הפסקת עובדים",
  "תקלת מעבדה / בקרת איכות",
  "אחר",
] as const;

export const LINES = ["A", "B"] as const;
export type LineId = (typeof LINES)[number];

export const LINE_LABELS: Record<LineId, string> = {
  A: "קו A",
  B: "קו B",
};

/* ------------------------------------------------------------------ */
/* Timing math                                                          */
/* ------------------------------------------------------------------ */

const overlapMs = (
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): number => Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));

export function effectiveEnd(batch: Batch, now: number): number {
  return (batch.endedAt ?? new Date(now)).getTime();
}

export function computePauseMs(pauses: Pause[], now: number): number {
  return pauses.reduce((sum, p) => {
    const end = p.endedAt ? p.endedAt.getTime() : now;
    return sum + Math.max(0, end - p.startedAt.getTime());
  }, 0);
}

export function computeTiming(
  batch: Batch,
  pauses: Pause[],
  now: number,
): BatchTiming {
  const start = batch.startedAt.getTime();
  const end = effectiveEnd(batch, now);
  const pauseMs = computePauseMs(pauses, now);
  const elapsedMs = Math.max(0, end - start);
  return {
    elapsedMs,
    pauseMs: Math.min(pauseMs, elapsedMs),
    activeMs: Math.max(0, elapsedMs - pauseMs),
  };
}

/**
 * Active (non-paused) milliseconds credited to a single membership
 * inside a batch: intersection of [joinedAt, leftAt] with the batch
 * window, minus overlap with every pause interval.
 */
export function memberActiveMs(
  batch: Batch,
  member: BatchMember,
  pauses: Pause[],
  now: number,
): number {
  const bStart = batch.startedAt.getTime();
  const bEnd = effectiveEnd(batch, now);
  const mStart = Math.max(member.joinedAt.getTime(), bStart);
  const mEnd = Math.min(member.leftAt?.getTime() ?? bEnd, bEnd);
  if (mEnd <= mStart) return 0;
  let total = mEnd - mStart;
  for (const p of pauses) {
    const pEnd = p.endedAt ? p.endedAt.getTime() : now;
    total -= overlapMs(mStart, mEnd, p.startedAt.getTime(), pEnd);
  }
  return Math.max(0, total);
}

/* ------------------------------------------------------------------ */
/* Aggregations                                                         */
/* ------------------------------------------------------------------ */

export interface BatchSummary {
  totalPallets: number;
  totalCartons: number;
  totalPoints: number;
}

export function summarizePallets(pallets: Pallet[]): BatchSummary {
  return {
    totalPallets: pallets.length,
    totalCartons: pallets.reduce((s, p) => s + p.cartons, 0),
    totalPoints: round2(pallets.reduce((s, p) => s + p.points, 0)),
  };
}

export interface PauseBreakdownRow {
  reason: string;
  count: number;
  ms: number;
}

export function pauseBreakdown(pauses: Pause[], now: number): PauseBreakdownRow[] {
  const map = new Map<string, PauseBreakdownRow>();
  for (const p of pauses) {
    const end = p.endedAt ? p.endedAt.getTime() : now;
    const ms = Math.max(0, end - p.startedAt.getTime());
    const row = map.get(p.reason) ?? { reason: p.reason, count: 0, ms: 0 };
    row.count += 1;
    row.ms += ms;
    map.set(p.reason, row);
  }
  return [...map.values()].sort((a, b) => b.ms - a.ms);
}

/* ------------------------------------------------------------------ */
/* Leaderboard                                                          */
/* ------------------------------------------------------------------ */

export function computeLeaderboard(
  workers: Worker[],
  graphs: BatchGraph[],
  raceMinHours: number,
  now: number,
): LeaderboardRow[] {
  const rows = new Map<number, LeaderboardRow>();
  for (const w of workers) {
    rows.set(w.id, {
      worker: w,
      points: 0,
      activeHours: 0,
      pph: 0,
      qualified: false,
      pallets: 0,
    });
  }

  for (const g of graphs) {
    // points from pallet shares
    const palletSeen = new Map<number, Set<number>>(); // worker -> pallet ids
    for (const s of g.shares) {
      const row = rows.get(s.workerId);
      if (!row) continue;
      row.points += s.points;
      if (!palletSeen.has(s.workerId)) palletSeen.set(s.workerId, new Set());
      palletSeen.get(s.workerId)!.add(s.palletId);
    }
    // active hours from membership intervals minus pause overlap
    for (const m of g.members) {
      const row = rows.get(m.workerId);
      if (!row) continue;
      row.activeHours += memberActiveMs(g.batch, m, g.pauses, now) / 3600000;
    }
    for (const [wid, set] of palletSeen) {
      const row = rows.get(wid);
      if (row) row.pallets += set.size;
    }
  }

  const list = [...rows.values()].map((r) => {
    const points = round2(r.points);
    const hours = round2(r.activeHours * 100) / 100;
    return {
      ...r,
      points,
      activeHours: hours,
      pph: hours > 0 ? round2(points / hours) : 0,
      qualified: hours >= raceMinHours,
    };
  });

  return list.sort((a, b) => b.points - a.points);
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Points of one pallet split equally across n members. */
export function splitPoints(totalPoints: number, memberCount: number): number {
  if (memberCount <= 0) return 0;
  return round2(round2(totalPoints) / memberCount);
}
