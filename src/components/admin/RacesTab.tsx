"use client";

import { useState } from "react";
import type { Race } from "@/db/schema";
import {
  CalendarRange,
  CircleStop,
  Flag,
  Gift,
  Hourglass,
  Play,
  Save,
} from "lucide-react";
import { formatDate, formatNumber } from "@/lib/format";
import { apiError } from "@/components/hooks";
import type { AdminCtx } from "./AdminClient";

export function RacesTab({ ctx }: { ctx: AdminCtx }) {
  const { state, refresh, push } = ctx;
  const race = state.activeRace;

  const [name, setName] = useState("");
  const [prize, setPrize] = useState("");
  const [minHours, setMinHours] = useState("30");
  const [confirmStart, setConfirmStart] = useState(false);
  const [busy, setBusy] = useState(false);

  const startRace = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/races", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, prize, minHours: Number(minHours) }),
      });
      if (!res.ok) return push("err", await apiError(res, "פתיחת המירוץ נכשלה"));
      push("ok", `המירוץ "${name}" נפתח — הנקודות אופסו לכולם, בהצלחה!`);
      setName("");
      setPrize("");
      setMinHours("30");
      setConfirmStart(false);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {/* Active race */}
      <section className="rounded-3xl border border-edge bg-surface p-5 shadow-card">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-ink">
          <Flag className="h-5 w-5 text-volt-600" />
          מירוץ פעיל כרגע
        </h2>
        {race ? (
          <ActiveRaceCard race={race} ctx={ctx} />
        ) : (
          <p className="rounded-2xl bg-paper px-4 py-6 text-center text-sm font-bold text-ink-faint">
            אין מירוץ פעיל — פתחו מירוץ חדש כדי להתחיל לצבור נקודות
          </p>
        )}
      </section>

      {/* Start new race */}
      <section className="rounded-3xl border border-edge bg-surface p-5 shadow-card">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-black text-ink">
          <Play className="h-5 w-5 text-brand-600" />
          פתיחת מירוץ חדש
        </h2>
        <p className="mb-4 text-xs font-bold text-ink-faint">
          פתיחת מירוץ חדש סוגרת את המירוץ הנוכחי (אם קיים) ומאפסת את טבלאות הנקודות.
          כל ההיסטוריה נשמרת וממשיכה להופיע ביומן ובדוחות.
        </p>
        <label className="mb-1 block text-xs font-extrabold text-ink-soft">שם המירוץ</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="לדוגמה: מירוץ קיץ 2026"
          className="mb-3 w-full rounded-xl border border-edge bg-white px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-brand-400"
        />
        <label className="mb-1 block text-xs font-extrabold text-ink-soft">
          תיאור הפרס (אופציונלי)
        </label>
        <input
          value={prize}
          onChange={(e) => setPrize(e.target.value)}
          placeholder='לדוגמה: ארוחת צוות + שובר 500 ש"ח'
          className="mb-3 w-full rounded-xl border border-edge bg-white px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-brand-400"
        />
        <label className="mb-1 block text-xs font-extrabold text-ink-soft">
          סף שעות פעילות מינימלי לזכייה בפרס
        </label>
        <input
          type="number"
          inputMode="decimal"
          min={1}
          value={minHours}
          onChange={(e) => setMinHours(e.target.value)}
          className="digits mb-4 w-full rounded-xl border border-edge bg-white px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-brand-400"
        />
        {confirmStart ? (
          <div className="flex gap-2">
            <button
              onClick={startRace}
              disabled={busy || !name.trim()}
              className="touch-lg flex-1 rounded-xl bg-red-600 py-3 font-black text-white disabled:opacity-40"
            >
              {race ? "מאשר: סוגר את המירוץ הנוכחי ופותח חדש" : "מאשר: פותח מירוץ חדש"}
            </button>
            <button
              onClick={() => setConfirmStart(false)}
              className="rounded-xl bg-white px-4 font-black text-ink-soft ring-1 ring-edge"
            >
              בטל
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmStart(true)}
            disabled={!name.trim()}
            className="touch-lg flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 font-black text-white transition-colors hover:bg-brand-500 disabled:opacity-40"
          >
            <Flag className="h-5 w-5" />
            פתח מירוץ ואפס נקודות
          </button>
        )}
      </section>

      {/* Past races */}
      <section className="overflow-hidden rounded-3xl border border-edge bg-surface shadow-card xl:col-span-2">
        <header className="border-b border-edge px-5 py-3.5">
          <h2 className="text-lg font-black text-ink">מירוצים קודמים</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-paper text-xs font-black text-ink-faint">
                <th className="px-4 py-2.5 text-start">מירוץ</th>
                <th className="px-4 py-2.5 text-start">פרס</th>
                <th className="px-4 py-2.5 text-start">פתיחה</th>
                <th className="px-4 py-2.5 text-start">סגירה</th>
                <th className="px-4 py-2.5 text-start">סף שעות</th>
                <th className="px-4 py-2.5 text-start">סטטוס</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge/70">
              {state.races.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2.5 font-extrabold text-ink">{r.name}</td>
                  <td className="px-4 py-2.5 text-ink-soft">{r.prize ?? "—"}</td>
                  <td className="num px-4 py-2.5 font-bold text-ink-soft">
                    {formatDate(r.startedAt)}
                  </td>
                  <td className="num px-4 py-2.5 font-bold text-ink-soft">
                    {r.endedAt ? formatDate(r.endedAt) : "—"}
                  </td>
                  <td className="digits px-4 py-2.5 font-bold text-ink-soft">
                    {formatNumber(r.minHours)}
                  </td>
                  <td className="px-4 py-2.5">
                    {r.isActive ? (
                      <span className="rounded-full bg-volt-100 px-2.5 py-1 text-xs font-black text-volt-700">
                        פעיל
                      </span>
                    ) : (
                      <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-black text-ink-faint">
                        הסתיים
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ActiveRaceCard({ race, ctx }: { race: Race; ctx: AdminCtx }) {
  const { refresh, push } = ctx;
  const [name, setName] = useState(race.name);
  const [prize, setPrize] = useState(race.prize ?? "");
  const [minHours, setMinHours] = useState(String(race.minHours));
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/races/${race.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, prize, minHours: Number(minHours) }),
      });
      if (!res.ok) return push("err", await apiError(res, "השמירה נכשלה"));
      push("ok", "הגדרות המירוץ עודכנו");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/races/${race.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finish" }),
      });
      if (!res.ok) return push("err", await apiError(res, "סגירת המירוץ נכשלה"));
      push("ok", `המירוץ "${race.name}" הסתיים — התוצאות הסופיות נשמרו`);
      setConfirmFinish(false);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="mb-1 block text-xs font-extrabold text-ink-soft">שם המירוץ</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mb-3 w-full rounded-xl border border-edge bg-white px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-brand-400"
      />
      <label className="mb-1 flex items-center gap-1 text-xs font-extrabold text-ink-soft">
        <Gift className="h-3.5 w-3.5" /> תיאור הפרס
      </label>
      <input
        value={prize}
        onChange={(e) => setPrize(e.target.value)}
        className="mb-3 w-full rounded-xl border border-edge bg-white px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-brand-400"
      />
      <label className="mb-1 flex items-center gap-1 text-xs font-extrabold text-ink-soft">
        <Hourglass className="h-3.5 w-3.5" /> סף שעות פעילות לזכייה (מונע הטיית נצבור-שעות)
      </label>
      <input
        type="number"
        inputMode="decimal"
        min={1}
        value={minHours}
        onChange={(e) => setMinHours(e.target.value)}
        className="digits mb-3 w-full rounded-xl border border-edge bg-white px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-brand-400"
      />
      <p className="num mb-4 flex items-center gap-1.5 text-xs font-bold text-ink-faint">
        <CalendarRange className="h-4 w-4" />
        נפתח ב־{formatDate(race.startedAt)}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={save}
          disabled={busy}
          className="touch-lg flex items-center gap-2 rounded-xl bg-volt-600 px-5 py-2.5 font-black text-white transition-colors hover:bg-volt-500 disabled:opacity-40"
        >
          <Save className="h-4 w-4" />
          שמור הגדרות
        </button>
        {confirmFinish ? (
          <>
            <button
              onClick={finish}
              disabled={busy}
              className="touch-lg rounded-xl bg-red-600 px-5 py-2.5 font-black text-white disabled:opacity-40"
            >
              לחצו שוב — סוגרים את המירוץ סופית
            </button>
            <button
              onClick={() => setConfirmFinish(false)}
              className="rounded-xl bg-white px-4 font-black text-ink-soft ring-1 ring-edge"
            >
              בטל
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmFinish(true)}
            className="touch-lg flex items-center gap-2 rounded-xl border-2 border-safety-300 bg-safety-50 px-5 py-2.5 font-black text-safety-700 transition-colors hover:bg-safety-100"
          >
            <CircleStop className="h-4 w-4" />
            סיים מירוץ
          </button>
        )}
      </div>
    </div>
  );
}
