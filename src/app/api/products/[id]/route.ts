import { db } from "@/db";
import { batches, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { bad, readJson, toPositiveInt, toPositiveNumber, trimStr } from "@/lib/api";
import { sanitizePalletOptions } from "../route";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** PATCH — edit product fields / toggle active. */
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId <= 0) return bad("מזהה מוצר לא תקין");

  const [product] = await db.select().from(products).where(eq(products.id, productId));
  if (!product) return bad("המוצר לא נמצא", 404);

  const body = await readJson<{
    name?: string;
    size?: string;
    unitsPerCarton?: number;
    palletOptions?: number[];
    pointValue?: number;
    active?: boolean;
  }>(req);
  if (!body) return bad("גוף בקשה לא תקין");

  const updates: Partial<typeof product> = {};

  if (body.name !== undefined) {
    const name = trimStr(body.name);
    if (!name) return bad("שם המוצר לא יכול להיות ריק");
    updates.name = name;
  }
  if (body.size !== undefined) {
    const size = trimStr(body.size);
    if (!size) return bad("יש להזין גודל בקבוק/גלון");
    updates.size = size;
  }
  if (body.unitsPerCarton !== undefined) {
    const upc = toPositiveInt(body.unitsPerCarton);
    if (!upc) return bad("מספר יחידות בקרטון לא תקין");
    updates.unitsPerCarton = upc;
  }
  if (body.palletOptions !== undefined) {
    const opts = sanitizePalletOptions(body.palletOptions);
    if (!opts) return bad("יש להגדיר לפחות גודל משטח אחד תקין");
    updates.palletOptions = opts;
  }
  if (body.pointValue !== undefined) {
    const pv = toPositiveNumber(body.pointValue);
    if (!pv) return bad("מקדם הנקודות חייב להיות חיובי");
    updates.pointValue = pv;
  }
  if (body.active !== undefined) updates.active = Boolean(body.active);

  if (Object.keys(updates).length === 0) return bad("לא נשלחו שינויים");

  const [updated] = await db
    .update(products)
    .set(updates)
    .where(eq(products.id, productId))
    .returning();
  return Response.json({ ok: true, product: updated });
}

/** DELETE — hard delete if never used, otherwise deactivate to keep history. */
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId <= 0) return bad("מזהה מוצר לא תקין");

  const [product] = await db.select().from(products).where(eq(products.id, productId));
  if (!product) return bad("המוצר לא נמצא", 404);

  const [used] = await db
    .select({ id: batches.id })
    .from(batches)
    .where(eq(batches.productId, productId));
  if (used) {
    await db.update(products).set({ active: false }).where(eq(products.id, productId));
    return Response.json({
      ok: true,
      softDeleted: true,
      message: "המוצר משויך לאצוות קיימות, לכן הושבת במקום להימחק — ההיסטוריה נשמרת",
    });
  }

  await db.delete(products).where(eq(products.id, productId));
  return Response.json({ ok: true, softDeleted: false });
}
