"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  CirclePause,
  CirclePlay,
  PackagePlus,
  Play,
  Plus,
  Timer,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { Product, Worker } from "@/db/schema";
import type { ActiveBatchView } from "@/lib/data";
import { PAUSE_REASONS } from "@/lib/stats";
import { formatNumber, formatTime } from "@/lib/format";
import { apiError, useNow } from "@/components/hooks";
import { BigTimer } from "./BigTimer";

interface LineCardProps {
  line: "A" | "B";
  batch: ActiveBatchView | null;
  products: Product[];
  workers: Worker[];
  busyWorkerIds: Set<number>;
  syncOffset: number;
  snapshotAt: number;
  refresh: () => Promise<void>;
  pushToast: (kind: "ok" | "err", text: string) => void;
}

const LINE_THEME = {
  A: {
    chip: "bg-brand-600",
    soft: "bg-brand-50 text-brand-700 border-brand-200",
    ring: "border-brand-200",
  },
  B: {
    chip: "bg-violet-600",
    soft: "bg-violet-50 text-violet-700 border-violet-200",
    ring: "border-violet-200",
  },
} as const;

export function LineCard(props: LineCardProps) {
  const { line, batch } = props;
  const theme = LINE_THEME[line];

  return (
    <section
      className={`flex min-h-[560px] flex-col overflow-hidden rounded-3xl border-2 bg-surface shadow-card ${theme.ring}`}
    >
      {batch ? (
        <ActiveLine {...props} batch={batch} />
      ) : (
        <SetupLine {...props} />
      )}
    </section>
  );
}

/* ================================================================== */
/* SETUP — no active batch on this line                                */
/* ================================================================== */

function SetupLine({
  line,
  products,
  workers,
  busyWorkerIds,
  refresh,
  pushToast,
}: LineCardProps) {
  const theme = LINE_THEME[line];
  const activeProducts = products.filter((p) => p.active);
  const availableWorkers = useMemo(
    () => workers.filter((w) => w.active && !busyWorkerIds.has(w.id)),
    [workers, busyWorkerIds],
  );

  const [productId, setProductId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const toggle = (id: number) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const start = async () => {
    if (!productId || selected.size === 0 || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line, productId, workerIds: [...selected] }),
      });
      if (!res.ok) {
        pushToast("err", await apiError(res, "לא הצלחנו להתחיל את האצווה"));
      } else {
        pushToast("ok", `אצווה חדשה יצאה לדרך בקו ${line} — בהצלחה!`);
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col p-5">
      <header className="flex items-center gap-3">
        <span
          className={`grid h-11 w-11 place-items-center rounded-2xl text-xl font-black text-white ${theme.chip}`}
        >
          {line}
        </span>
        <div>
          <h2 className="text-xl font-black text-ink">קו {line} — פנוי לעבודה</h2>
          <p className="text-sm font-semibold text-ink-faint">
            הקימו אצווה חדשה: בחרו מוצר וצוות
          </p>
        </div>
      </header>

      {/* Product picker */}
      <div className="mt-5">
        <p className="mb-2 text-sm font-extrabold text-ink-soft">
          1. בחירת מוצר למילוי
        </p>
        <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pe-1 lg:grid-cols-3">
          {activeProducts.map((p) => (
            <button
              key={p.id}
              onClick={() => setProductId(p.id === productId ? null : p.id)}
              className={`touch-lg rounded-2xl border-2 px-2 py-2 text-center transition-all ${
                productId === p.id
                  ? "border-brand-500 bg-brand-50 shadow-card"
                  : "border-edge bg-white hover:border-brand-200 hover:bg-brand-50/50"
              }`}
            >
              <span className="block truncate text-sm font-extrabold text-ink">
                {p.name}
              </span>
              <span className="num block text-xs font-bold text-ink-faint">
                {p.size} • {formatNumber(p.pointValue)} נק׳/קרטון
              </span>
            </button>
          ))}
          {activeProducts.length === 0 && (
            <p className="col-span-full rounded-xl bg-safety-50 p-3 text-sm font-bold text-safety-700">
              אין מוצרים פעילים — יש להוסיף מוצרים במסך הניהול
            </p>
          )}
        </div>
      </div>

      {/* Team picker */}
      <div className="mt-5 flex-1">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-extrabold text-ink-soft">
          <Users className="h-4 w-4" />
          2. בחירת צוות ({selected.size} נבחרו)
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {availableWorkers.map((w) => {
            const on = selected.has(w.id);
            return (
              <button
                key={w.id}
                onClick={() => toggle(w.id)}
                className={`touch-lg flex items-center gap-2 rounded-2xl border-2 px-2.5 py-2 text-start transition-all ${
                  on
                    ? "border-volt-500 bg-volt-50 shadow-card"
                    : "border-edge bg-white hover:border-volt-300"
                }`}
              >
                <span className="text-2xl leading-none">{w.emoji}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold text-ink">
                    {w.name}
                  </span>
                  <span className="num block text-[11px] font-bold text-ink-faint">
                    #{w.employeeId}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={start}
        disabled={!productId || selected.size === 0 || busy}
        className="touch-lg mt-5 flex items-center justify-center gap-2 rounded-2xl bg-volt-600 px-6 py-4 text-lg font-black text-white shadow-pop transition-all hover:bg-volt-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Play className="h-6 w-6" strokeWidth={2.6} />
        {busy ? "מפעיל…" : "התחל אצווה — הטיימר מתחיל"}
      </button>
    </div>
  );
}

/* ================================================================== */
/* ACTIVE — running batch with live timer & controls                   */
/* ================================================================== */

function ActiveLine({
  line,
  batch,
  workers,
  busyWorkerIds,
  syncOffset,
  snapshotAt,
  refresh,
  pushToast,
}: LineCardProps & { batch: ActiveBatchView }) {
  const theme = LINE_THEME[line];
  const [panel, setPanel] = useState<"none" | "pallet" | "pause">("none");
  const [confirm, setConfirm] = useState<"none" | "complete" | "cancel">("none");
  const [addId, setAddId] = useState("");
  const [busy, setBusy] = useState(false);

  const paused = batch.isPausedNow;
  const now = useNow(500);
  const liveNow = now + syncOffset;
  const delta = Math.max(0, liveNow - snapshotAt);
  const clock = {
    liveNow,
    activeMs: batch.activeMs + (paused ? 0 : delta),
    pauseMs: batch.pauseMs + (paused ? delta : 0),
  };

  const act = async (
    body: Record<string, unknown>,
    okMsg: string,
    method = "PATCH",
    url = `/api/batches/${batch.id}`,
  ) => {
    if (busy) return false;
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "DELETE" ? undefined : JSON.stringify(body),
      });
      if (!res.ok) {
        pushToast("err", await apiError(res, "הפעולה נכשלה"));
        return false;
      }
      pushToast("ok", okMsg);
      await refresh();
      return true;
    } finally {
      setBusy(false);
    }
  };

  const candidates = workers.filter(
    (w) =>
      w.active &&
      !busyWorkerIds.has(w.id) &&
      !batch.members.some((m) => m.workerId === w.id),
  );

  return (
    <div className="flex flex-1 flex-col">
      {/* Header strip */}
      <header
        className={`flex items-center gap-3 border-b-2 px-5 py-3 ${
          paused ? "border-safety-200 bg-safety-50" : "border-edge bg-white"
        }`}
      >
        <span
          className={`grid h-11 w-11 place-items-center rounded-2xl text-xl font-black text-white ${theme.chip}`}
        >
          {line}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-black text-ink">
            {batch.product.name}
            <span className="num ms-2 text-sm font-bold text-ink-faint">
              {batch.product.size}
            </span>
          </h2>
          <p className="num text-xs font-bold text-ink-faint">
            החלה ב־{formatTime(batch.startedAt)} • {formatNumber(batch.product.pointValue)} נק׳ לקרטון
          </p>
        </div>
        {paused ? (
          <span className="flex animate-pause-blink items-center gap-1.5 rounded-full bg-safety-500 px-3 py-1.5 text-sm font-black text-white">
            <CirclePause className="h-4 w-4" /> בהשהיה
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-volt-500 px-3 py-1.5 text-sm font-black text-white">
            <span className="h-2 w-2 animate-ping rounded-full bg-white" /> פעיל
          </span>
        )}
      </header>

      {/* Giant timer zone */}
      <div className="px-5 pt-4">
        <BigTimer
          activeMs={clock.activeMs}
          pauseMs={clock.pauseMs}
          paused={paused}
          pauseReason={batch.currentPauseReason}
          pauseSince={batch.currentPauseSince}
          syncOffset={syncOffset}
        />

        {/* Stat tiles */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <StatTile label="משטחים" value={formatNumber(batch.totalPallets, 0)} />
          <StatTile label="קרטונים" value={formatNumber(batch.totalCartons, 0)} />
          <StatTile
            label="נקודות"
            value={formatNumber(batch.totalPoints)}
            accent
          />
        </div>
      </div>

      {/* Team */}
      <div className="px-5 pt-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-ink-soft">
          <Users className="h-4 w-4" />
          צוות פעיל ({batch.members.length}) — נקודות מתחלקות שווה בשווה
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {batch.members.map((m) => (
            <span
              key={m.id}
              className="group flex items-center gap-1.5 rounded-full border border-edge bg-brand-50/60 py-1 pe-1 ps-2.5 text-sm font-bold text-ink"
            >
              <span className="text-lg leading-none">{m.emoji}</span>
              {m.name}
              <button
                title="הסרה מהצוות (נקודות הבאות בלעדיו)"
                onClick={() =>
                  act(
                    { action: "removeMember", workerId: m.workerId },
                    `${m.name} הוסר מהצוות — הנקודות הבאות יתחלקו מחדש`,
                  )
                }
                className="grid h-6 w-6 place-items-center rounded-full text-ink-faint transition-colors hover:bg-red-100 hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" strokeWidth={3} />
              </button>
            </span>
          ))}
          {batch.members.length === 0 && (
            <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-red-600">
              אין חברי צוות — הוסיפו עובד כדי לרשום משטחים
            </span>
          )}
          {candidates.length > 0 && (
            <span className="flex items-center gap-1">
              <select
                value={addId}
                onChange={(e) => setAddId(e.target.value)}
                className="h-9 rounded-full border border-edge bg-white px-2 text-sm font-bold text-ink outline-none focus:border-brand-400"
              >
                <option value="">+ הוסף עובד…</option>
                {candidates.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.emoji} {w.name}
                  </option>
                ))}
              </select>
              <button
                disabled={!addId || busy}
                onClick={async () => {
                  const w = candidates.find((c) => String(c.id) === addId);
                  const ok = await act(
                    { action: "addMember", workerId: Number(addId) },
                    `${w?.name ?? "העובד"} הצטרף לצוות — יקבל חלק מהנקודות הבאות`,
                  );
                  if (ok) setAddId("");
                }}
                className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-white transition-colors hover:bg-brand-500 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" strokeWidth={3} />
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Last pallets feed */}
      <div className="mt-4 px-5">
        <div className="max-h-28 space-y-1 overflow-y-auto pe-1">
          {batch.pallets.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-xl bg-paper px-3 py-1.5 text-xs font-bold text-ink-soft"
            >
              <span className="num">
                משטח {formatNumber(p.cartons, 0)} קרטונים • {formatTime(p.loggedAt)}
              </span>
              <span className="num text-volt-700">
                +{formatNumber(p.points)} נק׳ ({formatNumber(p.memberCount, 0)} בצוות)
              </span>
            </div>
          ))}
          {batch.pallets.length === 0 && (
            <p className="rounded-xl bg-paper px-3 py-2 text-center text-xs font-bold text-ink-faint">
              טרם נרשמו משטחים באצווה זו — הראשון בדרך!
            </p>
          )}
        </div>
      </div>

      {/* Panels */}
      {panel === "pallet" && (
        <PalletPanel
          batch={batch}
          busy={busy}
          onLog={async (cartons) => {
            const res = await fetch(`/api/batches/${batch.id}/pallets`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ cartons }),
            });
            if (!res.ok) {
              pushToast("err", await apiError(res, "רישום המשטח נכשל"));
              return;
            }
            const json = await res.json();
            pushToast(
              "ok",
              `משטח נרשם: +${formatNumber(json.points)} נק׳, ${formatNumber(json.perMember)} לכל עובד`,
            );
            setPanel("none");
            await refresh();
          }}
          onClose={() => setPanel("none")}
        />
      )}
      {panel === "pause" && (
        <PausePanel
          busy={busy}
          onPick={async (reason) => {
            const ok = await act({ action: "pause", reason }, `האצווה הושהתה: ${reason}`);
            if (ok) setPanel("none");
          }}
          onClose={() => setPanel("none")}
        />
      )}

      {/* Action bar */}
      <div className="mt-auto grid grid-cols-3 gap-2 p-5 pt-4">
        <button
          onClick={() => setPanel(panel === "pallet" ? "none" : "pallet")}
          disabled={paused || busy}
          className="touch-lg flex items-center justify-center gap-2 rounded-2xl bg-volt-600 px-3 py-3.5 text-base font-black text-white shadow-pop transition-all hover:bg-volt-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PackagePlus className="h-5 w-5" strokeWidth={2.5} />
          הוסף משטח +
        </button>

        {paused ? (
          <button
            onClick={() => act({ action: "resume" }, "העבודה חודשה — הטיימר רץ שוב")}
            disabled={busy}
            className="touch-lg flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-3 py-3.5 text-base font-black text-white shadow-pop transition-all hover:bg-brand-500 disabled:opacity-40"
          >
            <CirclePlay className="h-5 w-5" strokeWidth={2.5} />
            חדש עבודה
          </button>
        ) : (
          <button
            onClick={() => setPanel(panel === "pause" ? "none" : "pause")}
            disabled={busy}
            className="touch-lg flex items-center justify-center gap-2 rounded-2xl bg-safety-500 px-3 py-3.5 text-base font-black text-white shadow-pop transition-all hover:bg-safety-400 disabled:opacity-40"
          >
            <CirclePause className="h-5 w-5" strokeWidth={2.5} />
            השהה
          </button>
        )}

        {confirm === "complete" ? (
          <button
            onClick={async () => {
              const ok = await act({ action: "complete" }, "האצווה הסתיימה ונשמרה בהיסטוריה");
              if (ok) setConfirm("none");
            }}
            disabled={busy}
            onMouseLeave={() => setConfirm("none")}
            className="touch-lg flex items-center justify-center gap-1 rounded-2xl bg-ink px-2 py-3.5 text-sm font-black text-white"
          >
            <CheckCircle2 className="h-5 w-5" /> לחצו שוב לאישור
          </button>
        ) : (
          <button
            onClick={() => setConfirm("complete")}
            disabled={busy}
            className="touch-lg flex items-center justify-center gap-2 rounded-2xl border-2 border-ink/15 bg-white px-3 py-3.5 text-base font-black text-ink transition-all hover:border-ink/40 disabled:opacity-40"
          >
            <CheckCircle2 className="h-5 w-5" />
            סיים אצווה
          </button>
        )}
      </div>

      <div className="px-5 pb-4">
        {confirm === "cancel" ? (
          <button
            onClick={async () => {
              await act({}, "האצווה בוטלה ונמחקה", "DELETE");
              setConfirm("none");
            }}
            onMouseLeave={() => setConfirm("none")}
            disabled={busy}
            className="w-full rounded-xl bg-red-600 py-2 text-sm font-black text-white"
          >
            לחצו שוב לאישור מחיקה מלאה של האצווה
          </button>
        ) : (
          <button
            onClick={() => setConfirm("cancel")}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-bold text-ink-faint transition-colors hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" /> ביטול אצווה (מחיקה)
          </button>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Sub components                                                      */
/* ================================================================== */

function StatTile({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-3 py-2.5 text-center ${
        accent ? "border-volt-200 bg-volt-50" : "border-edge bg-paper"
      }`}
    >
      <p
        className={`digits text-2xl font-bold leading-none ${
          accent ? "text-volt-700" : "text-ink"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] font-extrabold text-ink-faint">{label}</p>
    </div>
  );
}

function PalletPanel({
  batch,
  busy,
  onLog,
  onClose,
}: {
  batch: ActiveBatchView;
  busy: boolean;
  onLog: (cartons: number) => Promise<void>;
  onClose: () => void;
}) {
  const [custom, setCustom] = useState("");
  const [pending, setPending] = useState(false);
  const memberCount = Math.max(1, batch.members.length);

  const preview = (cartons: number) =>
    formatNumber((cartons * batch.product.pointValue) / memberCount);

  const submit = async (cartons: number) => {
    if (pending || busy || cartons <= 0) return;
    setPending(true);
    try {
      await onLog(cartons);
      setCustom("");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-5 mt-4 animate-pop-in rounded-2xl border-2 border-volt-300 bg-volt-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-black text-volt-800">
          רישום משטח חדש — בחרו גודל או הקלידו ידנית
        </p>
        <button
          onClick={onClose}
          className="grid h-7 w-7 place-items-center rounded-full bg-white text-ink-faint hover:text-ink"
        >
          <X className="h-4 w-4" strokeWidth={3} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {batch.productPalletOptions.map((opt) => (
          <button
            key={opt}
            disabled={pending}
            onClick={() => submit(opt)}
            className="rounded-2xl border-2 border-volt-400 bg-white px-2 py-3 text-center transition-all hover:scale-[1.03] hover:bg-volt-100 disabled:opacity-50"
          >
            <span className="digits block text-2xl font-bold text-ink">{opt}</span>
            <span className="block text-[11px] font-extrabold text-ink-faint">קרטונים</span>
            <span className="num mt-0.5 block text-[11px] font-extrabold text-volt-700">
              +{formatNumber(opt * batch.product.pointValue)} נק׳ • {preview(opt)} לעובד
            </span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-stretch gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="מספר קרטונים מותאם אישית…"
          className="digits min-w-0 flex-1 rounded-xl border-2 border-volt-300 bg-white px-3 py-2.5 text-lg text-ink outline-none placeholder:text-right placeholder:font-sans placeholder:text-base placeholder:text-ink-faint focus:border-volt-500"
        />
        <button
          disabled={pending || !custom || Number(custom) <= 0}
          onClick={() => submit(Math.floor(Number(custom)))}
          className="touch-lg flex items-center gap-2 rounded-xl bg-volt-600 px-5 font-black text-white transition-colors hover:bg-volt-500 disabled:opacity-40"
        >
          <Timer className="h-5 w-5" />
          רשום
        </button>
      </div>
      {custom && Number(custom) > 0 && (
        <p className="num mt-2 text-xs font-extrabold text-volt-800">
          שווי: {formatNumber(Number(custom) * batch.product.pointValue)} נקודות •{" "}
          {formatNumber((Number(custom) * batch.product.pointValue) / memberCount)} לכל אחד מ־{memberCount} עובדים
        </p>
      )}
    </div>
  );
}

function PausePanel({
  busy,
  onPick,
  onClose,
}: {
  busy: boolean;
  onPick: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [custom, setCustom] = useState("");
  return (
    <div className="mx-5 mt-4 animate-pop-in rounded-2xl border-2 border-safety-300 bg-safety-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-black text-safety-800">
          סיבת ההשהיה — הזמן יירשם בנפרד מזמן העבודה
        </p>
        <button
          onClick={onClose}
          className="grid h-7 w-7 place-items-center rounded-full bg-white text-ink-faint hover:text-ink"
        >
          <X className="h-4 w-4" strokeWidth={3} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {PAUSE_REASONS.map((r) => (
          <button
            key={r}
            disabled={busy}
            onClick={() => onPick(r)}
            className="touch-lg rounded-xl border-2 border-safety-300 bg-white px-2 py-3 text-sm font-extrabold text-safety-800 transition-all hover:scale-[1.02] hover:bg-safety-100 disabled:opacity-50"
          >
            {r}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="סיבה אחרת — כתבו כאן…"
          className="min-w-0 flex-1 rounded-xl border-2 border-safety-300 bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-safety-500"
        />
        <button
          disabled={busy || !custom.trim()}
          onClick={() => onPick(custom.trim())}
          className="rounded-xl bg-safety-500 px-4 text-sm font-black text-white hover:bg-safety-400 disabled:opacity-40"
        >
          השהה
        </button>
      </div>
    </div>
  );
}
