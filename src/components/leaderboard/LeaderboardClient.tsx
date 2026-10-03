"use client";

import {
  BadgeCheck,
  CalendarRange,
  Crown,
  Gauge,
  Gift,
  Hourglass,
  Loader2,
  Medal,
  Trophy,
} from "lucide-react";
import type { StateSnapshot } from "@/lib/data";
import type { LeaderboardRow } from "@/lib/stats";
import { formatDate, formatNumber } from "@/lib/format";
import { usePolling } from "@/components/hooks";

export function LeaderboardClient() {
  const { data, loading } = usePolling<StateSnapshot>("/api/state", 5000);

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-ink-faint">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        <p className="text-lg font-bold">טוען טבלאות…</p>
      </div>
    );
  }
  if (!data) return null;

  const race = data.activeRace;
  const volume = data.volumeLeaderboard;
  const efficiency = data.efficiencyLeaderboard;
  const podium = volume.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Race hero */}
      <section className="relative overflow-hidden rounded-3xl border border-edge bg-surface shadow-card">
        <div className="absolute inset-y-0 end-0 w-1/3 bg-gradient-to-l from-brand-50 to-transparent" />
        <div className="relative flex flex-wrap items-center gap-x-10 gap-y-4 px-6 py-6">
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-xs font-black tracking-wide text-brand-600">
              <Crown className="h-4 w-4" /> מירוץ פעיל
            </p>
            <h1 className="text-3xl font-black text-ink sm:text-4xl">
              {race ? race.name : "אין מירוץ פעיל כרגע"}
            </h1>
            {race?.prize && (
              <p className="mt-1 flex items-center gap-1.5 text-base font-extrabold text-safety-600">
                <Gift className="h-5 w-5" /> הפרס: {race.prize}
              </p>
            )}
          </div>
          {race && (
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <HeroStat icon={<CalendarRange className="h-5 w-5" />} label="ימי מירוץ" value={formatNumber(data.raceDays, 0)} />
              <HeroStat icon={<Trophy className="h-5 w-5" />} label="נקודות מצטברות" value={formatNumber(data.totals.racePoints)} />
              <HeroStat icon={<Medal className="h-5 w-5" />} label="משטחים במירוץ" value={formatNumber(data.totals.racePallets, 0)} />
              <HeroStat icon={<Hourglass className="h-5 w-5" />} label="סף שעות לזכייה" value={formatNumber(race.minHours)} />
            </div>
          )}
          {race && (
            <p className="num w-full text-xs font-bold text-ink-faint">
              נפתח ב־{formatDate(race.startedAt)} • רק עובדים עם {formatNumber(race.minHours)}+ שעות עבודה פעילות זכאים לפרסים • הטבלאות מתעדכנות חי
            </p>
          )}
        </div>
      </section>

      {!race && (
        <p className="rounded-2xl border border-safety-200 bg-safety-50 px-5 py-4 text-center text-base font-bold text-safety-700">
          מנהל המפעל יכול לפתוח מירוץ חדש ממסך הניהול — הנקודות מתאפסות לכל מתחרה
        </p>
      )}

      {/* Podium */}
      {podium.length > 0 && (
        <section className="grid grid-cols-3 items-end gap-3 sm:gap-5">
          {[podium[1], podium[0], podium[2]].map((r, visualIdx) => {
            if (!r) return <div key={visualIdx} />;
            const place = visualIdx === 1 ? 1 : visualIdx === 0 ? 2 : 3;
            const heights = ["h-24", "h-32", "h-20"];
            const styles = [
              "border-ink-faint/40 bg-gradient-to-b from-slate-100 to-white",
              "border-safety-300 bg-gradient-to-b from-amber-100 to-white",
              "border-orange-200 bg-gradient-to-b from-orange-100 to-white",
            ];
            return (
              <div key={r.worker.id} className="flex flex-col items-center gap-2">
                <span className="relative text-5xl sm:text-6xl">
                  {r.worker.emoji}
                  {place === 1 && (
                    <Crown className="absolute -top-5 start-1/2 h-6 w-6 -translate-x-1/2 text-safety-500" />
                  )}
                </span>
                <p className="max-w-full truncate px-1 text-center text-sm font-black text-ink sm:text-base">
                  {r.worker.name}
                </p>
                <p className="digits text-2xl font-bold text-volt-700">
                  {formatNumber(r.points)}
                </p>
                <div
                  className={`flex w-full items-start justify-center rounded-t-3xl border-2 border-b-0 pt-3 ${heights[visualIdx]} ${styles[visualIdx]}`}
                >
                  <span className="digits text-3xl font-bold text-ink-soft">{place}</span>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Dual tables */}
      <div className="grid gap-6 xl:grid-cols-2">
        <BoardTable
          title="טבלת נפח — סה״כ נקודות"
          icon={<Trophy className="h-5 w-5 text-safety-500" />}
          rows={volume}
          cols={["נקודות", "שעות פעילות", "משטחים", "זכאות"]}
          cell={(r) => [
            <span key="p" className="digits text-lg font-bold text-volt-700">{formatNumber(r.points)}</span>,
            <span key="h" className="digits font-bold text-ink-soft">{formatNumber(r.activeHours)}</span>,
            <span key="t" className="digits font-bold text-ink-soft">{formatNumber(r.pallets, 0)}</span>,
            <QualifiedChip key="q" row={r} minHours={race?.minHours ?? 0} />,
          ]}
        />
        <BoardTable
          title="טבלת יעילות — נקודות לשעה"
          icon={<Gauge className="h-5 w-5 text-brand-600" />}
          rows={efficiency}
          cols={["נק׳/שעה", "נקודות", "שעות פעילות", "זכאות"]}
          cell={(r) => [
            <span key="p" className="digits text-lg font-bold text-brand-700">{formatNumber(r.pph)}</span>,
            <span key="n" className="digits font-bold text-ink-soft">{formatNumber(r.points)}</span>,
            <span key="h" className="digits font-bold text-ink-soft">{formatNumber(r.activeHours)}</span>,
            <QualifiedChip key="q" row={r} minHours={race?.minHours ?? 0} />,
          ]}
        />
      </div>
    </div>
  );
}

function HeroStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        {icon}
      </span>
      <span>
        <span className="digits block text-2xl font-bold leading-none text-ink">{value}</span>
        <span className="text-xs font-extrabold text-ink-faint">{label}</span>
      </span>
    </div>
  );
}

function QualifiedChip({ row, minHours }: { row: LeaderboardRow; minHours: number }) {
  if (row.qualified) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-volt-100 px-2.5 py-1 text-xs font-black text-volt-700">
        <BadgeCheck className="h-3.5 w-3.5" /> כשיר/ה
      </span>
    );
  }
  return (
    <span className="num inline-flex items-center gap-1 rounded-full bg-safety-100 px-2.5 py-1 text-xs font-black text-safety-700">
      <Hourglass className="h-3.5 w-3.5" />
      חסרות {formatNumber(Math.max(0, minHours - row.activeHours))} ש׳
    </span>
  );
}

function BoardTable({
  title,
  icon,
  rows,
  cols,
  cell,
}: {
  title: string;
  icon: React.ReactNode;
  rows: LeaderboardRow[];
  cols: string[];
  cell: (r: LeaderboardRow) => React.ReactNode[];
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-edge bg-surface shadow-card">
      <header className="flex items-center gap-2 border-b border-edge px-5 py-3.5">
        {icon}
        <h2 className="text-lg font-black text-ink">{title}</h2>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="bg-paper text-xs font-black text-ink-faint">
              <th className="px-4 py-2.5 text-start">#</th>
              <th className="px-4 py-2.5 text-start">עובד/ת</th>
              {cols.map((c) => (
                <th key={c} className="px-4 py-2.5 text-start">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-edge/70">
            {rows.map((r, i) => (
              <tr key={r.worker.id} className={i < 3 ? "bg-volt-50/40" : ""}>
                <td className="px-4 py-2.5">
                  <span
                    className={`digits grid h-7 w-7 place-items-center rounded-lg text-sm font-bold ${
                      i === 0
                        ? "bg-safety-400 text-white"
                        : i === 1
                          ? "bg-ink-faint/70 text-white"
                          : i === 2
                            ? "bg-safety-200 text-safety-800"
                            : "bg-paper text-ink-soft"
                    }`}
                  >
                    {i + 1}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2">
                    <span className="text-xl leading-none">{r.worker.emoji}</span>
                    <span className="font-extrabold text-ink">{r.worker.name}</span>
                  </span>
                </td>
                {cell(r).map((c, j) => (
                  <td key={j} className="px-4 py-2.5">{c}</td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={cols.length + 2} className="px-4 py-8 text-center font-bold text-ink-faint">
                  אין נתונים להצגה עדיין
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
