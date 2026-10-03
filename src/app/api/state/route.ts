import { getStateSnapshot } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getStateSnapshot();
    return Response.json(snapshot);
  } catch (err) {
    console.error("state error", err);
    return Response.json({ error: "שגיאת שרת בטעינת הנתונים" }, { status: 500 });
  }
}
