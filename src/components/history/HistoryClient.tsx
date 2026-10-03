"use client";

import { useMemo, useState } from "react";
import {
  CirclePause,
  Download,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import type { HistoryRow } from "@/lib/data";
import {
  formatDate,
  formatDuration,
  formatDurationShort,
  formatNumber,
} from "@/lib/format";
import { usePolling } from "@/components/hooks";

export function HistoryClient() {
  const { data, loading, refresh } = usePolling<{ rows: HistoryRow[] }>(
    "/api/history",
    8000,
  );
  const [query, setQuery] = useState("");
  const [line, setLine] = useState<"all" | "A" | "B">("all");

  const rows = useMemo(() => {
    let list = data?.rows ?? [];
    if (line !== "all") list = list.filter((r) => r.line === line);
    const q = query.trim();
    if (q) {
      list = list.filter(
        (r) =>
          r.productName.includes(q) ||
          (r.raceName ?? "").includes(q) ||
          r.team.some((t) => t.name.includes(q)),
      );
    }
    return list;
  }, [data, query, line]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-3xl font-black text-ink">יומן אצוות והיסטוריה</h1>
          <p className="text-sm font-bold text-ink-faint">
            כל האצוות שנרשמו — זמני עבודה, השהיות, צוותים ונקודות
          </p>
        </div>
        <div className="ms-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש מוצר, עובד או מירוץ…"
              className="touch-lg w-64 rounded-xl border border-edge bg-white pe-3 ps-9 text-sm font-bold text-ink outline-none focus:border-brand-400"
            />
          </div>
          <select
            value={line}
            onChange={(e) => setLine(e.target.value as "all" | "A" | "B")}
            className="touch-lg rounded-xl border border-edge bg-white px-3 text-sm font-bold text-ink outline-none focus:border-brand-400"
          >
            <option value="all">כל הקווים</option>
            <option value="A">קו A</option>
            <option value="B">קו B</option>
          </select>
          <button
            onClick={refresh}
            className="grid h-11 w-11 place-items-center rounded-xl border border-edge bg-white text-ink-soft transition-colors hover:text-brand-600"
            title="רענון"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <a
            href="/api/export/batches"
            className="touch-lg flex items-center gap-2 rounded-xl bg-ink px-4 text-sm font-black text-white transition-colors hover:bg-ink/85"
          >
            <Download className="h-4 w-4" />
            ייצוא CSV
          </a>
        </div>
      </header>

      {loading && !data ? (
        <div className="flex min-h-[40vh] items-center justify-center gap-3 text-ink-faint">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
          <p className="text-lg font-bold">טוען היסטוריה…</p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-3xl border border-edge bg-surface shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead>
                <tr className="bg-paper text-xs font-black text-ink-faint">
                  {[
                    "מזהה",
                    "תאריך",
                    "קו",
                    "מוצר",
                    "התחלה",
                    "סיום",
                    "זמן פעיל",
                    "זמן כולל",
                    "השהיות",
                    "צוות",
                    "משטחים",
                    "קרטונים",
                    "נקודות",
                  ].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-3 text-start">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/70">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top transition-colors hover:bg-brand-50/40">
                    <td className="digits px-3 py-3 font-bold text-ink-faint">#{r.id}</td>
                    <td className="num whitespace-nowrap px-3 py-3 font-bold text-ink">
                      {formatDate(r.startedAt)}
                      {r.raceName && (
                        <span className="ms-1.5 block text-[11px] font-extrabold text-brand-600">
                          {r.raceName}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`grid h-8 w-8 place-items-center rounded-xl text-sm font-black text-white ${
                          r.line === "A" ? "bg-brand-600" : "bg-violet-600"
                        }`}
                      >
                        {r.line}
                      </span>
                    </td>
                    <td className="min-w-36 px-3 py-3">
                      <span className="font-extrabold text-ink">{r.productName}</span>
                      <span className="num block text-xs font-bold text-ink-faint">
                        {r.productSize}
                      </span>
                    </td>
                    <td className="num whitespace-nowrap px-3 py-3 font-bold text-ink-soft">
                      {clockOf(r.startedAt)}
                    </td>
                    <td className="num whitespace-nowrap px-3 py-3 font-bold text-ink-soft">
                      {r.endedAt ? clockOf(r.endedAt) : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <span className="digits whitespace-nowrap rounded-lg bg-volt-50 px-2 py-1 text-[13px] font-bold text-volt-700">
                        {formatDuration(r.activeMs)}
                      </span>
                    </td>
                    <td className="digits whitespace-nowrap px-3 py-3 font-bold text-ink-soft">
                      {formatDuration(r.elapsedMs)}
                    </td>
                    <td className="min-w-44 px-3 py-3">
                      {r.pauses.length > 0 ? (
                        <span className="flex flex-wrap gap-1">
                          {r.pauses.map((p, i) => (
                            <span
                              key={i}
                              className="num inline-flex items-center gap-1 rounded-full bg-safety-50 px-2 py-0.5 text-[11px] font-extrabold text-safety-700"
                              title={p.reason}
                            >
                              <CirclePause className="h-3 w-3" />
                              {p.reason}: {formatDurationShort(p.ms)}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-ink-faint">ללא</span>
                      )}
                    </td>
                    <td className="min-w-44 px-3 py-3">
                      <span className="flex flex-wrap gap-x-2 gap-y-1">
                        {r.team.map((t, i) => (
                          <span key={i} className="whitespace-nowrap text-xs font-bold text-ink">
                            {t.emoji} {t.name}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className="digits px-3 py-3 font-bold text-ink-soft">
                      {formatNumber(r.totalPallets, 0)}
                    </td>
                    <td className="digits px-3 py-3 font-bold text-ink-soft">
                      {formatNumber(r.totalCartons, 0)}
                    </td>
                    <td className="px-3 py-3">
                      <span className="digits whitespace-nowrap rounded-lg bg-volt-600 px-2 py-1 text-[13px] font-bold text-white">
                        {formatNumber(r.totalPoints)}
                      </span>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-4 py-10 text-center font-bold text-ink-faint">
                      לא נמצאו אצוות התואמות לסינון
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function clockOf(ts: number): string {
  // HH:MM in Western digits (reuse formatDate's time part via formatTime)
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
