import { db } from "@/db";
import { batches, batchMembers, palletShares, workers } from "@/db/schema";
import { and, eq, isNull, ne } from "drizzle-orm";
import { bad, readJson, trimStr } from "@/lib/api";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** PATCH — edit worker details / toggle active. */
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const workerId = Number(id);
  if (!Number.isInteger(workerId) || workerId <= 0) return bad("מזהה עובד לא תקין");

  const [worker] = await db.select().from(workers).where(eq(workers.id, workerId));
  if (!worker) return bad("העובד לא נמצא", 404);

  const body = await readJson<{
    name?: string;
    employeeId?: string;
    emoji?: string;
    active?: boolean;
  }>(req);
  if (!body) return bad("גוף בקשה לא תקין");

  const updates: Partial<typeof worker> = {};

  if (body.name !== undefined) {
    const name = trimStr(body.name);
    if (!name) return bad("שם העובד לא יכול להיות ריק");
    if (name.length > 80) return bad("שם העובד ארוך מדי");
    updates.name = name;
  }

  if (body.employeeId !== undefined) {
    const employeeId = trimStr(body.employeeId);
    if (!employeeId) return bad("מספר העובד לא יכול להיות ריק");
    const [taken] = await db
      .select({ id: workers.id })
      .from(workers)
      .where(and(eq(workers.employeeId, employeeId), ne(workers.id, workerId)));
    if (taken) return bad(`מספר העובד ${employeeId} כבר קיים אצל עובד אחר`, 409);
    updates.employeeId = employeeId;
  }

  if (body.emoji !== undefined) {
    const emoji = trimStr(body.emoji);
    if (!emoji) return bad("יש לבחור אימוג׳י פרופיל");
    if ([...emoji].length > 8) return bad("האימוג׳י חייב להיות תו בודד");
    const [taken] = await db
      .select({ name: workers.name })
      .from(workers)
      .where(and(eq(workers.emoji, emoji), ne(workers.id, workerId)));
    if (taken) {
      return bad(`האימוג׳י ${emoji} כבר בשימוש אצל ${taken.name} — בחרו אימוג׳י אחר`, 409);
    }
    updates.emoji = emoji;
  }

  if (body.active !== undefined) {
    updates.active = Boolean(body.active);
    if (updates.active === false) {
      // Cannot deactivate a worker who is currently on an open batch
      const [onBatch] = await db
        .select({ id: batchMembers.id })
        .from(batchMembers)
        .innerJoin(batches, eq(batchMembers.batchId, batches.id))
        .where(
          and(
            eq(batchMembers.workerId, workerId),
            isNull(batchMembers.leftAt),
            ne(batches.status, "completed"),
          ),
        );
      if (onBatch) {
        return bad("לא ניתן להשבית עובד שמשובץ כרגע באצווה פעילה — הסירו אותו מהצוות קודם");
      }
    }
  }

  if (Object.keys(updates).length === 0) return bad("לא נשלחו שינויים");

  const [updated] = await db
    .update(workers)
    .set(updates)
    .where(eq(workers.id, workerId))
    .returning();
  return Response.json({ ok: true, worker: updated });
}

/**
 * DELETE — hard delete when the worker has no history; otherwise the
 * worker is soft-deleted (deactivated) so historical logs stay intact.
 */
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const workerId = Number(id);
  if (!Number.isInteger(workerId) || workerId <= 0) return bad("מזהה עובד לא תקין");

  const [worker] = await db.select().from(workers).where(eq(workers.id, workerId));
  if (!worker) return bad("העובד לא נמצא", 404);

  const [hasMembership] = await db
    .select({ id: batchMembers.id })
    .from(batchMembers)
    .where(eq(batchMembers.workerId, workerId));
  const [hasShares] = await db
    .select({ id: palletShares.id })
    .from(palletShares)
    .where(eq(palletShares.workerId, workerId));

  if (hasMembership || hasShares) {
    await db.update(workers).set({ active: false }).where(eq(workers.id, workerId));
    return Response.json({
      ok: true,
      softDeleted: true,
      message: "לעובד קיימת היסטוריית עבודה, לכן הושבת במקום להימחק — הנתונים נשמרו",
    });
  }

  await db.delete(workers).where(eq(workers.id, workerId));
  return Response.json({ ok: true, softDeleted: false });
}
