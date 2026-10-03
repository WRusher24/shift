import { getHistory } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await getHistory(500);
    return Response.json({ rows });
  } catch (err) {
    console.error("history error", err);
    return Response.json({ error: "שגיאת שרת בטעינת ההיסטוריה" }, { status: 500 });
  }
}
