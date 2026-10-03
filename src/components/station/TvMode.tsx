"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Crown,
  Factory,
  Gauge,
  MonitorPlay,
  MousePointer2,
  Trophy,
  Zap,
} from "lucide-react";
import type { StateSnapshot } from "@/lib/data";
import type { LeaderboardRow } from "@/lib/stats";
import { formatDuration, formatNumber, formatTime } from "@/lib/format";
import { useNow } from "@/components/hooks";
import { BigTimer } from "./BigTimer";

interface TvModeProps {
  state: StateSnapshot;
  syncOffset: number;
}

export function TvMode({ state, syncOffset }: TvModeProps) {
  const now = useNow(500);
  const liveNow = now + syncOffset;
  const delta = Math.max(0, liveNow - state.serverNow);

  const slides = useMemo(() => {
    const s: ("batches" | "volume" | "efficiency")[] = [];
    if (state.activeBatches.length > 0) s.push("batches");
    s.push("volume", "efficiency");
    return s;
  }, [state.activeBatches.length]);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);
  const slide = slides[idx % slides.length];

  const race = state.activeRace;

  return (
    <div className="blueprint-bg fixed inset-0 z-[70] flex flex-col overflow-hidden">
      {/* top glare strip */}
      <div className="h-1.5 w-full bg-gradient-to-l from-volt-500 via-brand-500 to-safety-400" />

      <header className="flex items-center gap-4 px-8 pt-5">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white shadow-pop">
          <Factory className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-black text-ink">שיפט — לוח תוצאות חי</h1>
          <p className="flex items-center gap-1.5 text-sm font-bold text-ink-faint">
            {race ? `${race.name} • יום ${state.raceDays} למירוץ` : "אין מירוץ פעיל כרגע"}
            {race?.prize ? (
              <span className="flex items-center gap-1 text-safety-600">
                <Trophy className="h-3.5 w-3.5" /> {race.prize}
              </span>
            ) : null}
          </p>
        </div>

        <div className="ms-auto flex items-center gap-4">
          <div className="text-end">
            <p className="digits text-4xl font-bold leading-none text-ink">
              {formatTime(liveNow)}
              <span className="text-xl text-ink-faint">
                :{String(new Date(liveNow).getSeconds()).padStart(2, "0")}
              </span>
            </p>
            <p className="text-[11px] font-extrabold text-ink-faint">שעון מפעל</p>
          </div>
          <span className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-black text-white">
            <MonitorPlay className="h-4 w-4 animate-pulse" />
            מצב טלוויזיה
          </span>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 px-8 py-5">
        <div key={slide} className="flex w-full animate-slide-in flex-col">
          {slide === "batches" && (
            <BatchesSlide state={state} delta={delta} liveNow={liveNow} syncOffset={syncOffset} />
          )}
          {slide === "volume" && (
            <BoardSlide
              title="טבלת נפח — סך הנקודות במירוץ"
              icon={<Trophy className="h-8 w-8 text-safety-500" />}
              rows={state.volumeLeaderboard.slice(0, 8)}
              metric={(r) => `${formatNumber(r.points)}`}
              metricLabel="נקודות"
              bar={(r) => r.points}
            />
          )}
          {slide === "efficiency" && (
            <BoardSlide
              title="טבלת יעילות — נקודות לשעת עבודה (PPH)"
              icon={<Gauge className="h-8 w-8 text-brand-600" />}
              rows={state.efficiencyLeaderboard.slice(0, 8)}
              metric={(r) => `${formatNumber(r.pph)}`}
              metricLabel="נק׳/שעה"
              bar={(r) => r.pph}
              showQualification
            />
          )}
        </div>
      </main>

      {/* progress dots */}
      <div className="flex items-center justify-center gap-2 pb-2">
        {slides.map((s, i) => (
          <button
            key={s}
            onClick={() => setIdx(i)}
            aria-label={s}
            className={`h-2 rounded-full transition-all ${
              i === idx % slides.length ? "w-10 bg-brand-600" : "w-2 bg-edge"
            }`}
          />
        ))}
      </div>

      {/* ticker */}
      <footer className="border-t border-edge bg-surface/90 py-3 backdrop-blur">
        <div className="relative flex overflow-hidden" dir="ltr">
          <div className="flex animate-marquee shrink-0 items-center gap-10 whitespace-nowrap px-5">
            <TickerContent state={state} />
          </div>
          <div className="flex animate-marquee shrink-0 items-center gap-10 whitespace-nowrap px-5" aria-hidden>
            <TickerContent state={state} />
          </div>
        </div>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-center text-xs font-bold text-ink-faint">
          <MousePointer2 className="h-3.5 w-3.5" />
          כל תנועת עכבר או מקש מחזירים מיד לעמדת הייצור
        </p>
      </footer>
    </div>
  );
}

function TickerContent({ state }: { state: StateSnapshot }) {
  const leader = state.volumeLeaderboard[0];
  return (
    <span className="num flex items-center gap-10 text-sm font-extrabold text-ink-soft" dir="rtl">
      <span className="flex items-center gap-1.5">
        <Zap className="h-4 w-4 text-volt-600" />
        סה״כ נקודות במירוץ: {formatNumber(state.totals.racePoints)}
      </span>
      <span>משטחים במירוץ: {formatNumber(state.totals.racePallets, 0)}</span>
      <span>אצוות סה״כ במערכת: {formatNumber(state.totals.batchesAllTime, 0)}</span>
      {leader && (
        <span className="flex items-center gap-1.5">
          <Crown className="h-4 w-4 text-safety-500" />
          מוביל/ה כרגע: {leader.worker.emoji} {leader.worker.name} (
          {formatNumber(leader.points)} נק׳)
        </span>
      )}
      <span>קווי ייצור פעילים: {state.activeBatches.length} / 2</span>
      <span>סף שעות לזכייה: {formatNumber(state.activeRace?.minHours ?? 0)} ש׳</span>
    </span>
  );
}

function BatchesSlide({
  state,
  delta,
  syncOffset,
}: {
  state: StateSnapshot;
  delta: number;
  liveNow: number;
  syncOffset: number;
}) {
  return (
    <div className="grid h-full grid-cols-2 gap-6">
      {state.activeBatches.map((b) => {
        const paused = b.isPausedNow;
        const activeMs = b.activeMs + (paused ? 0 : delta);
        const pauseMs = b.pauseMs + (paused ? delta : 0);
        return (
          <div
            key={b.id}
            className="flex flex-col rounded-3xl border-2 border-edge bg-surface p-6 shadow-pop"
          >
            <div className="mb-4 flex items-center gap-3">
              <span
                className={`grid h-12 w-12 place-items-center rounded-2xl text-2xl font-black text-white ${
                  b.line === "A" ? "bg-brand-600" : "bg-violet-600"
                }`}
              >
                {b.line}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-2xl font-black text-ink">
                  {b.product.name}
                </h3>
                <p className="num text-sm font-bold text-ink-faint">
                  {b.product.size} • {formatNumber(b.product.pointValue)} נק׳/קרטון
                </p>
              </div>
              <div className="flex -space-x-2" dir="ltr">
                {b.members.slice(0, 6).map((m) => (
                  <span
                    key={m.id}
                    title={m.name}
                    className="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-brand-50 text-xl shadow-card"
                  >
                    {m.emoji}
                  </span>
                ))}
              </div>
            </div>
            <BigTimer
              jumbo
              activeMs={activeMs}
              pauseMs={pauseMs}
              paused={paused}
              pauseReason={b.currentPauseReason}
              pauseSince={b.currentPauseSince}
              syncOffset={syncOffset}
            />
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { l: "משטחים", v: formatNumber(b.totalPallets, 0) },
                { l: "קרטונים", v: formatNumber(b.totalCartons, 0) },
                { l: "נקודות", v: formatNumber(b.totalPoints), hot: true },
              ].map((t) => (
                <div
                  key={t.l}
                  className={`rounded-2xl border px-4 py-3 text-center ${
                    t.hot ? "border-volt-200 bg-volt-50" : "border-edge bg-paper"
                  }`}
                >
                  <p
                    className={`digits text-4xl font-bold leading-none ${
                      t.hot ? "text-volt-700" : "text-ink"
                    }`}
                  >
                    {t.v}
                  </p>
                  <p className="mt-1 text-xs font-extrabold text-ink-faint">{t.l}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BoardSlide({
  title,
  icon,
  rows,
  metric,
  metricLabel,
  bar,
  showQualification = false,
}: {
  title: string;
  icon: React.ReactNode;
  rows: LeaderboardRow[];
  metric: (r: LeaderboardRow) => string;
  metricLabel: string;
  bar: (r: LeaderboardRow) => number;
  showQualification?: boolean;
}) {
  const max = Math.max(0.0001, ...rows.map((r) => bar(r)));
  return (
    <div className="flex h-full flex-col rounded-3xl border-2 border-edge bg-surface p-6 shadow-pop">
      <div className="mb-4 flex items-center gap-3">
        {icon}
        <h3 className="text-3xl font-black text-ink">{title}</h3>
      </div>
      <div className="flex flex-1 flex-col justify-around gap-2">
        {rows.length === 0 && (
          <p className="text-center text-xl font-bold text-ink-faint">
            המירוץ עוד לא נפתח — כל התוצאות לפניכם!
          </p>
        )}
        {rows.map((r, i) => (
          <div
            key={r.worker.id}
            className="flex items-center gap-4"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <span
              className={`digits grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl font-bold ${
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
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-50 text-2xl">
              {r.worker.emoji}
            </span>
            <div className="min-w-0 w-56 shrink-0">
              <p className="truncate text-xl font-black text-ink">{r.worker.name}</p>
              {showQualification && (
                <p
                  className={`num text-xs font-extrabold ${
                    r.qualified ? "text-volt-700" : "text-safety-600"
                  }`}
                >
                  {r.qualified
                    ? `כשיר/ה לפרס • ${formatNumber(r.activeHours)} ש׳`
                    : `${formatNumber(r.activeHours)} ש׳ — מתחת לסף`}
                </p>
              )}
            </div>
            <div className="relative h-10 min-w-0 flex-1 overflow-hidden rounded-2xl bg-paper">
              <div
                className={`absolute inset-y-0 start-0 rounded-2xl transition-all duration-1000 ${
                  i === 0
                    ? "bg-gradient-to-l from-volt-400 to-volt-600"
                    : "bg-gradient-to-l from-brand-300 to-brand-500"
                }`}
                style={{ width: `${Math.max(3, (bar(r) / max) * 100)}%` }}
              />
            </div>
            <div className="w-44 shrink-0 text-end">
              <p className="digits text-4xl font-bold leading-none text-ink">
                {metric(r)}
              </p>
              <p className="text-xs font-extrabold text-ink-faint">{metricLabel}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
