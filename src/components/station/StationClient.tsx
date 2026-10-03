"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarRange,
  Loader2,
  MonitorPlay,
  Radio,
  Trophy,
} from "lucide-react";
import type { StateSnapshot } from "@/lib/data";
import { formatNumber } from "@/lib/format";
import { usePolling } from "@/components/hooks";
import { ToastStack, useToasts } from "@/components/Toast";
import { LineCard } from "./LineCard";
import { TvMode } from "./TvMode";

const IDLE_MS = 10_000;

export function StationClient() {
  const { data, loading, error, refresh } =
    usePolling<StateSnapshot>("/api/state", 2500);
  const { toasts, push } = useToasts();

  // server-clock sync (drift-proof timers)
  const [syncOffset, setSyncOffset] = useState(0);
  const lastServerNow = useRef<number | null>(null);
  useEffect(() => {
    if (data && data.serverNow !== lastServerNow.current) {
      lastServerNow.current = data.serverNow;
      setSyncOffset(data.serverNow - Date.now());
    }
  }, [data]);

  // 10s idle → TV mode
  const [tvOn, setTvOn] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armIdle = useCallback(() => {
    setTvOn(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setTvOn(true), IDLE_MS);
  }, []);
  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "touchmove", "wheel"] as const;
    events.forEach((e) => window.addEventListener(e, armIdle, { passive: true }));
    armIdle();
    return () => {
      events.forEach((e) => window.removeEventListener(e, armIdle));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [armIdle]);

  const busyWorkerIds = useMemo(() => {
    const s = new Set<number>();
    data?.activeBatches.forEach((b) => b.members.forEach((m) => s.add(m.workerId)));
    return s;
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-ink-faint">
        <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
        <p className="text-lg font-bold">טוען את עמדת הייצור…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-lg font-bold text-red-600">{error ?? "שגיאה בטעינה"}</p>
        <button
          onClick={refresh}
          className="rounded-xl bg-brand-600 px-6 py-3 font-black text-white"
        >
          נסו שוב
        </button>
      </div>
    );
  }

  const byLine = (line: "A" | "B") =>
    data.activeBatches.find((b) => b.line === line) ?? null;
  const race = data.activeRace;

  return (
    <div className="space-y-5">
      {/* Race banner */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-3xl border border-edge bg-surface px-5 py-3.5 shadow-card">
        <span className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute h-full w-full animate-ping rounded-full bg-volt-400 opacity-75" />
            <span className="h-3 w-3 rounded-full bg-volt-500" />
          </span>
          <span className="text-sm font-black text-ink">
            {race ? race.name : "אין מירוץ פעיל"}
          </span>
          {race?.prize && (
            <span className="flex items-center gap-1 text-sm font-bold text-safety-600">
              <Trophy className="h-4 w-4" /> {race.prize}
            </span>
          )}
        </span>
        {race && (
          <span className="num flex items-center gap-1.5 text-xs font-extrabold text-ink-faint">
            <CalendarRange className="h-4 w-4" />
            יום {data.raceDays} • סף זכייה: {formatNumber(race.minHours)} שעות פעילות
          </span>
        )}
        <button
          onClick={() => setTvOn(true)}
          className="ms-auto flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-black text-white transition-colors hover:bg-ink/85"
        >
          <MonitorPlay className="h-4 w-4" />
          מצב טלוויזיה
        </button>
      </div>

      {error && (
        <p className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600">
          <Radio className="h-4 w-4" /> {error}
        </p>
      )}

      {/* Two line stations + side leaderboard */}
      <div className="grid gap-5 xl:grid-cols-[1fr_330px]">
        <div className="grid gap-5 lg:grid-cols-2">
          {(["A", "B"] as const).map((line) => (
            <LineCard
              key={line}
              line={line}
              batch={byLine(line)}
              products={data.products}
              workers={data.workers}
              busyWorkerIds={busyWorkerIds}
              syncOffset={syncOffset}
              snapshotAt={data.serverNow}
              refresh={refresh}
              pushToast={push}
            />
          ))}
        </div>

        <MiniLeaderboard state={data} />
      </div>

      {tvOn && <TvMode state={data} syncOffset={syncOffset} />}
      <ToastStack toasts={toasts} />
    </div>
  );
}

function MiniLeaderboard({ state }: { state: StateSnapshot }) {
  return (
    <aside className="flex flex-col gap-4">
      <section className="overflow-hidden rounded-3xl border border-edge bg-surface shadow-card">
        <header className="flex items-center justify-between border-b border-edge px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-black text-ink">
            <Trophy className="h-4 w-4 text-safety-500" />
            מובילי נפח — חמישייה
          </h3>
          <Link
            href="/leaderboard"
            className="text-xs font-extrabold text-brand-600 hover:underline"
          >
            לטבלה המלאה
          </Link>
        </header>
        <ol className="divide-y divide-edge/70">
          {state.volumeLeaderboard.slice(0, 5).map((r, i) => (
            <li key={r.worker.id} className="flex items-center gap-2.5 px-4 py-2.5">
              <span
                className={`digits grid h-7 w-7 place-items-center rounded-lg text-sm font-bold ${
                  i === 0 ? "bg-safety-400 text-white" : "bg-paper text-ink-soft"
                }`}
              >
                {i + 1}
              </span>
              <span className="text-xl leading-none">{r.worker.emoji}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-ink">
                {r.worker.name}
              </span>
              <span className="digits text-base font-bold text-volt-700">
                {formatNumber(r.points)}
              </span>
            </li>
          ))}
          {state.volumeLeaderboard.length === 0 && (
            <p className="px-4 py-6 text-center text-sm font-bold text-ink-faint">
              אין עדיין נקודות במירוץ
            </p>
          )}
        </ol>
      </section>

      <section className="overflow-hidden rounded-3xl border border-edge bg-surface shadow-card">
        <header className="border-b border-edge px-4 py-3">
          <h3 className="text-sm font-black text-ink">יעילות (נק׳/שעה) — שלישייה</h3>
        </header>
        <ol className="divide-y divide-edge/70">
          {state.efficiencyLeaderboard.slice(0, 3).map((r, i) => (
            <li key={r.worker.id} className="flex items-center gap-2.5 px-4 py-2.5">
              <span className="digits grid h-7 w-7 place-items-center rounded-lg bg-paper text-sm font-bold text-ink-soft">
                {i + 1}
              </span>
              <span className="text-xl leading-none">{r.worker.emoji}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-ink">
                {r.worker.name}
              </span>
              <span className="digits text-base font-bold text-brand-700">
                {formatNumber(r.pph)}
              </span>
            </li>
          ))}
        </ol>
        <p className="num border-t border-edge bg-paper px-4 py-2 text-center text-[11px] font-extrabold text-ink-faint">
          מסך זה עובר אוטומטית למצב טלוויזיה לאחר 10 שניות ללא מגע
        </p>
      </section>
    </aside>
  );
}
