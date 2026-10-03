"use client";

import { useState } from "react";
import { Package, Pencil, Plus, Power, Trash2, X } from "lucide-react";
import type { Product } from "@/db/schema";
import { formatNumber } from "@/lib/format";
import { apiError } from "@/components/hooks";
import type { AdminCtx } from "./AdminClient";

function parseOptions(text: string): number[] {
  return [
    ...new Set(
      text
        .split(/[,،\s]+/)
        .map((s) => Number(s))
        .filter((n) => Number.isInteger(n) && n > 0),
    ),
  ];
}

export function ProductsTab({ ctx }: { ctx: AdminCtx }) {
  const { state, refresh, push } = ctx;

  const [name, setName] = useState("");
  const [size, setSize] = useState("");
  const [unitsPerCarton, setUnitsPerCarton] = useState("12");
  const [optionsText, setOptionsText] = useState("28, 32");
  const [pointValue, setPointValue] = useState("1");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          size,
          unitsPerCarton: Number(unitsPerCarton),
          palletOptions: parseOptions(optionsText),
          pointValue: Number(pointValue),
        }),
      });
      if (!res.ok) return push("err", await apiError(res, "הוספת המוצר נכשלה"));
      push("ok", `המוצר "${name}" נוסף לקטלוג`);
      setName("");
      setSize("");
      setUnitsPerCarton("12");
      setOptionsText("28, 32");
      setPointValue("1");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      {/* Add product */}
      <section className="h-fit rounded-3xl border border-edge bg-surface p-5 shadow-card">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-ink">
          <Package className="h-5 w-5 text-brand-600" />
          הוספת מוצר חדש
        </h2>

        <Field label="שם מוצר (עברית, ערבית או אנגלית)">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="לדוגמה: מנקה רצפות / مسحوق غسيل / Dish Soap"
            className="w-full rounded-xl border border-edge bg-white px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-brand-400"
          />
        </Field>

        <Field label="גודל בקבוק / גלון">
          <input
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder='לדוגמה: 1 ל"מ או 1L'
            className="w-full rounded-xl border border-edge bg-white px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-brand-400"
          />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="יחידות בקרטון">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={unitsPerCarton}
              onChange={(e) => setUnitsPerCarton(e.target.value)}
              className="digits w-full rounded-xl border border-edge bg-white px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-brand-400"
            />
          </Field>
          <Field label="מקדם נקודות לקרטון">
            <input
              type="number"
              inputMode="decimal"
              min={0.1}
              step={0.1}
              value={pointValue}
              onChange={(e) => setPointValue(e.target.value)}
              className="digits w-full rounded-xl border border-edge bg-white px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-brand-400"
            />
          </Field>
        </div>

        <Field label="גדלי משטח מוגדרים מראש (קרטונים, מופרדים בפסיק)">
          <input
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            placeholder="28, 32"
            className="digits w-full rounded-xl border border-edge bg-white px-3 py-2.5 text-sm font-bold text-ink outline-none placeholder:text-right focus:border-brand-400"
          />
        </Field>

        {parseOptions(optionsText).length > 0 && name && (
          <p className="num mb-3 rounded-xl bg-volt-50 px-3 py-2 text-xs font-extrabold text-volt-800">
            תצוגה מקדימה: משטח {parseOptions(optionsText)[0]} קרטונים ={" "}
            {formatNumber(parseOptions(optionsText)[0] * (Number(pointValue) || 0))} נקודות
          </p>
        )}

        <button
          onClick={add}
          disabled={
            busy || !name.trim() || !size.trim() || parseOptions(optionsText).length === 0
          }
          className="touch-lg flex w-full items-center justify-center gap-2 rounded-xl bg-volt-600 py-3 font-black text-white transition-colors hover:bg-volt-500 disabled:opacity-40"
        >
          <Plus className="h-5 w-5" strokeWidth={3} />
          הוסף מוצר לקטלוג
        </button>
      </section>

      {/* Products table */}
      <section className="overflow-hidden rounded-3xl border border-edge bg-surface shadow-card">
        <header className="border-b border-edge px-5 py-3.5">
          <h2 className="text-lg font-black text-ink">
            קטלוג מוצרים ({state.products.filter((p) => p.active).length} פעילים)
          </h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-paper text-xs font-black text-ink-faint">
                <th className="px-4 py-2.5 text-start">מוצר</th>
                <th className="px-4 py-2.5 text-start">גודל</th>
                <th className="px-4 py-2.5 text-start">יח׳/קרטון</th>
                <th className="px-4 py-2.5 text-start">גדלי משטח</th>
                <th className="px-4 py-2.5 text-start">מקדם נק׳</th>
                <th className="px-4 py-2.5 text-start">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge/70">
              {state.products.map((p) => (
                <ProductRow key={p.id} product={p} ctx={ctx} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-xs font-extrabold text-ink-soft">{label}</label>
      {children}
    </div>
  );
}

function ProductRow({ product, ctx }: { product: Product; ctx: AdminCtx }) {
  const { refresh, push } = ctx;
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState(product.name);
  const [size, setSize] = useState(product.size);
  const [upc, setUpc] = useState(String(product.unitsPerCarton));
  const [opts, setOpts] = useState(product.palletOptions.join(", "));
  const [pv, setPv] = useState(String(product.pointValue));

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          size,
          unitsPerCarton: Number(upc),
          palletOptions: parseOptions(opts),
          pointValue: Number(pv),
        }),
      });
      if (!res.ok) return push("err", await apiError(res, "שמירת המוצר נכשלה"));
      push("ok", `המוצר "${name}" עודכן`);
      setEditing(false);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    const res = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !product.active }),
    });
    if (!res.ok) return push("err", await apiError(res, "הפעולה נכשלה"));
    push("ok", product.active ? `"${product.name}" הושבת` : `"${product.name}" הופעל`);
    await refresh();
  };

  const del = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      if (!res.ok) return push("err", await apiError(res, "המחיקה נכשלה"));
      const json = await res.json();
      push("ok", json.message ?? `"${product.name}" נמחק`);
      await refresh();
    } finally {
      setBusy(false);
      setConfirmDel(false);
    }
  };

  const inputCls =
    "rounded-lg border border-edge px-2 py-2 text-sm font-bold outline-none focus:border-brand-400";

  if (editing) {
    return (
      <tr className="bg-brand-50/50">
        <td className="px-4 py-2.5">
          <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} w-full`} />
        </td>
        <td className="px-4 py-2.5">
          <input value={size} onChange={(e) => setSize(e.target.value)} className={`${inputCls} w-20`} />
        </td>
        <td className="px-4 py-2.5">
          <input
            type="number"
            value={upc}
            onChange={(e) => setUpc(e.target.value)}
            className={`${inputCls} digits w-16`}
          />
        </td>
        <td className="px-4 py-2.5">
          <input value={opts} onChange={(e) => setOpts(e.target.value)} className={`${inputCls} digits w-32`} />
        </td>
        <td className="px-4 py-2.5">
          <input
            type="number"
            step={0.1}
            value={pv}
            onChange={(e) => setPv(e.target.value)}
            className={`${inputCls} digits w-16`}
          />
        </td>
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
    <tr className={product.active ? "" : "opacity-55"}>
      <td className="px-4 py-2.5 font-extrabold text-ink">{product.name}</td>
      <td className="num px-4 py-2.5 font-bold text-ink-soft">{product.size}</td>
      <td className="digits px-4 py-2.5 font-bold text-ink-soft">{product.unitsPerCarton}</td>
      <td className="px-4 py-2.5">
        <span className="flex flex-wrap gap-1">
          {product.palletOptions.map((o) => (
            <span
              key={o}
              className="digits rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-extrabold text-brand-700"
            >
              {o}
            </span>
          ))}
        </span>
      </td>
      <td className="digits px-4 py-2.5 font-bold text-volt-700">
        {formatNumber(product.pointValue)}
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
            title={product.active ? "השבתה" : "הפעלה"}
            onClick={toggleActive}
            className={`grid h-9 w-9 place-items-center rounded-lg border transition-colors ${
              product.active
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
