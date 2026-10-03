import { db } from "@/db";
import { workers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { bad, readJson, trimStr } from "@/lib/api";

export const dynamic = "force-dynamic";

/** POST — add a new worker. Emoji must be globally unique. */
export async function POST(req: Request) {
  const body = await readJson<{ name?: string; employeeId?: string; emoji?: string }>(req);
  if (!body) return bad("גוף בקשה לא תקין");

  const name = trimStr(body.name);
  const employeeId = trimStr(body.employeeId);
  const emoji = trimStr(body.emoji);

  if (!name) return bad("יש להזין שם עובד (בעברית, ערבית או אנגלית)");
  if (name.length > 80) return bad("שם העובד ארוך מדי");
  if (!employeeId) return bad("יש להזין מספר עובד");
  if (!emoji) return bad("יש לבחור אימוג׳י פרופיל לעובד");
  if ([...emoji].length > 8) return bad("האימוג׳י חייב להיות תו בודד");

  const [emojiTaken] = await db
    .select({ id: workers.id, name: workers.name })
    .from(workers)
    .where(eq(workers.emoji, emoji));
  if (emojiTaken) {
    return bad(`האימוג׳י ${emoji} כבר בשימוש אצל ${emojiTaken.name} — בחרו אימוג׳י אחר`, 409);
  }

  const [idTaken] = await db
    .select({ id: workers.id })
    .from(workers)
    .where(eq(workers.employeeId, employeeId));
  if (idTaken) return bad(`מספר העובד ${employeeId} כבר קיים במערכת`, 409);

  const [worker] = await db
    .insert(workers)
    .values({ name, employeeId, emoji })
    .returning();
  return Response.json({ ok: true, worker });
}
