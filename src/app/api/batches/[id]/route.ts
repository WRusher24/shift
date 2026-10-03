import { db } from "@/db";
import { batches, batchMembers, pauses, workers } from "@/db/schema";
import { and, eq, isNull, ne } from "drizzle-orm";
import { bad, readJson, trimStr } from "@/lib/api";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function loadOpenBatch(idParam: string) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) return { error: bad("מזהה אצווה לא תקין") };
  const [batch] = await db.select().from(batches).where(eq(batches.id, id));
  if (!batch) return { error: bad("האצווה לא נמצאה", 404) };
  if (batch.status === "completed") {
    return { error: bad("האצווה כבר הסתיימה ולא ניתן לערוך אותה") };
  }
  return { batch };
}

/** PATCH — lifecycle actions: pause | resume | complete | addMember | removeMember */
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const loaded = await loadOpenBatch(id);
  if ("error" in loaded) return loaded.error;
  const batch = loaded.batch;

  const body = await readJson<{ action?: string; reason?: string; workerId?: number }>(req);
  if (!body?.action) return bad("פעולה לא תקינה");
  const now = new Date();

  switch (body.action) {
    case "pause": {
      if (batch.status === "paused") return bad("האצווה כבר במצב השהיה");
      const reason = trimStr(body.reason);
      if (!reason) return bad("יש לבחור סיבת השהיה");
      await db.insert(pauses).values({
        batchId: batch.id,
        reason,
        startedAt: now,
      });
      await db
        .update(batches)
        .set({ status: "paused" })
        .where(eq(batches.id, batch.id));
      return Response.json({ ok: true });
    }

    case "resume": {
      if (batch.status !== "paused") return bad("האצווה אינה מושהית");
      await db
        .update(pauses)
        .set({ endedAt: now })
        .where(and(eq(pauses.batchId, batch.id), isNull(pauses.endedAt)));
      await db
        .update(batches)
        .set({ status: "active" })
        .where(eq(batches.id, batch.id));
      return Response.json({ ok: true });
    }

    case "complete": {
      // Close any open pause and membership, then finish the batch.
      await db
        .update(pauses)
        .set({ endedAt: now })
        .where(and(eq(pauses.batchId, batch.id), isNull(pauses.endedAt)));
      await db
        .update(batchMembers)
        .set({ leftAt: now })
        .where(and(eq(batchMembers.batchId, batch.id), isNull(batchMembers.leftAt)));
      await db
        .update(batches)
        .set({ status: "completed", endedAt: now })
        .where(eq(batches.id, batch.id));
      return Response.json({ ok: true });
    }

    case "addMember": {
      const workerId = Number(body.workerId);
      if (!Number.isInteger(workerId) || workerId <= 0) return bad("יש לבחור עובד להוספה");
      const [worker] = await db.select().from(workers).where(eq(workers.id, workerId));
      if (!worker) return bad("העובד לא נמצא", 404);
      if (!worker.active) return bad("העובד אינו פעיל ולא ניתן לשבץ אותו");

      const [alreadyIn] = await db
        .select({ id: batchMembers.id })
        .from(batchMembers)
        .where(
          and(
            eq(batchMembers.batchId, batch.id),
            eq(batchMembers.workerId, workerId),
            isNull(batchMembers.leftAt),
          ),
        );
      if (alreadyIn) return bad(`${worker.name} כבר חבר בצוות האצווה`);

      const [elsewhere] = await db
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
      if (elsewhere) return bad(`${worker.name} משובץ כרגע באצווה אחרת`);

      await db.insert(batchMembers).values({
        batchId: batch.id,
        workerId,
        joinedAt: now,
      });
      return Response.json({ ok: true });
    }

    case "removeMember": {
      const workerId = Number(body.workerId);
      if (!Number.isInteger(workerId) || workerId <= 0) return bad("יש לבחור עובד להסרה");
      const [openMembership] = await db
        .select({ id: batchMembers.id })
        .from(batchMembers)
        .where(
          and(
            eq(batchMembers.batchId, batch.id),
            eq(batchMembers.workerId, workerId),
            isNull(batchMembers.leftAt),
          ),
        );
      if (!openMembership) return bad("העובד אינו חבר פעיל בצוות האצווה");
      await db
        .update(batchMembers)
        .set({ leftAt: now })
        .where(eq(batchMembers.id, openMembership.id));
      return Response.json({ ok: true });
    }

    default:
      return bad("פעולה לא מוכרת");
  }
}

/** DELETE — cancel/discrad a batch entirely (with its logs). */
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const batchId = Number(id);
  if (!Number.isInteger(batchId) || batchId <= 0) return bad("מזהה אצווה לא תקין");
  const [batch] = await db.select().from(batches).where(eq(batches.id, batchId));
  if (!batch) return bad("האצווה לא נמצאה", 404);
  await db.delete(batches).where(eq(batches.id, batchId)); // cascades
  return Response.json({ ok: true });
}
