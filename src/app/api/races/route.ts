import { db } from "@/db";
import { races } from "@/db/schema";
import { eq } from "drizzle-orm";
import { bad, readJson, toPositiveNumber, trimStr } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * POST — start a NEW leaderboard race.
 * Any currently active race is closed (endedAt = now). Points "reset"
 * naturally: leaderboards are always computed per-race, and only the
 * active race is shown. Historical data stays untouched.
 */
export async function POST(req: Request) {
  const body = await readJson<{ name?: string; prize?: string; minHours?: number }>(req);
  if (!body) return bad("גוף בקשה לא תקין");

  const name = trimStr(body.name);
  if (!name) return bad("יש להזין שם למירוץ החדש");
  if (name.length > 80) return bad("שם המירוץ ארוך מדי");
  const prize = trimStr(body.prize) || null;

  let minHours = 30;
  if (body.minHours !== undefined && body.minHours !== null && body.minHours !== ("" as unknown)) {
    const parsed = toPositiveNumber(body.minHours);
    if (parsed === null) return bad("סף שעות המינימום חייב להיות מספר חיובי");
    minHours = parsed;
  }

  const result = await db.transaction(async (tx) => {
    await tx
      .update(races)
      .set({ isActive: false, endedAt: new Date() })
      .where(eq(races.isActive, true));
    const [race] = await tx
      .insert(races)
      .values({ name, prize, minHours, isActive: true, startedAt: new Date() })
      .returning();
    return race;
  });

  return Response.json({ ok: true, race: result });
}
