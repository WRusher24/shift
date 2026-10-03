import { db } from "@/db";
import { batches, races, workers } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getHistory,
  loadBatchGraphs,
} from "@/lib/data";
import { computeLeaderboard } from "@/lib/stats";
import {
  csvCell,
  formatDate,
  formatDateTime,
  formatDuration,
  formatNumber,
} from "@/lib/format";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ kind: string }> };

const BOM = "﻿"; // UTF-8 BOM so Hebrew opens correctly in Excel

function csvResponse(filename: string, header: string[], rows: (string | number)[][]) {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  return new Response(BOM + lines, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

const dateStamp = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
};

export async function GET(_req: Request, { params }: Params) {
  const { kind } = await params;
  const now = Date.now();

  /* ------------------------- Batches ledger ------------------------- */
  if (kind === "batches") {
    const history = await getHistory(5000);
    return csvResponse(
      `shift-batches-${dateStamp()}.csv`,
      [
        "מזהה",
        "קו",
        "מוצר",
        "גודל",
        "מירוץ",
        "תאריך",
        "שעת התחלה",
        "שעת סיום",
        "זמן עבודה פעיל",
        "זמן כולל",
        "זמן השהיות",
        "מספר השהיות",
        "פירוט השהיות",
        "משטחים",
        "קרטונים",
        "סה\"כ נקודות",
        "חברי צוות",
      ],
      history.map((h) => [
        h.id,
        h.line,
        h.productName,
        h.productSize,
        h.raceName ?? "—",
        formatDate(h.startedAt),
        formatDateTime(h.startedAt).split(" ")[1],
        h.endedAt ? formatDateTime(h.endedAt).split(" ")[1] : "—",
        formatDuration(h.activeMs),
        formatDuration(h.elapsedMs),
        formatDuration(h.pauseMs),
        h.pauseCount,
        h.pauses
          .map((p) => `${p.reason}: ${formatDuration(p.ms)} (x${p.count})`)
          .join(" | "),
        h.totalPallets,
        h.totalCartons,
        formatNumber(h.totalPoints),
        h.team.map((t) => `${t.emoji} ${t.name}`).join(" | "),
      ]),
    );
  }

  /* --------------------- Worker points summary ---------------------- */
  if (kind === "points") {
    const [activeRace] = await db.select().from(races).where(eq(races.isActive, true));
    if (!activeRace) {
      return Response.json({ error: "אין מירוץ פעיל כרגע" }, { status: 400 });
    }
    const workerRows = await db.select().from(workers);
    const raceBatches = await db
      .select()
      .from(batches)
      .where(eq(batches.raceId, activeRace.id));
    const graphs = await loadBatchGraphs(raceBatches);
    const board = computeLeaderboard(workerRows, graphs, activeRace.minHours, now);

    return csvResponse(
      `shift-points-${dateStamp()}.csv`,
      [
        "דירוג",
        "עובד",
        "אימוג'י",
        "מספר עובד",
        "סה\"כ נקודות",
        "שעות עבודה פעילות",
        "נקודות לשעה (PPH)",
        "עומד בסף השעות",
        "משטחים ששולבו",
      ],
      board.map((r, i) => [
        i + 1,
        r.worker.name,
        r.worker.emoji,
        r.worker.employeeId,
        formatNumber(r.points),
        formatNumber(r.activeHours),
        formatNumber(r.pph),
        r.qualified ? "כן" : "לא",
        r.pallets,
      ]),
    );
  }

  /* ------------------------- Downtime report ------------------------ */
  if (kind === "downtime") {
    const history = await getHistory(5000);
    const rows: (string | number)[][] = [];
    for (const h of history) {
      for (const p of h.pauses) {
        rows.push([
          h.id,
          `קו ${h.line}`,
          h.productName,
          formatDate(h.startedAt),
          p.reason,
          p.count,
          formatDuration(p.ms),
          formatNumber((p.ms / (h.elapsedMs || 1)) * 100),
        ]);
      }
    }
    return csvResponse(
      `shift-downtime-${dateStamp()}.csv`,
      [
        "מזהה אצווה",
        "קו",
        "מוצר",
        "תאריך",
        "סיבת השהיה",
        "מספר אירועים",
        "זמן השבתה",
        "אחוז מזמן האצווה",
      ],
      rows,
    );
  }

  return Response.json({ error: "סוג דוח לא מוכר" }, { status: 404 });
}
