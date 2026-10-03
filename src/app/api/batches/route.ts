import { db } from "@/db";
import { batches, batchMembers, products, races, workers } from "@/db/schema";
import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { bad, readJson } from "@/lib/api";
import { LINES } from "@/lib/stats";

export const dynamic = "force-dynamic";

interface CreateBatchBody {
  line?: string;
  productId?: number;
  workerIds?: number[];
}

/** POST — start a new batch on a line. */
export async function POST(req: Request) {
  const body = await readJson<CreateBatchBody>(req);
  if (!body) return bad("גוף בקשה לא תקין");

  const line = trimOrEmpty(body.line).toUpperCase();
  if (!LINES.includes(line as (typeof LINES)[number])) {
    return bad("יש לבחור קו תקין (A או B)");
  }

  const productId = Number(body.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    return bad("יש לבחור מוצר לייצור");
  }
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId));
  if (!product) return bad("המוצר שנבחר לא נמצא במערכת", 404);
  if (!product.active) return bad("המוצר שנבחר אינו פעיל");

  // The line must be free
  const [lineBusy] = await db
    .select({ id: batches.id })
    .from(batches)
    .where(and(eq(batches.line, line), ne(batches.status, "completed")));
  if (lineBusy) return bad(`קו ${line} כבר מפעיל אצווה פתוחה`);

  // Team validation
  const rawIds = Array.isArray(body.workerIds) ? body.workerIds : [];
  const workerIds = [...new Set(rawIds.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  if (workerIds.length === 0) return bad("יש לבחור לפחות עובד אחד לצוות");

  const foundWorkers = await db
    .select()
    .from(workers)
    .where(inArray(workers.id, workerIds));
  if (foundWorkers.length !== workerIds.length) {
    return bad("אחד העובדים שנבחרו לא נמצא במערכת");
  }
  const inactive = foundWorkers.find((w) => !w.active);
  if (inactive) return bad(`העובד ${inactive.name} אינו פעיל ולא ניתן לשבץ אותו`);

  // No worker may already be on another open batch
  const openMemberships = await db
    .select({ workerId: batchMembers.workerId, batchId: batchMembers.batchId })
    .from(batchMembers)
    .innerJoin(batches, eq(batchMembers.batchId, batches.id))
    .where(
      and(
        inArray(batchMembers.workerId, workerIds),
        isNull(batchMembers.leftAt),
        ne(batches.status, "completed"),
      ),
    );
  if (openMemberships.length > 0) {
    const w = foundWorkers.find((x) => x.id === openMemberships[0].workerId);
    return bad(`${w?.name ?? "עובד"} כבר משובץ באצווה פעילה אחרת`);
  }

  const [activeRace] = await db
    .select()
    .from(races)
    .where(eq(races.isActive, true));

  const [batch] = await db
    .insert(batches)
    .values({
      line,
      productId: product.id,
      raceId: activeRace?.id ?? null,
      status: "active",
      startedAt: new Date(),
    })
    .returning();

  await db.insert(batchMembers).values(
    workerIds.map((workerId) => ({ batchId: batch.id, workerId })),
  );

  return Response.json({ ok: true, batchId: batch.id });
}

function trimOrEmpty(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
