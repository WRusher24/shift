import { db } from "@/db";
import { products } from "@/db/schema";
import { bad, readJson, toPositiveInt, toPositiveNumber, trimStr } from "@/lib/api";

export const dynamic = "force-dynamic";

export function sanitizePalletOptions(v: unknown): number[] | null {
  if (!Array.isArray(v)) return null;
  const list = [
    ...new Set(
      v
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n > 0 && n <= 9999),
    ),
  ];
  return list.length ? list : null;
}

/** POST — create a product (name in Hebrew / Arabic / English). */
export async function POST(req: Request) {
  const body = await readJson<{
    name?: string;
    size?: string;
    unitsPerCarton?: number;
    palletOptions?: number[];
    pointValue?: number;
  }>(req);
  if (!body) return bad("גוף בקשה לא תקין");

  const name = trimStr(body.name);
  const size = trimStr(body.size);
  if (!name) return bad("יש להזין שם מוצר");
  if (name.length > 100) return bad("שם המוצר ארוך מדי");
  if (!size) return bad("יש להזין גודל בקבוק/גלון (לדוגמה: 1 ל\"מ)");

  const unitsPerCarton = toPositiveInt(body.unitsPerCarton ?? 12);
  if (!unitsPerCarton) return bad("יש להזין מספר יחידות בקרטון תקין");

  const palletOptions = sanitizePalletOptions(body.palletOptions);
  if (!palletOptions) return bad("יש להגדיר לפחות גודל משטח אחד (מספר קרטונים שלם)");

  const pointValue = toPositiveNumber(body.pointValue ?? 1);
  if (!pointValue) return bad("יש להזין מקדם נקודות חיובי למוצר");

  const [product] = await db
    .insert(products)
    .values({ name, size, unitsPerCarton, palletOptions, pointValue })
    .returning();
  return Response.json({ ok: true, product });
}
