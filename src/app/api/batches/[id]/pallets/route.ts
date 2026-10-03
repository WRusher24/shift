import { db } from "@/db";
import {
  batches,
  batchMembers,
  pallets,
  palletShares,
  products,
} from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { bad, readJson, toPositiveInt } from "@/lib/api";
import { round2, splitPoints } from "@/lib/stats";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * POST — log a finished pallet.
 * Points = cartons × product point multiplier, split EQUALLY among the
 * team members active at this exact moment. Shares are written to the
 * pallet_shares ledger instantly.
 */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const batchId = Number(id);
  if (!Number.isInteger(batchId) || batchId <= 0) return bad("מזהה אצווה לא תקין");

  const body = await readJson<{ cartons?: number }>(req);
  const cartons = toPositiveInt(body?.cartons);
  if (!cartons) return bad("יש להזין מספר קרטונים תקין (מספר שלם חיובי)");
  if (cartons > 9999) return bad("מספר הקרטונים גבוה מדי — בדקו שהוזן נכון");

  const [batch] = await db.select().from(batches).where(eq(batches.id, batchId));
  if (!batch) return bad("האצווה לא נמצאה", 404);
  if (batch.status === "completed") return bad("האצווה הסתיימה — לא ניתן לרשום משטחים");
  if (batch.status === "paused") {
    return bad("האצווה מושהית — חדשו את העבודה לפני רישום משטח");
  }

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, batch.productId));
  if (!product) return bad("המוצר של האצווה לא נמצא", 404);

  const activeMembers = await db
    .select()
    .from(batchMembers)
    .where(and(eq(batchMembers.batchId, batchId), isNull(batchMembers.leftAt)));
  if (activeMembers.length === 0) {
    return bad("אין חברי צוות פעילים באצווה — הוסיפו עובד לפני רישום משטח");
  }

  const totalPoints = round2(cartons * product.pointValue);
  const perMember = splitPoints(totalPoints, activeMembers.length);
  const now = new Date();

  const result = await db.transaction(async (tx) => {
    const [pallet] = await tx
      .insert(pallets)
      .values({
        batchId,
        cartons,
        points: totalPoints,
        memberCount: activeMembers.length,
        loggedAt: now,
      })
      .returning();
    await tx.insert(palletShares).values(
      activeMembers.map((m) => ({
        palletId: pallet.id,
        workerId: m.workerId,
        points: perMember,
        awardedAt: now,
      })),
    );
    return pallet;
  });

  return Response.json({
    ok: true,
    palletId: result.id,
    cartons,
    points: totalPoints,
    perMember,
    memberCount: activeMembers.length,
  });
}
