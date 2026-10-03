import { db } from "@/db";
import { races } from "@/db/schema";
import { eq } from "drizzle-orm";
import { bad, readJson, toPositiveNumber, trimStr } from "@/lib/api";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** PATCH — finish a race, or update name / prize / hours threshold. */
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const raceId = Number(id);
  if (!Number.isInteger(raceId) || raceId <= 0) return bad("מזהה מירוץ לא תקין");

  const [race] = await db.select().from(races).where(eq(races.id, raceId));
  if (!race) return bad("המירוץ לא נמצא", 404);

  const body = await readJson<{
    action?: string;
    name?: string;
    prize?: string;
    minHours?: number;
  }>(req);
  if (!body) return bad("גוף בקשה לא תקין");

  if (body.action === "finish") {
    if (!race.isActive) return bad("המירוץ כבר הסתיים");
    const [updated] = await db
      .update(races)
      .set({ isActive: false, endedAt: new Date() })
      .where(eq(races.id, raceId))
      .returning();
    return Response.json({ ok: true, race: updated });
  }

  const updates: Partial<typeof race> = {};
  if (body.name !== undefined) {
    const name = trimStr(body.name);
    if (!name) return bad("שם המירוץ לא יכול להיות ריק");
    updates.name = name;
  }
  if (body.prize !== undefined) {
    updates.prize = trimStr(body.prize) || null;
  }
  if (body.minHours !== undefined) {
    const parsed = toPositiveNumber(body.minHours);
    if (parsed === null) return bad("סף שעות המינימום חייב להיות מספר חיובי");
    updates.minHours = parsed;
  }

  if (Object.keys(updates).length === 0) return bad("לא נשלחו שינויים");

  const [updated] = await db
    .update(races)
    .set(updates)
    .where(eq(races.id, raceId))
    .returning();
  return Response.json({ ok: true, race: updated });
}
