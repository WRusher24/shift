import { db } from "@/db";
import {
  batches,
  batchMembers,
  pallets,
  palletShares,
  pauses,
  products,
  races,
  workers,
  type Batch,
  type Product,
  type Race,
  type Worker,
} from "@/db/schema";
import { asc, desc, eq, inArray, ne } from "drizzle-orm";
import {
  computeLeaderboard,
  computeTiming,
  pauseBreakdown,
  summarizePallets,
  type BatchGraph,
  type LeaderboardRow,
} from "@/lib/stats";

/* ------------------------------------------------------------------ */
/* Graph loading — batches with members / pauses / pallets / shares    */
/* ------------------------------------------------------------------ */

export async function loadBatchGraphs(
  batchList: Batch[],
): Promise<BatchGraph[]> {
  if (batchList.length === 0) return [];
  const ids = batchList.map((b) => b.id);
  const [memberRows, pauseRows, palletRows, shareRows] = await Promise.all([
    db.select().from(batchMembers).where(inArray(batchMembers.batchId, ids)),
    db.select().from(pauses).where(inArray(pauses.batchId, ids)),
    db.select().from(pallets).where(inArray(pallets.batchId, ids)),
    db
      .select({
        id: palletShares.id,
        palletId: palletShares.palletId,
        workerId: palletShares.workerId,
        points: palletShares.points,
        awardedAt: palletShares.awardedAt,
      })
      .from(palletShares)
      .innerJoin(pallets, eq(palletShares.palletId, pallets.id))
      .where(inArray(pallets.batchId, ids)),
  ]);

  return batchList.map((b) => {
    const bPallets = palletRows.filter((p) => p.batchId === b.id);
    const palletIds = new Set(bPallets.map((p) => p.id));
    return {
      batch: b,
      members: memberRows
        .filter((m) => m.batchId === b.id)
        .sort((a, b2) => a.joinedAt.getTime() - b2.joinedAt.getTime()),
      pauses: pauseRows
        .filter((p) => p.batchId === b.id)
        .sort((a, b2) => a.startedAt.getTime() - b2.startedAt.getTime()),
      pallets: bPallets.sort(
        (a, b2) => a.loggedAt.getTime() - b2.loggedAt.getTime(),
      ),
      shares: shareRows.filter((s) => palletIds.has(s.palletId)),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Serialized snapshot for the client                                   */
/* ------------------------------------------------------------------ */

export interface ActiveBatchView {
  id: number;
  line: string;
  status: "active" | "paused";
  product: { id: number; name: string; size: string; pointValue: number };
  productPalletOptions: number[];
  raceId: number | null;
  startedAt: number;
  elapsedMs: number;
  pauseMs: number;
  activeMs: number;
  isPausedNow: boolean;
  currentPauseReason: string | null;
  currentPauseSince: number | null;
  members: {
    id: number;
    workerId: number;
    name: string;
    emoji: string;
    joinedAt: number;
  }[];
  pallets: {
    id: number;
    cartons: number;
    points: number;
    memberCount: number;
    loggedAt: number;
  }[];
  totalPallets: number;
  totalCartons: number;
  totalPoints: number;
}

export interface StateSnapshot {
  serverNow: number;
  workers: Worker[];
  products: Product[];
  activeRace: Race | null;
  races: Race[];
  activeBatches: ActiveBatchView[];
  volumeLeaderboard: LeaderboardRow[];
  efficiencyLeaderboard: LeaderboardRow[];
  raceDays: number;
  totals: {
    batchesAllTime: number;
    palletsAllTime: number;
    cartonsAllTime: number;
    racePoints: number;
    racePallets: number;
  };
}

export async function getStateSnapshot(): Promise<StateSnapshot> {
  const now = Date.now();
  const [workerRows, productRows, raceRows, activeBatchRows, allBatchRows, allPalletRows] =
    await Promise.all([
      db.select().from(workers).orderBy(asc(workers.name)),
      db.select().from(products).orderBy(asc(products.name)),
      db.select().from(races).orderBy(desc(races.startedAt)),
      db.select().from(batches).where(ne(batches.status, "completed")),
      db.select().from(batches),
      db.select().from(pallets),
    ]);

  const activeRace = raceRows.find((r) => r.isActive) ?? null;

  const graphs = await loadBatchGraphs(activeBatchRows);
  const workerById = new Map(workerRows.map((w) => [w.id, w]));
  const productById = new Map(productRows.map((p) => [p.id, p]));

  const activeBatches: ActiveBatchView[] = graphs.map((g) => {
    const t = computeTiming(g.batch, g.pauses, now);
    const sum = summarizePallets(g.pallets);
    const openPause = g.pauses.find((p) => !p.endedAt) ?? null;
    const product = productById.get(g.batch.productId);
    return {
      id: g.batch.id,
      line: g.batch.line,
      status: g.batch.status as "active" | "paused",
      product: {
        id: product?.id ?? 0,
        name: product?.name ?? "מוצר לא ידוע",
        size: product?.size ?? "",
        pointValue: product?.pointValue ?? 0,
      },
      productPalletOptions: product?.palletOptions ?? [],
      raceId: g.batch.raceId,
      startedAt: g.batch.startedAt.getTime(),
      elapsedMs: t.elapsedMs,
      pauseMs: t.pauseMs,
      activeMs: t.activeMs,
      isPausedNow: g.batch.status === "paused",
      currentPauseReason: openPause?.reason ?? null,
      currentPauseSince: openPause ? openPause.startedAt.getTime() : null,
      members: g.members
        .filter((m) => !m.leftAt)
        .map((m) => {
          const w = workerById.get(m.workerId);
          return {
            id: m.id,
            workerId: m.workerId,
            name: w?.name ?? `#${m.workerId}`,
            emoji: w?.emoji ?? "❔",
            joinedAt: m.joinedAt.getTime(),
          };
        }),
      pallets: [...g.pallets]
        .sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime())
        .slice(0, 6)
        .map((p) => ({
          id: p.id,
          cartons: p.cartons,
          points: p.points,
          memberCount: p.memberCount,
          loggedAt: p.loggedAt.getTime(),
        })),
      totalPallets: sum.totalPallets,
      totalCartons: sum.totalCartons,
      totalPoints: sum.totalPoints,
    };
  });

  // Leaderboards for the active race
  let volumeLeaderboard: LeaderboardRow[] = [];
  let efficiencyLeaderboard: LeaderboardRow[] = [];
  let racePoints = 0;
  let racePallets = 0;
  if (activeRace) {
    const raceBatchRows = await db
      .select()
      .from(batches)
      .where(eq(batches.raceId, activeRace.id));
    const raceGraphs = await loadBatchGraphs(raceBatchRows);
    volumeLeaderboard = computeLeaderboard(
      workerRows,
      raceGraphs,
      activeRace.minHours,
      now,
    );
    efficiencyLeaderboard = [...volumeLeaderboard].sort((a, b) => {
      if (a.qualified !== b.qualified) return a.qualified ? -1 : 1;
      return b.pph - a.pph;
    });
    racePoints = volumeLeaderboard.reduce((s, r) => s + r.points, 0);
    racePallets = raceGraphs.reduce((s, g) => s + g.pallets.length, 0);
  }

  return {
    serverNow: now,
    workers: workerRows,
    products: productRows,
    activeRace,
    races: raceRows,
    activeBatches,
    volumeLeaderboard,
    efficiencyLeaderboard,
    raceDays: activeRace
      ? Math.max(
          1,
          Math.ceil(
            (now - activeRace.startedAt.getTime()) / (24 * 3600 * 1000) || 1,
          ),
        )
      : 0,
    totals: {
      batchesAllTime: allBatchRows.length,
      palletsAllTime: allPalletRows.length,
      cartonsAllTime: allPalletRows.reduce((s, p) => s + p.cartons, 0),
      racePoints: Math.round(racePoints * 100) / 100,
      racePallets,
    },
  };
}

/* ------------------------------------------------------------------ */
/* History ledger                                                       */
/* ------------------------------------------------------------------ */

export interface HistoryRow {
  id: number;
  line: string;
  status: string;
  productName: string;
  productSize: string;
  raceName: string | null;
  startedAt: number;
  endedAt: number | null;
  elapsedMs: number;
  pauseMs: number;
  activeMs: number;
  team: { name: string; emoji: string }[];
  totalPallets: number;
  totalCartons: number;
  totalPoints: number;
  pauses: { reason: string; count: number; ms: number }[];
  pauseCount: number;
}

export async function getHistory(limit = 300): Promise<HistoryRow[]> {
  const now = Date.now();
  const completed = await db
    .select()
    .from(batches)
    .orderBy(desc(batches.startedAt))
    .limit(limit);
  const graphs = await loadBatchGraphs(completed);
  const [workerRows, productRows, raceRows] = await Promise.all([
    db.select().from(workers),
    db.select().from(products),
    db.select().from(races),
  ]);
  const workerById = new Map(workerRows.map((w) => [w.id, w]));
  const productById = new Map(productRows.map((p) => [p.id, p]));
  const raceById = new Map(raceRows.map((r) => [r.id, r]));

  return graphs.map((g) => {
    const t = computeTiming(g.batch, g.pauses, now);
    const sum = summarizePallets(g.pallets);
    const product = productById.get(g.batch.productId);
    const race = g.batch.raceId ? raceById.get(g.batch.raceId) : null;
    return {
      id: g.batch.id,
      line: g.batch.line,
      status: g.batch.status,
      productName: product?.name ?? "מוצר לא ידוע",
      productSize: product?.size ?? "",
      raceName: race?.name ?? null,
      startedAt: g.batch.startedAt.getTime(),
      endedAt: g.batch.endedAt?.getTime() ?? null,
      elapsedMs: t.elapsedMs,
      pauseMs: t.pauseMs,
      activeMs: t.activeMs,
      team: g.members
        .map((m) => workerById.get(m.workerId))
        .filter(Boolean)
        .map((w) => ({ name: w!.name, emoji: w!.emoji })),
      totalPallets: sum.totalPallets,
      totalCartons: sum.totalCartons,
      totalPoints: sum.totalPoints,
      pauses: pauseBreakdown(g.pauses, now),
      pauseCount: g.pauses.length,
    };
  });
}
