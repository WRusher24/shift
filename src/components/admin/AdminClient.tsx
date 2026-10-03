"use client";

import { useState } from "react";
import { Flag, Loader2, Package, UsersRound, FileSpreadsheet } from "lucide-react";
import type { StateSnapshot } from "@/lib/data";
import { usePolling } from "@/components/hooks";
import { ToastStack, useToasts } from "@/components/Toast";
import { WorkersTab } from "./WorkersTab";
import { ProductsTab } from "./ProductsTab";
import { RacesTab } from "./RacesTab";
import { ReportsTab } from "./ReportsTab";

export interface AdminCtx {
  state: StateSnapshot;
  refresh: () => Promise<void>;
  push: (kind: "ok" | "err", text: string) => void;
}

const TABS = [
  { id: "workers", label: "עובדים", icon: UsersRound },
  { id: "products", label: "מוצרים", icon: Package },
  { id: "races", label: "מירוצים", icon: Flag },
  { id: "reports", label: "דוחות וייצוא", icon: FileSpreadsheet },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminClient() {
  const { data, loading, refresh } = usePolling<StateSnapshot>("/api/state", 15000);
  const { toasts, push } = useToasts();
  const [tab, setTab] = useState<TabId>("workers");

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-ink-faint">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        <p className="text-lg font-bold">טוען מסך ניהול…</p>
      </div>
    );
  }
  if (!data) return null;

  const ctx: AdminCtx = { state: data, refresh, push };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-ink">ניהול המפעל</h1>
          <p className="text-sm font-bold text-ink-faint">
            עובדים, מוצרים, מירוצים ודוחות תפעוליים
          </p>
        </div>
        <nav className="flex gap-1.5 rounded-2xl border border-edge bg-surface p-1.5 shadow-card">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-black transition-all ${
                tab === id
                  ? "bg-brand-600 text-white shadow-card"
                  : "text-ink-soft hover:bg-brand-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </header>

      {tab === "workers" && <WorkersTab ctx={ctx} />}
      {tab === "products" && <ProductsTab ctx={ctx} />}
      {tab === "races" && <RacesTab ctx={ctx} />}
      {tab === "reports" && <ReportsTab ctx={ctx} />}

      <ToastStack toasts={toasts} />
    </div>
  );
}
