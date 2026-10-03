/**
 * Seed script for the "שיפט" (Shift) platform.
 * Populates: workers (unique emojis), products (pallet configs),
 * races (one finished + one active) and a realistic mock batch history
 * with memberships, mid-batch changes, pauses, pallets and point shares.
 *
 * Run with:  npx tsx src/db/seed.ts
 */
import "dotenv/config";
import { db } from "./index";
import {
  batches,
  batchMembers,
  pallets,
  palletShares,
  pauses,
  products,
  races,
  workers,
} from "./schema";
import { PAUSE_REASONS, round2 } from "../lib/stats";

/* Deterministic RNG so re-seeding is reproducible */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260312);
const ri = (min: number, max: number) =>
  Math.floor(rand() * (max - min + 1)) + min;
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function sample<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (copy.length && out.length < n) {
    out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  }
  return out;
}

async function main() {
  console.log("🧹 Clearing existing data…");
  await db.delete(palletShares);
  await db.delete(pallets);
  await db.delete(pauses);
  await db.delete(batchMembers);
  await db.delete(batches);
  await db.delete(races);
  await db.delete(products);
  await db.delete(workers);

  /* ------------------------------ Workers ------------------------------ */
  const workerSeed = [
    { name: "דניאל כהן", employeeId: "1001", emoji: "🦾" },
    { name: "אחמד חוסיין", employeeId: "1002", emoji: "🚀" },
    { name: "יוסי לוי", employeeId: "1003", emoji: "⚡" },
    { name: "מרים עבדאללה", employeeId: "1004", emoji: "🌟" },
    { name: "עומר ח׳ליל", employeeId: "1005", emoji: "🐯" },
    { name: "נועה שמעוני", employeeId: "1006", emoji: "🧤" },
    { name: "ויקטור פבלוב", employeeId: "1007", emoji: "🔧" },
    { name: "סאלח נאסר", employeeId: "1008", emoji: "🎯" },
    { name: "אבי מזרחי", employeeId: "1009", emoji: "🏭" },
    { name: "Lior Biton", employeeId: "1010", emoji: "💪" },
    { name: "خالد יוסף", employeeId: "1011", emoji: "🧪" },
    { name: "Sara Levi", employeeId: "1012", emoji: "🦅" },
  ];
  const insertedWorkers = await db.insert(workers).values(workerSeed).returning();
  console.log(`👷 ${insertedWorkers.length} workers`);

  /* ------------------------------ Products ----------------------------- */
  const productSeed = [
    {
      name: "מנקה רצפות",
      size: "1 ל\"מ",
      unitsPerCarton: 12,
      palletOptions: [28, 32],
      pointValue: 1,
    },
    {
      name: "סבון כלים לימון",
      size: "2 ל\"מ",
      unitsPerCarton: 8,
      palletOptions: [24, 30],
      pointValue: 1.5,
    },
    {
      name: "אקונומיקה",
      size: "4 ל\"מ",
      unitsPerCarton: 4,
      palletOptions: [20, 24],
      pointValue: 2,
    },
    {
      name: "מנקה שירותים",
      size: "750 מ\"ל",
      unitsPerCarton: 16,
      palletOptions: [36, 40],
      pointValue: 1.2,
    },
    {
      name: "מרכך כביסה Lavender",
      size: "3 لتر",
      unitsPerCarton: 6,
      palletOptions: [18, 22],
      pointValue: 1.8,
    },
    {
      name: "Glass Cleaner",
      size: "1L",
      unitsPerCarton: 12,
      palletOptions: [30, 34],
      pointValue: 1.1,
    },
    {
      name: "מגבונים חיטוי 72 יח׳",
      size: "חבילה",
      unitsPerCarton: 18,
      palletOptions: [40, 44],
      pointValue: 0.8,
    },
  ];
  const insertedProducts = await db.insert(products).values(productSeed).returning();
  console.log(`🧴 ${insertedProducts.length} products`);

  /* ------------------------------- Races ------------------------------- */
  const now = Date.now();
  const [finishedRace] = await db
    .insert(races)
    .values({
      name: "מירוץ פתיחה",
      prize: "שובר ארוחת בוקר לצוות המנצח",
      minHours: 6,
      isActive: false,
      startedAt: new Date(now - 55 * DAY),
      endedAt: new Date(now - 26 * DAY),
    })
    .returning();
  const [activeRace] = await db
    .insert(races)
    .values({
      name: "מירוץ האביב הגדול",
      prize: "ארוחת צוות חגיגית + שובר 500 ש\"ח לכל מנצח",
      minHours: 8,
      isActive: true,
      startedAt: new Date(now - 12 * DAY),
    })
    .returning();
  console.log(`🏁 2 races (active: "${activeRace.name}")`);

  /* ---------------------------- Batch history -------------------------- */
  const workerIds = insertedWorkers.map((w) => w.id);
  let palletsTotal = 0;
  let batchesTotal = 0;

  async function createBatch(opts: {
    raceId: number;
    start: number;
    durationMin: number;
    line: "A" | "B";
    product: (typeof insertedProducts)[number];
  }) {
    const { raceId, start, durationMin, line, product } = opts;
    const end = start + durationMin * MIN;

    const [batch] = await db
      .insert(batches)
      .values({
        line,
        productId: product.id,
        raceId,
        status: "completed",
        startedAt: new Date(start),
        endedAt: new Date(end),
      })
      .returning();

    // Team: 3-5 members
    const team = sample(workerIds, ri(3, 5));
    const leaveAt =
      rand() < 0.3 ? start + Math.floor(durationMin * (0.5 + rand() * 0.2)) * MIN : null;
    const memberRows = await db
      .insert(batchMembers)
      .values(
        team.map((wid, idx) => ({
          batchId: batch.id,
          workerId: wid,
          joinedAt: new Date(start),
          leftAt:
            leaveAt && idx === team.length - 1 && team.length > 3
              ? new Date(leaveAt)
              : null,
        })),
      )
      .returning();

    // 0-2 pauses placed away from batch edges
    const pauseCount = rand() < 0.75 ? ri(1, 2) : 0;
    const pauseIntervals: { s: number; e: number; reason: string }[] = [];
    for (let i = 0; i < pauseCount; i++) {
      const len = ri(5, 18) * MIN;
      const s = start + ri(15, Math.max(16, durationMin - 25)) * MIN;
      const e = Math.min(s + len, end - 5 * MIN);
      if (e > s) {
        pauseIntervals.push({
          s,
          e,
          reason: pick(PAUSE_REASONS.slice(0, 5)),
        });
      }
    }
    if (pauseIntervals.length) {
      await db.insert(pauses).values(
        pauseIntervals.map((p) => ({
          batchId: batch.id,
          reason: p.reason,
          startedAt: new Date(p.s),
          endedAt: new Date(p.e),
        })),
      );
    }

    // Pallets every ~22-34 minutes of runtime
    const palletCount = Math.max(2, Math.floor(durationMin / ri(22, 34)));
    for (let k = 0; k < palletCount; k++) {
      let t = start + ((k + 1) / (palletCount + 1)) * (end - start);
      t += (rand() - 0.5) * 8 * MIN;
      // nudge out of pause windows
      for (const p of pauseIntervals) {
        if (t >= p.s && t <= p.e) t = p.e + 2 * MIN;
      }
      if (t > end - 3 * MIN) t = end - 3 * MIN;

      const useCustom = rand() < 0.12;
      const cartons = useCustom
        ? Math.max(6, pick(product.palletOptions) + ri(-6, 6))
        : pick(product.palletOptions);

      const activeMembers = memberRows.filter(
        (m) => !m.leftAt || m.leftAt.getTime() > t,
      );
      if (activeMembers.length === 0) continue;

      const total = round2(cartons * product.pointValue);
      const per = round2(total / activeMembers.length);
      const [pallet] = await db
        .insert(pallets)
        .values({
          batchId: batch.id,
          cartons,
          points: total,
          memberCount: activeMembers.length,
          loggedAt: new Date(t),
        })
        .returning();
      await db.insert(palletShares).values(
        activeMembers.map((m) => ({
          palletId: pallet.id,
          workerId: m.workerId,
          points: per,
          awardedAt: new Date(t),
        })),
      );
      palletsTotal++;
    }
    batchesTotal++;
  }

  // Finished race: 5 batches inside its window
  for (let i = 0; i < 5; i++) {
    const dayOffset = ri(28, 50);
    await createBatch({
      raceId: finishedRace.id,
      start: now - dayOffset * DAY + ri(6, 18) * HOUR,
      durationMin: ri(90, 200),
      line: i % 2 === 0 ? "A" : "B",
      product: pick(insertedProducts),
    });
  }

  // Active race: batches spread across the last 12 days
  for (let day = 12; day >= 1; day--) {
    const perDay = ri(1, 3);
    for (let i = 0; i < perDay; i++) {
      await createBatch({
        raceId: activeRace.id,
        start: now - day * DAY + ri(6, 19) * HOUR,
        durationMin: ri(75, 210),
        line: rand() < 0.5 ? "A" : "B",
        product: pick(insertedProducts),
      });
    }
  }

  console.log(
    `📦 ${batchesTotal} completed batches, ${palletsTotal} pallets with point shares`,
  );
  console.log("✅ Seed complete — the station is ready to go.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
