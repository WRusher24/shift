"use client";

import { useState } from "react";
import { Pencil, Plus, Power, Trash2, UserRound, X } from "lucide-react";
import type { Worker } from "@/db/schema";
import { apiError } from "@/components/hooks";
import type { AdminCtx } from "./AdminClient";

const EMOJI_PALETTE = [
  "🦾", "🚀", "⚡", "🌟", "🐯", "🧤", "🔧", "🎯",
  "🏭", "💪", "🧪", "🦅", "🐺", "🔥", "🌊", "🥇",
  "🎛️", "🧲", "🔩", "🛠️", "🚜", "🐆", "🦉", "🌵",
];

export function WorkersTab({ ctx }: { ctx: AdminCtx }) {
  const { state, refresh, push } = ctx;
  const takenEmojis = new Set(state.workers.map((w) => w.emoji));

  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [emoji, setEmoji] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, employeeId, emoji }),
      });
      if (!res.ok) return push("err", await apiError(res, "הוספת העובד נכשלה"));
      push("ok", `${name} נוסף/ה לצוות במפעל`);
      setName("");
      setEmployeeId("");
      setEmoji("");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      {/* Add worker */}
      <section className="h-fit rounded-3xl border border-edge bg-surface p-5 shadow-card">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-ink">
          <UserRound className="h-5 w-5 text-brand-600" />
          הוספת עובד חדש
        </h2>
        <label className="mb-1 block text-xs font-extrabold text-ink-soft">
          שם מלא (עברית, ערבית או אנגלית)
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="לדוגמה: דניאל כהן / أحمد حسين / John Smith"
          className="mb-3 w-full rounded-xl border border-edge bg-white px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-brand-400"
        />
        <label className="mb-1 block text-xs font-extrabold text-ink-soft">מספר עובד</label>
        <input
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          placeholder="לדוגמה: 1013"
          className="digits mb-3 w-full rounded-xl border border-edge bg-white px-3 py-2.5 text-sm font-bold text-ink outline-none placeholder:text-right focus:border-brand-400"
        />
        <label className="mb-1 block text-xs font-extrabold text-ink-soft">
          אימוג׳י פרופיל — ייחודי לכל עובד
        </label>
        <div className="mb-2 grid grid-cols-8 gap-1">
          {EMOJI_PALETTE.map((e) => {
            const taken = takenEmojis.has(e);
            const selected = emoji === e;
            return (
              <button
                key={e}
                disabled={taken}
                onClick={() => setEmoji(selected ? "" : e)}
                title={taken ? "תפוש — בשימוש עובד אחר" : e}
                className={`grid h-9 w-9 place-items-center rounded-xl border text-lg transition-all ${
                  taken
                    ? "cursor-not-allowed opacity-25 grayscale"
                    : selected
                      ? "scale-110 border-volt-500 bg-volt-50 shadow-card"
                      : "border-edge bg-white hover:bg-brand-50"
                }`}
              >
                {e}
              </button>
            );
          })}
        </div>
        <div className="mb-4 flex items-center gap-2">
          <input
            value={emoji}
            onChange={(e) => setEmoji([...e.target.value].slice(-2).join(""))}
            placeholder="או הקלידו אימוג׳י אחר…"
            className="w-full rounded-xl border border-edge bg-white px-3 py-2 text-center text-lg outline-none placeholder:text-sm focus:border-brand-400"
          />
          {emoji && (
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-volt-400 bg-volt-50 text-2xl">
              {emoji}
            </span>
          )}
        </div>
        <button
          onClick={add}
          disabled={busy || !name.trim() || !employeeId.trim() || !emoji}
          className="touch-lg flex w-full items-center justify-center gap-2 rounded-xl bg-volt-600 py-3 font-black text-white transition-colors hover:bg-volt-500 disabled:opacity-40"
        >
          <Plus className="h-5 w-5" strokeWidth={3} />
          הוסף עובד לצוות
        </button>
      </section>

      {/* Workers table */}
      <section className="overflow-hidden rounded-3xl border border-edge bg-surface shadow-card">
        <header className="flex items-center justify-between border-b border-edge px-5 py-3.5">
          <h2 className="text-lg font-black text-ink">
            צוות המפעל ({state.workers.filter((w) => w.active).length} פעילים מתוך{" "}
            {state.workers.length})
          </h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-paper text-xs font-black text-ink-faint">
                <th className="px-4 py-2.5 text-start">אימוג׳י</th>
                <th className="px-4 py-2.5 text-start">שם מלא</th>
                <th className="px-4 py-2.5 text-start">מספר עובד</th>
                <th className="px-4 py-2.5 text-start">סטטוס</th>
                <th className="px-4 py-2.5 text-start">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge/70">
              {state.workers.map((w) => (
                <WorkerRow
                  key={w.id}
                  worker={w}
                  ctx={ctx}
                  takenEmojis={takenEmojis}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function WorkerRow({
  worker,
  ctx,
  takenEmojis,
}: {
  worker: Worker;
  ctx: AdminCtx;
  takenEmojis: Set<string>;
}) {
  const { refresh, push } = ctx;
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(worker.name);
  const [employeeId, setEmployeeId] = useState(worker.employeeId);
  const [emoji, setEmoji] = useState(worker.emoji);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/workers/${worker.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, employeeId, emoji }),
      });
      if (!res.ok) return push("err", await apiError(res, "שמירת השינויים נכשלה"));
      push("ok", `הפרטים של ${name} עודכנו`);
      setEditing(false);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    const res = await fetch(`/api/workers/${worker.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !worker.active }),
    });
    if (!res.ok) return push("err", await apiError(res, "הפעולה נכשלה"));
    push("ok", worker.active ? `${worker.name} הושבת` : `${worker.name} הופעל מחדש`);
    await refresh();
  };

  const del = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/workers/${worker.id}`, { method: "DELETE" });
      if (!res.ok) return push("err", await apiError(res, "המחיקה נכשלה"));
      const json = await res.json();
      push("ok", json.message ?? `${worker.name} נמחק מהמערכת`);
      await refresh();
    } finally {
      setBusy(false);
      setConfirmDel(false);
    }
  };

  if (editing) {
    return (
      <tr className="bg-brand-50/50">
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-1">
            <input
              value={emoji}
              onChange={(e) => setEmoji([...e.target.value].slice(-2).join(""))}
              className="h-10 w-12 rounded-lg border border-edge text-center text-xl outline-none focus:border-brand-400"
            />
            <div className="grid grid-cols-4 gap-0.5">
              {EMOJI_PALETTE.filter((e) => !takenEmojis.has(e) || e === worker.emoji)
                .slice(0, 8)
                .map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`grid h-7 w-7 place-items-center rounded-md text-base ${
                      emoji === e ? "bg-volt-100 ring-1 ring-volt-500" : "hover:bg-white"
                    }`}
                  >
                    {e}
                  </button>
                ))}
            </div>
          </div>
        </td>
        <td className="px-4 py-2.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-edge px-2 py-2 text-sm font-bold outline-none focus:border-brand-400"
          />
        </td>
        <td className="px-4 py-2.5">
          <input
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="digits w-24 rounded-lg border border-edge px-2 py-2 text-sm font-bold outline-none focus:border-brand-400"
          />
        </td>
        <td className="px-4 py-2.5" />
        <td className="px-4 py-2.5">
          <span className="flex gap-1.5">
            <button
              onClick={save}
              disabled={busy}
              className="rounded-lg bg-volt-600 px-3 py-2 text-xs font-black text-white hover:bg-volt-500 disabled:opacity-40"
            >
              שמור
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg bg-white px-3 py-2 text-xs font-black text-ink-soft ring-1 ring-edge hover:bg-paper"
            >
              בטל
            </button>
          </span>
        </td>
      </tr>
    );
  }

  return (
    <tr className={worker.active ? "" : "opacity-55"}>
      <td className="px-4 py-2.5 text-2xl leading-none">{worker.emoji}</td>
      <td className="px-4 py-2.5 font-extrabold text-ink">{worker.name}</td>
      <td className="digits px-4 py-2.5 font-bold text-ink-soft">#{worker.employeeId}</td>
      <td className="px-4 py-2.5">
        {worker.active ? (
          <span className="rounded-full bg-volt-100 px-2.5 py-1 text-xs font-black text-volt-700">
            פעיל
          </span>
        ) : (
          <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-black text-ink-faint">
            מושבת
          </span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <span className="flex items-center gap-1">
          <button
            title="עריכה"
            onClick={() => setEditing(true)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-edge bg-white text-ink-soft transition-colors hover:border-brand-300 hover:text-brand-600"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            title={worker.active ? "השבתה" : "הפעלה"}
            onClick={toggleActive}
            className={`grid h-9 w-9 place-items-center rounded-lg border transition-colors ${
              worker.active
                ? "border-edge bg-white text-ink-soft hover:border-safety-300 hover:text-safety-600"
                : "border-volt-300 bg-volt-50 text-volt-700"
            }`}
          >
            <Power className="h-4 w-4" />
          </button>
          {confirmDel ? (
            <>
              <button
                onClick={del}
                disabled={busy}
                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-black text-white"
              >
                אשר מחיקה
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                className="grid h-9 w-9 place-items-center rounded-lg bg-white text-ink-soft ring-1 ring-edge"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              title="מחיקה"
              onClick={() => setConfirmDel(true)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-edge bg-white text-ink-soft transition-colors hover:border-red-300 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </span>
      </td>
    </tr>
  );
}
